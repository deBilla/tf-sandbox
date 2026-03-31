import type { TFGraph, ParseError } from '../parser/types';

export interface AppState {
  code: string;
  graph: TFGraph;
  selectedNodeId: string | null;
  files: { name: string; content: string }[];
  errors: ParseError[];
}

export type Action =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_GRAPH'; payload: TFGraph }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'ADD_FILES'; payload: { name: string; content: string }[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'CLEAR' };

export const initialState: AppState = {
  code: '',
  graph: { blocks: [], edges: [], errors: [] },
  selectedNodeId: null,
  files: [],
  errors: [],
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_GRAPH':
      return { ...state, graph: action.payload, errors: action.payload.errors };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };
    case 'ADD_FILES': {
      const newFiles = [...state.files, ...action.payload];
      const combined = newFiles.map(f => `# --- ${f.name} ---\n${f.content}`).join('\n\n');
      return { ...state, files: newFiles, code: combined };
    }
    case 'REMOVE_FILE': {
      const newFiles = state.files.filter(f => f.name !== action.payload);
      const combined = newFiles.map(f => `# --- ${f.name} ---\n${f.content}`).join('\n\n');
      return { ...state, files: newFiles, code: combined };
    }
    case 'CLEAR':
      return { ...initialState };
    default:
      return state;
  }
}
