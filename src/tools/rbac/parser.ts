import type { TFBlock, TFEdge, TFGraph } from '../../parser/types';
import type { RBACGraph, RBACIssue } from '../types';

interface IAMInput {
  roles: {
    name: string;
    arn?: string;
    policies: { name: string; actions: string[]; resources: string[] }[];
  }[];
}

export function parseRBAC(json: string): { graph: TFGraph; rbac: RBACGraph } {
  try {
    const input: IAMInput = JSON.parse(json);
    return buildRBACGraph(input);
  } catch (e) {
    return {
      graph: { blocks: [], edges: [], errors: [{ line: 0, message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, severity: 'error' }] },
      rbac: { principals: [], bindings: [], issues: [] },
    };
  }
}

function buildRBACGraph(input: IAMInput): { graph: TFGraph; rbac: RBACGraph } {
  const blocks: TFBlock[] = [];
  const edges: TFEdge[] = [];
  const issues: RBACIssue[] = [];

  // Collect all unique resources referenced in policies
  const allResources = new Set<string>();

  for (const role of input.roles) {
    // Role as a block
    const roleId = `role.${role.name}`;
    blocks.push({
      kind: 'module' as const, // reuse module style for roles
      name: role.name,
      id: roleId,
      attributes: { arn: role.arn ?? '' },
      rawBody: JSON.stringify(role, null, 2),
      refs: [],
      lineStart: 0,
      lineEnd: 0,
    });

    for (const policy of role.policies) {
      const policyId = `policy.${role.name}.${policy.name}`;
      const actionsStr = policy.actions.join(', ');
      const resourcesStr = policy.resources.join(', ');

      blocks.push({
        kind: 'resource' as const,
        type: 'iam_policy',
        name: policy.name,
        id: policyId,
        provider: 'iam',
        attributes: { actions: actionsStr, resources: resourcesStr },
        rawBody: JSON.stringify(policy, null, 2),
        refs: [],
        lineStart: 0,
        lineEnd: 0,
      });

      // Edge: role -> policy
      edges.push({ source: roleId, target: policyId, label: 'has policy' });

      // Create resource target nodes
      for (const res of policy.resources) {
        const resId = `target.${sanitize(res)}`;
        if (!allResources.has(resId)) {
          allResources.add(resId);
          blocks.push({
            kind: 'data' as const,
            type: 'resource_target',
            name: res.length > 40 ? res.slice(0, 37) + '...' : res,
            id: resId,
            attributes: { arn: res },
            rawBody: res,
            refs: [],
            lineStart: 0,
            lineEnd: 0,
          });
        }
        edges.push({ source: policyId, target: resId, label: policy.actions[0] });
      }

      // Check for overprivileged patterns
      if (policy.actions.includes('*')) {
        issues.push({
          principalId: roleId,
          severity: 'error',
          message: `${role.name} has wildcard (*) actions via ${policy.name}`,
        });
      }
      if (policy.actions.some(a => a.endsWith('*')) && !policy.actions.includes('*')) {
        issues.push({
          principalId: roleId,
          severity: 'warning',
          message: `${role.name} has broad wildcard actions in ${policy.name}: ${policy.actions.filter(a => a.endsWith('*')).join(', ')}`,
        });
      }
      if (policy.resources.includes('*')) {
        issues.push({
          principalId: roleId,
          severity: 'warning',
          message: `${role.name} / ${policy.name} targets all resources (*)`,
        });
      }
    }
  }

  return {
    graph: { blocks, edges, errors: [] },
    rbac: {
      principals: input.roles.map(r => ({
        id: `role.${r.name}`,
        name: r.name,
        kind: 'role' as const,
      })),
      bindings: input.roles.flatMap(r =>
        r.policies.map(p => ({
          principal: `role.${r.name}`,
          role: p.name,
          resources: p.resources,
          actions: p.actions,
        }))
      ),
      issues,
    },
  };
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_');
}
