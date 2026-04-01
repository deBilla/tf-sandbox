/**
 * Security and best-practice policy rules for Terraform configs.
 * These run client-side — no OPA binary needed for basic checks.
 */

import type { TFGraph, TFBlock } from '../parser/types';

export interface PolicyViolation {
  line: number;
  blockId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fix?: string;
}

type PolicyRule = (block: TFBlock, graph: TFGraph) => PolicyViolation[];

const SECURITY_POLICIES: PolicyRule[] = [
  // S3: Check for missing encryption config
  (block, graph) => {
    if (block.type !== 'aws_s3_bucket') return [];
    const hasEncryption = graph.blocks.some(
      b => b.type === 'aws_s3_bucket_server_side_encryption_configuration' &&
        b.rawBody.includes(block.name)
    );
    if (!hasEncryption) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'warning',
        message: `${block.id}: no server-side encryption configured`,
        fix: 'Add an aws_s3_bucket_server_side_encryption_configuration resource',
      }];
    }
    return [];
  },

  // S3: Check for missing public access block
  (block, graph) => {
    if (block.type !== 'aws_s3_bucket') return [];
    const hasPublicBlock = graph.blocks.some(
      b => b.type === 'aws_s3_bucket_public_access_block' &&
        b.rawBody.includes(block.name)
    );
    if (!hasPublicBlock) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'warning',
        message: `${block.id}: no public access block — bucket may be publicly accessible`,
        fix: 'Add an aws_s3_bucket_public_access_block resource',
      }];
    }
    return [];
  },

  // RDS: Check for unencrypted storage
  (block) => {
    if (block.type !== 'aws_db_instance') return [];
    if (!block.attributes['storage_encrypted'] || block.attributes['storage_encrypted'] === 'false') {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'warning',
        message: `${block.id}: storage encryption is not enabled`,
        fix: 'Add storage_encrypted = true',
      }];
    }
    return [];
  },

  // RDS: Check for missing deletion protection in prod
  (block) => {
    if (block.type !== 'aws_db_instance') return [];
    const hasProtection = block.attributes['deletion_protection'];
    if (!hasProtection) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'info',
        message: `${block.id}: deletion_protection is not set — database can be accidentally deleted`,
        fix: 'Add deletion_protection = true for production',
      }];
    }
    return [];
  },

  // RDS: Check for hardcoded password
  (block) => {
    if (block.type !== 'aws_db_instance') return [];
    const password = block.attributes['password'];
    if (password && !password.includes('var.') && !password.includes('data.') && !password.includes('random_')) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'error',
        message: `${block.id}: password appears to be hardcoded — use a variable or secrets manager`,
        fix: 'Use var.db_password or aws_secretsmanager_secret',
      }];
    }
    return [];
  },

  // Security Group: Check for 0.0.0.0/0 ingress
  (block) => {
    if (block.type !== 'aws_security_group') return [];
    if (block.rawBody.includes('0.0.0.0/0') && block.rawBody.includes('ingress')) {
      // Check if it's a known safe port (80, 443)
      const hasSshOpen = block.rawBody.includes('from_port') &&
        (block.rawBody.includes('22') || block.rawBody.includes('3389'));
      if (hasSshOpen) {
        return [{
          line: block.lineStart,
          blockId: block.id,
          severity: 'error',
          message: `${block.id}: SSH/RDP port open to 0.0.0.0/0 — restrict to known IPs`,
          fix: 'Replace cidr_blocks with specific IP ranges',
        }];
      }
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'info',
        message: `${block.id}: ingress from 0.0.0.0/0 detected — ensure this is intentional`,
      }];
    }
    return [];
  },

  // ElastiCache: Check for missing encryption
  (block) => {
    if (block.type !== 'aws_elasticache_replication_group') return [];
    const violations: PolicyViolation[] = [];
    if (!block.attributes['at_rest_encryption_enabled'] ||
      block.attributes['at_rest_encryption_enabled'] === 'false') {
      violations.push({
        line: block.lineStart,
        blockId: block.id,
        severity: 'warning',
        message: `${block.id}: at-rest encryption is not enabled`,
        fix: 'Add at_rest_encryption_enabled = true',
      });
    }
    return violations;
  },

  // GKE: Check for missing network policy
  (block) => {
    if (block.type !== 'google_container_cluster') return [];
    if (!block.rawBody.includes('network_policy')) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'info',
        message: `${block.id}: no network_policy block — pods can communicate without restriction`,
        fix: 'Add a network_policy block to enable network policies',
      }];
    }
    return [];
  },

  // IAM: Check for overly broad policies
  (block) => {
    if (block.type !== 'aws_iam_role_policy' && block.type !== 'aws_iam_policy') return [];
    if (block.rawBody.includes('"*"') && block.rawBody.includes('Action')) {
      const hasWildcardAction = block.rawBody.includes('"Action": "*"') ||
        block.rawBody.includes('"Action":"*"') ||
        block.rawBody.match(/"Action"\s*[:=]\s*"\*"/);
      if (hasWildcardAction) {
        return [{
          line: block.lineStart,
          blockId: block.id,
          severity: 'error',
          message: `${block.id}: IAM policy grants wildcard (*) actions — use least-privilege`,
          fix: 'Restrict Action to only the specific permissions needed',
        }];
      }
    }
    return [];
  },

  // General: Check for missing tags
  (block) => {
    if (block.kind !== 'resource') return [];
    const taggableTypes = [
      'aws_instance', 'aws_vpc', 'aws_subnet', 'aws_security_group',
      'aws_s3_bucket', 'aws_db_instance', 'aws_iam_role',
      'aws_elasticache_replication_group', 'aws_lambda_function',
      'google_compute_network', 'google_container_cluster',
    ];
    if (taggableTypes.includes(block.type ?? '') && !block.attributes['tags']) {
      return [{
        line: block.lineStart,
        blockId: block.id,
        severity: 'info',
        message: `${block.id}: no tags defined — tags help with cost tracking and organization`,
        fix: 'Add a tags block with Environment, Project, etc.',
      }];
    }
    return [];
  },
];

export function checkPolicies(graph: TFGraph): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const block of graph.blocks) {
    for (const policy of SECURITY_POLICIES) {
      violations.push(...policy(block, graph));
    }
  }

  return violations;
}
