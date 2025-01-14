#!/bin/bash
set -e

# Function to check stack status
check_stack_status() {
    local stack_name=$1
    local status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "STACK_NOT_FOUND")
    echo $status
}

# Function to wait for stack to be ready
wait_for_stack() {
    local stack_name=$1
    local max_attempts=30
    local attempt=1
    
    echo "Checking status of stack: $stack_name"
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(check_stack_status "$stack_name")
        echo "Current status: $status"
        
        case $status in
            *_COMPLETE)
                echo "Stack $stack_name is ready"
                return 0
                ;;
            *_IN_PROGRESS)
                echo "Stack $stack_name is still in progress. Waiting... ($attempt/$max_attempts)"
                sleep 30
                ;;
            STACK_NOT_FOUND)
                echo "Stack $stack_name not found"
                return 0
                ;;
            *)
                echo "Stack $stack_name is in state $status"
                return 1
                ;;
        esac
        
        attempt=$((attempt + 1))
    done
    
    echo "Timeout waiting for stack $stack_name"
    return 1
}

# Get the absolute path to the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    echo "Error: .env file not found in $PROJECT_ROOT"
    exit 1
fi

# Check required environment variables
required_vars=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_DEFAULT_REGION"
    "AWS_ACCOUNT_ID"
    "ENVIRONMENT"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set in .env file"
        exit 1
    fi
done

echo "🚀 Starting deployment process for environment: $ENVIRONMENT"

# Set AWS account ID for CDK
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_DEFAULT_REGION

# Deploy infrastructure
echo "📦 Deploying infrastructure..."
cd "$PROJECT_ROOT/infrastructure"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing infrastructure dependencies..."
    pnpm install
fi

# Build TypeScript files
echo "Building TypeScript files..."
pnpm run build

# Bootstrap CDK if needed
echo "Bootstrapping CDK..."
pnpm cdk bootstrap "aws://${AWS_ACCOUNT_ID}/${AWS_DEFAULT_REGION}" || true

# Wait for stacks to be ready
echo "Checking stack statuses..."
for stack in "leftcurve-vpc" "leftcurve-db" "leftcurve-ecs"; do
    if ! wait_for_stack "$stack"; then
        echo "Error: Stack $stack is in a failed state"
        exit 1
    fi
done

# Deploy all stacks
echo "Deploying CDK stacks..."
pnpm cdk deploy --all --require-approval never

cd "$PROJECT_ROOT"

echo "🏗️ Building Docker image..."
docker build -t leftcurve-api:latest .

# Construct ECR repository URI
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/leftcurve-api"
echo "Using ECR Repository URI: $ECR_REPO_URI"

# Create ECR repository if it doesn't exist
aws ecr describe-repositories --repository-names leftcurve-api || \
    aws ecr create-repository --repository-name leftcurve-api

echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_DEFAULT_REGION | \
    docker login --username AWS --password-stdin "$ECR_REPO_URI"

# Tag and push the image
echo "📤 Pushing image to ECR..."
IMAGE_TAG=${GITHUB_SHA:-$(git rev-parse --short HEAD)}
docker tag leftcurve-api:latest "$ECR_REPO_URI:$IMAGE_TAG"
docker tag leftcurve-api:latest "$ECR_REPO_URI:latest"
docker push "$ECR_REPO_URI:$IMAGE_TAG"
docker push "$ECR_REPO_URI:latest"

# Wait for ECS stack to be ready before running migrations
wait_for_stack "leftcurve-ecs"

echo "🔄 Running database migrations..."
SUBNET_ID=$(aws ec2 describe-subnets \
    --filters Name=tag:Name,Values='*Private*' \
    --query 'Subnets[0].SubnetId' \
    --output text)

SG_ID=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values='*ECSSecurityGroup*' \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

aws ecs run-task \
    --cluster leftcurve-cluster \
    --task-definition leftcurve-migration-task \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}"

echo "⏳ Waiting for migrations to complete..."
sleep 30

echo "🔄 Updating ECS service..."
aws ecs update-service \
    --cluster leftcurve-cluster \
    --service leftcurve-service \
    --force-new-deployment

echo "✅ Deployment completed successfully!"