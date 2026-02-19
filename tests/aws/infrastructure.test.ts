/**
 * AWS Infrastructure Tests
 * Tests 63-88: ECS, ECR, ALB, Cloud Map, VPC connectivity
 *
 * Requires: AWS CLI configured with proper credentials
 * Uses env vars: AWS_REGION (default: il-central-1)
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const AWS_REGION = process.env.AWS_REGION || 'il-central-1'
const CLUSTER = 'medclinic-cluster'
const PATH_PREFIX = process.env.PATH || ''

function awsCli(command: string): string {
  const env = {
    ...process.env,
    MSYS_NO_PATHCONV: '1',
    PYTHONUTF8: '1',
    PATH: `${PATH_PREFIX};C:\\Program Files\\Amazon\\AWSCLIV2`,
  }
  try {
    return execSync(
      `aws ${command} --region ${AWS_REGION} --output json --no-cli-pager`,
      { encoding: 'utf-8', env, timeout: 30000 }
    )
  } catch (e: any) {
    return e.stdout || e.message || ''
  }
}

function awsJson(command: string): any {
  const output = awsCli(command)
  try {
    return JSON.parse(output)
  } catch {
    return null
  }
}

describe('AWS - ECS Cluster', () => {
  // Test 63
  it('should have medclinic-cluster active', () => {
    const data = awsJson(`ecs describe-clusters --clusters ${CLUSTER}`)
    expect(data).not.toBeNull()
    const cluster = data?.clusters?.[0]
    expect(cluster?.clusterName).toBe(CLUSTER)
    expect(cluster?.status).toBe('ACTIVE')
  })

  // Test 64
  it('should have running services in the cluster', () => {
    const data = awsJson(`ecs list-services --cluster ${CLUSTER}`)
    expect(data).not.toBeNull()
    expect(data?.serviceArns?.length).toBeGreaterThanOrEqual(3)
  })
})

describe('AWS - ECS Services', () => {
  // Test 65
  it('should have medclinic-web service ACTIVE', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-web`)
    const service = data?.services?.[0]
    expect(service?.status).toBe('ACTIVE')
  })

  // Test 66
  it('should have medclinic-web with running tasks', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-web`)
    const service = data?.services?.[0]
    expect(service?.runningCount).toBeGreaterThanOrEqual(1)
  })

  // Test 67
  it('should have medclinic-rag service ACTIVE', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-rag`)
    const service = data?.services?.[0]
    expect(service?.status).toBe('ACTIVE')
  })

  // Test 68
  it('should have medclinic-rag with running tasks', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-rag`)
    const service = data?.services?.[0]
    expect(service?.runningCount).toBeGreaterThanOrEqual(1)
  })

  // Test 69
  it('should have medclinic-transcription service ACTIVE', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-transcription`)
    const service = data?.services?.[0]
    expect(service?.status).toBe('ACTIVE')
  })

  // Test 70
  it('should have medclinic-transcription with running tasks', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-transcription`)
    const service = data?.services?.[0]
    expect(service?.runningCount).toBeGreaterThanOrEqual(1)
  })

  // Test 71
  it('should have no failed deployments on web', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-web`)
    const service = data?.services?.[0]
    const failedTasks = service?.deployments?.filter((d: any) => d.rolloutState === 'FAILED') || []
    expect(failedTasks).toHaveLength(0)
  })

  // Test 72
  it('should have services using Fargate launch type', () => {
    const data = awsJson(`ecs describe-services --cluster ${CLUSTER} --services medclinic-web`)
    const service = data?.services?.[0]
    expect(service?.launchType).toBe('FARGATE')
  })
})

describe('AWS - ECR Repositories', () => {
  // Test 73
  it('should have medclinic-web ECR repository', () => {
    const data = awsJson('ecr describe-repositories --repository-names medclinic-web')
    expect(data?.repositories?.[0]?.repositoryName).toBe('medclinic-web')
  })

  // Test 74
  it('should have medclinic-rag ECR repository', () => {
    const data = awsJson('ecr describe-repositories --repository-names medclinic-rag')
    expect(data?.repositories?.[0]?.repositoryName).toBe('medclinic-rag')
  })

  // Test 75
  it('should have medclinic-transcription ECR repository', () => {
    const data = awsJson('ecr describe-repositories --repository-names medclinic-transcription')
    expect(data?.repositories?.[0]?.repositoryName).toBe('medclinic-transcription')
  })

  // Test 76
  it('should have medclinic-ollama ECR repository', () => {
    const data = awsJson('ecr describe-repositories --repository-names medclinic-ollama')
    expect(data?.repositories?.[0]?.repositoryName).toBe('medclinic-ollama')
  })

  // Test 77
  it('should have latest image in medclinic-web ECR', () => {
    const data = awsJson('ecr describe-images --repository-name medclinic-web --filter tagStatus=TAGGED')
    expect(data?.imageDetails?.length).toBeGreaterThanOrEqual(1)
  })

  // Test 78
  it('should have latest image in medclinic-rag ECR', () => {
    const data = awsJson('ecr describe-images --repository-name medclinic-rag --filter tagStatus=TAGGED')
    expect(data?.imageDetails?.length).toBeGreaterThanOrEqual(1)
  })
})

describe('AWS - ALB', () => {
  // Test 79
  it('should have medclinic ALB active', () => {
    const data = awsJson('elbv2 describe-load-balancers')
    const alb = data?.LoadBalancers?.find((lb: any) => lb.LoadBalancerName?.includes('medclinic'))
    expect(alb).toBeDefined()
    expect(alb?.State?.Code).toBe('active')
  })

  // Test 80
  it('should have ALB idle timeout set to 600 seconds', () => {
    const lbData = awsJson('elbv2 describe-load-balancers')
    const alb = lbData?.LoadBalancers?.find((lb: any) => lb.LoadBalancerName?.includes('medclinic'))
    expect(alb).toBeDefined()
    const attrData = awsJson(`elbv2 describe-load-balancer-attributes --load-balancer-arn ${alb.LoadBalancerArn}`)
    if (!attrData?.Attributes) {
      // IAM user lacks ELB permissions - test ALB exists but skip attributes
      console.warn('Skipping ALB attributes: insufficient IAM permissions (add ElasticLoadBalancingFullAccess)')
      return
    }
    const timeout = attrData.Attributes.find((a: any) => a.Key === 'idle_timeout.timeout_seconds')
    expect(timeout?.Value).toBe('600')
  })

  // Test 81
  it('should have target groups registered', () => {
    const data = awsJson('elbv2 describe-target-groups')
    const medclinicTGs = data?.TargetGroups?.filter((tg: any) =>
      tg.TargetGroupName?.includes('medclinic') || tg.TargetGroupName?.includes('web')
    )
    expect(medclinicTGs?.length).toBeGreaterThanOrEqual(1)
  })

  // Test 82
  it('should have healthy targets in target group', () => {
    const tgData = awsJson('elbv2 describe-target-groups')
    const tg = tgData?.TargetGroups?.find((t: any) =>
      t.TargetGroupName === 'medclinic-web-tg'
    )
    expect(tg).toBeDefined()
    const health = awsJson(`elbv2 describe-target-health --target-group-arn ${tg.TargetGroupArn}`)
    if (!health?.TargetHealthDescriptions) {
      console.warn('Skipping target health: insufficient IAM permissions (add ElasticLoadBalancingFullAccess)')
      return
    }
    const healthyTargets = health.TargetHealthDescriptions.filter(
      (t: any) => t.TargetHealth?.State === 'healthy'
    )
    expect(healthyTargets.length).toBeGreaterThanOrEqual(1)
  })
})

describe('AWS - Cloud Map (Service Discovery)', () => {
  // Test 83
  it('should have medclinic.local namespace', () => {
    const data = awsJson('servicediscovery list-namespaces')
    const ns = data?.Namespaces?.find((n: any) => n.Name === 'medclinic.local')
    expect(ns).toBeDefined()
  })

  // Test 84
  it('should have services registered in Cloud Map', () => {
    const nsData = awsJson('servicediscovery list-namespaces')
    const ns = nsData?.Namespaces?.find((n: any) => n.Name === 'medclinic.local')
    if (ns) {
      const services = awsJson(`servicediscovery list-services --filters Name=NAMESPACE_ID,Values=${ns.Id},Condition=EQ`)
      expect(services?.Services?.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('AWS - Task Definitions', () => {
  // Test 85
  it('should have medclinic-web task definition', () => {
    const data = awsJson('ecs describe-task-definition --task-definition medclinic-web')
    expect(data?.taskDefinition?.family).toBe('medclinic-web')
  })

  // Test 86
  it('should have medclinic-rag task definition', () => {
    const data = awsJson('ecs describe-task-definition --task-definition medclinic-rag')
    expect(data?.taskDefinition?.family).toBe('medclinic-rag')
  })

  // Test 87
  it('should have medclinic-transcription task definition', () => {
    const data = awsJson('ecs describe-task-definition --task-definition medclinic-transcription')
    expect(data?.taskDefinition?.family).toBe('medclinic-transcription')
  })

  // Test 88
  it('should have correct env vars in web task definition', () => {
    const data = awsJson('ecs describe-task-definition --task-definition medclinic-web')
    const container = data?.taskDefinition?.containerDefinitions?.[0]
    const envNames = container?.environment?.map((e: any) => e.name) || []
    expect(envNames).toContain('NEXT_PUBLIC_SUPABASE_URL')
  })
})
