/**
 * HCL Block Extractor — extracts TFBlock objects from tokenized (comment-free, placeholder-safe) text.
 */

import type { TFBlock, BlockKind, ParseError } from './types';
import { restorePlaceholders, type CleanedSource } from './tokenizer';

// Also match terraform blocks (to skip over them without crashing on nested backend blocks)
const BLOCK_PATTERN = /^(\s*)(resource|variable|output|data|locals|module|provider|terraform)\s+(?:"([^"]*?)"\s+)?(?:"([^"]*?)"\s+)?\{/;
const SKIP_BLOCKS = new Set(['terraform']);

export function extractBlocks(source: CleanedSource): { blocks: TFBlock[]; errors: ParseError[] } {
  const lines = source.text.split('\n');
  const blocks: TFBlock[] = [];
  const errors: ParseError[] = [];

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(BLOCK_PATTERN);
    if (!match) {
      i++;
      continue;
    }

    const kindStr = match[2];
    const label1 = match[3] ? restorePlaceholders(match[3], source.placeholders) : undefined;
    const label2 = match[4] ? restorePlaceholders(match[4], source.placeholders) : undefined;

    // Find matching closing brace via depth counting
    let depth = 0;
    const startLine = i;
    const bodyLines: string[] = [];

    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      bodyLines.push(line);
      if (depth === 0) {
        i = j + 1;
        break;
      }
      if (j === lines.length - 1) {
        errors.push({ line: startLine + 1, message: `Unclosed block: ${kindStr} ${label1 ?? ''}`, severity: 'error' });
        i = j + 1;
        break;
      }
    }

    if (depth !== 0) continue;

    // Skip non-visual blocks like terraform {}
    if (SKIP_BLOCKS.has(kindStr)) continue;

    const kind = kindStr as BlockKind;
    const rawBody = restorePlaceholders(bodyLines.join('\n'), source.placeholders);
    // Inner body = everything between first { and last }
    const fullText = bodyLines.join('\n');
    const firstBrace = fullText.indexOf('{');
    const lastBrace = fullText.lastIndexOf('}');
    const innerBody = fullText.substring(firstBrace + 1, lastBrace);

    if (kind === 'locals') {
      // Split locals into individual local.X blocks
      const localBlocks = extractLocals(innerBody, rawBody, startLine, startLine + bodyLines.length - 1, source);
      blocks.push(...localBlocks);
    } else {
      const block = buildBlock(kind, label1, label2, innerBody, rawBody, startLine, startLine + bodyLines.length - 1, source);
      if (block) blocks.push(block);
    }
  }

  return { blocks, errors };
}

function buildBlock(
  kind: BlockKind,
  label1: string | undefined,
  label2: string | undefined,
  innerBody: string,
  rawBody: string,
  lineStart: number,
  lineEnd: number,
  source: CleanedSource
): TFBlock | null {
  let type: string | undefined;
  let name: string;
  let id: string;

  switch (kind) {
    case 'resource':
      if (!label1 || !label2) return null;
      type = label1;
      name = label2;
      id = `${label1}.${label2}`;
      break;
    case 'data':
      if (!label1 || !label2) return null;
      type = label1;
      name = label2;
      id = `data.${label1}.${label2}`;
      break;
    case 'variable':
      if (!label1) return null;
      name = label1;
      id = `var.${label1}`;
      break;
    case 'output':
      if (!label1) return null;
      name = label1;
      id = `output.${label1}`;
      break;
    case 'module':
      if (!label1) return null;
      name = label1;
      id = `module.${label1}`;
      break;
    case 'provider':
      if (!label1) return null;
      name = label1;
      id = `provider.${label1}`;
      break;
    default:
      return null;
  }

  const provider = type ? extractProvider(type) : (kind === 'provider' ? name : undefined);
  const attributes = extractAttributes(innerBody, source);

  return {
    kind,
    type,
    name,
    id,
    provider,
    attributes,
    rawBody,
    refs: [],
    lineStart: lineStart + 1, // 1-indexed
    lineEnd: lineEnd + 1,
  };
}

function extractLocals(
  innerBody: string,
  rawBody: string,
  lineStart: number,
  lineEnd: number,
  source: CleanedSource
): TFBlock[] {
  const blocks: TFBlock[] = [];
  // Extract top-level key = value pairs, handling multiline values (maps, lists)
  const localLines = innerBody.split('\n');
  let i = 0;

  while (i < localLines.length) {
    const attrMatch = localLines[i].match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*)/);
    if (!attrMatch) {
      i++;
      continue;
    }

    const key = attrMatch[1];
    let valueStr = attrMatch[2].trim();

    // If the value opens a brace/bracket, collect until it closes
    let depth = 0;
    for (const ch of valueStr) {
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') depth--;
    }

    let endLine = i;
    while (depth > 0 && endLine + 1 < localLines.length) {
      endLine++;
      const nextLine = localLines[endLine];
      valueStr += '\n' + nextLine;
      for (const ch of nextLine) {
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') depth--;
      }
    }

    const restoredValue = restorePlaceholders(valueStr, source.placeholders);

    blocks.push({
      kind: 'locals',
      name: key,
      id: `local.${key}`,
      attributes: { value: restoredValue.length > 80 ? restoredValue.slice(0, 77) + '...' : restoredValue },
      rawBody,
      refs: [],
      lineStart: lineStart + 1,
      lineEnd: lineEnd + 1,
    });

    i = endLine + 1;
  }
  return blocks;
}

function extractAttributes(innerBody: string, source: CleanedSource): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Only top-level attributes (not inside nested blocks)
  let depth = 0;
  for (const line of innerBody.split('\n')) {
    // Check depth BEFORE processing this line's braces
    const prevDepth = depth;
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    // Attribute is top-level if we were at depth 0 before this line
    if (prevDepth === 0) {
      const attrMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.+)/);
      if (attrMatch) {
        const value = restorePlaceholders(attrMatch[2].trim(), source.placeholders);
        attrs[attrMatch[1]] = value;
      }
    }
  }
  return attrs;
}

function extractProvider(resourceType: string): string {
  // google_compute_instance -> google
  // aws_instance -> aws
  // azurerm_virtual_machine -> azurerm
  const idx = resourceType.indexOf('_');
  if (idx === -1) return resourceType;
  return resourceType.substring(0, idx);
}
