import type { TFGraph, TFBlock } from '../../parser/types';
import type { MLOpsStageType, MLOpsWorkflow, MLOpsRecommendation, MLOpsStageMeta } from '../types';
import { getStageInfo, STAGE_CATALOG } from './catalog';
import type { Provider } from './catalog';

// ── Resource Type → MLOps Stage Mapping ──────────────────────────

const RESOURCE_STAGE_MAP: [string, MLOpsStageType][] = [
  // AWS — Data Ingestion
  ['aws_kinesis_stream', 'data_ingestion'],
  ['aws_kinesis_firehose', 'data_ingestion'],
  ['aws_glue_crawler', 'data_ingestion'],
  ['aws_glue_catalog', 'data_ingestion'],
  ['aws_dms_', 'data_ingestion'],

  // AWS — Preprocessing
  ['aws_sagemaker_processing', 'data_preprocessing'],
  ['aws_glue_job', 'data_preprocessing'],
  ['aws_emr_cluster', 'data_preprocessing'],

  // AWS — Feature Engineering
  ['aws_sagemaker_feature_group', 'feature_engineering'],

  // AWS — Training
  ['aws_sagemaker_training', 'model_training'],
  ['aws_sagemaker_hyper', 'model_training'],

  // AWS — Evaluation (SageMaker Clarify / processing for eval)
  ['aws_sagemaker_model_bias', 'model_evaluation'],
  ['aws_sagemaker_model_explainability', 'model_evaluation'],

  // AWS — Registry
  ['aws_sagemaker_model_package', 'model_registry'],

  // AWS — Deployment
  ['aws_sagemaker_endpoint', 'model_deployment'],
  ['aws_sagemaker_model', 'model_deployment'],

  // AWS — Monitoring
  ['aws_sagemaker_monitoring', 'monitoring'],
  ['aws_cloudwatch_metric_alarm', 'monitoring'],
  ['aws_cloudwatch_dashboard', 'monitoring'],

  // AWS — Storage
  ['aws_s3_bucket', 'data_storage'],

  // AWS — Artifacts
  ['aws_ecr_repository', 'artifact_storage'],

  // AWS — CI/CD
  ['aws_sfn_state_machine', 'cicd_trigger'],
  ['aws_codepipeline', 'cicd_trigger'],
  ['aws_codebuild_project', 'cicd_trigger'],
  ['aws_lambda_function', 'cicd_trigger'],

  // AWS — Batch Inference
  ['aws_sagemaker_transform', 'batch_inference'],

  // GCP — Data Ingestion
  ['google_pubsub_topic', 'data_ingestion'],
  ['google_pubsub_subscription', 'data_ingestion'],
  ['google_dataflow_job', 'data_ingestion'],
  ['google_bigquery_dataset', 'data_ingestion'],
  ['google_bigquery_table', 'data_ingestion'],

  // GCP — Preprocessing
  ['google_dataproc_cluster', 'data_preprocessing'],
  ['google_dataproc_job', 'data_preprocessing'],

  // GCP — Feature Store
  ['google_vertex_ai_feature', 'feature_engineering'],

  // GCP — Training
  ['google_vertex_ai_custom_job', 'model_training'],
  ['google_vertex_ai_training', 'model_training'],

  // GCP — Deployment
  ['google_vertex_ai_endpoint_deployment', 'model_deployment'],
  ['google_vertex_ai_endpoint', 'model_deployment'],
  ['google_vertex_ai_model', 'model_deployment'],

  // GCP — Monitoring
  ['google_monitoring_alert', 'monitoring'],
  ['google_monitoring_dashboard', 'monitoring'],

  // GCP — Storage
  ['google_storage_bucket', 'data_storage'],

  // GCP — Artifacts
  ['google_artifact_registry', 'artifact_storage'],

  // GCP — CI/CD
  ['google_cloudbuild_trigger', 'cicd_trigger'],
  ['google_cloud_scheduler', 'cicd_trigger'],

  // OpenStack — K8s / Training
  ['openstack_containerinfra_cluster_v1', 'model_training'],
  ['openstack_containerinfra_clustertemplate', 'model_training'],
  ['openstack_compute_instance_v2', 'model_training'],

  // OpenStack — Storage
  ['openstack_objectstorage_container', 'data_storage'],

  // OpenStack — Networking / Deployment
  ['openstack_lb_loadbalancer', 'model_deployment'],
  ['openstack_lb_listener', 'model_deployment'],
  ['openstack_lb_pool', 'model_deployment'],
  ['openstack_networking_network', 'model_deployment'],
  ['openstack_networking_subnet', 'model_deployment'],
  ['openstack_networking_router', 'model_deployment'],
  ['openstack_networking_floatingip', 'model_deployment'],
  ['openstack_networking_secgroup', 'model_deployment'],

  // OpenStack — Database
  ['openstack_db_instance', 'data_storage'],

  // ── Kubernetes-native / Helm / Multi-provider ────────────────

  // Helm — mapped by chart purpose (matched by resource name in presets)
  ['helm_release', 'model_deployment'],

  // Kubernetes resources
  ['kubernetes_namespace', 'model_deployment'],
  ['kubernetes_deployment', 'model_deployment'],
  ['kubernetes_service', 'model_deployment'],
  ['kubernetes_config_map', 'model_deployment'],
  ['kubernetes_secret', 'model_deployment'],
  ['kubernetes_ingress', 'model_deployment'],
  ['kubernetes_stateful_set', 'data_storage'],
  ['kubernetes_persistent_volume', 'data_storage'],
  ['kubernetes_job', 'model_training'],
  ['kubernetes_cron_job', 'cicd_trigger'],
];

