package terraform.security

import rego.v1

# Input: { blocks: [...], edges: [...] } — the TFGraph from our parser

# --- S3 ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_s3_bucket"
    not has_encryption(block.name, input.blocks)
    result := {
        "severity": "warning",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: no server-side encryption configured", [block.id]),
        "fix": "Add an aws_s3_bucket_server_side_encryption_configuration resource",
    }
}

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_s3_bucket"
    not has_public_access_block(block.name, input.blocks)
    result := {
        "severity": "warning",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: no public access block — bucket may be publicly accessible", [block.id]),
        "fix": "Add an aws_s3_bucket_public_access_block resource",
    }
}

# --- RDS ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_db_instance"
    not block.attributes.storage_encrypted
    result := {
        "severity": "warning",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: storage encryption is not enabled", [block.id]),
        "fix": "Add storage_encrypted = true",
    }
}

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_db_instance"
    password := block.attributes.password
    not contains(password, "var.")
    not contains(password, "data.")
    not contains(password, "random_")
    result := {
        "severity": "error",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: password appears hardcoded — use a variable or secrets manager", [block.id]),
        "fix": "Use var.db_password or aws_secretsmanager_secret",
    }
}

# --- Security Groups ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_security_group"
    contains(block.rawBody, "0.0.0.0/0")
    contains(block.rawBody, "ingress")
    contains(block.rawBody, "22")
    result := {
        "severity": "error",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: SSH port 22 open to 0.0.0.0/0", [block.id]),
        "fix": "Restrict cidr_blocks to known IP ranges",
    }
}

# --- ElastiCache ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_elasticache_replication_group"
    not block.attributes.at_rest_encryption_enabled
    result := {
        "severity": "warning",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: at-rest encryption is not enabled", [block.id]),
        "fix": "Add at_rest_encryption_enabled = true",
    }
}

# --- IAM ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "aws_iam_role_policy"
    contains(block.rawBody, "\"Action\": \"*\"")
    result := {
        "severity": "error",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: IAM policy grants wildcard (*) actions — use least-privilege", [block.id]),
        "fix": "Restrict Action to only the specific permissions needed",
    }
}

# --- GKE ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type == "google_container_cluster"
    not contains(block.rawBody, "network_policy")
    result := {
        "severity": "info",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: no network_policy block — pods can communicate unrestricted", [block.id]),
        "fix": "Add a network_policy block to enable network policies",
    }
}

# --- Tags ---

deny contains result if {
    block := input.blocks[_]
    block.kind == "resource"
    block.type in taggable_types
    not block.attributes.tags
    result := {
        "severity": "info",
        "blockId": block.id,
        "line": block.lineStart,
        "message": sprintf("%s: no tags defined", [block.id]),
        "fix": "Add tags for cost tracking and organization",
    }
}

# --- Helpers ---

has_encryption(bucket_name, blocks) if {
    b := blocks[_]
    b.type == "aws_s3_bucket_server_side_encryption_configuration"
    contains(b.rawBody, bucket_name)
}

has_public_access_block(bucket_name, blocks) if {
    b := blocks[_]
    b.type == "aws_s3_bucket_public_access_block"
    contains(b.rawBody, bucket_name)
}

taggable_types := {
    "aws_instance", "aws_vpc", "aws_subnet", "aws_security_group",
    "aws_s3_bucket", "aws_db_instance", "aws_iam_role",
    "aws_elasticache_replication_group", "aws_lambda_function",
    "google_compute_network", "google_container_cluster",
}
