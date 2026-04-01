import type { TFBlock, TFGraph } from '../../parser/types';
import type { DriftReport, DriftResource } from '../types';

interface StateResource {
  address: string;
  type: string;
  name: string;
  values: Record<string, unknown>;
}

export function parseStateJson(json: string): TFGraph {
  try {
    const state = JSON.parse(json);
    const resources = extractResources(state);
    const blocks: TFBlock[] = resources.map(r => ({
      kind: 'resource' as const,
      type: r.type,
      name: r.name,
      id: `${r.type}.${r.name}`,
      provider: r.type.indexOf('_') > 0 ? r.type.substring(0, r.type.indexOf('_')) : undefined,
      attributes: flattenValues(r.values),
      rawBody: JSON.stringify(r.values, null, 2),
      refs: [],
      lineStart: 0,
      lineEnd: 0,
    }));
    return { blocks, edges: [], errors: [] };
  } catch (e) {
    return {
      blocks: [], edges: [],
      errors: [{ line: 0, message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, severity: 'error' }],
    };
  }
}

function extractResources(state: any): StateResource[] {
  const resources: StateResource[] = [];

  // Handle terraform show -json format
  if (state.values?.root_module?.resources) {
    for (const r of state.values.root_module.resources) {
      resources.push({
        address: r.address,
        type: r.type,
        name: r.name,
        values: r.values ?? {},
      });
    }
    // Child modules
    for (const mod of state.values.root_module.child_modules ?? []) {
      for (const r of mod.resources ?? []) {
        resources.push({
          address: r.address,
          type: r.type,
          name: r.name,
          values: r.values ?? {},
        });
      }
    }
  }

  return resources;
}

function flattenValues(values: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(values)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && !Array.isArray(val)) continue; // skip nested objects
    result[key] = String(val);
  }
  return result;
}

export function computeDrift(codeGraph: TFGraph, stateGraph: TFGraph): DriftReport {
  const codeResources = new Map(
    codeGraph.blocks.filter(b => b.kind === 'resource').map(b => [b.id, b])
  );
  const stateResources = new Map(
    stateGraph.blocks.filter(b => b.kind === 'resource').map(b => [b.id, b])
  );

  const resources: DriftResource[] = [];
  const allIds = new Set([...codeResources.keys(), ...stateResources.keys()]);

  for (const id of allIds) {
    const inCode = codeResources.get(id);
    const inState = stateResources.get(id);

    if (inCode && !inState) {
      resources.push({ id, type: inCode.type ?? '', name: inCode.name, status: 'missing-in-state' });
    } else if (!inCode && inState) {
      resources.push({ id, type: inState.type ?? '', name: inState.name, status: 'missing-in-code' });
    } else if (inCode && inState) {
      // Compare attributes
      const drifted = findDriftedAttributes(inCode.attributes, inState.attributes);
      resources.push({
        id,
        type: inCode.type ?? '',
        name: inCode.name,
        status: drifted.length > 0 ? 'drifted' : 'in-sync',
        driftedAttributes: drifted.length > 0 ? drifted : undefined,
      });
    }
  }

  const summary = {
    total: resources.length,
    inSync: resources.filter(r => r.status === 'in-sync').length,
    drifted: resources.filter(r => r.status === 'drifted').length,
    missingInState: resources.filter(r => r.status === 'missing-in-state').length,
    missingInCode: resources.filter(r => r.status === 'missing-in-code').length,
  };

  return { resources, summary };
}

function findDriftedAttributes(
  codeAttrs: Record<string, string>,
  stateAttrs: Record<string, string>
): { key: string; declared: string; actual: string }[] {
  const drifted: { key: string; declared: string; actual: string }[] = [];
  const skipKeys = new Set(['id', 'arn', 'tags_all', 'owner_id', 'vpc_id']);

  for (const [key, codeVal] of Object.entries(codeAttrs)) {
    if (skipKeys.has(key)) continue;
    // Strip quotes and interpolation for comparison
    const cleanCode = codeVal.replace(/^"/, '').replace(/"$/, '');
    if (cleanCode.includes('${') || cleanCode.startsWith('var.') || cleanCode.startsWith('local.')) continue;

    const stateVal = stateAttrs[key];
    if (stateVal !== undefined && stateVal !== cleanCode && stateVal !== codeVal) {
      drifted.push({ key, declared: cleanCode, actual: stateVal });
    }
  }

  return drifted;
}
