# Task Definitions - MedClinic AWS ECS

קבצי Task Definition עבור כל שירותי המערכת ב-AWS ECS Fargate.

## שירותים

| קובץ | שירות | CPU | Memory | Port |
|---|---|---|---|---|
| `medclinic-web.json` | Next.js Frontend | 1024 | 2048 MB | 3000 |
| `medclinic-rag.json` | RAG Server (FastAPI + Ollama) | 1024 | 2048 MB | 8001 |
| `medclinic-transcription.json` | Transcription Service (Whisper) | 1024 | 2048 MB | 8000 |
| `medclinic-ollama.json` | Ollama LLM Engine | 2048 | 8192 MB | 11434 |

## Placeholders ב-CI/CD

הקבצים מכילים placeholders שמוחלפים אוטומטית ב-GitHub Actions:

| Placeholder | מוחלף ב | מקור |
|---|---|---|
| `AWS_ACCOUNT_ID` | מספר החשבון | GitHub Secret: `AWS_ACCOUNT_ID` |
| `ECR_IMAGE_TAG` | ה-SHA של ה-commit | `github.sha` |
| `fs-XXXXXXXX` | EFS File System ID | GitHub Secret: `EFS_FILE_SYSTEM_ID` |
| `fsap-UPLOADS` | EFS Access Point להעלאות | GitHub Secret: `EFS_AP_UPLOADS` |
| `fsap-OUTPUTS` | EFS Access Point לתוצרים | GitHub Secret: `EFS_AP_OUTPUTS` |

---

## הגדרת EFS (חובה לפני הפריסה הראשונה)

### שלב 1: יצירת EFS File System

```bash
export REGION=il-central-1

EFS_ID=$(aws efs create-file-system \
  --region $REGION \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=medclinic-transcription-storage \
  --query "FileSystemId" --output text)

echo "EFS ID: $EFS_ID"
```

### שלב 2: מצא את ה-VPC וה-Subnets של ה-ECS Cluster

```bash
# מצא את ה-VPC של ה-cluster (דרך ה-security groups)
aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=*medclinic*" \
  --region $REGION \
  --query "Subnets[*].{ID:SubnetId,AZ:AvailabilityZone}" \
  --output table

# מצא את ה-Security Group של ה-ECS tasks
aws ecs describe-services \
  --cluster medclinic-cluster \
  --services medclinic-transcription \
  --region $REGION \
  --query "services[0].networkConfiguration.awsvpcConfiguration" \
  --output json
```

### שלב 3: צור Security Group ל-EFS (אם אין)

```bash
# מצא את ה-VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=false" \
  --region $REGION \
  --query "Vpcs[0].VpcId" --output text)

# צור Security Group ל-EFS
EFS_SG=$(aws ec2 create-security-group \
  --group-name medclinic-efs-sg \
  --description "Security group for MedClinic EFS" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query "GroupId" --output text)

# אפשר NFS (port 2049) מה-ECS tasks
ECS_SG="sg-XXXXXXXXXX"  # החלף ב-Security Group של ה-ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $EFS_SG \
  --protocol tcp --port 2049 \
  --source-group $ECS_SG \
  --region $REGION
```

### שלב 4: צור Mount Targets בכל Subnet

```bash
# חזור על זה לכל subnet שב-ECS cluster
for SUBNET_ID in subnet-XXXXXXXX subnet-YYYYYYYY; do
  aws efs create-mount-target \
    --file-system-id $EFS_ID \
    --subnet-id $SUBNET_ID \
    --security-groups $EFS_SG \
    --region $REGION
done

# המתן ל-available status
aws efs describe-mount-targets \
  --file-system-id $EFS_ID \
  --region $REGION \
  --query "MountTargets[*].{State:LifeCycleState,Subnet:SubnetId}" \
  --output table
```

### שלב 5: צור Access Points

```bash
# Access Point עבור uploads
AP_UPLOADS=$(aws efs create-access-point \
  --file-system-id $EFS_ID \
  --posix-user Uid=1000,Gid=1000 \
  --root-directory "Path=/uploads,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" \
  --tags Key=Name,Value=transcription-uploads \
  --region $REGION \
  --query "AccessPointId" --output text)

echo "AP Uploads: $AP_UPLOADS"

# Access Point עבור outputs
AP_OUTPUTS=$(aws efs create-access-point \
  --file-system-id $EFS_ID \
  --posix-user Uid=1000,Gid=1000 \
  --root-directory "Path=/outputs,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=755}" \
  --tags Key=Name,Value=transcription-outputs \
  --region $REGION \
  --query "AccessPointId" --output text)

echo "AP Outputs: $AP_OUTPUTS"
```

### שלב 6: הוסף GitHub Secrets

הוסף את הערכים הבאים ב-GitHub → Settings → Secrets and variables → Actions:

| Secret Name | ערך |
|---|---|
| `EFS_FILE_SYSTEM_ID` | הערך של `$EFS_ID` (מדרגה 1) |
| `EFS_AP_UPLOADS` | הערך של `$AP_UPLOADS` (מדרגה 5) |
| `EFS_AP_OUTPUTS` | הערך של `$AP_OUTPUTS` (מדרגה 5) |

---

## GitHub Secrets נדרשים (רשימה מלאה)

| Secret | תיאור |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_ACCOUNT_ID` | מספר חשבון AWS (12 ספרות) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EFS_FILE_SYSTEM_ID` | EFS file system ID (fs-XXXXXXXX) |
| `EFS_AP_UPLOADS` | EFS access point for uploads (fsap-XXXXXXXX) |
| `EFS_AP_OUTPUTS` | EFS access point for outputs (fsap-XXXXXXXX) |
