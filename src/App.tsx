import { Group, Panel, Separator } from 'react-resizable-panels';
import { AppProvider, useAppState } from './store/context';
import { GraphCanvas } from './graph/GraphCanvas';
import { EditorPanel } from './panels/EditorPanel';
import { DetailPanel } from './panels/DetailPanel';
import { ValidationPanel } from './panels/ValidationPanel';
import { SummaryBar } from './panels/SummaryBar';
import { FileUpload } from './panels/FileUpload';
import { SAMPLES } from './utils/samples';

function RightPanel() {
  const { state, dispatch } = useAppState();
  const tab = state.activeDetailTab;
  const validationCount = state.validation?.results.length ?? 0;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Tab switcher */}
      <div className="flex border-b border-slate-700 shrink-0">
        <button
          onClick={() => dispatch({ type: 'SET_DETAIL_TAB', payload: 'detail' })}
          className={`flex-1 text-xs py-2 px-3 font-medium transition-colors ${
            tab === 'detail'
              ? 'text-slate-100 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_DETAIL_TAB', payload: 'validation' })}
          className={`flex-1 text-xs py-2 px-3 font-medium transition-colors flex items-center justify-center gap-1.5 ${
            tab === 'validation'
              ? 'text-slate-100 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Validate
          {validationCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              (state.validation?.summary.errors ?? 0) > 0
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {validationCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {tab === 'detail' ? (
          <DetailPanel />
        ) : (
          <ValidationPanel report={state.validation} />
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const { dispatch } = useAppState();

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-slate-100 tracking-tight">
            <span className="text-blue-400">TF</span> Sandbox
          </h1>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex gap-1.5">
            {SAMPLES.map(s => (
              <button
                key={s.name}
                onClick={() => dispatch({ type: 'SET_CODE', payload: s.code })}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 transition-colors"
                title={s.description}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-slate-500">Terraform Visual Sandbox</span>
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
              <FileUpload />
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
