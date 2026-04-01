import type { TFGraph } from './types';
import { tokenize } from './tokenizer';
import { extractBlocks } from './parser';
import { resolveReferences } from './references';
import { isTreeSitterReady, parseWithTreeSitter, initTreeSitter } from './astParser';

// Initialize tree-sitter on module load — resolves once ready
const treeSitterReady = initTreeSitter();

/** Wait for tree-sitter to be ready (call once at app startup) */
export function waitForParser(): Promise<boolean> {
  return treeSitterReady;
}

export function parseTerraform(input: string): TFGraph {
  if (!input.trim()) {
    return { blocks: [], edges: [], errors: [] };
  }

  // Use tree-sitter AST parser if available (primary)
  if (isTreeSitterReady()) {
    const astResult = parseWithTreeSitter(input);
    if (astResult) return astResult;
    console.warn('[parser] tree-sitter returned null, falling back to regex');
  } else {
    console.warn('[parser] tree-sitter not ready, using regex fallback');
  }

  // Fallback: regex-based parser
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
