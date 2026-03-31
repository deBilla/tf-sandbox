import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TFBlock } from '../../parser/types';
import type { CategoryInfo } from '../icons';

interface ResourceNodeData {
  block: TFBlock;
  category: CategoryInfo;
  providerColor: string;
}

export function ResourceNode({ data, selected }: NodeProps) {
  const { block, category, providerColor } = data as unknown as ResourceNodeData;
  const attrs = Object.entries(block.attributes).slice(0, 3);

  return (
    <div
      className={`bg-slate-800 rounded-lg shadow-lg overflow-hidden transition-all ${
        selected ? 'ring-2 ring-blue-400' : 'ring-1 ring-slate-600'
      }`}
      style={{ borderLeft: `4px solid ${providerColor}`, width: 260 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
          <span>{category.icon}</span>
          <span className="truncate">{block.type}</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-700" style={{ color: providerColor }}>
            {category.label}
          </span>
        </div>
        <div className="text-sm font-semibold text-slate-100 truncate">{block.name}</div>
        {attrs.length > 0 && (
          <div className="mt-1.5 border-t border-slate-700 pt-1.5 space-y-0.5">
            {attrs.map(([k, v]) => (
              <div key={k} className="text-[11px] text-slate-400 truncate">
                <span className="text-slate-500">{k}:</span>{' '}
                <span>{cleanValue(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  );
}

function cleanValue(v: string): string {
  // Strip quotes and truncate
  let s = v.replace(/^"/, '').replace(/"$/, '');
  if (s.length > 30) s = s.slice(0, 27) + '...';
  return s;
}
