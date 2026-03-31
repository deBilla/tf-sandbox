export interface Sample {
  name: string;
  description: string;
  code: string;
}

export const SAMPLES: Sample[] = [
  {
    name: 'Minimal',
    description: '1 variable + 1 resource + 1 output',
    code: `variable "region" {
  description = "The AWS region"
  type        = string
  default     = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
    Env  = var.region
  }
}

output "instance_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP of the web server"
}
`,
  },
  {
    name: 'AWS VPC + EC2',
    description: 'VPC, subnet, security group, EC2, RDS',
    code: `variable "region" {
  default = "us-west-2"
}

variable "environment" {
  default = "staging"
}

variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "\${var.environment}-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "\${var.region}a"
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "\${var.region}b"
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "\${var.environment}-web"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet"
  subnet_ids = [aws_subnet.private.id, aws_subnet.public.id]
}

resource "aws_db_instance" "postgres" {
  identifier        = "\${var.environment}-db"
  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  db_name           = "app"
  username          = "admin"
  password          = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.web.id]
  skip_final_snapshot = true
}

resource "aws_s3_bucket" "assets" {
  bucket = "\${var.environment}-app-assets"
}

output "web_ip" {
  value = aws_instance.web.public_ip
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.assets.id
}
`,
  },
  {
    name: 'GKE Cluster',
    description: 'Google Cloud GKE + Network + Monitoring',
    code: `variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  default = "us-central1"
}

variable "environment" {
  default = "staging"
}

locals {
  cluster_name = "\${var.environment}-gke"
  network_name = "\${var.environment}-vpc"
}

resource "google_compute_network" "vpc" {
  name                    = local.network_name
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "\${var.environment}-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/20"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

resource "google_container_cluster" "primary" {
  name     = local.cluster_name
  project  = var.project_id
  location = var.region
  network  = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  remove_default_node_pool = true
  initial_node_count       = 1

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "\${var.environment}-node-pool"
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.primary.name

  node_count = 3

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }
}

resource "google_monitoring_alert_policy" "cpu" {
  display_name = "High CPU - \${local.cluster_name}"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "CPU utilization"
    condition_threshold {
      filter          = "resource.type = \\"gke_container\\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
    }
  }
}

output "cluster_endpoint" {
  value = google_container_cluster.primary.endpoint
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}
`,
  },
];
