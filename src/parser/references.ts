/**
 * Dependency Resolver — finds references between blocks and produces edges.
 */

import type { TFBlock, TFEdge, ParseError } from './types';

export function resolveReferences(blocks: TFBlock[]): { edges: TFEdge[]; errors: ParseError[] } {
  const edges: TFEdge[] = [];
  const errors: ParseError[] = [];

  // Build index of known block IDs for matching
  const blockIds = new Set(blocks.map(b => b.id));

  // Build resource short names: "aws_instance.web" -> exists
  const resourceIds = new Set<string>();
  for (const b of blocks) {
    if (b.kind === 'resource' && b.type) {
      resourceIds.add(`${b.type}.${b.name}`);
    }
  }

  // Reference patterns
  // Matches var.NAME, local.NAME, module.NAME (with optional .output suffix)
  const builtinRefPattern = /(?:var|local|module)\.[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
  const dataRefPattern = /data\.[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*/g;

  // Build a dynamic regex for resource refs from known resource type.name pairs
  // e.g. matches aws_security_group.rds.id, aws_s3_bucket.models.arn, etc.
  const resourceTypeNames = blocks
    .filter(b => b.kind === 'resource' && b.type)
    .map(b => `${b.type!}.${b.name}`);

  const resourceRefPattern = resourceTypeNames.length > 0
    ? new RegExp(
        `(?:${resourceTypeNames.map(r => escapeRegex(r)).join('|')})(?:\\.[a-zA-Z_][a-zA-Z0-9_]*)*`,
        'g'
      )
    : null;

  const edgeSet = new Set<string>();

  for (const block of blocks) {
    const text = block.rawBody;
    const foundRefs = new Set<string>();

    // Find var.X, local.X, module.X.output references
    for (const match of text.matchAll(builtinRefPattern)) {
      const ref = match[0];
      const parts = ref.split('.');
      const targetId = `${parts[0]}.${parts[1]}`;
      foundRefs.add(targetId);
    }

    // Find data.TYPE.NAME references
    for (const match of text.matchAll(dataRefPattern)) {
      const ref = match[0];
      const parts = ref.split('.');
      const targetId = `${parts[0]}.${parts[1]}.${parts[2]}`;
      foundRefs.add(targetId);
    }

    // Find resource references (TYPE.NAME.attr)
    if (resourceRefPattern) {
      for (const match of text.matchAll(resourceRefPattern)) {
        const ref = match[0];
        const parts = ref.split('.');
        const targetId = `${parts[0]}.${parts[1]}`;
        if (resourceIds.has(targetId)) {
          foundRefs.add(targetId);
        }
      }
    }

    // Also scan depends_on blocks for explicit references
    const dependsOnRefs = extractDependsOn(text, blockIds, resourceIds);
    for (const ref of dependsOnRefs) {
      foundRefs.add(ref);
    }

    // Create edges, filtering self-refs and duplicates
    for (const targetId of foundRefs) {
      if (targetId === block.id) continue;
      if (!blockIds.has(targetId)) continue;

      const edgeKey = `${block.id}->${targetId}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      const label = findAttributeLabel(block.rawBody, targetId);

      edges.push({
        source: block.id,
        target: targetId,
        label,
      });

      block.refs.push(targetId);
    }
  }

  // Detect cycles
  const cycleErrors = detectCycles(blocks, edges);
  errors.push(...cycleErrors);

  return { edges, errors };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Extract references from depends_on = [...] blocks */
function extractDependsOn(
  rawBody: string,
  blockIds: Set<string>,
  resourceIds: Set<string>
): Set<string> {
  const refs = new Set<string>();
  const dependsOnMatch = rawBody.match(/depends_on\s*=\s*\[([\s\S]*?)\]/);
  if (!dependsOnMatch) return refs;

  const content = dependsOnMatch[1];
  // Match resource-style refs: aws_s3_bucket.models, module.eks, etc.
  const refPattern = /[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
  for (const match of content.matchAll(refPattern)) {
    const ref = match[0];
    const parts = ref.split('.');

    // Check if it's a known resource TYPE.NAME
    const asResource = `${parts[0]}.${parts[1]}`;
    if (resourceIds.has(asResource)) {
      refs.add(asResource);
      continue;
    }

    // Check module.X, var.X, local.X
    if (['module', 'var', 'local'].includes(parts[0])) {
      refs.add(asResource);
      continue;
    }

    // Check data.TYPE.NAME
    if (parts[0] === 'data' && parts.length >= 3) {
      refs.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
      continue;
    }

    // Check if it exists as any block ID
    if (blockIds.has(asResource)) {
      refs.add(asResource);
    }
  }

  return refs;
}

function findAttributeLabel(rawBody: string, targetRef: string): string | undefined {
  const lines = rawBody.split('\n');
  const escaped = escapeRegex(targetRef);
  const pattern = new RegExp(escaped);

  // First pass: look for the ref on a line with attr = ...
  for (const line of lines) {
    if (pattern.test(line)) {
      const attrMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/);
      if (attrMatch) return attrMatch[1];
    }
  }

  // Second pass: look for the ref in a multiline context — find the nearest attr above it
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      // Walk backwards to find the attribute assignment
      for (let j = i; j >= 0; j--) {
        const attrMatch = lines[j].match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/);
        if (attrMatch) return attrMatch[1];
      }
    }
  }
  return undefined;
}

function detectCycles(blocks: TFBlock[], edges: TFEdge[]): ParseError[] {
  const errors: ParseError[] = [];
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (inStack.has(neighbor)) {
        const block = blocks.find(b => b.id === nodeId);
        errors.push({
          line: block?.lineStart ?? 0,
          message: `Circular dependency: ${nodeId} -> ${neighbor}`,
          severity: 'warning',
        });
        return true;
      }
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const block of blocks) {
    if (!visited.has(block.id)) {
      dfs(block.id);
    }
  }

  return errors;
}
