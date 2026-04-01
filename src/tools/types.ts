export type ToolId = 'terraform' | 'cost' | 'drift' | 'rbac';

export interface ToolDescriptor {
  id: ToolId;
  label: string;
  shortLabel: string;
  icon: string;
  editorLanguage: string;
  placeholder: string;
  samples: { name: string; description: string; code: string }[];
}

export interface CostEstimate {
  resourceId: string;
  resourceType: string;
  monthlyCost: number | null;
  unit: string;
  note?: string;
}

export interface CostAnnotations {
  perResource: CostEstimate[];
  totalMonthlyCost: number;
  coveredCount: number;
  uncoveredCount: number;
}

export interface DriftResource {
  id: string;
  type: string;
  name: string;
  status: 'in-sync' | 'drifted' | 'missing-in-state' | 'missing-in-code';
  driftedAttributes?: { key: string; declared: string; actual: string }[];
}

export interface DriftReport {
  resources: DriftResource[];
  summary: { total: number; inSync: number; drifted: number; missingInState: number; missingInCode: number };
}

export interface RBACPrincipal {
  id: string;
  name: string;
  kind: 'user' | 'group' | 'role' | 'serviceaccount';
}

export interface RBACBinding {
  principal: string;
  role: string;
  resources: string[];
  actions: string[];
}

export interface RBACIssue {
  principalId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface RBACGraph {
  principals: RBACPrincipal[];
  bindings: RBACBinding[];
  issues: RBACIssue[];
}
