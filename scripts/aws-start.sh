#!/bin/bash
# Start all MedClinic services on AWS
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
CLUSTER="medclinic-cluster"
REGION="il-central-1"

echo "Starting MedClinic services..."

aws ecs update-service --cluster $CLUSTER --service medclinic-web --desired-count 1 --no-cli-pager --region $REGION --query "service.serviceName" --output text
aws ecs update-service --cluster $CLUSTER --service medclinic-rag --desired-count 1 --no-cli-pager --region $REGION --query "service.serviceName" --output text
aws ecs update-service --cluster $CLUSTER --service medclinic-transcription --desired-count 1 --no-cli-pager --region $REGION --query "service.serviceName" --output text

echo ""
echo "Services starting... Wait ~60 seconds then run:"
echo "  bash scripts/aws-status.sh"
