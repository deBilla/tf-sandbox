#!/usr/bin/env node

/**
 * Build-time pricing fetch script.
 * Fetches real AWS pricing from instances.vantage.sh (public, no auth needed).
 * Outputs a compact JSON to src/tools/cost/aws-pricing.json.
 *
 * Run: node scripts/fetch-pricing.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'tools', 'cost', 'aws-pricing.json');
const REGION = 'us-east-1';
const HOURS_PER_MONTH = 730;

const SOURCES = {
  ec2: 'https://instances.vantage.sh/instances.json',
  rds: 'https://instances.vantage.sh/rds/instances.json',
  cache: 'https://instances.vantage.sh/cache/instances.json',
};

async function fetchJSON(url, label) {
  console.log(`  Fetching ${label}...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`  ${label}: ${data.length} entries`);
    return data;
  } catch (e) {
    console.warn(`  ${label}: FAILED (${e.message})`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractEC2(data) {
  const result = {};
  for (const inst of data) {
    const pricing = inst.pricing?.[REGION]?.linux?.ondemand;
    if (!pricing) continue;
    const hourly = parseFloat(pricing);
    if (isNaN(hourly) || hourly <= 0) continue;

    result[inst.instance_type] = {
      h: Math.round(hourly * 10000) / 10000, // hourly rate
      m: Math.round(hourly * HOURS_PER_MONTH * 100) / 100, // monthly cost
      v: parseInt(inst.vCPU) || 0,
      mem: parseFloat(inst.memory) || 0,
    };
  }
  return result;
}

function extractRDS(data) {
  const result = {};
  for (const inst of data) {
    const regionPricing = inst.pricing?.[REGION];
    if (!regionPricing) continue;

    // Get PostgreSQL on-demand price (most common), fall back to MySQL
    const pgPrice = regionPricing['PostgreSQL']?.ondemand
      ?? regionPricing['MySQL']?.ondemand
      ?? regionPricing['Aurora PostgreSQL']?.ondemand;

    if (!pgPrice) continue;
    const hourly = parseFloat(pgPrice);
    if (isNaN(hourly) || hourly <= 0) continue;

    result[inst.instance_type] = {
      h: Math.round(hourly * 10000) / 10000,
      m: Math.round(hourly * HOURS_PER_MONTH * 100) / 100,
      v: parseInt(inst.vcpu) || 0,
      mem: parseFloat(inst.memory) || 0,
    };
  }
  return result;
}

function extractCache(data) {
  const result = {};
  for (const inst of data) {
    const regionPricing = inst.pricing?.[REGION];
    if (!regionPricing) continue;

    // Redis on-demand price
    const price = regionPricing['Redis']?.ondemand
      ?? regionPricing['Memcached']?.ondemand
      ?? regionPricing['Valkey']?.ondemand;

    if (!price) continue;
    const hourly = parseFloat(price);
    if (isNaN(hourly) || hourly <= 0) continue;

    result[inst.instance_type] = {
      h: Math.round(hourly * 10000) / 10000,
      m: Math.round(hourly * HOURS_PER_MONTH * 100) / 100,
      v: parseInt(inst.vcpu) || 0,
      mem: parseFloat(inst.memory) || 0,
    };
  }
  return result;
}

async function main() {
  console.log('Fetching AWS pricing data...');

  const [ec2Data, rdsData, cacheData] = await Promise.all([
    fetchJSON(SOURCES.ec2, 'EC2'),
    fetchJSON(SOURCES.rds, 'RDS'),
    fetchJSON(SOURCES.cache, 'ElastiCache'),
  ]);

  const pricing = {
    metadata: {
      source: 'instances.vantage.sh',
      fetchedAt: new Date().toISOString(),
      region: REGION,
      hoursPerMonth: HOURS_PER_MONTH,
    },
    compute: ec2Data ? extractEC2(ec2Data) : {},
    rds: rdsData ? extractRDS(rdsData) : {},
    cache: cacheData ? extractCache(cacheData) : {},
    // Fixed-price managed services (these don't change often)
    managed: {
      eks_control_plane: 73,
      nat_gateway: 32.4,
      route53_hosted_zone: 0.5,
      lambda_per_million_requests: 0.2,
      s3_standard_per_gb: 0.023,
      ebs_gp3_per_gb: 0.08,
      cloudfront_per_gb: 0.085,
      dynamodb_wcu: 0.00065,
      dynamodb_rcu: 0.00013,
      sqs_per_million: 0.4,
      sns_per_million: 0.5,
      ecr_per_gb: 0.1,
    },
  };

  const ec2Count = Object.keys(pricing.compute).length;
  const rdsCount = Object.keys(pricing.rds).length;
  const cacheCount = Object.keys(pricing.cache).length;

  if (ec2Count === 0 && rdsCount === 0 && cacheCount === 0) {
    console.warn('All fetches failed. Keeping existing pricing data.');
    process.exit(0);
  }

  const json = JSON.stringify(pricing, null, 2);
  writeFileSync(OUTPUT_PATH, json);

  const sizeKB = Math.round(json.length / 1024);
  console.log(`\nDone! Written to ${OUTPUT_PATH}`);
  console.log(`  EC2: ${ec2Count} instance types`);
  console.log(`  RDS: ${rdsCount} instance types`);
  console.log(`  ElastiCache: ${cacheCount} instance types`);
  console.log(`  File size: ${sizeKB} KB`);
}

main().catch(e => {
  console.error('Pricing fetch failed:', e.message);
  process.exit(0); // Don't break the build
});
