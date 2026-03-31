import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useAppState } from '../store/context';

export function EditorPanel() {
  const { state, dispatch } = useAppState();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.languages.register({ id: 'hcl' });
    monaco.languages.setMonarchTokensProvider('hcl', {
      keywords: ['resource', 'variable', 'output', 'data', 'locals', 'module', 'provider', 'terraform', 'for_each', 'count', 'depends_on', 'lifecycle', 'dynamic'],
      typeKeywords: ['string', 'number', 'bool', 'list', 'map', 'object', 'set', 'any'],
      constants: ['true', 'false', 'null'],
      tokenizer: {
        root: [
          [/#.*$/, 'comment'],
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/"/, 'string', '@string'],
          [/<<-?\s*[A-Z_][A-Z0-9_]*/, 'string', '@heredoc'],
          [/\b(true|false|null)\b/, 'keyword.constant'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/[a-zA-Z_][\w]*(?=\s*=)/, 'variable'],
          [/\b(resource|variable|output|data|locals|module|provider|terraform|for_each|count|depends_on|lifecycle|dynamic)\b/, 'keyword'],
          [/\b(var|local|module|data|each|self)\b(?=\.)/, 'type'],
        ],
        comment: [
          [/\*\//, 'comment', '@pop'],
          [/./, 'comment'],
        ],
        string: [
          [/\$\{/, 'delimiter.bracket', '@interpolation'],
          [/[^"$\\]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop'],
        ],
        interpolation: [
          [/\}/, 'delimiter.bracket', '@pop'],
          [/./, 'variable.other'],
        ],
        heredoc: [
          [/^[A-Z_][A-Z0-9_]*$/, 'string', '@pop'],
          [/.*$/, 'string'],
        ],
      },
    } as any);

    monaco.editor.defineTheme('tf-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c084fc' },
        { token: 'type', foreground: '67e8f9' },
        { token: 'variable', foreground: '93c5fd' },
        { token: 'string', foreground: '86efac' },
        { token: 'string.escape', foreground: 'fbbf24' },
        { token: 'comment', foreground: '64748b' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'keyword.constant', foreground: 'fb923c' },
        { token: 'delimiter.bracket', foreground: 'fbbf24' },
        { token: 'variable.other', foreground: '67e8f9' },
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#e2e8f0',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editor.selectionBackground': '#334155',
        'editor.lineHighlightBackground': '#1e293b',
        'editorCursor.foreground': '#60a5fa',
      },
    });
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection([]);

    editor.onDidChangeCursorPosition((e) => {
      const line = e.position.lineNumber;
      // Find block at this line
      const block = state.graph.blocks.find(b => line >= b.lineStart && line <= b.lineEnd);
      if (block) {
        dispatch({ type: 'SELECT_NODE', payload: block.id });
      }
    });
  };

  const handleChange = useCallback((value: string | undefined) => {
    dispatch({ type: 'SET_CODE', payload: value ?? '' });
  }, [dispatch]);

  // Highlight selected block in editor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !decorationsRef.current) return;

    if (!state.selectedNodeId) {
      decorationsRef.current.set([]);
      return;
    }

    const block = state.graph.blocks.find(b => b.id === state.selectedNodeId);
    if (!block) {
      decorationsRef.current.set([]);
      return;
    }

    decorationsRef.current.set([
      {
        range: {
          startLineNumber: block.lineStart,
          startColumn: 1,
          endLineNumber: block.lineEnd,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'bg-blue-500/10',
          overviewRuler: { color: '#60a5fa', position: 1 },
        },
      },
    ]);

    editor.revealLineInCenter(block.lineStart);
  }, [state.selectedNodeId, state.graph.blocks]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-medium text-slate-400">Terraform Editor</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => dispatch({ type: 'CLEAR' })}
            className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          defaultLanguage="hcl"
          theme="tf-dark"
          value={state.code}
          onChange={handleChange}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
