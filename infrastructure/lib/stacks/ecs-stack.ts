import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
  databaseSecret: secretsmanager.ISecret;
  ecsSecurityGroup: ec2.SecurityGroup;
  albSecurityGroup: ec2.SecurityGroup;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Create ECR Repository
    let repository: ecr.IRepository;

    try {
      // Try to import existing repository
      repository = ecr.Repository.fromRepositoryName(
        this,
        'ExistingRepository',
        'leftcurve-api',
      );
    } catch {
      // If it doesn't exist, create new one
      repository = new ecr.Repository(this, 'Repository', {
        repositoryName: 'leftcurve-api',
        imageScanOnPush: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
    }

    // Enhanced logging configuration
    const logGroup = new logs.LogGroup(this, 'ServiceLogs', {
      logGroupName: '/ecs/leftcurve-api',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const migrationLogGroup = new logs.LogGroup(this, 'MigrationLogs', {
      logGroupName: '/ecs/leftcurve-migrations',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'leftcurve-cluster',
      containerInsights: true,
      enableFargateCapacityProviders: true,
    });

    // Task role with permissions
    const taskRole = new iam.Role(this, 'ECSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ECS tasks with logging permissions',
    });

    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy',
      ),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'], // ECR authorization token needs * permission
      }),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:GetRepositoryPolicy',
          'ecr:ListImages',
          'ecr:DescribeImages',
          'ecr:BatchGetImage',
          'ecr:GetDownloadUrlForLayer',
        ],
        resources: [repository.repositoryArn],
      }),
    );

    // Task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole: taskRole,
    });

    // Main container
    const container = taskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'ApiContainer',
        logGroup,
        datetimeFormat: 'DATETIME',
        multilinePattern: '^\\w{3}\\s\\d{2}\\s\\d{2}:\\d{2}:\\d{2}',
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '8080',
        LOG_LEVEL: 'debug',
        HOST: '0.0.0.0',
        RATE_LIMIT: process.env.RATE_LIMIT || '10',
        RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '60',
        API_KEY: process.env.API_KEY,
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
        RUN_MIGRATIONS: 'false', // Don't run migrations in the main container
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          'database_url',
        ),
      },
    });

    container.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    // Migration task definition
    const migrationTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      'MigrationTaskDef',
      {
        family: 'leftcurve-migration-task',
        memoryLimitMiB: 512,
        cpu: 256,
        taskRole,
        executionRole: taskRole,
      },
    );

    // Migration container
    migrationTaskDefinition.addContainer('MigrationContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'MigrationContainer',
        logGroup: migrationLogGroup,
        datetimeFormat: 'DATETIME',
        multilinePattern: '^\\w{3}\\s\\d{2}\\s\\d{2}:\\d{2}:\\d{2}',
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '8080',
        LOG_LEVEL: 'debug',
        RATE_LIMIT: '10',
        RATE_LIMIT_WINDOW: '60',
        API_KEY: process.env.API_KEY || '',
        CORS_ORIGIN: '*',
        RUN_MIGRATIONS: 'true', // This container will run migrations
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          'database_url',
        ),
      },
    });

    // Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: props.vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 8080,
      targetType: elbv2.TargetType.IP,
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      serviceName: 'leftcurve-service',
      taskDefinition,
      desiredCount: parseInt(process.env.ECS_SERVICE_DESIRED_COUNT || '1'),
      assignPublicIp: true,
      securityGroups: [props.ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      enableExecuteCommand: true,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE',
          weight: 1,
        },
      ],
    });

    service.attachToApplicationTargetGroup(targetGroup);
    service.node.addDependency(logGroup);

    // ALB Listener
    const listener = alb.addListener('Listener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // 404 Rule
    listener.addAction('NotFoundAction', {
      action: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'application/json',
        messageBody: JSON.stringify({
          status: 404,
          message: 'Route not found',
        }),
      }),
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['*/not-found', '*/*not-found*']),
      ],
      priority: 10,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
      exportName: 'LeftCurveLoadBalancerDNS',
    });

    new cdk.CfnOutput(this, 'ServiceLogGroup', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group Name',
      exportName: 'LeftCurveServiceLogGroup',
    });

    new cdk.CfnOutput(this, 'MigrationLogGroup', {
      value: migrationLogGroup.logGroupName,
      description: 'Migration CloudWatch Log Group Name',
      exportName: 'LeftCurveMigrationLogGroup',
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: 'LeftCurveRepositoryUri',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS Service Name',
      exportName: 'LeftCurveServiceName',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'LeftCurveClusterName',
    });

    new cdk.CfnOutput(this, 'ListenerArn', {
      value: listener.listenerArn,
      description: 'ALB Listener ARN',
      exportName: 'LeftCurveListenerArn',
    });
  }
}
