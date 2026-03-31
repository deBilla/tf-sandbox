import { useMemo } from 'react';
import { useAppState } from '../store/context';
import type { BlockKind } from '../parser/types';

export function SummaryBar() {
  const { state } = useAppState();
  const { blocks, edges, errors } = state.graph;

  const counts = useMemo(() => {
    const map: Partial<Record<BlockKind, number>> = {};
    for (const b of blocks) {
      map[b.kind] = (map[b.kind] ?? 0) + 1;
    }
    return map;
  }, [blocks]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    // Unused variables
    const varIds = new Set(blocks.filter(b => b.kind === 'variable').map(b => b.id));
    const referencedIds = new Set(edges.map(e => e.target));
    for (const id of varIds) {
      if (!referencedIds.has(id)) {
        w.push(`Unused variable: ${id}`);
      }
    }
    // Dangling references from errors
    for (const err of errors) {
      if (err.severity === 'warning') w.push(err.message);
    }
    return w;
  }, [blocks, edges, errors]);

  const parseErrors = errors.filter(e => e.severity === 'error');

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs">
      <Stat label="Resources" count={counts.resource} color="#60a5fa" />
      <Stat label="Variables" count={counts.variable} color="#a78bfa" />
      <Stat label="Outputs" count={counts.output} color="#34d399" />
      <Stat label="Data" count={counts.data} color="#22d3ee" />
      <Stat label="Modules" count={counts.module} color="#c084fc" />
      <div className="text-slate-500">|</div>
      <span className="text-slate-400">
        Edges: <span className="text-slate-200">{edges.length}</span>
      </span>
      {parseErrors.length > 0 && (
        <span className="text-red-400">
          🔴 {parseErrors.length} error{parseErrors.length > 1 ? 's' : ''}
        </span>
      )}
      {warnings.length > 0 && (
        <span className="text-amber-400 cursor-help" title={warnings.join('\n')}>
          ⚠ {warnings.length} warning{warnings.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function Stat({ label, count, color }: { label: string; count?: number; color: string }) {
  if (!count) return null;
  return (
    <span className="text-slate-400">
      {label}: <span style={{ color }}>{count}</span>
    </span>
  );
}
