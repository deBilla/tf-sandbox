import type { MLOpsStageType } from '../types';

export type Provider = 'aws' | 'gcp' | 'openstack';

interface StageInfo {
  description: string;
  whyItMatters: string;
  commonPitfalls: string[];
  bestPractices: string[];
  services: Record<Provider, { service: string; notes: string }>;
}

// ── MLOps Maturity Levels ──────────────────────────────────────────

export interface MaturityLevel {
  level: number;
  name: string;
  description: string;
  characteristics: string[];
  stagesUsed: MLOpsStageType[];
}

export const MATURITY_LEVELS: MaturityLevel[] = [
  {
    level: 0,
    name: 'Manual Process',
    description: 'Data scientists manually train and deploy models. No automation, no CI/CD, no monitoring. Every step is a notebook or script run by hand.',
    characteristics: [
      'Manual data preparation and feature engineering',
      'Jupyter notebook-driven experimentation',
      'Manual model deployment (copy weights, restart server)',
      'No tracking of experiments or model versions',
      'Disconnected from software engineering practices',
    ],
    stagesUsed: ['data_ingestion', 'data_preprocessing', 'model_training', 'model_deployment'],
  },
  {
    level: 1,
    name: 'Pipeline Automation',
    description: 'The ML pipeline is automated end-to-end. Training, evaluation, and deployment happen as a pipeline, but the pipeline itself is triggered manually.',
    characteristics: [
      'Automated training pipeline (data → train → evaluate → deploy)',
      'Experiment tracking and model versioning',
      'Feature store for consistent feature serving',
      'Automated testing of model quality before deployment',
      'Manual pipeline triggers (e.g., "retrain when data looks stale")',
    ],
    stagesUsed: ['data_ingestion', 'data_preprocessing', 'feature_engineering', 'model_training', 'model_evaluation', 'model_registry', 'model_deployment'],
  },
  {
    level: 2,
    name: 'CI/CD for ML',
    description: 'Full automation including CI/CD for the ML pipeline itself. Retraining triggers automatically on data drift or schedule. Production monitoring feeds back into the pipeline.',
    characteristics: [
      'Automated retraining triggered by data drift or schedule',
      'CI/CD for pipeline code, model code, and infrastructure',
      'A/B testing and canary deployments for model rollout',
      'Real-time monitoring with drift detection and alerting',
      'Feedback loop: monitoring → retrain → evaluate → deploy',
    ],
    stagesUsed: ['cicd_trigger', 'data_ingestion', 'data_preprocessing', 'feature_engineering', 'model_training', 'model_evaluation', 'model_registry', 'model_deployment', 'monitoring', 'ab_testing'],
  },
];

// ── Key MLOps Concepts ─────────────────────────────────────────────

export interface Concept {
  term: string;
  definition: string;
  relatedStages: MLOpsStageType[];
}

export const KEY_CONCEPTS: Concept[] = [
  {
    term: 'Data Drift',
    definition: 'When the statistical properties of input data change over time compared to the training data. Causes model accuracy to degrade silently. Requires monitoring and automated retraining.',
    relatedStages: ['monitoring', 'data_ingestion', 'cicd_trigger'],
  },
  {
    term: 'Concept Drift',
    definition: 'When the relationship between input features and the target variable changes. Unlike data drift, the inputs look normal but the model\'s learned patterns no longer hold. Harder to detect than data drift.',
    relatedStages: ['monitoring', 'model_evaluation'],
  },
  {
    term: 'Training-Serving Skew',
    definition: 'Mismatch between how features are computed during training vs. production inference. Common cause: different code paths for batch training and online serving. Feature stores solve this by providing a single source of truth.',
    relatedStages: ['feature_engineering', 'model_deployment', 'realtime_inference'],
  },
  {
    term: 'Model Lineage',
    definition: 'The full provenance chain of a model: which data it was trained on, which code version, which hyperparameters, and which pipeline run produced it. Critical for debugging, compliance, and reproducibility.',
    relatedStages: ['model_registry', 'model_training', 'artifact_storage'],
  },
  {
    term: 'Feature Store',
    definition: 'A centralized repository for storing, versioning, and serving ML features. Provides both offline (batch) and online (low-latency) access. Ensures training and serving use identical feature logic.',
    relatedStages: ['feature_engineering', 'data_storage'],
  },
  {
    term: 'Shadow Deployment',
    definition: 'Running a new model in parallel with the production model, receiving real traffic but not serving responses to users. Allows comparison without risk. A safer alternative to A/B testing for high-stakes models.',
    relatedStages: ['model_deployment', 'ab_testing', 'monitoring'],
  },
  {
    term: 'Canary Release',
    definition: 'Gradually rolling out a new model version to a small percentage of traffic, then increasing if metrics look good. Limits blast radius of a bad model. Requires traffic splitting and automated rollback.',
    relatedStages: ['model_deployment', 'ab_testing'],
  },
  {
    term: 'Experiment Tracking',
    definition: 'Systematic logging of hyperparameters, metrics, code versions, and artifacts for every training run. Tools like MLflow, W&B, or cloud-native trackers. Essential for reproducibility and team collaboration.',
    relatedStages: ['model_training', 'model_evaluation', 'model_registry'],
  },
  {
    term: 'Model Card',
    definition: 'Documentation that accompanies a trained model describing its intended use, performance characteristics, limitations, fairness evaluations, and ethical considerations. A best practice for responsible ML.',
    relatedStages: ['model_registry', 'model_evaluation'],
  },
  {
    term: 'Pipeline Orchestration',
    definition: 'Coordinating the execution of multi-step ML workflows (ingest → preprocess → train → evaluate → deploy) with dependency management, retries, and scheduling. The backbone of reproducible ML.',
    relatedStages: ['cicd_trigger', 'data_ingestion', 'model_training'],
  },
];

