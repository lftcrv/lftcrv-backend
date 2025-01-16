import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly credentials: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Database configuration
    const dbName = process.env.DATABASE_NAME || 'lftcrv';
    const dbUser = process.env.DATABASE_USER || 'lftcrv';

    // Create RDS instance first
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
      credentials: rds.Credentials.fromGeneratedSecret(dbUser),
      databaseName: dbName,
      securityGroups: [props.dbSecurityGroup],
      multiAz: process.env.ENVIRONMENT === 'production',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: process.env.ENVIRONMENT !== 'production',
      removalPolicy:
        process.env.ENVIRONMENT === 'production'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      deletionProtection: process.env.ENVIRONMENT === 'production',
    });

    // Get the generated secret from RDS
    const generatedSecret = this.database.secret!;

    // Create our custom secret with the correct format including database_url
    this.credentials = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: 'leftcurve/database',
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          username: generatedSecret
            .secretValueFromJson('username')
            .unsafeUnwrap(),
          password: generatedSecret
            .secretValueFromJson('password')
            .unsafeUnwrap(),
          dbname: dbName,
          host: this.database.instanceEndpoint.hostname,
          port: this.database.instanceEndpoint.port,
          database_url: `postgresql://${generatedSecret.secretValueFromJson('username').unsafeUnwrap()}:${generatedSecret.secretValueFromJson('password').unsafeUnwrap()}@${this.database.instanceEndpoint.hostname}:${this.database.instanceEndpoint.port}/${dbName}?schema=public`,
        }),
      ),
    });

    // Grant ECS task execution role access to secret
    this.credentials.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        principals: [new iam.ServicePrincipal('ecs-tasks.amazonaws.com')],
        resources: ['*'],
      }),
    );

    // Stack outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'Database endpoint',
      exportName: 'LeftCurveDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseCredentialsArn', {
      value: this.credentials.secretArn,
      description: 'Database credentials ARN',
      exportName: 'LeftCurveDatabaseCredentialsArn',
    });
  }
}
