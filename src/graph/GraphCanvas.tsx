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

function ExportOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl px-8 py-6 flex flex-col items-center gap-4 shadow-2xl">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12" viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="24" cy="24" r="20" fill="none" stroke="#334155" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#60a5fa" strokeWidth="4"
              strokeDasharray="80 126" strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="text-sm font-medium text-slate-200">{message}</div>
        {/* Progress bar animation */}
        <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full"
            style={{
              animation: 'progress 2s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

function ExportButtons() {
  const { getNodes, getNodesBounds } = useReactFlow();
  const [status, setStatus] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showStatus = useCallback((msg: string, duration = 2000) => {
    setStatus(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), duration);
  }, []);

  const getExportOpts = useCallback(() => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return null;

    const nodes = getNodes();
    if (nodes.length === 0) return null;

    const bounds = getNodesBounds(nodes.map(n => n.id));
    const padding = 50;
    const imageWidth = bounds.width + padding * 2;
    const imageHeight = bounds.height + padding * 2;
    const vp = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, padding);

    return {
      viewport,
      opts: {
        backgroundColor: '#0f172a',
        width: imageWidth,
        height: imageHeight,
        skipFonts: true,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        },
      },
    };
  }, [getNodes, getNodesBounds]);

  // Defer the actual work to next animation frame so the overlay paints first
  const deferWork = useCallback((work: () => Promise<void>) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        work();
      });
    });
  }, []);

  const doExport = useCallback((format: 'png' | 'svg') => {
    const exp = getExportOpts();
    if (!exp) return;

    showStatus(`Rendering ${format.toUpperCase()}...`, 30000);

    deferWork(async () => {
      try {
        const fn = format === 'svg' ? toSvg : toPng;
        const dataUrl = await fn(exp.viewport, exp.opts);
        downloadImage(dataUrl, `terraform-diagram.${format}`);
        showStatus(`${format.toUpperCase()} downloaded`);
      } catch {
        showStatus('Export failed');
      }
    });
  }, [getExportOpts, showStatus, deferWork]);

  const copyToClipboard = useCallback(() => {
    const exp = getExportOpts();
    if (!exp) return;

    showStatus('Copying to clipboard...', 30000);

    deferWork(async () => {
      try {
        const dataUrl = await toPng(exp.viewport, exp.opts);
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showStatus('Copied to clipboard');
      } catch {
        showStatus('Copy failed');
      }
    });
  }, [getExportOpts, showStatus, deferWork]);

  const busy = !!status?.includes('...');

  return (
    <div className="flex items-center gap-1.5">
      {busy && <ExportOverlay message={status!} />}
      {status && !busy && (
        <span className={`text-xs px-2.5 py-1 rounded-md ${
          status.includes('failed') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
        } flex items-center gap-1.5`}>
          {status.includes('failed') ? '\u2718' : '\u2714'} {status}
        </span>
      )}
      <button
        onClick={copyToClipboard}
        disabled={!!busy}
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
        disabled={!!busy}
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
        disabled={!!busy}
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