// ── Provider Comparison ────────────────────────────────────────────

export interface ProviderOverview {
  provider: Provider;
  label: string;
  mlPlatform: string;
  strengths: string[];
  considerations: string[];
}

export const PROVIDER_OVERVIEWS: ProviderOverview[] = [
  {
    provider: 'aws',
    label: 'Amazon Web Services',
    mlPlatform: 'SageMaker',
    strengths: [
      'Most mature ML platform with the broadest service catalog',
      'Built-in algorithms, AutoML (Autopilot), and distributed training',
      'Tight integration: S3 → Glue → SageMaker → CloudWatch',
      'SageMaker Pipelines for native pipeline orchestration',
      'Largest ecosystem of pre-trained models and marketplace',
    ],
    considerations: [
      'Vendor lock-in with SageMaker-specific APIs',
      'Pricing can be complex (instance hours + storage + data transfer)',
      'Feature Store and Model Monitor are separate billable services',
    ],
  },
  {
    provider: 'gcp',
    label: 'Google Cloud Platform',
    mlPlatform: 'Vertex AI',
    strengths: [
      'TPU access for large-scale training (LLMs, vision models)',
      'Strong BigQuery integration for data-native ML (BQML)',
      'Vertex AI Pipelines built on Kubeflow (portable)',
      'AutoML with state-of-the-art Google research models',
      'Integrated ML metadata and experiment tracking',
    ],
    considerations: [
      'Smaller service catalog than AWS for non-ML workloads',
      'TPU availability varies by region',
      'Some features are still in preview/beta',
    ],
  },
  {
    provider: 'openstack',
    label: 'OpenStack',
    mlPlatform: 'Self-managed (Magnum + MLflow)',
    strengths: [
      'Full control over infrastructure and data sovereignty',
      'No vendor lock-in — uses open-source tools throughout',
      'Can run on-premises for regulated industries',
      'Magnum provides Kubernetes for container-native ML workloads',
      'Lower cost at scale for organizations with existing OpenStack deployments',
    ],
    considerations: [
      'Requires significant operational expertise to manage',
      'No managed ML services — must assemble from open-source (MLflow, Kubeflow, etc.)',
      'GPU passthrough and scheduling requires manual configuration',
      'Smaller community and fewer tutorials compared to AWS/GCP',
    ],
  },
];

