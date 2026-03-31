import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TFBlock } from '../../parser/types';

interface GenericNodeData {
  block: TFBlock;
  icon: string;
  borderColor: string;
}

export function GenericNode({ data, selected }: NodeProps) {
  const { block, icon, borderColor } = data as unknown as GenericNodeData;
  const kindLabel = block.kind === 'locals' ? 'local' : block.kind;
  const attrs = Object.entries(block.attributes).slice(0, 2);

  return (
    <div
      className={`bg-slate-800 rounded-lg shadow-md overflow-hidden transition-all ${
        selected ? 'ring-2 ring-blue-400' : 'ring-1 ring-slate-600'
      }`}
      style={{ borderLeft: `3px solid ${borderColor}`, width: 200 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
          <span>{icon}</span>
          <span>{kindLabel}</span>
        </div>
        <div className="text-sm font-semibold text-slate-100 truncate">{block.name}</div>
        {attrs.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {attrs.map(([k, v]) => (
              <div key={k} className="text-[11px] text-slate-400 truncate">
                <span className="text-slate-500">{k}:</span> {v.replace(/^"/, '').replace(/"$/, '').slice(0, 25)}
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  );
}
