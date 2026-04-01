/**
 * Tree-sitter AST-based HCL parser.
 * Replaces the regex-based parser with proper AST walking for accurate
 * block extraction, attribute parsing, and reference resolution.
 */

import type { TFBlock, TFEdge, TFGraph, ParseError, BlockKind } from './types';

const KNOWN_BLOCK_KINDS = new Set<string>([
  'resource', 'variable', 'output', 'data', 'locals', 'module', 'provider',
]);
const SKIP_BLOCK_KINDS = new Set<string>(['terraform']);

let parserInstance: any = null;
let initDone = false;

export async function initTreeSitter(): Promise<boolean> {
  if (initDone) return !!parserInstance;
  initDone = true;

  try {
    const mod = await import('web-tree-sitter');
    const { Parser, Language } = mod;
    const base = import.meta.env.BASE_URL ?? '/';

    await Parser.init({
      locateFile: () => `${base}web-tree-sitter.wasm`,
    });

    const parser = new Parser();
    const hclLang = await Language.load(`${base}tree-sitter-hcl.wasm`);
    parser.setLanguage(hclLang);
    parserInstance = parser;
    return true;
  } catch (e) {
    console.warn('Tree-sitter init failed:', e);
    return false;
  }
}

export function isTreeSitterReady(): boolean {
  return !!parserInstance;
}

export function parseWithTreeSitter(code: string): TFGraph | null {
  if (!parserInstance) return null;

  try {
    const tree = parserInstance.parse(code);
    const graph = extractGraph(tree.rootNode, code);
    console.log(`[tree-sitter] Parsed ${graph.blocks.length} blocks, ${graph.edges.length} edges, ${graph.errors.length} errors`);
    return graph;
  } catch (e) {
    console.error('Tree-sitter parse failed:', e);
    return null;
  }
}

function extractGraph(root: any, _code: string): TFGraph {
  const blocks: TFBlock[] = [];
  const errors: ParseError[] = [];

  // Collect syntax errors
  collectSyntaxErrors(root, errors);

  // Walk all nodes recursively to find blocks — handles both:
  //   Node.js: config_file -> body -> block[]
  //   Browser: config_file -> block[] (no body wrapper, comments mixed in)
  findBlocks(root, blocks);

  // Resolve references — walk the full tree for variable_expr chains
  const edges = resolveRefsFromAST(blocks, root);

  return { blocks, edges, errors };
}

/** Recursively find all top-level block nodes regardless of tree structure */
function findBlocks(node: any, blocks: TFBlock[]): void {
  if (node.type === 'block') {
    // Check if this is a top-level terraform/resource/variable/etc block
    const children = getNamedChildren(node);
    const kindNode = children.find((c: any) => c.type === 'identifier');
    if (kindNode && (KNOWN_BLOCK_KINDS.has(kindNode.text) || SKIP_BLOCK_KINDS.has(kindNode.text))) {
      const extracted = extractBlock(node);
      if (extracted) blocks.push(...extracted);
      return; // Don't recurse into extracted blocks
    }
  }

  // Recurse into children (body, config_file, etc.)
  for (let i = 0; i < node.namedChildCount; i++) {
    findBlocks(node.namedChild(i), blocks);
  }
}

/** Safely get named children as an array */
function getNamedChildren(node: any): any[] {
  const children: any[] = [];
  for (let i = 0; i < node.namedChildCount; i++) {
    children.push(node.namedChild(i));
  }
  return children;
}

