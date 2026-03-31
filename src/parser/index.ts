import type { TFGraph } from './types';
import { tokenize } from './tokenizer';
import { extractBlocks } from './parser';
import { resolveReferences } from './references';

export function parseTerraform(input: string): TFGraph {
  if (!input.trim()) {
    return { blocks: [], edges: [], errors: [] };
  }

  try {
    const cleaned = tokenize(input);
    const { blocks, errors: blockErrors } = extractBlocks(cleaned);
    const { edges, errors: refErrors } = resolveReferences(blocks);

    return {
      blocks,
      edges,
      errors: [...blockErrors, ...refErrors],
    };
  } catch (e) {
    return {
      blocks: [],
      edges: [],
      errors: [{ line: 0, message: `Parser error: ${e instanceof Error ? e.message : String(e)}`, severity: 'error' }],
    };
  }
}

export type { TFBlock, TFEdge, TFGraph, ParseError, BlockKind } from './types';
