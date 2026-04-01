/**
 * Pricing lookup — uses real AWS pricing data fetched at build time,
 * with static fallbacks for GCP, OpenStack, and unknown types.
 */

import awsPricing from './aws-pricing.json';

export interface PriceEntry {
  monthlyCost: number;
  unit: string;
  note?: string;
}

// Map Terraform resource types to the pricing category they belong to
const RESOURCE_CATEGORY: Record<string, 'compute' | 'rds' | 'cache' | 'managed' | 'free'> = {
  aws_instance: 'compute',
  aws_db_instance: 'rds',
  aws_rds_cluster: 'rds',
  aws_elasticache_replication_group: 'cache',
  aws_elasticache_cluster: 'cache',
  aws_eks_cluster: 'managed',
  aws_eks_node_group: 'compute',
  aws_nat_gateway: 'managed',
  aws_lambda_function: 'managed',
  aws_s3_bucket: 'managed',
  aws_dynamodb_table: 'managed',
  aws_sqs_queue: 'managed',
  aws_sns_topic: 'managed',
  aws_ecr_repository: 'managed',
  aws_route53_zone: 'managed',
  aws_cloudfront_distribution: 'managed',
  aws_lb: 'managed',
  aws_eip: 'managed',
  // Free resources
  aws_vpc: 'free',
  aws_subnet: 'free',
  aws_security_group: 'free',
  aws_iam_role: 'free',
  aws_iam_role_policy: 'free',
  aws_iam_policy: 'free',
  aws_elasticache_subnet_group: 'free',
  aws_lb_target_group: 'free',
  aws_route53_record: 'free',
  aws_s3_bucket_server_side_encryption_configuration: 'free',
  aws_s3_bucket_public_access_block: 'free',
  aws_s3_bucket_versioning: 'free',
  aws_s3_bucket_lifecycle_configuration: 'free',
};

// Managed service fixed monthly costs
const MANAGED_COSTS: Record<string, PriceEntry> = {
  aws_eks_cluster: { monthlyCost: (awsPricing as any).managed?.eks_control_plane ?? 73, unit: '/cluster', note: 'EKS control plane' },
  aws_nat_gateway: { monthlyCost: (awsPricing as any).managed?.nat_gateway ?? 32.4, unit: '/gateway', note: '$0.045/hr + data' },
  aws_lambda_function: { monthlyCost: 5, unit: '/function', note: '~1M requests/mo estimate' },
  aws_s3_bucket: { monthlyCost: 2, unit: '/bucket', note: `$${(awsPricing as any).managed?.s3_standard_per_gb ?? 0.023}/GB standard` },
  aws_dynamodb_table: { monthlyCost: 7, unit: '/table', note: 'On-demand, 1M reads/mo' },
  aws_sqs_queue: { monthlyCost: 1, unit: '/queue', note: '~1M requests/mo' },
  aws_sns_topic: { monthlyCost: 0.5, unit: '/topic' },
  aws_ecr_repository: { monthlyCost: 1, unit: '/repo', note: '~10GB storage' },
  aws_route53_zone: { monthlyCost: (awsPricing as any).managed?.route53_hosted_zone ?? 0.5, unit: '/zone' },
  aws_cloudfront_distribution: { monthlyCost: 10, unit: '/dist', note: 'Depends on traffic' },
  aws_lb: { monthlyCost: 22, unit: '/lb', note: 'ALB base cost' },
  aws_eip: { monthlyCost: 3.6, unit: '/ip', note: 'If unattached' },
};

// Static fallback for GCP / OpenStack / unknown providers
const STATIC_FALLBACK: Record<string, PriceEntry> = {
  // GCP
  google_compute_instance: { monthlyCost: 35, unit: '/instance', note: 'e2-medium estimate' },
  google_compute_network: { monthlyCost: 0, unit: '', note: 'No cost' },
  google_compute_subnetwork: { monthlyCost: 0, unit: '', note: 'No cost' },
  google_container_cluster: { monthlyCost: 73, unit: '/cluster', note: 'Control plane' },
  google_container_node_pool: { monthlyCost: 100, unit: '/pool', note: 'Depends on machine type' },
  google_sql_database_instance: { monthlyCost: 50, unit: '/instance', note: 'db-f1-micro estimate' },
  google_storage_bucket: { monthlyCost: 2, unit: '/bucket' },
  // OpenStack
  openstack_compute_instance_v2: { monthlyCost: 40, unit: '/instance' },
  openstack_networking_router_v2: { monthlyCost: 5, unit: '/router' },
  openstack_networking_floatingip_v2: { monthlyCost: 3, unit: '/ip' },
  openstack_lb_loadbalancer_v2: { monthlyCost: 20, unit: '/lb' },
  openstack_blockstorage_volume_v3: { monthlyCost: 10, unit: '/100GB' },
  openstack_db_instance_v1: { monthlyCost: 50, unit: '/instance' },
  openstack_objectstorage_container_v1: { monthlyCost: 2, unit: '/container' },
};

const computeData = (awsPricing as any).compute as Record<string, { h: number; m: number; v: number; mem: number }> ?? {};
const rdsData = (awsPricing as any).rds as Record<string, { h: number; m: number; v: number; mem: number }> ?? {};
const cacheData = (awsPricing as any).cache as Record<string, { h: number; m: number; v: number; mem: number }> ?? {};

export function lookupCost(resourceType: string, attributes: Record<string, string>): PriceEntry | null {
  const category = RESOURCE_CATEGORY[resourceType];

  // Free resources
  if (category === 'free') {
    return { monthlyCost: 0, unit: '', note: 'No cost' };
  }

  // Managed services with fixed costs
  if (category === 'managed') {
    return MANAGED_COSTS[resourceType] ?? null;
  }

  // Instance-based resources — look up by instance type
  const instanceType = attributes.instance_type || attributes.instance_class ||
    attributes.node_type || attributes.flavor_name || attributes.machine_type ||
    attributes.flavor || '';
  const cleanType = instanceType.replace(/^"/, '').replace(/"$/, '');

  // Skip interpolated values
  if (cleanType.includes('${') || cleanType.startsWith('var.') || cleanType.includes('?')) {
    return STATIC_FALLBACK[resourceType] ?? null;
  }

  if (category === 'compute' && cleanType && computeData[cleanType]) {
    const d = computeData[cleanType];
    return { monthlyCost: d.m, unit: '/instance', note: `${cleanType} (${d.v}vCPU, ${d.mem}GB)` };
  }

  if (category === 'rds' && cleanType && rdsData[cleanType]) {
    const d = rdsData[cleanType];
    return { monthlyCost: d.m, unit: '/instance', note: `${cleanType} (${d.v}vCPU, ${d.mem}GB)` };
  }

  if (category === 'cache' && cleanType && cacheData[cleanType]) {
    const d = cacheData[cleanType];
    return { monthlyCost: d.m, unit: '/node', note: `${cleanType} (${d.v}vCPU, ${d.mem}GB)` };
  }

  // Count multiplier
  const count = attributes.count ? parseInt(attributes.count, 10) : 1;

  // Fallback to static
  const fallback = STATIC_FALLBACK[resourceType];
  if (fallback) {
    return count > 1
      ? { ...fallback, monthlyCost: fallback.monthlyCost * count, note: `${count}x ${fallback.note ?? resourceType}` }
      : fallback;
  }

  return null;
}
