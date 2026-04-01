/**
 * Static pricing data for common AWS/GCP resources.
 * Prices are rough estimates in USD/month for the default/smallest config.
 */

export interface PriceEntry {
  monthlyCost: number;
  unit: string;
  note?: string;
}

// Resource type -> base monthly cost
// These are ballpark figures for us-east-1/us-central1 defaults
const PRICING: Record<string, PriceEntry> = {
  // AWS EC2
  'aws_instance': { monthlyCost: 30, unit: '/instance', note: 't3.medium default estimate' },
  // AWS RDS
  'aws_db_instance': { monthlyCost: 50, unit: '/instance', note: 'db.t3.micro + 20GB' },
  // AWS S3
  'aws_s3_bucket': { monthlyCost: 2, unit: '/bucket', note: 'Storage + requests' },
  // AWS ElastiCache
  'aws_elasticache_replication_group': { monthlyCost: 45, unit: '/group', note: 'cache.t3.micro' },
  'aws_elasticache_cluster': { monthlyCost: 25, unit: '/node', note: 'cache.t3.micro' },
  'aws_elasticache_subnet_group': { monthlyCost: 0, unit: '', note: 'No cost' },
  // AWS VPC
  'aws_vpc': { monthlyCost: 0, unit: '', note: 'No cost for VPC itself' },
  'aws_subnet': { monthlyCost: 0, unit: '', note: 'No cost' },
  'aws_security_group': { monthlyCost: 0, unit: '', note: 'No cost' },
  'aws_nat_gateway': { monthlyCost: 45, unit: '/gateway', note: '$0.045/hr + data' },
  'aws_eip': { monthlyCost: 3.6, unit: '/ip', note: 'If unattached' },
  // AWS IAM
  'aws_iam_role': { monthlyCost: 0, unit: '', note: 'No cost' },
  'aws_iam_role_policy': { monthlyCost: 0, unit: '', note: 'No cost' },
  'aws_iam_policy': { monthlyCost: 0, unit: '', note: 'No cost' },
  // AWS Lambda
  'aws_lambda_function': { monthlyCost: 5, unit: '/function', note: '1M requests/mo estimate' },
  // AWS ECS/EKS
  'aws_ecs_service': { monthlyCost: 0, unit: '', note: 'Cost depends on tasks' },
  'aws_eks_cluster': { monthlyCost: 73, unit: '/cluster', note: '$0.10/hr control plane' },
  'aws_eks_node_group': { monthlyCost: 100, unit: '/group', note: 'Depends on instance type' },
  // AWS ALB/NLB
  'aws_lb': { monthlyCost: 22, unit: '/lb', note: 'ALB base cost' },
  'aws_lb_target_group': { monthlyCost: 0, unit: '', note: 'No cost' },
  // AWS Route53
  'aws_route53_zone': { monthlyCost: 0.5, unit: '/zone' },
  'aws_route53_record': { monthlyCost: 0, unit: '', note: 'Included in zone' },
  // AWS CloudFront
  'aws_cloudfront_distribution': { monthlyCost: 10, unit: '/dist', note: 'Depends on traffic' },
  // AWS SQS/SNS
  'aws_sqs_queue': { monthlyCost: 1, unit: '/queue', note: '1M requests/mo' },
  'aws_sns_topic': { monthlyCost: 0.5, unit: '/topic' },
  // AWS DynamoDB
  'aws_dynamodb_table': { monthlyCost: 7, unit: '/table', note: 'On-demand, 1M reads/mo' },
  // AWS ECR
  'aws_ecr_repository': { monthlyCost: 1, unit: '/repo', note: '10GB storage' },

  // GCP
  'google_compute_instance': { monthlyCost: 35, unit: '/instance', note: 'e2-medium' },
  'google_compute_network': { monthlyCost: 0, unit: '', note: 'No cost' },
  'google_compute_subnetwork': { monthlyCost: 0, unit: '', note: 'No cost' },
  'google_compute_firewall': { monthlyCost: 0, unit: '', note: 'No cost' },
  'google_container_cluster': { monthlyCost: 73, unit: '/cluster', note: 'Control plane' },
  'google_container_node_pool': { monthlyCost: 100, unit: '/pool', note: 'Depends on machine type' },
  'google_sql_database_instance': { monthlyCost: 50, unit: '/instance', note: 'db-f1-micro' },
  'google_storage_bucket': { monthlyCost: 2, unit: '/bucket' },
  'google_cloud_run_service': { monthlyCost: 5, unit: '/service' },
  'google_pubsub_topic': { monthlyCost: 1, unit: '/topic' },

  // OpenStack (rough estimates based on typical hosting)
  'openstack_compute_instance_v2': { monthlyCost: 40, unit: '/instance' },
  'openstack_networking_network_v2': { monthlyCost: 0, unit: '', note: 'No cost' },
  'openstack_networking_subnet_v2': { monthlyCost: 0, unit: '', note: 'No cost' },
  'openstack_networking_router_v2': { monthlyCost: 5, unit: '/router' },
  'openstack_networking_floatingip_v2': { monthlyCost: 3, unit: '/ip' },
  'openstack_lb_loadbalancer_v2': { monthlyCost: 20, unit: '/lb' },
  'openstack_blockstorage_volume_v3': { monthlyCost: 10, unit: '/100GB' },
  'openstack_db_instance_v1': { monthlyCost: 50, unit: '/instance' },
  'openstack_containerinfra_cluster_v1': { monthlyCost: 0, unit: '', note: 'Pay for nodes only' },
  'openstack_objectstorage_container_v1': { monthlyCost: 2, unit: '/container' },
};

