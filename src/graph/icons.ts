export interface CategoryInfo {
  icon: string;
  color: string;
  label: string;
}

const CATEGORY_MAP: [string, CategoryInfo][] = [
  // GCP (longer prefixes first for matching)
  ['google_service_account', { icon: '🔑', color: '#E53935', label: 'IAM' }],
  ['google_project_iam',     { icon: '🛡️', color: '#E53935', label: 'IAM' }],
  ['google_clouddeploy',     { icon: '🚀', color: '#00BFA5', label: 'Cloud Deploy' }],
  ['google_monitoring',      { icon: '📊', color: '#F4B400', label: 'Monitoring' }],
  ['google_container',       { icon: '☸️', color: '#326CE5', label: 'GKE' }],
  ['google_compute',         { icon: '🖥️', color: '#4285F4', label: 'Compute' }],
  ['google_storage',         { icon: '🪣', color: '#AB47BC', label: 'Storage' }],
  ['google_logging',         { icon: '📋', color: '#F4B400', label: 'Logging' }],
  ['google_project',         { icon: '📁', color: '#78909C', label: 'Project' }],
  ['google_sql',             { icon: '🗄️', color: '#F57C00', label: 'Cloud SQL' }],
  ['google_iam',             { icon: '🛡️', color: '#E53935', label: 'IAM' }],
  // AWS
  ['aws_lambda',   { icon: '⚡', color: '#FF9900', label: 'Lambda' }],
  ['aws_instance', { icon: '🖥️', color: '#FF9900', label: 'EC2' }],
  ['aws_vpc',      { icon: '🌐', color: '#FF9900', label: 'VPC' }],
  ['aws_subnet',   { icon: '🌐', color: '#FF9900', label: 'VPC' }],
  ['aws_security_group', { icon: '🛡️', color: '#FF9900', label: 'Security' }],
  ['aws_s3',       { icon: '🪣', color: '#FF9900', label: 'S3' }],
  ['aws_rds',      { icon: '🗄️', color: '#FF9900', label: 'RDS' }],
  ['aws_db',       { icon: '🗄️', color: '#FF9900', label: 'RDS' }],
  ['aws_iam',      { icon: '🛡️', color: '#FF9900', label: 'IAM' }],
  ['aws_ecs',      { icon: '☸️', color: '#FF9900', label: 'ECS' }],
  ['aws_eks',      { icon: '☸️', color: '#FF9900', label: 'EKS' }],
  ['aws_lb',       { icon: '⚖️', color: '#FF9900', label: 'ELB' }],
  ['aws_alb',      { icon: '⚖️', color: '#FF9900', label: 'ALB' }],
  ['aws_route53',  { icon: '🌍', color: '#FF9900', label: 'Route53' }],
  ['aws_cloudfront', { icon: '🌍', color: '#FF9900', label: 'CloudFront' }],
  // MLOps stages
  ['mlops_data_ingestion',      { icon: '📥', color: '#10B981', label: 'Ingest' }],
  ['mlops_data_preprocessing',  { icon: '🔧', color: '#06B6D4', label: 'Preprocess' }],
  ['mlops_feature_engineering', { icon: '🧮', color: '#8B5CF6', label: 'Features' }],
  ['mlops_model_training',      { icon: '🧠', color: '#8B5CF6', label: 'Train' }],
  ['mlops_model_evaluation',    { icon: '📏', color: '#F59E0B', label: 'Evaluate' }],
  ['mlops_model_registry',      { icon: '📋', color: '#6366F1', label: 'Registry' }],
  ['mlops_model_deployment',    { icon: '🚀', color: '#EF4444', label: 'Deploy' }],
  ['mlops_monitoring',          { icon: '📊', color: '#F43F5E', label: 'Monitor' }],
  ['mlops_cicd_trigger',        { icon: '🔄', color: '#3B82F6', label: 'CI/CD' }],
  ['mlops_ab_testing',          { icon: '🔀', color: '#EC4899', label: 'A/B Test' }],
  ['mlops_batch_inference',     { icon: '📦', color: '#F97316', label: 'Batch' }],
  ['mlops_realtime_inference',  { icon: '⚡', color: '#FBBF24', label: 'Real-time' }],
  ['mlops_data_storage',        { icon: '🪣', color: '#14B8A6', label: 'Storage' }],
  ['mlops_artifact_storage',    { icon: '🗄️', color: '#A78BFA', label: 'Artifacts' }],
  // Kubernetes native
  ['kubernetes_namespace',        { icon: '📁', color: '#326CE5', label: 'Namespace' }],
  ['kubernetes_deployment',       { icon: '🚀', color: '#326CE5', label: 'Deployment' }],
  ['kubernetes_service',          { icon: '🌐', color: '#326CE5', label: 'Service' }],
  ['kubernetes_stateful_set',     { icon: '🗄️', color: '#326CE5', label: 'StatefulSet' }],
  ['kubernetes_cron_job',         { icon: '🔄', color: '#326CE5', label: 'CronJob' }],
  ['kubernetes_job',              { icon: '⚙️', color: '#326CE5', label: 'Job' }],
  ['kubernetes_config_map',       { icon: '📋', color: '#326CE5', label: 'ConfigMap' }],
  ['kubernetes_secret',           { icon: '🔑', color: '#326CE5', label: 'Secret' }],
  ['kubernetes_ingress',          { icon: '🌍', color: '#326CE5', label: 'Ingress' }],
  ['kubernetes_persistent_volume', { icon: '💾', color: '#326CE5', label: 'PV' }],
  // Helm
  ['helm_release',                { icon: '⎈', color: '#0F1689', label: 'Helm' }],
  // OpenStack
  ['openstack_containerinfra',    { icon: '☸️', color: '#ED1944', label: 'Magnum' }],
  ['openstack_compute',           { icon: '🖥️', color: '#ED1944', label: 'Compute' }],
  ['openstack_objectstorage',     { icon: '🪣', color: '#ED1944', label: 'Swift' }],
  ['openstack_networking',        { icon: '🌐', color: '#ED1944', label: 'Network' }],
  ['openstack_lb_',               { icon: '⚖️', color: '#ED1944', label: 'Octavia' }],
  ['openstack_db_',               { icon: '🗄️', color: '#ED1944', label: 'Trove DB' }],
  // Azure
  ['azurerm_kubernetes',    { icon: '☸️', color: '#0078D4', label: 'AKS' }],
  ['azurerm_virtual',       { icon: '🖥️', color: '#0078D4', label: 'VM' }],
  ['azurerm_resource_group', { icon: '📁', color: '#0078D4', label: 'Resource Group' }],
  ['azurerm_storage',       { icon: '🪣', color: '#0078D4', label: 'Storage' }],
  ['azurerm_network',       { icon: '🌐', color: '#0078D4', label: 'Network' }],
];

