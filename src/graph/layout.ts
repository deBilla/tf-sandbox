import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TFBlock, TFEdge } from '../parser/types';
import { getCategoryForType, getProviderColor, KIND_STYLES } from './icons';

const NODE_WIDTH = 260;
const NODE_HEIGHT = 90;
const SMALL_NODE_WIDTH = 200;
const SMALL_NODE_HEIGHT = 70;

function getNodeDimensions(kind: string) {
  if (kind === 'resource' || kind === 'data') {
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
  return { width: SMALL_NODE_WIDTH, height: SMALL_NODE_HEIGHT };
}

export function computeLayout(
  blocks: TFBlock[],
  edges: TFEdge[]
): { nodes: Node[]; edges: Edge[] } {
  if (blocks.length === 0) {
    return { nodes: [], edges: [] };
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    ranksep: 200,
    nodesep: 80,
    edgesep: 40,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add all block nodes
  for (const block of blocks) {
    const { width, height } = getNodeDimensions(block.kind);
    g.setNode(block.id, { width, height });
  }

  // Add dependency edges
  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target, { weight: 1, minlen: 1 });
    }
  }

  // For disconnected nodes (no edges), add invisible edges from variables to maintain
  // a left-to-right flow: variables -> resources -> outputs
  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  // Create chain of unconnected nodes by kind to give them sensible positions
  const kindOrder = ['variable', 'provider', 'data', 'locals', 'module', 'resource', 'output'];
  const disconnected = blocks.filter(b => !connectedNodes.has(b.id));
  const byKind = new Map<string, TFBlock[]>();
  for (const b of disconnected) {
    if (!byKind.has(b.kind)) byKind.set(b.kind, []);
    byKind.get(b.kind)!.push(b);
  }

  // Chain disconnected nodes of different kinds
  let prevKindNode: string | null = null;
  for (const kind of kindOrder) {
    const group = byKind.get(kind);
    if (!group || group.length === 0) continue;
    if (prevKindNode) {
      g.setEdge(prevKindNode, group[0].id, { weight: 0, minlen: 2, style: 'invis' });
    }
    prevKindNode = group[group.length - 1].id;
  }

  dagre.layout(g);

  // Convert to React Flow nodes
  const flowNodes: Node[] = [];

  // Group resources by provider for sub-grouping
  const providerGroups = new Map<string, TFBlock[]>();
  for (const block of blocks) {
    if (block.kind === 'resource' && block.provider) {
      const key = block.provider;
      if (!providerGroups.has(key)) providerGroups.set(key, []);
      providerGroups.get(key)!.push(block);
    }
  }

  // Create provider group boundary nodes
  for (const [provider, members] of providerGroups) {
    if (members.length < 2) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const m of members) {
      const pos = g.node(m.id);
      if (!pos) continue;
      const { width, height } = getNodeDimensions(m.kind);
      minX = Math.min(minX, pos.x - width / 2);
      minY = Math.min(minY, pos.y - height / 2);
      maxX = Math.max(maxX, pos.x + width / 2);
      maxY = Math.max(maxY, pos.y + height / 2);
    }

    const padding = 30;
    const labelHeight = 30;
    flowNodes.push({
      id: `__group_${provider}`,
      type: 'providerGroup',
      position: { x: minX - padding, y: minY - padding - labelHeight },
      data: { provider, label: `${provider.toUpperCase()} Resources`, color: getProviderColor(provider) },
      style: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2 + labelHeight,
      },
    });
  }

  // Add block nodes
  for (const block of blocks) {
    const pos = g.node(block.id);
    if (!pos) continue;

    const { width, height } = getNodeDimensions(block.kind);
    let nodeType: string;
    let data: Record<string, unknown>;

    if (block.kind === 'resource') {
      const category = getCategoryForType(block.type ?? '');
      nodeType = 'tfResource';
      data = { block, category, providerColor: getProviderColor(block.provider) };
    } else {
      const kindStyle = KIND_STYLES[block.kind] ?? KIND_STYLES.variable;
      nodeType = 'tfGeneric';
      data = { block, ...kindStyle };
    }

    flowNodes.push({
      id: block.id,
      type: nodeType,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
      data,
    });
  }

  // Convert edges — only real dependency edges, not the invisible layout edges
  const flowEdges: Edge[] = edges.map((e, i) => ({
    id: `e-${i}-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: '#64748b', strokeWidth: 1.5 },
    labelStyle: { fill: '#94a3b8', fontSize: 11 },
    labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 3,
  }));

  return { nodes: flowNodes, edges: flowEdges };
}
