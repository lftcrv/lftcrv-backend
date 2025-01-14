#!/bin/bash
set -e

echo "🧹 Starting cleanup of all AWS resources..."

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Delete ECS services and tasks
echo "Cleaning up ECS resources..."
aws ecs list-services --cluster leftcurve-cluster --query 'serviceArns[]' --output text | while read -r service; do
    if [ ! -z "$service" ]; then
        echo "Deleting service: $service"
        aws ecs update-service --cluster leftcurve-cluster --service "$service" --desired-count 0
        aws ecs delete-service --cluster leftcurve-cluster --service "$service"
    fi
done

# Delete ECS cluster
echo "Deleting ECS cluster..."
aws ecs delete-cluster --cluster leftcurve-cluster || true

# Delete ECR repository
echo "Deleting ECR repository..."
aws ecr delete-repository --repository-name leftcurve-api --force || true

# Delete CloudFormation stacks
echo "Deleting CloudFormation stacks..."
for stack in "leftcurve-ecs" "leftcurve-db" "leftcurve-vpc" "CDKToolkit"; do
    echo "Attempting to delete stack: $stack"
    aws cloudformation delete-stack --stack-name $stack || true
    echo "Waiting for stack deletion: $stack"
    aws cloudformation wait stack-delete-complete --stack-name $stack || true
done

# Delete Secrets Manager secret
echo "Deleting Secrets Manager secret..."
aws secretsmanager delete-secret --secret-id leftcurve/database --force-delete-without-recovery || true

# Clean up S3 bucket used by CDK
echo "Cleaning up CDK bootstrap bucket..."
aws s3api list-object-versions --bucket cdk-hnb659fds-assets-911167914606-eu-west-3   --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}'   --output json |   aws s3api delete-objects --bucket cdk-hnb659fds-assets-911167914606-eu-west-3 --delete file:///dev/stdin
aws s3api list-object-versions --bucket cdk-hnb659fds-assets-911167914606-eu-west-3   --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}'   --output json |   aws s3api delete-objects --bucket cdk-hnb659fds-assets-911167914606-eu-west-3 --delete file:///dev/stdin
aws s3api delete-bucket --bucket cdk-hnb659fds-assets-911167914606-eu-west-3

aws s3 rb "s3://cdk-hnb659fds-assets-${AWS_ACCOUNT_ID}-${AWS_DEFAULT_REGION}" --force || true

echo "✨ Cleanup completed! You can now redeploy from scratch."
echo "To redeploy:"
echo "1. cd infrastructure"
echo "2. pnpm cdk bootstrap"
echo "3. cd .."
echo "4. ./scripts/deploy.sh"