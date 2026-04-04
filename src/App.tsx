import { Group, Panel, Separator } from 'react-resizable-panels';
import { AppProvider, useAppState } from './store/context';
import { GraphCanvas } from './graph/GraphCanvas';
import { EditorPanel } from './panels/EditorPanel';
import { DetailPanel } from './panels/DetailPanel';
import { ValidationPanel } from './panels/ValidationPanel';
import { SummaryBar } from './panels/SummaryBar';
import { FileUpload } from './panels/FileUpload';
import { ToolSwitcher } from './tools/ToolSwitcher';
import { CostSummaryPanel } from './tools/cost/CostSummaryPanel';
import { DriftReportPanel } from './tools/drift/DriftReportPanel';
import { RBACDetailPanel } from './tools/rbac/RBACDetailPanel';
import { MLOpsDetailPanel } from './tools/mlops/MLOpsDetailPanel';
import { getToolById } from './tools/registry';

function RightPanel() {
  const { state, dispatch } = useAppState();
  const tool = state.activeTool;
  const tab = state.activeDetailTab;
  const validationCount = state.validation?.results.length ?? 0;

  // Define tabs based on active tool
  const tabs: { id: string; label: string; badge?: number; badgeColor?: string }[] = [
    { id: 'detail', label: 'Details' },
  ];

  if (tool === 'terraform') {
    tabs.push({ id: 'validation', label: 'Validate', badge: validationCount > 0 ? validationCount : undefined,
      badgeColor: (state.validation?.summary.errors ?? 0) > 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400' });
  } else if (tool === 'cost') {
    tabs.push({ id: 'cost', label: 'Cost' });
  } else if (tool === 'drift') {
    tabs.push({ id: 'drift', label: 'Drift' });
  } else if (tool === 'rbac') {
    tabs.push({ id: 'rbac', label: 'Access' });
  } else if (tool === 'mlops') {
    tabs.push({ id: 'mlops', label: 'Knowledge Hub' });
  }

  const activeTab = tabs.find(t => t.id === tab) ? tab : tabs[1]?.id ?? 'detail';

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex border-b border-slate-700 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'SET_DETAIL_TAB', payload: t.id as any })}
            className={`flex-1 text-xs py-2 px-3 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === t.id
                ? 'text-slate-100 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.badgeColor}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'detail' && <DetailPanel />}
        {activeTab === 'validation' && <ValidationPanel report={state.validation} />}
        {activeTab === 'cost' && <CostSummaryPanel />}
        {activeTab === 'drift' && <DriftReportPanel />}
        {activeTab === 'rbac' && <RBACDetailPanel />}
        {activeTab === 'mlops' && <MLOpsDetailPanel />}
      </div>
    </div>
  );
}

function AppInner() {
  const { state, dispatch } = useAppState();
  const tool = getToolById(state.activeTool);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-slate-100 tracking-tight">
            <span className="text-blue-400">TF</span> Sandbox
          </h1>
          <div className="h-4 w-px bg-slate-700" />
          <ToolSwitcher />
        </div>
        <div className="flex items-center gap-3">
          {/* Sample buttons for active tool */}
          <div className="flex gap-1.5">
            {tool?.samples.map(s => (
              <button
                key={s.name}
                onClick={() => dispatch({ type: 'SET_CODE', payload: s.code })}
                className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-colors"
                title={s.description}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar />

      {/* Main panels */}
      <div className="flex-1 min-h-0">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={28} minSize={15}>
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                <EditorPanel />
              </div>
              {(state.activeTool === 'terraform' || state.activeTool === 'cost' || state.activeTool === 'mlops') && <FileUpload />}
            </div>
          </Panel>

          <Separator className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

          <Panel defaultSize={47} minSize={30}>
            <GraphCanvas />
          </Panel>

          <Separator className="w-1 bg-slate-700 hover:bg-blue-500 transition-colors cursor-col-resize" />

          <Panel defaultSize={25} minSize={12}>
            <RightPanel />
          </Panel>
        </Group>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