const DEFAULT_CATEGORY: CategoryInfo = { icon: '📦', color: '#78909C', label: 'Resource' };

export function getCategoryForType(resourceType: string): CategoryInfo {
  for (const [prefix, info] of CATEGORY_MAP) {
    if (resourceType.startsWith(prefix)) return info;
  }
  return DEFAULT_CATEGORY;
}

export const PROVIDER_COLORS: Record<string, string> = {
  google: '#4285F4',
  aws: '#FF9900',
  azurerm: '#0078D4',
  gcp: '#4285F4',
  openstack: '#ED1944',
  null: '#78909C',
  random: '#78909C',
  local: '#78909C',
  template: '#78909C',
};

export function getProviderColor(provider?: string): string {
  if (!provider) return '#78909C';
  return PROVIDER_COLORS[provider] ?? '#78909C';
}

export const KIND_STYLES: Record<string, { icon: string; borderColor: string }> = {
  variable: { icon: '📥', borderColor: '#6b7280' },
  output: { icon: '📤', borderColor: '#22c55e' },
  module: { icon: '📦', borderColor: '#8b5cf6' },
  data: { icon: '🔍', borderColor: '#06b6d4' },
  provider: { icon: '☁️', borderColor: '#94a3b8' },
  locals: { icon: '📌', borderColor: '#f59e0b' },
};
