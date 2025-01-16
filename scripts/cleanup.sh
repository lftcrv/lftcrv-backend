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

# Function to ensure CDK execution role exists
ensure_cdk_role() {
    local ROLE_NAME="cdk-hnb659fds-cfn-exec-role-${AWS_ACCOUNT_ID}-${AWS_DEFAULT_REGION}"
    
    # Check if role exists
    if ! aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
        echo "Creating CDK execution role..."
        
        # Create role
        aws iam create-role \
            --role-name "$ROLE_NAME" \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "cloudformation.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }' || return 1

        # Attach required policy
        aws iam put-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-name CDKExecutionPolicy \
            --policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": "*",
                        "Resource": "*"
                    }
                ]
            }' || return 1
    fi
}

# Function to wait for service deletion
wait_for_service_deletion() {
    local cluster=$1
    local service=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if ! aws ecs describe-services --cluster "$cluster" --services "$service" --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
            return 0
        fi
        echo "Waiting for service deletion... ($attempt/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    return 1
}

# Delete ECS services and tasks
echo "Cleaning up ECS resources..."
aws ecs list-services --cluster leftcurve-cluster --query 'serviceArns[]' --output text | while read -r service; do
    if [ ! -z "$service" ]; then
        echo "Deleting service: $service"
        service_name=$(echo "$service" | awk -F'/' '{print $NF}')
        aws ecs update-service --cluster leftcurve-cluster --service "$service_name" --desired-count 0 || true
        aws ecs delete-service --cluster leftcurve-cluster --service "$service_name" || true
        wait_for_service_deletion "leftcurve-cluster" "$service_name"
    fi
done

# Delete ECS cluster
echo "Deleting ECS cluster..."
aws ecs delete-cluster --cluster leftcurve-cluster || true

# Delete ECR repository
echo "Deleting ECR repository..."
aws ecr delete-repository --repository-name leftcurve-api --force || true

# Ensure CDK role exists before deleting stacks
echo "Ensuring CDK execution role exists..."
ensure_cdk_role

# Delete CloudFormation stacks
echo "Deleting CloudFormation stacks..."
for stack in "leftcurve-ecs" "leftcurve-db" "leftcurve-vpc" "leftcurve-security-groups" "CDKToolkit"; do
    echo "Attempting to delete stack: $stack"
    if aws cloudformation describe-stacks --stack-name "$stack" >/dev/null 2>&1; then
        aws cloudformation delete-stack --stack-name "$stack"
        echo "Waiting for stack deletion: $stack"
        aws cloudformation wait stack-delete-complete --stack-name "$stack"
    else
        echo "Stack $stack does not exist, skipping..."
    fi
done

# Delete Secrets Manager secret
echo "Deleting Secrets Manager secret..."
aws secretsmanager delete-secret --secret-id leftcurve/database --force-delete-without-recovery || true

# Clean up S3 bucket used by CDK
echo "Cleaning up CDK bootstrap bucket..."
BUCKET_NAME="cdk-hnb659fds-assets-${AWS_ACCOUNT_ID}-${AWS_DEFAULT_REGION}"

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Cleaning bucket contents..."
    aws s3api list-object-versions \
        --bucket "$BUCKET_NAME" \
        --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
        --output json | \
        aws s3api delete-objects \
            --bucket "$BUCKET_NAME" \
            --delete file:///dev/stdin || true

    aws s3api list-object-versions \
        --bucket "$BUCKET_NAME" \
        --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
        --output json | \
        aws s3api delete-objects \
            --bucket "$BUCKET_NAME" \
            --delete file:///dev/stdin || true

    echo "Deleting bucket..."
    aws s3 rb "s3://${BUCKET_NAME}" --force || true
else
    echo "Bucket does not exist, skipping..."
fi

echo "✨ Cleanup completed! You can now redeploy from scratch."
echo "To redeploy:"
echo "./scripts/deploy.sh"