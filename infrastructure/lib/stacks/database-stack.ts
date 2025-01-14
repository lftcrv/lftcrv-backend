import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly credentials: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create database credentials
    this.credentials = new secretsmanager.Secret(this, 'DBCredentials', {
      secretName: 'leftcurve/database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'leftcurve_admin',
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // Create security group for database
    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      'DatabaseSecurityGroup',
      {
        vpc: props.vpc,
        description: 'Security group for LeftCurve database',
        allowAllOutbound: true,
      },
    );

    // Determine if we're in production
    const isProduction = process.env.ENVIRONMENT === 'production';

    // Create RDS instance
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13,
      }),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MEDIUM,
      ),
      credentials: rds.Credentials.fromSecret(this.credentials),
      securityGroups: [dbSecurityGroup],
      multiAz: isProduction,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: isProduction
        ? cdk.Duration.days(7)
        : cdk.Duration.days(1),
      deleteAutomatedBackups: !isProduction,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProduction,
      databaseName: 'leftcurve',
      preferredBackupWindow: isProduction ? '03:00-04:00' : undefined,
      preferredMaintenanceWindow: isProduction
        ? 'Mon:04:00-Mon:05:00'
        : undefined,
      cloudwatchLogsExports: ['postgresql'],
      monitoringInterval: cdk.Duration.minutes(isProduction ? 1 : 0),
    });

    // Output database endpoint
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'Database endpoint',
      exportName: 'LeftCurveDatabaseEndpoint',
    });

    // Output database credentials ARN
    new cdk.CfnOutput(this, 'DatabaseCredentialsArn', {
      value: this.credentials.secretArn,
      description: 'Database credentials ARN',
      exportName: 'LeftCurveDatabaseCredentialsArn',
    });
  }
}
