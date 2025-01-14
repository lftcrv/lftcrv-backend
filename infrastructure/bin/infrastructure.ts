#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { EcsStack } from '../lib/stacks/ecs-stack';

const app = new cdk.App();

const commonProps: cdk.StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Project: 'LeftCurve',
    Environment: process.env.ENVIRONMENT || 'production',
  },
};

const vpcStack = new VpcStack(app, 'LeftCurveVpcStack', {
  ...commonProps,
  stackName: 'leftcurve-vpc',
});

const dbStack = new DatabaseStack(app, 'LeftCurveDbStack', {
  ...commonProps,
  stackName: 'leftcurve-db',
  vpc: vpcStack.vpc,
});

const ecsStack = new EcsStack(app, 'LeftCurveEcsStack', {
  ...commonProps,
  stackName: 'leftcurve-ecs',
  vpc: vpcStack.vpc,
  database: dbStack.database,
});

dbStack.addDependency(vpcStack);
ecsStack.addDependency(dbStack);

app.synth();
