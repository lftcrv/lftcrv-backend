#!/bin/bash
set -e

# Define cleanup function
cleanup() {
    echo "🧹 Cleaning up resources..."
    docker buildx rm multiarch-builder 2>/dev/null || true
    rm -f build.log 2>/dev/null || true
}

# Enhanced error handling
handle_error() {
    local exit_code=$?
    echo "❌ Error occurred in script at line $1"
    cleanup
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR
trap cleanup EXIT

# Get the absolute path to the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
else
    echo "❌ Error: .env file not found in $PROJECT_ROOT"
    exit 1
fi

# Check required environment variables
required_vars=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_DEFAULT_REGION"
    "AWS_ACCOUNT_ID"
    "ENVIRONMENT"
    "DATABASE_NAME"
    "DATABASE_PORT"
    "API_KEY"
    "RATE_LIMIT"
    "RATE_LIMIT_WINDOW"
    "ECS_CONTAINER_MEMORY"
    "ECS_CONTAINER_CPU"
    "ECS_SERVICE_DESIRED_COUNT"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env file"
        exit 1
    fi
done

echo "🚀 Starting deployment process for environment: $ENVIRONMENT"

# Set AWS account ID for CDK
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_DEFAULT_REGION

# Construct ECR repository URI
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/leftcurve-api"

# Check if Docker daemon is running
echo "🔄 Checking Docker daemon..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running"
    exit 1
fi

# Create ECR repository if it doesn't exist
echo "🔄 Creating/verifying ECR repository..."
aws ecr describe-repositories --repository-names leftcurve-api || \
    aws ecr create-repository \
        --repository-name leftcurve-api \
        --region $AWS_DEFAULT_REGION \
        --image-tag-mutability MUTABLE \
        --image-scanning-configuration scanOnPush=true

# Login to ECR
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $AWS_DEFAULT_REGION | \
    docker login --username AWS --password-stdin "$ECR_REPO_URI"

# Build and push Docker image
echo "🏗️ Building Docker image..."
IMAGE_TAG=${GITHUB_SHA:-$(git rev-parse --short HEAD)}
FULL_IMAGE_URI="$ECR_REPO_URI:$IMAGE_TAG"
LATEST_IMAGE_URI="$ECR_REPO_URI:latest"

# Build the image
docker build -t $FULL_IMAGE_URI .
docker tag $FULL_IMAGE_URI $LATEST_IMAGE_URI

# Push images
echo "📤 Pushing images to ECR..."
docker push $FULL_IMAGE_URI
docker push $LATEST_IMAGE_URI

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

export API_KEY  #
# Deploy stacks
echo "Deploying CDK stacks..."
pnpm cdk deploy LeftCurveVpcStack \
    LeftCurveSecurityGroupStack \
    LeftCurveDbStack \
    LeftCurveEcsStack \
    --require-approval never

# Run migrations and update service
if [ $? -eq 0 ]; then
    echo "🔄 Running database migrations..."
    TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
        --task-definition leftcurve-migration-task \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)

    NETWORK_CONFIG=$(aws ecs describe-services \
        --cluster leftcurve-cluster \
        --services leftcurve-service \
        --query 'services[0].networkConfiguration.awsvpcConfiguration' \
        --output json)

    SUBNET_ID=$(echo "$NETWORK_CONFIG" | jq -r '.subnets[0]')
    SG_ID=$(echo "$NETWORK_CONFIG" | jq -r '.securityGroups[0]')

    aws ecs run-task \
        --cluster leftcurve-cluster \
        --task-definition "$TASK_DEFINITION_ARN" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}"

    echo "🔄 Updating ECS service..."
    aws ecs update-service \
        --cluster leftcurve-cluster \
        --service leftcurve-service \
        --force-new-deployment

    echo "✅ Deployment completed successfully!"
    echo "Deployment time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Image tag: $IMAGE_TAG"
    echo "Repository: $ECR_REPO_URI"
else
    echo "❌ Stack deployment failed"
    exit 1
fi