function extractBlock(node: any): TFBlock[] | null {
  const children = getNamedChildren(node);

  // First child is the identifier (kind)
  const kindNode = children.find((c: any) => c.type === 'identifier');
  if (!kindNode) return null;

  const kind = kindNode.text;

  if (SKIP_BLOCK_KINDS.has(kind)) return null;
  if (!KNOWN_BLOCK_KINDS.has(kind)) return null;

  // Labels are string_lit children
  const labels: string[] = [];
  for (const child of children) {
    if (child.type === 'string_lit') {
      const slChildren = getNamedChildren(child);
      const tl = slChildren.find((c: any) => c.type === 'template_literal');
      if (tl) labels.push(tl.text);
      else labels.push(child.text.replace(/^"/, '').replace(/"$/, ''));
    }
  }

  // Body node
  const bodyNode = children.find((c: any) => c.type === 'body');

  const lineStart = node.startPosition.row + 1;
  const lineEnd = node.endPosition.row + 1;
  const rawBody = node.text;

  if (kind === 'locals' && bodyNode) {
    return extractLocalsFromAST(bodyNode, rawBody, lineStart, lineEnd);
  }

  // Build block
  const blockKind = kind as BlockKind;
  let type: string | undefined;
  let name: string;
  let id: string;

  switch (blockKind) {
    case 'resource':
      if (labels.length < 2) return null;
      type = labels[0]; name = labels[1];
      id = `${labels[0]}.${labels[1]}`;
      break;
    case 'data':
      if (labels.length < 2) return null;
      type = labels[0]; name = labels[1];
      id = `data.${labels[0]}.${labels[1]}`;
      break;
    case 'variable':
      if (labels.length < 1) return null;
      name = labels[0]; id = `var.${labels[0]}`;
      break;
    case 'output':
      if (labels.length < 1) return null;
      name = labels[0]; id = `output.${labels[0]}`;
      break;
    case 'module':
      if (labels.length < 1) return null;
      name = labels[0]; id = `module.${labels[0]}`;
      break;
    case 'provider':
      if (labels.length < 1) return null;
      name = labels[0]; id = `provider.${labels[0]}`;
      break;
    default:
      return null;
  }

  const provider = type ? extractProvider(type) : (blockKind === 'provider' ? name : undefined);
  const attributes = bodyNode ? extractAttributesFromAST(bodyNode) : {};

  return [{
    kind: blockKind, type, name, id, provider, attributes, rawBody,
    refs: [], lineStart, lineEnd,
  }];
}

function extractLocalsFromAST(bodyNode: any, rawBody: string, lineStart: number, lineEnd: number): TFBlock[] {
  const blocks: TFBlock[] = [];

  for (let i = 0; i < bodyNode.namedChildCount; i++) {
    const attr = bodyNode.namedChild(i);
    if (attr.type !== 'attribute') continue;

    const keyNode = attr.namedChildren.find((c: any) => c.type === 'identifier');
    if (!keyNode) continue;

    const key = keyNode.text;
    const exprNode = attr.namedChildren.find((c: any) => c.type === 'expression');
    const valueText = exprNode ? exprNode.text : '';
    const displayValue = valueText.length > 80 ? valueText.slice(0, 77) + '...' : valueText;

    blocks.push({
      kind: 'locals', name: key, id: `local.${key}`,
      attributes: { value: displayValue }, rawBody,
      refs: [], lineStart, lineEnd,
    });
  }

  return blocks;
}

function extractAttributesFromAST(bodyNode: any): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (let i = 0; i < bodyNode.namedChildCount; i++) {
    const child = bodyNode.namedChild(i);
    if (child.type !== 'attribute') continue;

    const keyNode = child.namedChildren.find((c: any) => c.type === 'identifier');
    const exprNode = child.namedChildren.find((c: any) => c.type === 'expression');
    if (!keyNode || !exprNode) continue;

    attrs[keyNode.text] = exprNode.text;
  }

  return attrs;
}

