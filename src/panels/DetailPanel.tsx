import { useAppState } from '../store/context';
import { getCategoryForType, KIND_STYLES, getProviderColor } from '../graph/icons';

export function DetailPanel() {
  const { state, dispatch } = useAppState();
  const block = state.graph.blocks.find(b => b.id === state.selectedNodeId);

  if (!block) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-500 text-sm text-center">
        <div>
          <div className="text-3xl mb-3">🔍</div>
          <div>Click a node in the graph to see its details</div>
        </div>
      </div>
    );
  }

  const isResource = block.kind === 'resource' || block.kind === 'data';
  const category = isResource ? getCategoryForType(block.type ?? '') : null;
  const kindStyle = KIND_STYLES[block.kind];
  const borderColor = isResource ? getProviderColor(block.provider) : kindStyle?.borderColor ?? '#64748b';

  // Find connected edges
  const incoming = state.graph.edges.filter(e => e.target === block.id);
  const outgoing = state.graph.edges.filter(e => e.source === block.id);

  return (
    <div className="h-full overflow-y-auto bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700" style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span>{category?.icon ?? kindStyle?.icon ?? '📦'}</span>
          <span className="uppercase tracking-wider">{block.kind}</span>
          {block.type && <span className="text-slate-500">/ {block.type}</span>}
        </div>
        <div className="text-lg font-semibold text-slate-100">{block.name}</div>
        <div className="text-xs text-slate-500 mt-1">
          Lines {block.lineStart}–{block.lineEnd} &middot; ID: <code className="text-slate-400">{block.id}</code>
        </div>
      </div>

      {/* Attributes */}
      {Object.keys(block.attributes).length > 0 && (
        <div className="p-4 border-b border-slate-700">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Attributes</div>
          <div className="space-y-1.5">
            {Object.entries(block.attributes).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-sm">
                <span className="text-slate-400 shrink-0">{k}</span>
                <span className="text-slate-300 break-all">{v.replace(/^"/, '').replace(/"$/, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {outgoing.length > 0 && (
        <div className="p-4 border-b border-slate-700">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Depends On ({outgoing.length})
          </div>
          <div className="space-y-1">
            {outgoing.map(e => (
              <button
                key={e.target}
                onClick={() => dispatch({ type: 'SELECT_NODE', payload: e.target })}
                className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-slate-800 transition-colors"
              >
                <span className="text-blue-400">{e.target}</span>
                {e.label && <span className="text-slate-500 ml-2 text-xs">via {e.label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="p-4 border-b border-slate-700">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Referenced By ({incoming.length})
          </div>
          <div className="space-y-1">
            {incoming.map(e => (
              <button
                key={e.source}
                onClick={() => dispatch({ type: 'SELECT_NODE', payload: e.source })}
                className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-slate-800 transition-colors"
              >
                <span className="text-green-400">{e.source}</span>
                {e.label && <span className="text-slate-500 ml-2 text-xs">via {e.label}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Raw HCL */}
      <div className="p-4">
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Raw HCL</div>
        <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {block.rawBody}
        </pre>
      </div>
    </div>
  );
}
