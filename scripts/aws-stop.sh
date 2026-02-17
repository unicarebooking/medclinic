#!/bin/bash
# Stop all MedClinic services on AWS (scales to 0, no charges)
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
CLUSTER="medclinic-cluster"
REGION="il-central-1"

echo "Stopping MedClinic services..."

aws ecs update-service --cluster $CLUSTER --service medclinic-web --desired-count 0 --no-cli-pager --region $REGION --query "service.serviceName" --output text
aws ecs update-service --cluster $CLUSTER --service medclinic-rag --desired-count 0 --no-cli-pager --region $REGION --query "service.serviceName" --output text
aws ecs update-service --cluster $CLUSTER --service medclinic-transcription --desired-count 0 --no-cli-pager --region $REGION --query "service.serviceName" --output text

echo ""
echo "All services scaled to 0. No Fargate charges."
