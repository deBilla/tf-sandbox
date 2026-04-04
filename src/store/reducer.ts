import type { TFGraph, ParseError } from '../parser/types';
import type { ValidationReport } from '../validator';
import type { ToolId, CostAnnotations, DriftReport, RBACGraph, MLOpsWorkflow } from '../tools/types';

export interface AppState {
  activeTool: ToolId;
  code: string;
  secondaryCode: string; // For drift: .tf code when editor shows state JSON
  graph: TFGraph;
  selectedNodeId: string | null;
  files: { name: string; content: string }[];
  errors: ParseError[];
  validation: ValidationReport | null;
  activeDetailTab: 'detail' | 'validation';
  // Tool-specific state
  costData: CostAnnotations | null;
  driftData: DriftReport | null;
  rbacData: RBACGraph | null;
  mlopsData: MLOpsWorkflow | null;
}

export type Action =
  | { type: 'SET_TOOL'; payload: ToolId }
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_SECONDARY_CODE'; payload: string }
  | { type: 'SET_GRAPH'; payload: TFGraph }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'ADD_FILES'; payload: { name: string; content: string }[] }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'SET_VALIDATION'; payload: ValidationReport }
  | { type: 'SET_DETAIL_TAB'; payload: 'detail' | 'validation' }
  | { type: 'SET_COST_DATA'; payload: CostAnnotations }
  | { type: 'SET_DRIFT_DATA'; payload: DriftReport }
  | { type: 'SET_RBAC_DATA'; payload: RBACGraph }
  | { type: 'SET_MLOPS_DATA'; payload: MLOpsWorkflow }
  | { type: 'CLEAR' };

export const initialState: AppState = {
  activeTool: 'terraform',
  code: '',
  secondaryCode: '',
  graph: { blocks: [], edges: [], errors: [] },
  selectedNodeId: null,
  files: [],
  errors: [],
  validation: null,
  activeDetailTab: 'detail',
  costData: null,
  driftData: null,
  rbacData: null,
  mlopsData: null,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TOOL': {
      const keepCode = (action.payload === 'cost' || action.payload === 'mlops') && state.activeTool === 'terraform'
        || action.payload === 'terraform' && state.activeTool === 'mlops';
      return {
        ...initialState,
        activeTool: action.payload,
        code: keepCode ? state.code : '',
        graph: keepCode ? state.graph : initialState.graph,
      };
    }
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_SECONDARY_CODE':
      return { ...state, secondaryCode: action.payload };
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
    case 'SET_VALIDATION':
      return { ...state, validation: action.payload };
    case 'SET_DETAIL_TAB':
      return { ...state, activeDetailTab: action.payload };
    case 'SET_COST_DATA':
      return { ...state, costData: action.payload };
    case 'SET_DRIFT_DATA':
      return { ...state, driftData: action.payload };
    case 'SET_RBAC_DATA':
      return { ...state, rbacData: action.payload };
    case 'SET_MLOPS_DATA':
      return { ...state, mlopsData: action.payload };
    case 'CLEAR':
      return { ...initialState, activeTool: state.activeTool };
    default:
      return state;
  }
}
