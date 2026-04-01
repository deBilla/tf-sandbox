/**
 * OPA/WASM policy engine — evaluates compiled Rego policies in the browser.
 * Loads the pre-compiled policy.wasm and runs it against the TFGraph.
 */

import type { TFGraph } from '../parser/types';

let policyInstance: any = null;
let initDone = false;

export interface OPAViolation {
  severity: string;
  blockId: string;
  line: number;
  message: string;
  fix?: string;
}

export async function initOPA(): Promise<boolean> {
  if (initDone) return !!policyInstance;
  initDone = true;

  try {
    const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
    const base = import.meta.env.BASE_URL ?? '/';
    const resp = await fetch(`${base}policy.wasm`);
    const wasmBytes = await resp.arrayBuffer();
    policyInstance = await loadPolicy(wasmBytes);
    console.log('OPA policy engine initialized');
    return true;
  } catch (e) {
    console.warn('OPA init failed, using fallback policies:', e);
    return false;
  }
}

export function isOPAReady(): boolean {
  return !!policyInstance;
}

export function evaluateOPA(graph: TFGraph): OPAViolation[] {
  if (!policyInstance) return [];

  try {
    // OPA expects the input as a JSON-serializable object
    const input = {
      blocks: graph.blocks.map(b => ({
        kind: b.kind,
        type: b.type ?? '',
        name: b.name,
        id: b.id,
        provider: b.provider ?? '',
        attributes: b.attributes,
        rawBody: b.rawBody,
        lineStart: b.lineStart,
        lineEnd: b.lineEnd,
      })),
      edges: graph.edges.map(e => ({
        source: e.source,
        target: e.target,
        label: e.label ?? '',
      })),
    };

    const result = policyInstance.evaluate(input);

    // OPA returns [{ result: [...violations] }]
    if (!result || !result[0] || !result[0].result) return [];

    return result[0].result.map((v: any) => ({
      severity: v.severity ?? 'warning',
      blockId: v.blockId ?? '',
      line: v.line ?? 0,
      message: v.message ?? 'Policy violation',
      fix: v.fix,
    }));
  } catch (e) {
    console.warn('OPA evaluation failed:', e);
    return [];
  }
}