// Instance type cost overrides (monthly)
const INSTANCE_COSTS: Record<string, number> = {
  // AWS
  't2.micro': 8, 't2.small': 17, 't2.medium': 34, 't3.micro': 7.5, 't3.small': 15, 't3.medium': 30,
  'm5.large': 70, 'm5.xlarge': 140, 'm5.2xlarge': 281, 'm6i.large': 70, 'm6i.xlarge': 140,
  'r5.large': 91, 'r5.xlarge': 182, 'r6i.large': 91, 'r6i.xlarge': 182,
  'c5.large': 62, 'c5.xlarge': 124, 'g5.xlarge': 764, 'g5.2xlarge': 916,
  'db.t3.micro': 12, 'db.t3.small': 24, 'db.t3.medium': 49, 'db.t4g.medium': 47,
  'db.r6g.large': 166, 'db.r6g.xlarge': 332,
  'cache.t3.micro': 12, 'cache.t3.small': 24, 'cache.t4g.small': 23,
  'cache.r6g.large': 131,
  // GCP
  'e2-micro': 6, 'e2-small': 12, 'e2-medium': 24, 'e2-standard-2': 49, 'e2-standard-4': 97,
  'n2-standard-2': 58, 'n2-standard-4': 116,
};

export function lookupCost(resourceType: string, attributes: Record<string, string>): PriceEntry | null {
  const base = PRICING[resourceType];
  if (!base) return null;

  let cost = base.monthlyCost;
  let note = base.note;

  // Try to refine cost based on instance_type/flavor attributes
  const instanceType = attributes.instance_type || attributes.instance_class || attributes.node_type ||
    attributes.flavor_name || attributes.machine_type || attributes.flavor || '';
  const cleanType = instanceType.replace(/^"/, '').replace(/"$/, '');

  if (cleanType && INSTANCE_COSTS[cleanType]) {
    cost = INSTANCE_COSTS[cleanType];
    note = cleanType;
  }

  // Count multiplier
  const count = attributes.count ? parseInt(attributes.count, 10) : 1;
  if (count > 1) {
    cost *= count;
    note = `${count}x ${note || resourceType}`;
  }

  return { monthlyCost: cost, unit: base.unit, note };
}
