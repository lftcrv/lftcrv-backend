import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    // Create ECR Repository
    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName: 'leftcurve-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep only last 3 images',
          maxImageCount: 3,
          rulePriority: 1,
        },
      ],
    });

    // Create Log Group
    const logGroup = new logs.LogGroup(this, 'ServiceLogs', {
      logGroupName: '/ecs/leftcurve-api',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'leftcurve-cluster',
      containerInsights: true,
    });

    // Security Groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'Security group for ALB',
    });

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'Security group for ECS tasks',
    });

    // Allow inbound from ALB to ECS tasks
    ecsSecurityGroup.connections.allowFrom(
      albSecurityGroup,
      ec2.Port.tcp(8080),
      'Allow inbound from ALB',
    );

    // Create Task Role
    const taskRole = new iam.Role(this, 'ECSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add necessary permissions
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AmazonECSTaskExecutionRolePolicy',
      ),
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'secretsmanager:GetSecretValue',
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: [props.database.secret!.secretArn, repository.repositoryArn],
      }),
    );

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole: taskRole,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'LeftCurveAPI',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_HOST: props.database.instanceEndpoint.hostname,
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'leftcurve',
      },
      secrets: {
        DATABASE_USER: ecs.Secret.fromSecretsManager(
          props.database.secret!,
          'username',
        ),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(
          props.database.secret!,
          'password',
        ),
      },
    });

    container.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    // Create ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    // Create Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: props.vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 8080,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/api/health',
        port: '8080',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Add listener
    alb.addListener('Listener', {
      port: 80,
      defaultTargetGroups: [targetGroup],
    });

    // Create ECS Service with load balancer target group
    new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    }).attachToApplicationTargetGroup(targetGroup);

    // Add outputs
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

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: 'LeftCurveRepositoryUri',
    });

    new cdk.CfnOutput(this, 'ECRRepositoryName', {
      value: repository.repositoryName,
      description: 'ECR Repository Name',
      exportName: 'LeftCurveRepositoryName',
    });
  }
}