export function classifyResourceType(resourceType: string): MLOpsStageType | null {
  for (const [prefix, stage] of RESOURCE_STAGE_MAP) {
    if (resourceType.startsWith(prefix)) return stage;
  }
  return null;
}

function detectProvider(blocks: TFBlock[]): Provider {
  for (const b of blocks) {
    if (b.type?.startsWith('aws_') || b.provider === 'aws') return 'aws';
    if (b.type?.startsWith('google_') || b.provider === 'google') return 'gcp';
    if (b.type?.startsWith('openstack_') || b.provider === 'openstack') return 'openstack';
  }
  // Check provider blocks
  for (const b of blocks) {
    if (b.kind === 'provider') {
      if (b.name === 'aws') return 'aws';
      if (b.name === 'google') return 'gcp';
      if (b.name === 'openstack') return 'openstack';
    }
  }
  return 'aws';
}

// ── Main Entry Point ─────────────────────────────────────────────

export function analyzeMLOps(graph: TFGraph): MLOpsWorkflow {
  const provider = detectProvider(graph.blocks);
  const stageMap = new Map<MLOpsStageType, TFBlock[]>();
  const unmapped: TFBlock[] = [];

  // Classify each resource block into an MLOps stage
  for (const block of graph.blocks) {
    if (block.kind !== 'resource' || !block.type) {
      continue;
    }

    const stage = classifyResourceType(block.type);
    if (stage) {
      if (!stageMap.has(stage)) stageMap.set(stage, []);
      stageMap.get(stage)!.push(block);
    } else {
      unmapped.push(block);
    }
  }

  // Build stage metas
  const stages: MLOpsStageMeta[] = [];
  for (const [stageType, blocks] of stageMap) {
    const info = STAGE_CATALOG[stageType] ? getStageInfo(stageType, provider) : null;
    const resourceNames = blocks.map(b => b.type!).filter((v, i, a) => a.indexOf(v) === i);

    stages.push({
      id: stageType,
      name: stageType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: stageType,
      service: info?.service ?? resourceNames.join(', '),
      description: info?.description ?? '',
      whyItMatters: info?.whyItMatters ?? '',
      commonPitfalls: info?.commonPitfalls ?? [],
      bestPractices: info?.bestPractices ?? [],
      providerNotes: info?.providerNotes ?? '',
    });
  }

  // Sort stages by typical pipeline order
  const STAGE_ORDER: MLOpsStageType[] = [
    'cicd_trigger', 'data_ingestion', 'data_storage', 'data_preprocessing',
    'feature_engineering', 'model_training', 'model_evaluation',
    'model_registry', 'artifact_storage', 'model_deployment',
    'batch_inference', 'realtime_inference', 'ab_testing', 'monitoring',
  ];
  stages.sort((a, b) => STAGE_ORDER.indexOf(a.type) - STAGE_ORDER.indexOf(b.type));

  // Generate recommendations
  const recommendations = generateRecommendations(stageMap, provider);

  // Derive a name from the provider
  const providerLabel = provider === 'aws' ? 'AWS' : provider === 'gcp' ? 'GCP' : 'OpenStack';
  const name = `${providerLabel} MLOps Pipeline`;

  return { name, provider, stages, recommendations };
}

function generateRecommendations(
  stageMap: Map<MLOpsStageType, TFBlock[]>,
  _provider: Provider,
): MLOpsRecommendation[] {
  const recommendations: MLOpsRecommendation[] = [];
  const hasStage = (s: MLOpsStageType) => stageMap.has(s);

  const hasDeployment = hasStage('model_deployment') || hasStage('realtime_inference') || hasStage('batch_inference');

  if (hasDeployment && !hasStage('monitoring')) {
    recommendations.push({
      stageId: 'model_deployment',
      severity: 'warning',
      message: 'No monitoring resources detected. Add CloudWatch alarms or SageMaker Model Monitor to detect drift and degradation.',
    });
  }

  if (hasDeployment && !hasStage('model_evaluation')) {
    recommendations.push({
      stageId: 'model_deployment',
      severity: 'warning',
      message: 'No model evaluation resources found. Consider adding SageMaker Clarify or custom evaluation before deployment.',
    });
  }

  if (hasStage('model_training') && !hasStage('model_registry')) {
    recommendations.push({
      stageId: 'model_training',
      severity: 'info',
      message: 'Consider adding a model registry (aws_sagemaker_model_package_group) to version and track trained models.',
    });
  }

  if (hasStage('model_training') && !hasStage('artifact_storage')) {
    recommendations.push({
      stageId: 'model_training',
      severity: 'info',
      message: 'Consider adding a dedicated artifact repository (ECR / Artifact Registry) for container images.',
    });
  }

  if (hasStage('feature_engineering') && hasDeployment && !hasStage('monitoring')) {
    recommendations.push({
      stageId: 'feature_engineering',
      severity: 'info',
      message: 'Feature stores with real-time serving should be monitored for feature drift to prevent training-serving skew.',
    });
  }

  if (hasStage('model_training') && !hasStage('cicd_trigger')) {
    recommendations.push({
      stageId: 'model_training',
      severity: 'info',
      message: 'No CI/CD orchestration found. Add Step Functions, CodePipeline, or Cloud Build to automate the training pipeline.',
    });
  }

  if (!hasStage('data_storage')) {
    recommendations.push({
      stageId: '',
      severity: 'info',
      message: 'No data storage resources (S3/GCS/Swift) detected. Versioned storage is key to ML reproducibility.',
    });
  }

  return recommendations;
}
