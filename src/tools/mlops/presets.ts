export const MLOPS_PRESETS = [
  {
    name: 'SageMaker (AWS)',
    description: 'AWS SageMaker ML training and deployment pipeline',
    code: `# --- AWS SageMaker MLOps Pipeline ---

provider "aws" {
  region = "us-east-1"
}

# ── Data Layer ────────────────────────────────────────────

resource "aws_s3_bucket" "data_lake" {
  bucket = "ml-data-lake-prod"
  versioning { enabled = true }
  tags = { Purpose = "ML training data" }
}

resource "aws_s3_bucket" "model_artifacts" {
  bucket = "ml-model-artifacts-prod"
  versioning { enabled = true }
}

resource "aws_ecr_repository" "ml_images" {
  name                 = "ml-pipeline-images"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# ── IAM ───────────────────────────────────────────────────

resource "aws_iam_role" "sagemaker_role" {
  name = "sagemaker-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow",
      Principal = { Service = "sagemaker.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "sagemaker_full" {
  role       = aws_iam_role.sagemaker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

# ── Preprocessing ─────────────────────────────────────────

resource "aws_sagemaker_processing_job" "preprocessing" {
  processing_job_name = "data-preprocessing"
  role_arn            = aws_iam_role.sagemaker_role.arn

  processing_inputs {
    input_name = "raw-data"
    s3_input { s3_uri = "s3://\${aws_s3_bucket.data_lake.bucket}/raw/" }
  }

  processing_outputs {
    output_name = "processed-data"
    s3_output { s3_uri = "s3://\${aws_s3_bucket.data_lake.bucket}/processed/" }
  }

  app_specification {
    image_uri = "\${aws_ecr_repository.ml_images.repository_url}:preprocess"
  }
}

# ── Feature Store ─────────────────────────────────────────

resource "aws_sagemaker_feature_group" "user_features" {
  feature_group_name             = "user-features"
  record_identifier_feature_name = "user_id"
  event_time_feature_name        = "event_time"
  role_arn                        = aws_iam_role.sagemaker_role.arn

  offline_store_config {
    s3_storage_config {
      s3_uri = "s3://\${aws_s3_bucket.data_lake.bucket}/features/"
    }
  }
}

# ── Training ──────────────────────────────────────────────

resource "aws_sagemaker_training_job" "model_training" {
  training_job_name = "fraud-detection-v1"
  role_arn          = aws_iam_role.sagemaker_role.arn

  algorithm_specification {
    training_image      = "\${aws_ecr_repository.ml_images.repository_url}:train"
    training_input_mode = "File"
  }

  input_data_config {
    channel_name = "train"
    data_source {
      s3_data_source {
        s3_uri       = "s3://\${aws_s3_bucket.data_lake.bucket}/processed/"
        s3_data_type = "S3Prefix"
      }
    }
  }

  output_data_config {
    s3_output_path = "s3://\${aws_s3_bucket.model_artifacts.bucket}/models/"
  }

  resource_config {
    instance_count    = 1
    instance_type     = "ml.p3.2xlarge"
    volume_size_in_gb = 50
  }

  stopping_condition { max_runtime_in_seconds = 86400 }
}

# ── Registry ──────────────────────────────────────────────

resource "aws_sagemaker_model_package_group" "model_registry" {
  model_package_group_name = "fraud-detection-models"

  depends_on = [aws_sagemaker_training_job.model_training]
}

# ── Deployment ────────────────────────────────────────────

resource "aws_sagemaker_endpoint_configuration" "serving" {
  name = "fraud-detection-endpoint-config"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model_package_group.model_registry.model_package_group_name
    initial_instance_count = 2
    instance_type          = "ml.m5.xlarge"
    initial_variant_weight = 1.0
  }
}

resource "aws_sagemaker_endpoint" "serving" {
  name                 = "fraud-detection-endpoint"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.serving.name
}

# ── Monitoring ────────────────────────────────────────────

resource "aws_sagemaker_monitoring_schedule" "model_monitor" {
  name = "fraud-detection-monitor"

  monitoring_schedule_config {
    schedule_config { schedule_expression = "cron(0 * ? * * *)" }
    monitoring_job_definition {
      monitoring_output_config {
        monitoring_outputs {
          s3_output { s3_uri = "s3://\${aws_s3_bucket.data_lake.bucket}/monitoring/" }
        }
      }
    }
  }

  depends_on = [aws_sagemaker_endpoint.serving]
}

resource "aws_cloudwatch_metric_alarm" "model_latency" {
  alarm_name          = "sagemaker-endpoint-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ModelLatency"
  namespace           = "AWS/SageMaker"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "Model inference latency > 100ms"
  dimensions = { EndpointName = aws_sagemaker_endpoint.serving.name }
}
`,
  },
  {
    name: 'Vertex AI (GCP)',
    description: 'GCP Vertex AI ML pipeline with feature store and monitoring',
    code: `# --- GCP Vertex AI MLOps Pipeline ---

provider "google" {
  project = "my-ml-project"
  region  = "us-central1"
}

# ── Data Ingestion ────────────────────────────────────────

resource "google_bigquery_dataset" "ml_data" {
  dataset_id = "ml_training_data"
  location   = "US"
  labels     = { purpose = "ml-pipeline" }
}

resource "google_bigquery_table" "training_data" {
  dataset_id          = google_bigquery_dataset.ml_data.dataset_id
  table_id            = "training_features"
  deletion_protection = false
}

# ── Storage ───────────────────────────────────────────────

resource "google_storage_bucket" "ml_bucket" {
  name     = "ml-pipeline-artifacts"
  location = "US"
  versioning { enabled = true }
  lifecycle_rule {
    action { type = "Delete" }
    condition { age = 365 }
  }
}

# ── Container Registry ───────────────────────────────────

resource "google_artifact_registry_repository" "ml_images" {
  location      = "us-central1"
  repository_id = "ml-pipeline-images"
  format        = "DOCKER"
}

# ── Feature Store ─────────────────────────────────────────

resource "google_vertex_ai_feature_store" "main" {
  name   = "ml-feature-store"
  region = "us-central1"
  online_serving_config { fixed_node_count = 1 }
}

resource "google_vertex_ai_feature_store_entity_type" "users" {
  name         = "users"
  featurestore = google_vertex_ai_feature_store.main.id
}

# ── Training ──────────────────────────────────────────────

resource "google_vertex_ai_custom_job" "training" {
  display_name = "fraud-model-training"
  region       = "us-central1"

  job_spec {
    worker_pool_specs {
      machine_spec {
        machine_type      = "n1-standard-8"
        accelerator_type  = "NVIDIA_TESLA_T4"
        accelerator_count = 1
      }
      replica_count = 1
      container_spec {
        image_uri = "\${google_artifact_registry_repository.ml_images.location}-docker.pkg.dev/my-ml-project/\${google_artifact_registry_repository.ml_images.repository_id}/trainer:latest"
        args = [
          "--data-path=gs://\${google_storage_bucket.ml_bucket.name}/processed/",
          "--feature-store=\${google_vertex_ai_feature_store.main.id}",
          "--output-path=gs://\${google_storage_bucket.ml_bucket.name}/models/"
        ]
      }
    }
  }
}

# ── Model + Endpoint ──────────────────────────────────────

resource "google_vertex_ai_model" "fraud_model" {
  display_name = "fraud-detection-model"
  region       = "us-central1"
  artifact_uri = "gs://\${google_storage_bucket.ml_bucket.name}/models/\${google_vertex_ai_custom_job.training.display_name}/"

  container_spec {
    image_uri = "\${google_artifact_registry_repository.ml_images.location}-docker.pkg.dev/my-ml-project/\${google_artifact_registry_repository.ml_images.repository_id}/serve:latest"
  }
}

resource "google_vertex_ai_endpoint" "serving" {
  display_name = "fraud-detection-endpoint"
  region       = "us-central1"

  depends_on = [google_vertex_ai_model.fraud_model]
}

# ── Monitoring ────────────────────────────────────────────

resource "google_monitoring_alert_policy" "model_drift" {
  display_name = "Model Prediction Drift"
  combiner     = "OR"

  conditions {
    display_name = "High prediction drift"
    condition_threshold {
      filter          = "resource.type = \\"aiplatform.googleapis.com/Endpoint\\" AND resource.labels.endpoint_id = \${google_vertex_ai_endpoint.serving.id}"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.1
      duration        = "300s"
    }
  }
}

# ── CI/CD ─────────────────────────────────────────────────

resource "google_pubsub_topic" "ml_triggers" {
  name = "ml-pipeline-triggers"
}

resource "google_pubsub_subscription" "retrain_trigger" {
  name                 = "retrain-on-drift"
  topic                = google_pubsub_topic.ml_triggers.name
  ack_deadline_seconds = 300
}

resource "google_cloudbuild_trigger" "ml_pipeline" {
  name     = "ml-pipeline-trigger"
  filename = "cloudbuild-ml.yaml"

  substitutions = {
    _TRAINING_JOB  = google_vertex_ai_custom_job.training.display_name
    _ENDPOINT_ID   = google_vertex_ai_endpoint.serving.id
    _PUBSUB_TOPIC  = google_pubsub_topic.ml_triggers.name
    _ARTIFACT_REPO = google_artifact_registry_repository.ml_images.repository_id
    _BUCKET        = google_storage_bucket.ml_bucket.name
  }

  github {
    owner = "my-org"
    name  = "ml-pipeline"
    push { branch = "^main$" }
  }
}
`,
  },
  {
    name: 'OpenStack ML',
    description: 'OpenStack ML pipeline with Magnum K8s, Swift, and model serving',
    code: `# --- OpenStack MLOps Pipeline ---

provider "openstack" {
  auth_url = "https://keystone.example.com:5000/v3"
  region   = "RegionOne"
}

# ── Networking ────────────────────────────────────────────

resource "openstack_networking_network_v2" "ml_network" {
  name           = "ml-pipeline-network"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "ml_subnet" {
  name       = "ml-subnet"
  network_id = openstack_networking_network_v2.ml_network.id
  cidr       = "10.0.1.0/24"
  ip_version = 4
}

# ── K8s Cluster (Magnum) ─────────────────────────────────

resource "openstack_containerinfra_clustertemplate_v1" "ml_template" {
  name                  = "ml-gpu-template"
  image                 = "fedora-coreos-gpu"
  coe                   = "kubernetes"
  flavor                = "gpu.large"
  master_flavor         = "m1.large"
  docker_storage_driver = "overlay2"
  network_driver        = "flannel"
  external_network_id   = var.external_network_id
  fixed_network         = openstack_networking_network_v2.ml_network.id
  fixed_subnet          = openstack_networking_subnet_v2.ml_subnet.id
}

resource "openstack_containerinfra_cluster_v1" "ml_cluster" {
  name                = "ml-training-cluster"
  cluster_template_id = openstack_containerinfra_clustertemplate_v1.ml_template.id
  master_count        = 1
  node_count          = 3
}

# ── Object Storage (Swift) ───────────────────────────────

resource "openstack_objectstorage_container_v1" "data_lake" {
  name     = "ml-data-lake"
  metadata = { purpose = "ML training data" }
}

resource "openstack_objectstorage_container_v1" "model_artifacts" {
  name     = "ml-model-artifacts"
  metadata = { purpose = "Trained model binaries" }
}

# ── Training Compute ─────────────────────────────────────

resource "openstack_compute_instance_v2" "training_node" {
  name        = "ml-training-gpu"
  flavor_name = "gpu.xlarge"
  image_name  = "ubuntu-22.04-cuda"

  network {
    uuid = openstack_networking_network_v2.ml_network.id
  }

  user_data = <<-EOF
    #!/bin/bash
    export K8S_API=\${openstack_containerinfra_cluster_v1.ml_cluster.api_address}
    export DATA=swift://\${openstack_objectstorage_container_v1.data_lake.name}/
    export OUTPUT=swift://\${openstack_objectstorage_container_v1.model_artifacts.name}/
    python train.py --data $DATA --output $OUTPUT --cluster $K8S_API
  EOF
}

# ── Model Serving (Load Balancer) ─────────────────────────

resource "openstack_lb_loadbalancer_v2" "model_serving" {
  name          = "model-serving-lb"
  vip_subnet_id = openstack_networking_subnet_v2.ml_subnet.id
}

resource "openstack_lb_listener_v2" "inference" {
  name            = "inference-listener"
  protocol        = "HTTP"
  protocol_port   = 8080
  loadbalancer_id = openstack_lb_loadbalancer_v2.model_serving.id
}

resource "openstack_lb_pool_v2" "model_servers" {
  name        = "model-server-pool"
  protocol    = "HTTP"
  lb_method   = "ROUND_ROBIN"
  listener_id = openstack_lb_listener_v2.inference.id
}

resource "openstack_lb_member_v2" "training_node" {
  pool_id       = openstack_lb_pool_v2.model_servers.id
  address       = openstack_compute_instance_v2.training_node.access_ip_v4
  protocol_port = 8080
  subnet_id     = openstack_networking_subnet_v2.ml_subnet.id
}

# ── Monitoring ────────────────────────────────────────────

resource "openstack_compute_instance_v2" "monitoring" {
  name        = "monasca-monitor"
  flavor_name = "m1.large"
  image_name  = "ubuntu-22.04"

  network {
    uuid = openstack_networking_network_v2.ml_network.id
  }

  user_data = <<-EOF
    #!/bin/bash
    pip install monasca-agent
    monasca-setup --username admin --password secret \\
      --project_name ml-platform \\
      --keystone_url https://keystone.example.com:5000/v3
    # Monitor model serving endpoint
    monasca-agent-add http_check \\
      --url http://\${openstack_lb_loadbalancer_v2.model_serving.vip_address}:8080/health \\
      --name model-serving-health
    # Monitor training node
    monasca-agent-add host_alive \\
      --target \${openstack_compute_instance_v2.training_node.access_ip_v4} \\
      --name training-node-health
  EOF
}

variable "external_network_id" {
  description = "External network for Magnum cluster"
  type        = string
}
`,
  },
  {
    name: 'Full MLOps (AWS)',
    description: 'Complete AWS MLOps with Step Functions, A/B testing, and full CI/CD',
    code: `# --- Full AWS MLOps Pipeline ---

provider "aws" {
  region = "us-west-2"
}

# ── Data Layer ────────────────────────────────────────────

resource "aws_s3_bucket" "data_lake" {
  bucket = "mlops-data-lake"
  versioning { enabled = true }
}

resource "aws_kinesis_stream" "data_stream" {
  name             = "ml-data-stream"
  shard_count      = 2
  retention_period = 48
}

resource "aws_glue_catalog_database" "ml_catalog" {
  name = "ml_data_catalog"
}

resource "aws_glue_crawler" "data_crawler" {
  name          = "ml-data-crawler"
  database_name = aws_glue_catalog_database.ml_catalog.name
  role          = aws_iam_role.sagemaker_role.arn
  s3_target { path = "s3://\${aws_s3_bucket.data_lake.bucket}/raw/" }
}

# ── Feature Engineering ──────────────────────────────────

resource "aws_sagemaker_feature_group" "transaction_features" {
  feature_group_name             = "transaction-features"
  record_identifier_feature_name = "transaction_id"
  event_time_feature_name        = "event_time"
  role_arn                        = aws_iam_role.sagemaker_role.arn
  online_store_config { enable_online_store = true }
}

# ── Training ──────────────────────────────────────────────

resource "aws_sagemaker_training_job" "model_v2" {
  training_job_name = "fraud-model-v2"
  role_arn          = aws_iam_role.sagemaker_role.arn

  algorithm_specification {
    training_image      = "\${aws_ecr_repository.ml_images.repository_url}:train-v2"
    training_input_mode = "File"
  }

  input_data_config {
    channel_name = "train"
    data_source {
      s3_data_source {
        s3_uri       = "s3://\${aws_s3_bucket.data_lake.bucket}/processed/"
        s3_data_type = "S3Prefix"
      }
    }
  }

  output_data_config {
    s3_output_path = "s3://\${aws_s3_bucket.model_artifacts.bucket}/v2/"
  }

  resource_config {
    instance_count    = 2
    instance_type     = "ml.p3.8xlarge"
    volume_size_in_gb = 100
  }

  stopping_condition { max_runtime_in_seconds = 86400 }
}

# ── Artifacts & Registry ─────────────────────────────────

resource "aws_s3_bucket" "model_artifacts" {
  bucket = "mlops-model-artifacts"
  versioning { enabled = true }
}

resource "aws_ecr_repository" "ml_images" {
  name                 = "mlops-pipeline"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_sagemaker_model_package_group" "registry" {
  model_package_group_name = "fraud-detection-registry"

  depends_on = [aws_sagemaker_training_job.model_v2]
}

# ── A/B Testing Deployment ───────────────────────────────

resource "aws_sagemaker_endpoint_configuration" "ab_test" {
  name = "fraud-detection-ab-config"

  production_variants {
    variant_name           = "champion"
    model_name             = aws_sagemaker_model_package_group.registry.model_package_group_name
    initial_instance_count = 2
    instance_type          = "ml.m5.xlarge"
    initial_variant_weight = 0.9
  }

  production_variants {
    variant_name           = "challenger"
    model_name             = aws_sagemaker_model_package_group.registry.model_package_group_name
    initial_instance_count = 1
    instance_type          = "ml.m5.xlarge"
    initial_variant_weight = 0.1
  }
}

resource "aws_sagemaker_endpoint" "production" {
  name                 = "fraud-detection-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.ab_test.name
}

# ── Monitoring ────────────────────────────────────────────

resource "aws_sagemaker_monitoring_schedule" "data_quality" {
  name = "data-quality-monitor"

  monitoring_schedule_config {
    schedule_config { schedule_expression = "cron(0 */6 ? * * *)" }
    monitoring_job_definition {
      monitoring_output_config {
        monitoring_outputs {
          s3_output { s3_uri = "s3://\${aws_s3_bucket.data_lake.bucket}/monitoring/" }
        }
      }
    }
  }

  depends_on = [aws_sagemaker_endpoint.production]
}

resource "aws_cloudwatch_metric_alarm" "endpoint_errors" {
  alarm_name          = "sagemaker-endpoint-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Invocation5XXErrors"
  namespace           = "AWS/SageMaker"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  dimensions = { EndpointName = aws_sagemaker_endpoint.production.name }
}

# ── CI/CD Orchestration ──────────────────────────────────

resource "aws_sfn_state_machine" "ml_pipeline" {
  name     = "ml-training-pipeline"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    StartAt = "PreprocessData"
    States = {
      PreprocessData = { Type = "Task", Next = "TrainModel" }
      TrainModel     = { Type = "Task", Next = "EvaluateModel" }
      EvaluateModel  = { Type = "Choice", Choices = [
        { Variable = "$.accuracy", NumericGreaterThan = 0.95, Next = "RegisterModel" }
      ], Default = "TrainingFailed" }
      RegisterModel  = { Type = "Task", Next = "DeployModel" }
      DeployModel    = { Type = "Task", End = true }
      TrainingFailed = { Type = "Fail" }
    }
  })
}

resource "aws_codepipeline" "ml_cicd" {
  name     = "ml-model-pipeline"
  role_arn = aws_iam_role.sagemaker_role.arn

  artifact_store {
    location = aws_s3_bucket.model_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name     = "Source"
      category = "Source"
      owner    = "AWS"
      provider = "CodeCommit"
      version  = "1"
      output_artifacts = ["source"]
      configuration = { RepositoryName = "ml-pipeline", BranchName = "main" }
    }
  }

  stage {
    name = "Train"
    action {
      name     = "TriggerPipeline"
      category = "Invoke"
      owner    = "AWS"
      provider = "StepFunctions"
      version  = "1"
      input_artifacts = ["source"]
      configuration = { StateMachineArn = aws_sfn_state_machine.ml_pipeline.arn }
    }
  }
}

# ── IAM ───────────────────────────────────────────────────

resource "aws_iam_role" "sagemaker_role" {
  name = "mlops-sagemaker-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow",
      Principal = { Service = "sagemaker.amazonaws.com" } }]
  })
}

resource "aws_iam_role" "step_functions_role" {
  name = "mlops-stepfunctions-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow",
      Principal = { Service = "states.amazonaws.com" } }]
  })
}
`,
  },
  {
    name: 'K8s + Ray (Fleet)',
    description: 'Distributed training and fleet telemetry on OpenStack K8s with Ray, Kafka, Postgres, Weaviate, and Prometheus',
    code: `# ===========================================================
# Fleet-Scale MLOps on OpenStack Kubernetes
# Ray distributed training | Kafka telemetry | gRPC inference
# Weaviate vector DB | Postgres metadata | Prometheus + Grafana
# ===========================================================

provider "openstack" {
  auth_url = "https://keystone.example.com:5000/v3"
  region   = "RegionOne"
}

provider "helm" {
  kubernetes {
    host                   = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.host
    client_certificate     = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.client_certificate
    client_key             = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.client_key
    cluster_ca_certificate = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.cluster_ca_certificate
  }
}

provider "kubernetes" {
  host                   = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.host
  client_certificate     = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.client_certificate
  client_key             = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.client_key
  cluster_ca_certificate = openstack_containerinfra_cluster_v1.ml_cluster.kubeconfig.cluster_ca_certificate
}

# ── OpenStack: Networking ─────────────────────────────────

resource "openstack_networking_network_v2" "ml_network" {
  name           = "fleet-ml-network"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "ml_subnet" {
  name            = "fleet-ml-subnet"
  network_id      = openstack_networking_network_v2.ml_network.id
  cidr            = "10.10.0.0/16"
  ip_version      = 4
  dns_nameservers = ["8.8.8.8"]
}

resource "openstack_networking_router_v2" "ml_router" {
  name                = "fleet-ml-router"
  external_network_id = var.external_network_id
}

resource "openstack_networking_router_interface_v2" "ml_router_iface" {
  router_id = openstack_networking_router_v2.ml_router.id
  subnet_id = openstack_networking_subnet_v2.ml_subnet.id
}

resource "openstack_networking_secgroup_v2" "ml_secgroup" {
  name        = "fleet-ml-secgroup"
  description = "Security group for ML cluster"
}

resource "openstack_networking_secgroup_rule_v2" "grpc_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 50051
  port_range_max    = 50051
  security_group_id = openstack_networking_secgroup_v2.ml_secgroup.id
}

# ── OpenStack: K8s Cluster (Magnum) ──────────────────────

resource "openstack_containerinfra_clustertemplate_v1" "gpu_template" {
  name                  = "fleet-gpu-k8s"
  image                 = "fedora-coreos-38-gpu"
  coe                   = "kubernetes"
  flavor                = "gpu.a100.2x"
  master_flavor         = "m1.xlarge"
  docker_storage_driver = "overlay2"
  network_driver        = "calico"
  external_network_id   = var.external_network_id
  fixed_network         = openstack_networking_network_v2.ml_network.id
  fixed_subnet          = openstack_networking_subnet_v2.ml_subnet.id
}

resource "openstack_containerinfra_cluster_v1" "ml_cluster" {
  name                = "fleet-ml-cluster"
  cluster_template_id = openstack_containerinfra_clustertemplate_v1.gpu_template.id
  master_count        = 3
  node_count          = 8
  keypair             = var.keypair_name
}

# ── OpenStack: PostgreSQL (Trove) ────────────────────────

resource "openstack_db_instance_v1" "postgres" {
  name      = "ml-metadata-db"
  flavor_id = var.db_flavor_id
  size      = 100

  datastore {
    type    = "postgresql"
    version = "15"
  }

  network {
    uuid = openstack_networking_network_v2.ml_network.id
  }
}

# ── OpenStack: Swift Object Storage ──────────────────────

resource "openstack_objectstorage_container_v1" "training_data" {
  name     = "fleet-training-data"
  metadata = { purpose = "Training datasets" }
}

resource "openstack_objectstorage_container_v1" "model_artifacts" {
  name     = "fleet-model-artifacts"
  metadata = { purpose = "Model binaries and checkpoints" }
}

# ── Kubernetes: Namespaces ───────────────────────────────

resource "kubernetes_namespace" "training" {
  metadata { name = "ml-training" }

  depends_on = [openstack_containerinfra_cluster_v1.ml_cluster]
}

resource "kubernetes_namespace" "inference" {
  metadata { name = "ml-inference" }

  depends_on = [openstack_containerinfra_cluster_v1.ml_cluster]
}

resource "kubernetes_namespace" "data" {
  metadata { name = "ml-data" }

  depends_on = [openstack_containerinfra_cluster_v1.ml_cluster]
}

resource "kubernetes_namespace" "monitoring" {
  metadata { name = "ml-monitoring" }

  depends_on = [openstack_containerinfra_cluster_v1.ml_cluster]
}

# ── Helm: Kafka (Strimzi) ───────────────────────────────

resource "helm_release" "strimzi_operator" {
  name       = "strimzi"
  repository = "https://strimzi.io/charts/"
  chart      = "strimzi-kafka-operator"
  version    = "0.40.0"
  namespace  = kubernetes_namespace.data.metadata[0].name
}

resource "helm_release" "kafka_cluster" {
  name      = "fleet-kafka"
  chart     = "./charts/kafka-cluster"
  namespace = kubernetes_namespace.data.metadata[0].name

  depends_on = [helm_release.strimzi_operator]
}

# ── Helm: Feast Feature Store ────────────────────────────

resource "helm_release" "feast" {
  name       = "feast"
  repository = "https://feast-helm-charts.storage.googleapis.com"
  chart      = "feast"
  version    = "0.37.0"
  namespace  = kubernetes_namespace.data.metadata[0].name

  set {
    name  = "global.registry.path"
    value = "postgresql://mlops:secret@\${openstack_db_instance_v1.postgres.addresses[0].address}:5432/feature_store"
  }

  depends_on = [openstack_db_instance_v1.postgres, helm_release.kafka_cluster]
}

# ── Helm: Ray (Distributed Training) ────────────────────

resource "helm_release" "ray_operator" {
  name       = "kuberay-operator"
  repository = "https://ray-project.github.io/kuberay-helm/"
  chart      = "kuberay-operator"
  version    = "1.1.0"
  namespace  = kubernetes_namespace.training.metadata[0].name
}

resource "helm_release" "ray_cluster" {
  name       = "ray-fleet-training"
  repository = "https://ray-project.github.io/kuberay-helm/"
  chart      = "ray-cluster"
  version    = "1.1.0"
  namespace  = kubernetes_namespace.training.metadata[0].name

  depends_on = [
    helm_release.ray_operator,
    openstack_objectstorage_container_v1.training_data,
    helm_release.feast
  ]
}

# ── Helm: MLflow (Model Registry) ───────────────────────

resource "helm_release" "mlflow" {
  name       = "mlflow"
  repository = "https://community-charts.github.io/helm-charts"
  chart      = "mlflow"
  version    = "0.7.19"
  namespace  = kubernetes_namespace.training.metadata[0].name

  set {
    name  = "backendStore.databaseUrl"
    value = "postgresql://mlops:secret@\${openstack_db_instance_v1.postgres.addresses[0].address}:5432/mlflow"
  }

  set {
    name  = "artifactRoot"
    value = "swift://\${openstack_objectstorage_container_v1.model_artifacts.name}/"
  }

  depends_on = [helm_release.ray_cluster]
}

# ── Helm: Weaviate (Vector DB) ──────────────────────────

resource "helm_release" "weaviate" {
  name       = "weaviate"
  repository = "https://weaviate.github.io/weaviate-helm"
  chart      = "weaviate"
  version    = "16.8.0"
  namespace  = kubernetes_namespace.data.metadata[0].name

  depends_on = [openstack_objectstorage_container_v1.model_artifacts]
}

# ── Kubernetes: gRPC Triton Inference ────────────────────

resource "kubernetes_deployment" "grpc_model_server" {
  metadata {
    name      = "grpc-model-server"
    namespace = kubernetes_namespace.inference.metadata[0].name
    labels    = { app = "model-server" }
  }

  spec {
    replicas = 4

    selector { match_labels = { app = "model-server" } }

    template {
      metadata {
        labels      = { app = "model-server" }
        annotations = { "prometheus.io/scrape" = "true", "prometheus.io/port" = "9090" }
      }

      spec {
        container {
          name  = "triton"
          image = "nvcr.io/nvidia/tritonserver:24.01-py3"

          port { container_port = 50051; name = "grpc" }
          port { container_port = 9090; name = "metrics" }

          resources {
            requests = { cpu = "4", memory = "16Gi", "nvidia.com/gpu" = "1" }
            limits   = { cpu = "8", memory = "32Gi", "nvidia.com/gpu" = "1" }
          }
        }
      }
    }
  }

  depends_on = [
    helm_release.mlflow,
    helm_release.weaviate,
    helm_release.kafka_cluster
  ]
}

resource "kubernetes_service" "grpc_model_server" {
  metadata {
    name      = "model-server-grpc"
    namespace = kubernetes_namespace.inference.metadata[0].name
  }

  spec {
    selector = { app = "model-server" }
    port {
      name        = "grpc"
      port        = 50051
      target_port = 50051
    }
    type = "ClusterIP"
  }

  depends_on = [kubernetes_deployment.grpc_model_server]
}

# ── OpenStack: External gRPC Load Balancer ───────────────

resource "openstack_lb_loadbalancer_v2" "grpc_lb" {
  name          = "fleet-grpc-lb"
  vip_subnet_id = openstack_networking_subnet_v2.ml_subnet.id
}

resource "openstack_lb_listener_v2" "grpc_listener" {
  name            = "grpc-listener"
  protocol        = "TCP"
  protocol_port   = 50051
  loadbalancer_id = openstack_lb_loadbalancer_v2.grpc_lb.id
}

resource "openstack_lb_pool_v2" "grpc_pool" {
  name        = "grpc-model-pool"
  protocol    = "TCP"
  lb_method   = "LEAST_CONNECTIONS"
  listener_id = openstack_lb_listener_v2.grpc_listener.id
}

resource "openstack_networking_floatingip_v2" "grpc_fip" {
  pool = var.floating_ip_pool
}

resource "openstack_networking_floatingip_associate_v2" "grpc_fip_assoc" {
  floating_ip = openstack_networking_floatingip_v2.grpc_fip.address
  port_id     = openstack_lb_loadbalancer_v2.grpc_lb.vip_port_id
}

# ── Helm: Prometheus + Grafana ───────────────────────────

resource "helm_release" "prometheus_stack" {
  name       = "kube-prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "58.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  depends_on = [
    kubernetes_service.grpc_model_server,
    helm_release.ray_cluster,
    helm_release.kafka_cluster
  ]
}

# ── Helm: OpenTelemetry Collector ────────────────────────

resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  version    = "0.86.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  depends_on = [helm_release.prometheus_stack]
}

# ── Kubernetes: Scheduled Retraining CronJob ─────────────

resource "kubernetes_cron_job" "retrain_trigger" {
  metadata {
    name      = "scheduled-retrain"
    namespace = kubernetes_namespace.training.metadata[0].name
  }

  spec {
    schedule = "0 2 * * 1"

    job_template {
      metadata { labels = { job = "retrain" } }
      spec {
        template {
          metadata { labels = { job = "retrain" } }
          spec {
            container {
              name    = "trigger"
              image   = "curlimages/curl:latest"
              command = ["/bin/sh", "-c", "curl -X POST http://ray-fleet-training-head-svc:8265/api/jobs/"]
            }
            restart_policy = "OnFailure"
          }
        }
      }
    }
  }

  depends_on = [helm_release.ray_cluster, helm_release.mlflow]
}

# ── Variables ─────────────────────────────────────────────

variable "external_network_id" {
  description = "OpenStack external network ID"
  type        = string
}

variable "keypair_name" {
  description = "SSH keypair for cluster nodes"
  type        = string
  default     = "ml-platform-key"
}

variable "db_flavor_id" {
  description = "Trove DB flavor ID"
  type        = string
  default     = "m1.large"
}

variable "floating_ip_pool" {
  description = "Floating IP pool name"
  type        = string
  default     = "external"
}
`,
  },
];
