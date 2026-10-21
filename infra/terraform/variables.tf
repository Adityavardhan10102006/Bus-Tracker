variable "aws_region" {
  description = "AWS India Region per Decision 2 / Master Plan"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Target deployment environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
  default     = "vjit-bus-tracker"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}
