import { useMemo } from 'react';
import { useAppState } from '../store/context';
import type { BlockKind } from '../parser/types';

export function SummaryBar() {
  const { state } = useAppState();
  const tool = state.activeTool;

  if (tool === 'terraform' || tool === 'cost') {
    return <TerraformSummary />;
  }
  if (tool === 'drift') {
    return <DriftSummary />;
  }
  if (tool === 'rbac') {
    return <RBACSummary />;
  }
  return null;
}

function TerraformSummary() {
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
    return errors.filter(e => e.severity === 'warning');
  }, [errors]);

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
      {state.activeTool === 'cost' && state.costData && (
        <>
          <div className="text-slate-500">|</div>
          <span className="text-green-400 font-medium">
            ~${state.costData.totalMonthlyCost.toLocaleString()}/mo
          </span>
        </>
      )}
      {parseErrors.length > 0 && (
        <span className="text-red-400">
          {parseErrors.length} error{parseErrors.length > 1 ? 's' : ''}
        </span>
      )}
      {warnings.length > 0 && (
        <span className="text-amber-400 cursor-help" title={warnings.map(w => w.message).join('\n')}>
          {warnings.length} warning{warnings.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function DriftSummary() {
  const { state } = useAppState();
  const drift = state.driftData;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs">
      {drift ? (
        <>
          <span className="text-slate-400">Total: <span className="text-slate-200">{drift.summary.total}</span></span>
          <span className="text-green-400">In Sync: {drift.summary.inSync}</span>
          {drift.summary.drifted > 0 && <span className="text-amber-400">Drifted: {drift.summary.drifted}</span>}
          {drift.summary.missingInState > 0 && <span className="text-red-400">Not Deployed: {drift.summary.missingInState}</span>}
          {drift.summary.missingInCode > 0 && <span className="text-blue-400">Not in Code: {drift.summary.missingInCode}</span>}
        </>
      ) : (
        <span className="text-slate-500">Paste terraform show -json output to detect drift</span>
      )}
    </div>
  );
}

function RBACSummary() {
  const { state } = useAppState();
  const rbac = state.rbacData;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs">
      {rbac ? (
        <>
          <span className="text-purple-400">Roles: {rbac.principals.length}</span>
          <span className="text-blue-400">Policies: {rbac.bindings.length}</span>
          {rbac.issues.length > 0 && (
            <span className="text-red-400">{rbac.issues.length} issue{rbac.issues.length > 1 ? 's' : ''}</span>
          )}
        </>
      ) : (
        <span className="text-slate-500">Paste IAM policy JSON to analyze</span>
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