/** Walk the entire AST to find reference expressions and build edges */
function resolveRefsFromAST(blocks: TFBlock[], root: any): TFEdge[] {
  const edges: TFEdge[] = [];
  const edgeSet = new Set<string>();
  const blockIds = new Set(blocks.map(b => b.id));
  const resourceIds = new Set(
    blocks.filter(b => b.kind === 'resource' && b.type).map(b => `${b.type}.${b.name}`)
  );

  // For each block, find its AST node and walk for references
  const blockNodes: any[] = [];
  collectBlockNodes(root, blockNodes);

  for (const blockNode of blockNodes) {
    const children = getNamedChildren(blockNode);
    const kindNode = children.find((c: any) => c.type === 'identifier');
    if (!kindNode || SKIP_BLOCK_KINDS.has(kindNode.text)) continue;

    const sourceBlock = findBlockForNode(blocks, blockNode);
    if (!sourceBlock) continue;

    // Walk the block's body (or the block itself) for references
    const bodyNode = children.find((c: any) => c.type === 'body');
    if (!bodyNode) continue;

    const refs = new Set<string>();
    walkForRefs(bodyNode, refs, resourceIds);

    for (const targetId of refs) {
      if (targetId === sourceBlock.id) continue;
      if (!blockIds.has(targetId)) continue;

      const edgeKey = `${sourceBlock.id}->${targetId}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      // Find the attribute label
      const label = findAttrLabelForRef(bodyNode, targetId, resourceIds);

      edges.push({ source: sourceBlock.id, target: targetId, label });
      sourceBlock.refs.push(targetId);
    }
  }

  return edges;
}

/** Collect all top-level block AST nodes from the tree */
function collectBlockNodes(node: any, result: any[]): void {
  if (node.type === 'block') {
    const children = getNamedChildren(node);
    const kindNode = children.find((c: any) => c.type === 'identifier');
    if (kindNode && (KNOWN_BLOCK_KINDS.has(kindNode.text) || SKIP_BLOCK_KINDS.has(kindNode.text))) {
      result.push(node);
      return;
    }
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    collectBlockNodes(node.namedChild(i), result);
  }
}

/** Recursively walk AST nodes to find reference chains like var.x, module.x.y, aws_vpc.main.id */
function walkForRefs(node: any, refs: Set<string>, resourceIds: Set<string>): void {
  // A reference chain starts with variable_expr and is followed by get_attr siblings
  if (node.type === 'variable_expr') {
    const chain = buildRefChain(node);
    if (chain.length >= 2) {
      const prefix = chain[0];

      if (prefix === 'var' || prefix === 'local') {
        refs.add(`${chain[0]}.${chain[1]}`);
      } else if (prefix === 'module') {
        refs.add(`module.${chain[1]}`);
      } else if (prefix === 'data' && chain.length >= 3) {
        refs.add(`data.${chain[1]}.${chain[2]}`);
      } else {
        // Could be a resource reference: aws_vpc.main.id -> aws_vpc.main
        const candidate = `${chain[0]}.${chain[1]}`;
        if (resourceIds.has(candidate)) {
          refs.add(candidate);
        }
      }
    }
    return; // Don't recurse into variable_expr children
  }

  for (let i = 0; i < node.namedChildCount; i++) {
    walkForRefs(node.namedChild(i), refs, resourceIds);
  }
  // Also check non-named children for variable_expr in tuple elements etc.
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.isNamed && child.type !== node.type) {
      // Already covered by namedChildren
    } else if (!child.isNamed) {
      // Skip punctuation
    }
  }
}

/** Build a reference chain from a variable_expr and its sibling get_attr nodes */
function buildRefChain(varExprNode: any): string[] {
  const chain: string[] = [];

  // The variable_expr contains an identifier
  const id = varExprNode.namedChildren.find((c: any) => c.type === 'identifier');
  if (id) chain.push(id.text);

  // Walk sibling get_attr nodes (they come after variable_expr in the parent expression)
  let sibling = varExprNode.nextNamedSibling;
  while (sibling && sibling.type === 'get_attr') {
    const attrId = sibling.namedChildren.find((c: any) => c.type === 'identifier');
    if (attrId) chain.push(attrId.text);
    sibling = sibling.nextNamedSibling;
  }

  return chain;
}

function findBlockForNode(blocks: TFBlock[], blockNode: any): TFBlock | null {
  const line = blockNode.startPosition.row + 1;
  return blocks.find(b => b.lineStart === line) ?? null;
}

function findAttrLabelForRef(bodyNode: any, targetId: string, resourceIds: Set<string>): string | undefined {
  // Walk attributes and check if they contain a reference to targetId
  for (let i = 0; i < bodyNode.namedChildCount; i++) {
    const attr = bodyNode.namedChild(i);
    if (attr.type !== 'attribute') continue;

    const keyNode = attr.namedChildren.find((c: any) => c.type === 'identifier');
    const exprNode = attr.namedChildren.find((c: any) => c.type === 'expression');
    if (!keyNode || !exprNode) continue;

    const refs = new Set<string>();
    walkForRefs(exprNode, refs, resourceIds);
    if (refs.has(targetId)) return keyNode.text;
  }
  return undefined;
}

function extractProvider(resourceType: string): string {
  const idx = resourceType.indexOf('_');
  return idx === -1 ? resourceType : resourceType.substring(0, idx);
}

function collectSyntaxErrors(node: any, errors: ParseError[]): void {
  if (node.type === 'ERROR' || node.isMissing) {
    errors.push({
      line: node.startPosition.row + 1,
      message: node.isMissing
        ? `Missing expected syntax near "${(node.text ?? '').slice(0, 30)}"`
        : `Syntax error: unexpected "${(node.text ?? '').slice(0, 40)}"`,
      severity: 'error',
    });
  }
  for (let i = 0; i < node.childCount; i++) {
    collectSyntaxErrors(node.child(i), errors);
  }
}
