terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# KMS Key for Encryption at Rest
resource "aws_kms_key" "main" {
  description             = "KMS key for ${var.project_name}-${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Private S3 Buckets for Data Export and Firmware Staging
resource "aws_s3_bucket" "exports" {
  bucket        = "${var.project_name}-${var.environment}-exports"
  force_destroy = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "exports_crypto" {
  bucket = aws_s3_bucket.exports.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "exports_block" {
  bucket = aws_s3_bucket.exports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Secrets Manager for Application Credentials
resource "aws_secretsmanager_secret" "app_secrets" {
  name       = "${var.project_name}/${var.environment}/app-secrets"
  kms_key_id = aws_kms_key.main.arn
}
