import type { ToolDescriptor } from './types';
import { SAMPLES as tfSamples } from '../utils/samples';
import { MLOPS_PRESETS } from './mlops/presets';

export const TOOLS: ToolDescriptor[] = [
  {
    id: 'terraform',
    label: 'Terraform Sandbox',
    shortLabel: 'Terraform',
    icon: 'T',
    editorLanguage: 'hcl',
    placeholder: 'Paste your .tf configuration here...',
    samples: tfSamples,
  },
  {
    id: 'cost',
    label: 'Cost Explorer',
    shortLabel: 'Cost',
    icon: '$',
    editorLanguage: 'hcl',
    placeholder: 'Paste .tf configuration to estimate costs...',
    samples: tfSamples,
  },
  {
    id: 'drift',
    label: 'Drift Detector',
    shortLabel: 'Drift',
    icon: 'D',
    editorLanguage: 'json',
    placeholder: '// Paste terraform show -json output here\n// Then switch to the Code tab to paste your .tf files',
    samples: [
      {
        name: 'Example State',
        description: 'Sample terraform state JSON',
        code: JSON.stringify({
          format_version: "1.0",
          terraform_version: "1.5.0",
          values: {
            root_module: {
              resources: [
                { address: "aws_instance.web", type: "aws_instance", name: "web", values: { ami: "ami-OLD", instance_type: "t2.micro", tags: { Name: "web" } } },
                { address: "aws_vpc.main", type: "aws_vpc", name: "main", values: { cidr_block: "10.0.0.0/16" } },
                { address: "aws_s3_bucket.data", type: "aws_s3_bucket", name: "data", values: { bucket: "my-data-bucket" } },
              ]
            }
          }
        }, null, 2),
      }
    ],
  },
  {
    id: 'rbac',
    label: 'RBAC Visualizer',
    shortLabel: 'RBAC',
    icon: 'R',
    editorLanguage: 'json',
    placeholder: 'Paste AWS IAM policy JSON or K8s RBAC YAML...',
    samples: [
      {
        name: 'AWS IAM',
        description: 'AWS IAM policies and roles',
        code: JSON.stringify({
          roles: [
            {
              name: "admin-role",
              arn: "arn:aws:iam::123456:role/admin",
              policies: [{ name: "AdministratorAccess", actions: ["*"], resources: ["*"] }]
            },
            {
              name: "dev-role",
              arn: "arn:aws:iam::123456:role/developer",
              policies: [
                { name: "S3ReadOnly", actions: ["s3:GetObject", "s3:ListBucket"], resources: ["arn:aws:s3:::app-*"] },
                { name: "EC2Manage", actions: ["ec2:Describe*", "ec2:StartInstances", "ec2:StopInstances"], resources: ["*"] },
              ]
            },
            {
              name: "ci-role",
              arn: "arn:aws:iam::123456:role/ci-pipeline",
              policies: [
                { name: "ECRPush", actions: ["ecr:*"], resources: ["arn:aws:ecr:::repository/app-*"] },
                { name: "EKSDeploy", actions: ["eks:DescribeCluster", "eks:ListClusters"], resources: ["*"] },
                { name: "S3Deploy", actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], resources: ["arn:aws:s3:::deploy-*"] },
              ]
            },
            {
              name: "readonly-role",
              arn: "arn:aws:iam::123456:role/readonly",
              policies: [{ name: "ReadOnlyAccess", actions: ["*:Describe*", "*:List*", "*:Get*"], resources: ["*"] }]
            }
          ]
        }, null, 2),
      },
    ],
  },
  {
    id: 'mlops',
    label: 'MLOps Visualizer',
    shortLabel: 'MLOps',
    icon: 'M',
    editorLanguage: 'hcl',
    placeholder: 'Paste your Terraform ML infrastructure code here or use a preset above...',
    samples: MLOPS_PRESETS,
  },
];

export function getToolById(id: string): ToolDescriptor | undefined {
  return TOOLS.find(t => t.id === id);
}
