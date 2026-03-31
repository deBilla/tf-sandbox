import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  getViewportForBounds,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import '@xyflow/react/dist/style.css';
import { useAppState } from '../store/context';
import { computeLayout } from './layout';
import { ResourceNode } from './nodes/ResourceNode';
import { GenericNode } from './nodes/GenericNode';
import { ProviderGroupNode } from './nodes/ProviderGroupNode';

const nodeTypes = {
  tfResource: ResourceNode,
  tfGeneric: GenericNode,
  providerGroup: ProviderGroupNode,
};

function downloadImage(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.setAttribute('download', filename);
  a.setAttribute('href', dataUrl);
  a.click();
}

function ExportButtons() {
  const { getNodes, getNodesBounds } = useReactFlow();
  const [exporting, setExporting] = useState(false);

  const doExport = useCallback((format: 'png' | 'svg') => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return;

    const nodes = getNodes();
    if (nodes.length === 0) return;

    setExporting(true);

    const bounds = getNodesBounds(nodes.map(n => n.id));
    const padding = 50;
    const imageWidth = bounds.width + padding * 2;
    const imageHeight = bounds.height + padding * 2;

    const vp = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, padding);

    const opts = {
      backgroundColor: '#0f172a',
      width: imageWidth,
      height: imageHeight,
      skipFonts: true,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      },
    };

    const fn = format === 'svg' ? toSvg : toPng;
    const ext = format === 'svg' ? 'svg' : 'png';

    fn(viewport, opts)
      .then((dataUrl) => {
        downloadImage(dataUrl, `terraform-diagram.${ext}`);
      })
      .catch((err) => {
        console.error('Export failed:', err);
      })
      .finally(() => {
        setExporting(false);
      });
  }, [getNodes, getNodesBounds]);

  const copyToClipboard = useCallback(() => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return;

    const nodes = getNodes();
    if (nodes.length === 0) return;

    setExporting(true);

    const bounds = getNodesBounds(nodes.map(n => n.id));
    const padding = 50;
    const imageWidth = bounds.width + padding * 2;
    const imageHeight = bounds.height + padding * 2;
    const vp = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, padding);

    toPng(viewport, {
      backgroundColor: '#0f172a',
      width: imageWidth,
      height: imageHeight,
      skipFonts: true,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
      },
    })
      .then(async (dataUrl) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
      })
      .finally(() => {
        setExporting(false);
      });
  }, [getNodes, getNodesBounds]);

  return (
    <div className="flex gap-1">
      <button
        onClick={copyToClipboard}
        disabled={exporting}
        className="text-xs px-2.5 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        title="Copy to clipboard"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        Copy
      </button>
      <button
        onClick={() => doExport('png')}
        disabled={exporting}
        className="text-xs px-2.5 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        title="Download as PNG"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        PNG
      </button>
      <button
        onClick={() => doExport('svg')}
        disabled={exporting}
        className="text-xs px-2.5 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        title="Download as SVG"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        SVG
      </button>
    </div>
  );
}

function GraphCanvasInner() {
  const { state, dispatch } = useAppState();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const prevGraphRef = useRef(state.graph);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  useEffect(() => {
    if (state.graph === prevGraphRef.current && nodes.length > 0) return;
    prevGraphRef.current = state.graph;

    const layout = computeLayout(state.graph.blocks, state.graph.edges);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [state.graph]);

  const styledEdges = useMemo(() => {
    if (!state.selectedNodeId) return edges;
    return edges.map(e => {
      const isConnected = e.source === state.selectedNodeId || e.target === state.selectedNodeId;
      return {
        ...e,
        style: {
          ...(e.style ?? {}),
          stroke: isConnected ? '#60a5fa' : '#64748b',
          strokeWidth: isConnected ? 2.5 : 1.5,
          opacity: isConnected ? 1 : 0.4,
        },
        animated: isConnected,
      };
    });
  }, [edges, state.selectedNodeId]);

  const selectedNodes = useMemo(() => {
    if (!state.selectedNodeId) return nodes;
    return nodes.map(n => ({
      ...n,
      selected: n.id === state.selectedNodeId,
    }));
  }, [nodes, state.selectedNodeId]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.id.startsWith('__')) return;
    dispatch({ type: 'SELECT_NODE', payload: node.id });
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', payload: null });
  }, [dispatch]);

  return (
    <div className="w-full h-full bg-slate-900">
      <ReactFlow
        nodes={selectedNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="!bg-slate-800 !border-slate-600 !shadow-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-600" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'providerGroup') return 'transparent';
            if (n.type === 'tfResource') return (n.data as Record<string, unknown>).providerColor as string ?? '#64748b';
            return '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-800 !border-slate-600"
        />
        <Panel position="top-right">
          <ExportButtons />
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
