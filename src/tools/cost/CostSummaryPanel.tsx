import { useAppState } from '../../store/context';

export function CostSummaryPanel() {
  const { state, dispatch } = useAppState();
  const cost = state.costData;

  if (!cost) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Paste Terraform code to estimate costs
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Total cost */}
      <div className="p-4 border-b border-slate-700">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estimated Monthly Cost</div>
        <div className="text-3xl font-bold text-green-400">
          ${cost.totalMonthlyCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          <span className="text-sm text-slate-500 font-normal">/mo</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {cost.coveredCount} resources with pricing | {cost.uncoveredCount} without data
        </div>
      </div>

      {/* Per-resource breakdown */}
      <div className="p-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Breakdown</div>
        <div className="space-y-1">
          {cost.perResource.map(r => (
            <button
              key={r.resourceId}
              onClick={() => dispatch({ type: 'SELECT_NODE', payload: r.resourceId })}
              className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="text-slate-300 truncate max-w-[180px]">{r.resourceId}</span>
                {r.note && <span className="text-slate-500 text-[10px]">{r.note}</span>}
              </div>
              <span className={`shrink-0 font-mono ${
                r.monthlyCost === null ? 'text-slate-600' :
                r.monthlyCost === 0 ? 'text-slate-500' :
                r.monthlyCost > 100 ? 'text-amber-400' :
                'text-green-400'
              }`}>
                {r.monthlyCost === null ? '?' : r.monthlyCost === 0 ? 'Free' : `$${r.monthlyCost}`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
