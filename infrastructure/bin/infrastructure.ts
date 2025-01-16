import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { SecurityGroupStack } from '../lib/stacks/security-group-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { EcsStack } from '../lib/stacks/ecs-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-3',
};

const commonProps: cdk.StackProps = {
  env,
  tags: {
    Project: 'LeftCurve',
    Environment: process.env.ENVIRONMENT || 'production',
  },
};

// VPC Stack
const vpcStack = new VpcStack(app, 'LeftCurveVpcStack', {
  ...commonProps,
  stackName: 'leftcurve-vpc',
});

// Security Groups Stack
const securityGroupStack = new SecurityGroupStack(
  app,
  'LeftCurveSecurityGroupStack',
  {
    ...commonProps,
    stackName: 'leftcurve-security-groups',
    vpc: vpcStack.vpc,
  },
);
securityGroupStack.addDependency(vpcStack);

// Database Stack
const dbStack = new DatabaseStack(app, 'LeftCurveDbStack', {
  ...commonProps,
  stackName: 'leftcurve-db',
  vpc: vpcStack.vpc,
  dbSecurityGroup: securityGroupStack.dbSecurityGroup,
});
dbStack.addDependency(securityGroupStack);

// ECS Stack
const ecsStack = new EcsStack(app, 'LeftCurveEcsStack', {
  ...commonProps,
  stackName: 'leftcurve-ecs',
  vpc: vpcStack.vpc,
  database: dbStack.database,
  databaseSecret: dbStack.credentials,
  ecsSecurityGroup: securityGroupStack.ecsSecurityGroup,
  albSecurityGroup: securityGroupStack.albSecurityGroup,
});
ecsStack.addDependency(dbStack);
ecsStack.addDependency(securityGroupStack);

app.synth();
