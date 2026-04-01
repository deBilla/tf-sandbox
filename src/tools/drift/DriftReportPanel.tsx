import { useAppState } from '../../store/context';

const STATUS_STYLES = {
  'in-sync': { color: 'text-green-400', bg: 'bg-green-500/10', label: 'In Sync' },
  'drifted': { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Drifted' },
  'missing-in-state': { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Not Deployed' },
  'missing-in-code': { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Not in Code' },
};

export function DriftReportPanel() {
  const { state, dispatch } = useAppState();
  const drift = state.driftData;

  if (!drift) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        <div className="mb-2">Paste <code>terraform show -json</code> output</div>
        <div className="text-[11px]">Compare deployed state against your .tf code</div>
      </div>
    );
  }

  const { summary, resources } = drift;

  return (
    <div className="h-full overflow-y-auto">
      {/* Summary */}
      <div className="p-4 border-b border-slate-700 grid grid-cols-2 gap-2">
        <Stat label="In Sync" count={summary.inSync} color="text-green-400" />
        <Stat label="Drifted" count={summary.drifted} color="text-amber-400" />
        <Stat label="Not Deployed" count={summary.missingInState} color="text-red-400" />
        <Stat label="Not in Code" count={summary.missingInCode} color="text-blue-400" />
      </div>

      {/* Resource list */}
      <div className="divide-y divide-slate-800">
        {resources.map(r => {
          const s = STATUS_STYLES[r.status];
          return (
            <button
              key={r.id}
              onClick={() => dispatch({ type: 'SELECT_NODE', payload: r.id })}
              className="w-full text-left px-3 py-2 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.bg} ${s.color}`}>
                  {s.label}
                </span>
                <span className="text-xs text-slate-300 truncate">{r.id}</span>
              </div>
              {r.driftedAttributes && (
                <div className="mt-1 space-y-0.5">
                  {r.driftedAttributes.map(a => (
                    <div key={a.key} className="text-[10px] text-slate-500 pl-2">
                      {a.key}: <span className="text-red-400 line-through">{a.declared}</span>
                      {' -> '}<span className="text-green-400">{a.actual}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{count}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
