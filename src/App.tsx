import { Group, Panel, Separator } from 'react-resizable-panels';
import { AppProvider, useAppState } from './store/context';
import { GraphCanvas } from './graph/GraphCanvas';
import { EditorPanel } from './panels/EditorPanel';
import { DetailPanel } from './panels/DetailPanel';
import { SummaryBar } from './panels/SummaryBar';
import { FileUpload } from './panels/FileUpload';
import { SAMPLES } from './utils/samples';

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
            <DetailPanel />
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
