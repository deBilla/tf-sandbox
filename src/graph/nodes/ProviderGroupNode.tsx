import type { NodeProps } from '@xyflow/react';

interface ProviderGroupData {
  provider: string;
  label: string;
  color: string;
}

export function ProviderGroupNode({ data }: NodeProps) {
  const { label, color } = data as unknown as ProviderGroupData;

  return (
    <div className="w-full h-full rounded-xl border-2 border-dashed pointer-events-none"
      style={{ borderColor: `${color}30` }}
    >
      <div className="px-3 py-1 text-xs font-medium" style={{ color: `${color}90` }}>
        {label}
      </div>
    </div>
  );
}
