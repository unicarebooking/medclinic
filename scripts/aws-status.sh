#!/bin/bash
# Check MedClinic services status and get URL
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
CLUSTER="medclinic-cluster"
REGION="il-central-1"

echo "=== MedClinic Service Status ==="
echo ""

aws ecs describe-services \
  --cluster $CLUSTER \
  --services medclinic-web medclinic-rag medclinic-transcription \
  --region $REGION \
  --query "services[*].{Service:serviceName,Running:runningCount,Desired:desiredCount}" \
  --output table

echo ""
echo "=== Access URL ==="
echo "http://medclinic-alb-789263220.il-central-1.elb.amazonaws.com"
echo ""
