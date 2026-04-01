/**
 * Pre-extracted provider schemas for common AWS, GCP, and Azure resources.
 * These allow client-side validation of resource attributes without the Terraform binary.
 */

export interface AttributeSchema {
  type: 'string' | 'number' | 'bool' | 'list' | 'map' | 'set' | 'any';
  required?: boolean;
  description?: string;
  validValues?: string[];
}

export interface ResourceSchema {
  provider: string;
  description: string;
  attributes: Record<string, AttributeSchema>;
}

// Curated schemas for the most common resource types
export const RESOURCE_SCHEMAS: Record<string, ResourceSchema> = {
  // --- AWS ---
  aws_instance: {
    provider: 'aws',
    description: 'EC2 Instance',
    attributes: {
      ami: { type: 'string', required: true, description: 'AMI ID' },
      instance_type: { type: 'string', required: true, description: 'Instance type' },
      subnet_id: { type: 'string', description: 'VPC Subnet ID' },
      vpc_security_group_ids: { type: 'list', description: 'Security group IDs' },
      key_name: { type: 'string', description: 'Key pair name' },
      tags: { type: 'map', description: 'Resource tags' },
      iam_instance_profile: { type: 'string', description: 'IAM instance profile' },
      user_data: { type: 'string', description: 'User data script' },
      availability_zone: { type: 'string', description: 'AZ' },
      associate_public_ip_address: { type: 'bool', description: 'Associate public IP' },
    },
  },
  aws_vpc: {
    provider: 'aws',
    description: 'VPC',
    attributes: {
      cidr_block: { type: 'string', required: true, description: 'CIDR block' },
      enable_dns_hostnames: { type: 'bool', description: 'Enable DNS hostnames' },
      enable_dns_support: { type: 'bool', description: 'Enable DNS support' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_subnet: {
    provider: 'aws',
    description: 'VPC Subnet',
    attributes: {
      vpc_id: { type: 'string', required: true, description: 'VPC ID' },
      cidr_block: { type: 'string', required: true, description: 'CIDR block' },
      availability_zone: { type: 'string', description: 'Availability zone' },
      map_public_ip_on_launch: { type: 'bool', description: 'Auto-assign public IP' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_security_group: {
    provider: 'aws',
    description: 'Security Group',
    attributes: {
      name: { type: 'string', description: 'Name' },
      name_prefix: { type: 'string', description: 'Name prefix' },
      vpc_id: { type: 'string', required: true, description: 'VPC ID' },
      description: { type: 'string', description: 'Description' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_s3_bucket: {
    provider: 'aws',
    description: 'S3 Bucket',
    attributes: {
      bucket: { type: 'string', description: 'Bucket name' },
      bucket_prefix: { type: 'string', description: 'Bucket name prefix' },
      tags: { type: 'map', description: 'Resource tags' },
      force_destroy: { type: 'bool', description: 'Allow bucket destruction with objects' },
    },
  },
  aws_db_instance: {
    provider: 'aws',
    description: 'RDS Database Instance',
    attributes: {
      engine: { type: 'string', required: true, description: 'Database engine', validValues: ['postgres', 'mysql', 'mariadb', 'oracle-ee', 'sqlserver-ee', 'aurora', 'aurora-mysql', 'aurora-postgresql'] },
      instance_class: { type: 'string', required: true, description: 'Instance class' },
      allocated_storage: { type: 'number', description: 'Storage size (GB)' },
      engine_version: { type: 'string', description: 'Engine version' },
      identifier: { type: 'string', description: 'Identifier' },
      username: { type: 'string', description: 'Master username' },
      password: { type: 'string', description: 'Master password' },
      db_name: { type: 'string', description: 'Database name' },
      skip_final_snapshot: { type: 'bool', description: 'Skip final snapshot' },
      multi_az: { type: 'bool', description: 'Multi-AZ deployment' },
      storage_encrypted: { type: 'bool', description: 'Enable encryption' },
      vpc_security_group_ids: { type: 'list', description: 'Security group IDs' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_iam_role: {
    provider: 'aws',
    description: 'IAM Role',
    attributes: {
      name: { type: 'string', description: 'Role name' },
      name_prefix: { type: 'string', description: 'Role name prefix' },
      assume_role_policy: { type: 'string', required: true, description: 'Trust policy JSON' },
      description: { type: 'string', description: 'Description' },
      max_session_duration: { type: 'number', description: 'Max session duration' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_iam_role_policy: {
    provider: 'aws',
    description: 'IAM Role Policy',
    attributes: {
      name: { type: 'string', description: 'Policy name' },
      role: { type: 'string', required: true, description: 'Role ID' },
      policy: { type: 'string', required: true, description: 'Policy JSON' },
    },
  },
  aws_elasticache_replication_group: {
    provider: 'aws',
    description: 'ElastiCache Replication Group',
    attributes: {
      replication_group_id: { type: 'string', required: true, description: 'Replication group ID' },
      description: { type: 'string', required: true, description: 'Description' },
      node_type: { type: 'string', required: true, description: 'Node type' },
      num_cache_clusters: { type: 'number', description: 'Number of cache clusters' },
      engine_version: { type: 'string', description: 'Engine version' },
      port: { type: 'number', description: 'Port' },
      subnet_group_name: { type: 'string', description: 'Subnet group name' },
      security_group_ids: { type: 'list', description: 'Security group IDs' },
      automatic_failover_enabled: { type: 'bool', description: 'Enable automatic failover' },
      at_rest_encryption_enabled: { type: 'bool', description: 'Enable encryption at rest' },
      transit_encryption_enabled: { type: 'bool', description: 'Enable transit encryption' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  aws_elasticache_subnet_group: {
    provider: 'aws',
    description: 'ElastiCache Subnet Group',
    attributes: {
      name: { type: 'string', required: true, description: 'Name' },
      subnet_ids: { type: 'list', required: true, description: 'Subnet IDs' },
      description: { type: 'string', description: 'Description' },
    },
  },
  aws_lambda_function: {
    provider: 'aws',
    description: 'Lambda Function',
    attributes: {
      function_name: { type: 'string', required: true, description: 'Function name' },
      role: { type: 'string', required: true, description: 'IAM role ARN' },
      handler: { type: 'string', description: 'Handler' },
      runtime: { type: 'string', description: 'Runtime', validValues: ['nodejs20.x', 'nodejs18.x', 'python3.12', 'python3.11', 'python3.10', 'java21', 'java17', 'go1.x', 'dotnet8', 'ruby3.3'] },
      filename: { type: 'string', description: 'Deployment package path' },
      s3_bucket: { type: 'string', description: 'S3 bucket for deployment package' },
      memory_size: { type: 'number', description: 'Memory (MB)' },
      timeout: { type: 'number', description: 'Timeout (seconds)' },
      tags: { type: 'map', description: 'Resource tags' },
    },
  },
  // --- GCP ---
  google_compute_network: {
    provider: 'google',
    description: 'VPC Network',
    attributes: {
      name: { type: 'string', required: true, description: 'Network name' },
      auto_create_subnetworks: { type: 'bool', description: 'Auto-create subnetworks' },
      project: { type: 'string', description: 'Project ID' },
    },
  },
  google_compute_subnetwork: {
    provider: 'google',
    description: 'VPC Subnetwork',
    attributes: {
      name: { type: 'string', required: true, description: 'Subnet name' },
      network: { type: 'string', required: true, description: 'Network ID' },
      ip_cidr_range: { type: 'string', required: true, description: 'CIDR range' },
      region: { type: 'string', required: true, description: 'Region' },
      project: { type: 'string', description: 'Project ID' },
    },
  },
  google_container_cluster: {
    provider: 'google',
    description: 'GKE Cluster',
    attributes: {
      name: { type: 'string', required: true, description: 'Cluster name' },
      location: { type: 'string', required: true, description: 'Location (zone or region)' },
      network: { type: 'string', description: 'VPC network' },
      subnetwork: { type: 'string', description: 'VPC subnetwork' },
      initial_node_count: { type: 'number', description: 'Initial node count' },
      remove_default_node_pool: { type: 'bool', description: 'Remove default pool' },
      project: { type: 'string', description: 'Project ID' },
    },
  },
  google_container_node_pool: {
    provider: 'google',
    description: 'GKE Node Pool',
    attributes: {
      name: { type: 'string', required: true, description: 'Pool name' },
      cluster: { type: 'string', required: true, description: 'Cluster name' },
      location: { type: 'string', required: true, description: 'Location' },
      node_count: { type: 'number', description: 'Node count' },
      project: { type: 'string', description: 'Project ID' },
    },
  },
  // --- Kubernetes ---
  kubernetes_namespace: {
    provider: 'kubernetes',
    description: 'Kubernetes Namespace',
    attributes: {},
  },
};

export function getSchemaForType(resourceType: string): ResourceSchema | null {
  return RESOURCE_SCHEMAS[resourceType] ?? null;
}
