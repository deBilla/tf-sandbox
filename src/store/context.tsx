import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import { reducer, initialState, type AppState, type Action } from './reducer';
import { parseTerraform, waitForParser } from '../parser';
import { validate } from '../validator';
import { annotateCosts } from '../tools/cost/parser';
import { parseStateJson, computeDrift } from '../tools/drift/parser';
import { parseRBAC } from '../tools/rbac/parser';
import { analyzeMLOps } from '../tools/mlops/parser';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const parserReadyRef = useRef(false);

  // Wait for tree-sitter WASM to load, then re-parse if there's code
  useEffect(() => {
    waitForParser().then((ok) => {
      parserReadyRef.current = true;
      if (ok) console.log('Tree-sitter HCL parser ready');
      if (state.code) {
        const graph = parseTerraform(state.code);
        dispatch({ type: 'SET_GRAPH', payload: graph });
        const report = validate(state.code, graph);
        dispatch({ type: 'SET_VALIDATION', payload: report });
      }
    });
  }, []);

  // Debounced parse + validate on code/tool change
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const tool = state.activeTool;

      if (tool === 'terraform' || tool === 'cost') {
        const graph = parseTerraform(state.code);
        dispatch({ type: 'SET_GRAPH', payload: graph });

        if (tool === 'terraform') {
          const report = validate(state.code, graph);
          dispatch({ type: 'SET_VALIDATION', payload: report });
        }

        if (tool === 'cost') {
          const costs = annotateCosts(graph);
          dispatch({ type: 'SET_COST_DATA', payload: costs });
        }
      } else if (tool === 'drift') {
        // Primary code = state JSON, secondary = .tf code
        const stateGraph = parseStateJson(state.code);
        dispatch({ type: 'SET_GRAPH', payload: stateGraph });

        if (state.secondaryCode) {
          const codeGraph = parseTerraform(state.secondaryCode);
          const drift = computeDrift(codeGraph, stateGraph);
          dispatch({ type: 'SET_DRIFT_DATA', payload: drift });
        }
      } else if (tool === 'rbac') {
        const { graph, rbac } = parseRBAC(state.code);
        dispatch({ type: 'SET_GRAPH', payload: graph });
        dispatch({ type: 'SET_RBAC_DATA', payload: rbac });
      } else if (tool === 'mlops') {
        const graph = parseTerraform(state.code);
        dispatch({ type: 'SET_GRAPH', payload: graph });
        const mlops = analyzeMLOps(graph);
        dispatch({ type: 'SET_MLOPS_DATA', payload: mlops });
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [state.code, state.secondaryCode, state.activeTool]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
