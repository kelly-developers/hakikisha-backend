#!/bin/bash

# Hakikisha Backend AWS Deployment Script
set -e

echo "Starting AWS deployment..."

# Load environment variables
source .env

# Build Docker image
echo "Building Docker image..."
docker build -t hakikisha-backend:latest .

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push image
echo "Pushing image to ECR..."
docker tag hakikisha-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hakikisha-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hakikisha-backend:latest

# Update ECS service
echo "Updating ECS service..."
aws ecs update-service --cluster hakikisha-cluster --service hakikisha-service --force-new-deployment

echo "Deployment completed successfully!"