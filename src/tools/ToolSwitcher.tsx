import { useAppState } from '../store/context';
import { TOOLS } from './registry';
import type { ToolId } from './types';

export function ToolSwitcher() {
  const { state, dispatch } = useAppState();

  return (
    <div className="flex gap-1">
      {TOOLS.map(tool => {
        const active = state.activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id as ToolId })}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              active
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
            title={tool.label}
          >
            <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${
              active ? 'bg-blue-500/30' : 'bg-slate-600'
            }`}>
              {tool.icon}
            </span>
            {tool.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