export const STAGE_CATALOG: Record<MLOpsStageType, StageInfo> = {
  data_ingestion: {
    description:
      'Collects raw data from various sources (databases, APIs, streams) and lands it in a centralized store for downstream processing.',
    whyItMatters: 'Garbage in, garbage out. The quality and freshness of your training data directly determines model performance. A robust ingestion pipeline ensures your models are trained on reliable, up-to-date data.',
    commonPitfalls: [
      'Not validating data at the boundary — corrupt records propagate downstream',
      'Ignoring late-arriving data in streaming pipelines',
      'No deduplication — training on duplicate records biases the model',
    ],
    bestPractices: [
      'Use schema validation at ingestion time to catch corrupt data early',
      'Track data lineage from source to destination',
      'Implement idempotent ingestion to handle retries safely',
      'Set up dead-letter queues for failed records',
    ],
    services: {
      aws: { service: 'AWS Glue / Kinesis', notes: 'Glue handles batch ETL; Kinesis handles real-time streaming ingestion. Data lands in S3.' },
      gcp: { service: 'Dataflow / Pub/Sub', notes: 'Pub/Sub for event streaming; Dataflow (Apache Beam) for batch and stream processing into GCS or BigQuery.' },
      openstack: { service: 'Zaqar / Swift', notes: 'Zaqar provides message queuing for event-driven ingestion. Swift provides object storage as the landing zone.' },
    },
  },
  data_preprocessing: {
    description:
      'Cleans, transforms, and normalizes raw data into a format suitable for feature engineering or direct model training.',
    whyItMatters: 'Raw data is messy. Preprocessing standardizes it so models can learn meaningful patterns instead of noise. Inconsistent preprocessing between training and serving is one of the top causes of production ML failures.',
    commonPitfalls: [
      'Data leakage — using future data to preprocess past data (e.g., scaling with test set statistics)',
      'Non-deterministic transformations that break reproducibility',
      'Coupling preprocessing with training code, making it hard to reuse',
    ],
    bestPractices: [
      'Version your preprocessing pipelines alongside your code',
      'Use deterministic transformations for reproducibility',
      'Log data quality metrics (null rates, distributions) at each step',
      'Separate preprocessing logic from training logic for reuse',
    ],
    services: {
      aws: { service: 'SageMaker Processing', notes: 'Runs containerized preprocessing jobs on managed compute. Integrates with S3 for input/output.' },
      gcp: { service: 'Dataflow / Dataprep', notes: 'Dataflow for programmatic pipelines; Dataprep for visual, no-code data wrangling.' },
      openstack: { service: 'Sahara (Hadoop/Spark)', notes: 'Sahara provisions Hadoop or Spark clusters for large-scale data processing jobs.' },
    },
  },
  feature_engineering: {
    description:
      'Derives meaningful features from preprocessed data. A feature store centralizes feature definitions for training and serving consistency.',
    whyItMatters: 'Good features often matter more than model complexity. Feature engineering encodes domain knowledge into the data. A feature store prevents the #1 production ML bug: training-serving skew.',
    commonPitfalls: [
      'Different feature computation code in training vs. serving',
      'Point-in-time correctness violations (using future data as features)',
      'Feature definitions not documented, leading to team confusion',
    ],
    bestPractices: [
      'Use a feature store to share features across teams and models',
      'Ensure feature parity between training and serving (training-serving skew)',
      'Document feature semantics and update cadence',
      'Monitor feature drift over time',
    ],
    services: {
      aws: { service: 'SageMaker Feature Store', notes: 'Managed feature store with online (low-latency) and offline (batch) retrieval modes.' },
      gcp: { service: 'Vertex AI Feature Store', notes: 'Managed feature store integrated with Vertex AI Pipelines. Supports point-in-time lookups.' },
      openstack: { service: 'Custom (Spark + Swift)', notes: 'No native feature store; typically built with Spark for computation and Swift for storage.' },
    },
  },
  model_training: {
    description:
      'Fits a machine learning model on prepared training data. This is the core compute-intensive step that produces model artifacts.',
    whyItMatters: 'This is where the model learns. But training without proper experiment tracking, version control, and reproducibility means you can never reliably recreate or improve results.',
    commonPitfalls: [
      'Not logging hyperparameters — can\'t reproduce a good run',
      'Training on all available data with no holdout for evaluation',
      'Leaving GPU instances running after training completes (cost waste)',
    ],
    bestPractices: [
      'Always log hyperparameters, metrics, and artifacts for reproducibility',
      'Use spot/preemptible instances for cost savings on long training jobs',
      'Implement early stopping to avoid wasting compute',
      'Pin library versions and use containers for environment reproducibility',
    ],
    services: {
      aws: { service: 'SageMaker Training', notes: 'Managed training with built-in algorithms, custom containers, and distributed training support.' },
      gcp: { service: 'Vertex AI Training', notes: 'Supports custom containers, AutoML, and distributed training on GPUs/TPUs.' },
      openstack: { service: 'Magnum (K8s) + GPU nodes', notes: 'Deploy training workloads on Kubernetes clusters provisioned by Magnum with GPU-enabled flavors.' },
    },
  },
  model_evaluation: {
    description:
      'Validates model quality against holdout data and baseline metrics before promotion. Gates bad models from reaching production.',
    whyItMatters: 'A model that looks great on average metrics can fail catastrophically on important subgroups. Evaluation is the last line of defense before a model touches real users.',
    commonPitfalls: [
      'Only checking aggregate accuracy — missing failures on minority groups',
      'No baseline comparison — a 90% accuracy model might be worse than the current one',
      'Manual evaluation that gets skipped under deadline pressure',
    ],
    bestPractices: [
      'Compare against a baseline model, not just absolute thresholds',
      'Evaluate on multiple metrics (accuracy, fairness, latency)',
      'Use stratified evaluation across important data slices',
      'Automate evaluation as a pipeline gate, not a manual step',
    ],
    services: {
      aws: { service: 'SageMaker Clarify / Processing', notes: 'Clarify provides bias and explainability analysis. Processing jobs run custom evaluation scripts.' },
      gcp: { service: 'Vertex AI Model Evaluation', notes: 'Built-in evaluation metrics for classification, regression, and forecasting models.' },
      openstack: { service: 'Custom (Jupyter + Mistral)', notes: 'Run evaluation notebooks or scripts orchestrated by Mistral workflows.' },
    },
  },
  model_registry: {
    description:
      'A versioned catalog of trained model artifacts. Tracks model lineage, metadata, and promotion status (staging, production, archived).',
    whyItMatters: 'Without a registry, "which model is in production?" becomes a guessing game. The registry is your source of truth for model versions, enabling rollback, auditing, and governance.',
    commonPitfalls: [
      'Storing models on local disk or in ad-hoc S3 paths with no metadata',
      'No approval process — anyone can push a model to production',
      'Not linking model versions to the data and code that produced them',
    ],
    bestPractices: [
      'Tag every model version with training data hash and hyperparameters',
      'Enforce approval workflows before promoting to production',
      'Store model cards with performance characteristics and limitations',
      'Automate registry updates from the training pipeline',
    ],
    services: {
      aws: { service: 'SageMaker Model Registry', notes: 'Integrated with SageMaker Pipelines. Supports approval workflows and model groups.' },
      gcp: { service: 'Vertex AI Model Registry', notes: 'Central registry with version management, deployment targets, and evaluation linkage.' },
      openstack: { service: 'MLflow on Magnum', notes: 'Self-hosted MLflow on Kubernetes provides model versioning, staging, and artifact storage on Swift.' },
    },
  },
  model_deployment: {
    description:
      'Serves the model as a live endpoint (real-time) or deploys it for batch scoring. The bridge between training and production inference.',
    whyItMatters: 'A model has zero business value until it\'s deployed. But deployment is where most ML projects fail — infrastructure, latency, scaling, and rollback are all new challenges for data science teams.',
    commonPitfalls: [
      'No rollback plan — a bad model is stuck in production',
      'Deploying without load testing — model crashes under real traffic',
      'Mixing training and serving infrastructure, causing resource contention',
    ],
    bestPractices: [
      'Use canary or blue-green deployments to minimize risk',
      'Set autoscaling policies based on request volume and latency',
      'Implement health checks and automatic rollback on failure',
      'Separate model serving infrastructure from training infrastructure',
    ],
    services: {
      aws: { service: 'SageMaker Endpoints', notes: 'Real-time endpoints with auto-scaling, multi-variant support, and built-in A/B testing.' },
      gcp: { service: 'Vertex AI Endpoints', notes: 'Managed prediction endpoints with traffic splitting, autoscaling, and custom containers.' },
      openstack: { service: 'Magnum (K8s) + Octavia LB', notes: 'Deploy model servers (TFServing, Triton) on Kubernetes with Octavia load balancers.' },
    },
  },
  monitoring: {
    description:
      'Tracks model performance, data drift, and system health in production. Detects degradation before it impacts users.',
    whyItMatters: 'Models degrade silently. Unlike software bugs that crash, a drifting model just gives slightly worse answers. Without monitoring, you won\'t know until business metrics tank weeks later.',
    commonPitfalls: [
      'Only monitoring system metrics (CPU, memory) but not model quality',
      'No baseline for "normal" prediction distributions to compare against',
      'Alert fatigue from noisy thresholds that don\'t account for natural variance',
    ],
    bestPractices: [
      'Monitor prediction distributions, not just system metrics',
      'Set up alerts for data drift and concept drift',
      'Log input features and predictions for offline analysis',
      'Create dashboards that combine ML metrics with business KPIs',
    ],
    services: {
      aws: { service: 'SageMaker Model Monitor / CloudWatch', notes: 'Model Monitor detects data/model quality drift. CloudWatch handles infrastructure metrics and alarms.' },
      gcp: { service: 'Vertex AI Model Monitoring', notes: 'Automated skew and drift detection with alerts. Integrates with Cloud Monitoring for infrastructure.' },
      openstack: { service: 'Monasca', notes: 'OpenStack-native monitoring with metrics collection, alarms, and dashboards for ML workloads.' },
    },
  },
  cicd_trigger: {
    description:
      'Automates the ML pipeline lifecycle. Triggers retraining on schedule, data changes, or code commits. The backbone of continuous ML delivery.',
    whyItMatters: 'Manual retraining doesn\'t scale. CI/CD for ML ensures that when data changes, code changes, or drift is detected, the pipeline automatically retrains, evaluates, and deploys — without human intervention.',
    commonPitfalls: [
      'Triggering retraining only on schedule, ignoring data drift signals',
      'No automated quality gate — pipeline auto-deploys bad models',
      'Pipeline code not versioned, making it impossible to reproduce past runs',
    ],
    bestPractices: [
      'Trigger retraining on data drift signals, not just schedules',
      'Run the full pipeline (preprocess -> train -> evaluate -> deploy) end-to-end',
      'Gate deployments on evaluation metrics passing thresholds',
      'Version pipeline definitions alongside model code',
    ],
    services: {
      aws: { service: 'Step Functions / CodePipeline', notes: 'Step Functions orchestrate ML pipelines as state machines. CodePipeline handles CI/CD for model code.' },
      gcp: { service: 'Cloud Build / Vertex AI Pipelines', notes: 'Cloud Build for CI/CD triggers; Vertex AI Pipelines (Kubeflow) for ML workflow orchestration.' },
      openstack: { service: 'Mistral', notes: 'Mistral is the OpenStack workflow service for defining and executing multi-step ML pipelines.' },
    },
  },
  ab_testing: {
    description:
      'Routes traffic between model variants to compare real-world performance. Validates that a new model improves business metrics before full rollout.',
    whyItMatters: 'Offline metrics don\'t always translate to real-world impact. A/B testing is the gold standard for proving that a new model actually improves the metrics that matter to the business.',
    commonPitfalls: [
      'Calling a winner too early without statistical significance',
      'Not accounting for novelty effects or seasonal patterns',
      'Testing too many variants at once, diluting traffic and signal',
    ],
    bestPractices: [
      'Define success metrics before starting the experiment',
      'Ensure statistical significance before declaring a winner',
      'Control for confounding variables (time of day, user segments)',
      'Have an automatic rollback mechanism if the challenger degrades',
    ],
    services: {
      aws: { service: 'SageMaker Inference (variant routing)', notes: 'Production variants on a single endpoint with configurable traffic splitting.' },
      gcp: { service: 'Vertex AI Traffic Splitting', notes: 'Endpoint traffic splitting across deployed model versions with gradual rollout.' },
      openstack: { service: 'Octavia LB (weighted pools)', notes: 'Use Octavia weighted backend pools to split traffic between model serving instances.' },
    },
  },
  batch_inference: {
    description:
      'Runs predictions on large datasets offline. Suited for use cases where real-time latency is not required (reports, recommendations, scoring).',
    whyItMatters: 'Not every prediction needs to be real-time. Batch inference is cheaper, simpler, and more reliable for use cases like daily recommendations, monthly scoring, or report generation.',
    commonPitfalls: [
      'Not validating output row counts — silent data loss goes unnoticed',
      'Running batch jobs during peak hours, competing for resources',
      'No retry logic — a single transient failure kills the entire batch',
    ],
    bestPractices: [
      'Partition input data for parallel processing',
      'Write results to a queryable store (data warehouse, database)',
      'Schedule batch jobs during off-peak hours for cost savings',
      'Validate output schema and row counts after each run',
    ],
    services: {
      aws: { service: 'SageMaker Batch Transform', notes: 'Processes S3 datasets in parallel using managed compute. Supports large-scale offline scoring.' },
      gcp: { service: 'Vertex AI Batch Prediction', notes: 'Runs predictions on BigQuery tables or GCS files with managed autoscaling.' },
      openstack: { service: 'Magnum (K8s Jobs)', notes: 'Run batch inference as Kubernetes Jobs on Magnum-managed clusters with GPU nodes.' },
    },
  },
  realtime_inference: {
    description:
      'Serves predictions with low latency via an API endpoint. Powers interactive applications, search ranking, fraud detection, and similar use cases.',
    whyItMatters: 'For user-facing applications, latency is a feature. Real-time inference lets you personalize experiences, detect fraud in milliseconds, and make decisions at the speed of your product.',
    commonPitfalls: [
      'Not optimizing the model for inference (large models = slow responses)',
      'No caching layer — repeatedly computing the same predictions',
      'Cold start issues when autoscaling from zero instances',
    ],
    bestPractices: [
      'Cache frequent predictions to reduce latency and cost',
      'Set SLA-based autoscaling (e.g., p99 latency < 100ms)',
      'Use model optimization (quantization, distillation) for faster inference',
      'Implement graceful degradation when the model service is overloaded',
    ],
    services: {
      aws: { service: 'SageMaker Real-time Endpoints', notes: 'Managed endpoints with auto-scaling, multi-model support, and GPU/Inferentia acceleration.' },
      gcp: { service: 'Vertex AI Online Prediction', notes: 'Low-latency endpoints with autoscaling, custom containers, and TPU/GPU support.' },
      openstack: { service: 'Magnum (K8s) + Octavia', notes: 'Deploy TFServing or Triton on Kubernetes with Octavia load balancers for production inference.' },
    },
  },
  data_storage: {
    description:
      'Persistent storage for datasets, intermediate results, and outputs. The foundation for data versioning and reproducibility.',
    whyItMatters: 'Reproducibility requires knowing exactly what data was used. Versioned data storage lets you recreate any past training run and audit how models were built.',
    commonPitfalls: [
      'Overwriting data in-place — can\'t reproduce past training runs',
      'No lifecycle policies — storage costs grow unbounded',
      'Storing sensitive data without encryption or access controls',
    ],
    bestPractices: [
      'Use versioned object storage for immutable dataset snapshots',
      'Implement lifecycle policies to archive or delete stale data',
      'Encrypt data at rest and in transit',
      'Maintain a data catalog with schema and ownership metadata',
    ],
    services: {
      aws: { service: 'S3', notes: 'Object storage with versioning, lifecycle policies, and S3 Select for in-place querying.' },
      gcp: { service: 'GCS / BigQuery', notes: 'GCS for unstructured data; BigQuery for structured analytics with built-in ML (BQML).' },
      openstack: { service: 'Swift', notes: 'OpenStack object storage with large object support, versioning, and access control.' },
    },
  },
  artifact_storage: {
    description:
      'Stores model artifacts, container images, and pipeline outputs. Enables reproducibility by linking artifacts to training runs.',
    whyItMatters: 'Model artifacts are the output of expensive training runs. Losing them means retraining from scratch. Proper artifact storage with metadata linking enables instant rollback and audit trails.',
    commonPitfalls: [
      'No metadata linking artifacts to the training run that produced them',
      'Using mutable tags (e.g., "latest") for production container images',
      'Not scanning container images for security vulnerabilities',
    ],
    bestPractices: [
      'Tag artifacts with the pipeline run ID and git commit hash',
      'Scan container images for vulnerabilities before deployment',
      'Set retention policies to manage storage costs',
      'Use immutable tags for production artifacts',
    ],
    services: {
      aws: { service: 'ECR / S3', notes: 'ECR for Docker images; S3 for model artifacts. Integrated with SageMaker training output.' },
      gcp: { service: 'Artifact Registry / GCS', notes: 'Artifact Registry for containers and packages; GCS for model binaries and checkpoints.' },
      openstack: { service: 'Swift + Harbor', notes: 'Swift for model artifacts; Harbor (on Magnum) for container image registry and scanning.' },
    },
  },
};

export function getStageInfo(type: MLOpsStageType, provider: Provider) {
  const entry = STAGE_CATALOG[type];
  const svc = entry.services[provider];
  return {
    description: entry.description,
    whyItMatters: entry.whyItMatters,
    commonPitfalls: entry.commonPitfalls,
    bestPractices: entry.bestPractices,
    service: svc.service,
    providerNotes: svc.notes,
  };
}

export function getAllServicesForStage(type: MLOpsStageType) {
  const entry = STAGE_CATALOG[type];
  return {
    aws: entry.services.aws,
    gcp: entry.services.gcp,
    openstack: entry.services.openstack,
  };
}
