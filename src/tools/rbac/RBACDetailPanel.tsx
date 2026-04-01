import { useAppState } from '../../store/context';

export function RBACDetailPanel() {
  const { state } = useAppState();
  const rbac = state.rbacData;

  if (!rbac) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Paste IAM policy JSON to analyze access patterns
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Summary */}
      <div className="p-4 border-b border-slate-700">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-purple-400">{rbac.principals.length}</div>
            <div className="text-[10px] text-slate-500">Roles</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-400">{rbac.bindings.length}</div>
            <div className="text-[10px] text-slate-500">Policies</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{rbac.issues.length}</div>
            <div className="text-[10px] text-slate-500">Issues</div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {rbac.issues.length > 0 && (
        <div className="p-3 border-b border-slate-700">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Issues</div>
          <div className="space-y-1.5">
            {rbac.issues.map((issue, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded border ${
                issue.severity === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                issue.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                'bg-blue-500/10 border-blue-500/30 text-blue-300'
              }`}>
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bindings */}
      <div className="p-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Access Bindings</div>
        <div className="space-y-2">
          {rbac.bindings.map((binding, i) => (
            <div key={i} className="text-xs bg-slate-800 rounded p-2">
              <div className="text-purple-400 font-medium">{binding.principal.replace('role.', '')}</div>
              <div className="text-slate-500 mt-0.5">{binding.role}</div>
              <div className="text-slate-400 mt-1">
                Actions: <span className="text-slate-300">{binding.actions.slice(0, 3).join(', ')}{binding.actions.length > 3 ? ` +${binding.actions.length - 3}` : ''}</span>
              </div>
              <div className="text-slate-400">
                Resources: <span className="text-slate-300">{binding.resources.slice(0, 2).join(', ')}{binding.resources.length > 2 ? ` +${binding.resources.length - 2}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
