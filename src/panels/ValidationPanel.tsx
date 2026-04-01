import { useState, useMemo } from 'react';
import { useAppState } from '../store/context';
import type { ValidationReport, Severity } from '../validator';

const SEVERITY_CONFIG: Record<Severity, { icon: string; color: string; bg: string }> = {
  error: { icon: '!', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  warning: { icon: '!', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  info: { icon: 'i', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
};

const CATEGORY_LABELS: Record<string, string> = {
  syntax: 'Syntax',
  schema: 'Schema',
  policy: 'Security',
  reference: 'Reference',
};

export function ValidationPanel({ report }: { report: ValidationReport | null }) {
  const { dispatch } = useAppState();
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const filtered = useMemo(() => {
    if (!report) return [];
    if (filter === 'all') return report.results;
    return report.results.filter(r => r.severity === filter);
  }, [report, filter]);

  if (!report) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Paste Terraform code to see validation results
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Summary */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-3 shrink-0">
        <span className="text-xs font-medium text-slate-400">Validation</span>
        <div className="flex gap-2 ml-auto">
          {summary.errors > 0 && (
            <button
              onClick={() => setFilter(f => f === 'error' ? 'all' : 'error')}
              className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${filter === 'error' ? 'bg-red-500/20 text-red-300' : 'text-red-400 hover:bg-red-500/10'}`}
            >
              <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center">!</span>
              {summary.errors}
            </button>
          )}
          {summary.warnings > 0 && (
            <button
              onClick={() => setFilter(f => f === 'warning' ? 'all' : 'warning')}
              className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${filter === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'text-amber-400 hover:bg-amber-500/10'}`}
            >
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">!</span>
              {summary.warnings}
            </button>
          )}
          {summary.infos > 0 && (
            <button
              onClick={() => setFilter(f => f === 'info' ? 'all' : 'info')}
              className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${filter === 'info' ? 'bg-blue-500/20 text-blue-300' : 'text-blue-400 hover:bg-blue-500/10'}`}
            >
              <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center">i</span>
              {summary.infos}
            </button>
          )}
        </div>
      </div>

      {/* Schema coverage */}
      <div className="px-3 py-1.5 border-b border-slate-700/50 shrink-0">
        <div className="text-[10px] text-slate-500">
          Schema checked: {summary.schemaChecked}/{summary.totalBlocks} blocks
          {summary.schemaChecked > 0 && (
            <span className="text-green-500 ml-1">
              ({Math.round((summary.schemaChecked / Math.max(summary.totalBlocks, 1)) * 100)}% coverage)
            </span>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm">
            {report.results.length === 0 ? (
              <div className="text-green-400">No issues found</div>
            ) : (
              <div className="text-slate-500">No {filter} issues</div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((result, i) => {
              const config = SEVERITY_CONFIG[result.severity];
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (result.blockId) {
                      dispatch({ type: 'SELECT_NODE', payload: result.blockId });
                    }
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 mt-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${config.bg} ${config.color} border`}>
                      {SEVERITY_CONFIG[result.severity].icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {CATEGORY_LABELS[result.category] ?? result.category}
                        </span>
                        {result.line > 0 && (
                          <span className="text-[10px] text-slate-500">L{result.line}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 break-words">{result.message}</div>
                      {result.fix && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Fix: {result.fix}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
