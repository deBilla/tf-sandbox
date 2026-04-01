import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import { reducer, initialState, type AppState, type Action } from './reducer';
import { parseTerraform, waitForParser } from '../parser';
import { validate } from '../validator';

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
      // Re-parse with tree-sitter now available
      if (state.code) {
        const graph = parseTerraform(state.code);
        dispatch({ type: 'SET_GRAPH', payload: graph });
        const report = validate(state.code, graph);
        dispatch({ type: 'SET_VALIDATION', payload: report });
      }
    });
  }, []);

  // Debounced parse + validate on code change
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const graph = parseTerraform(state.code);
      dispatch({ type: 'SET_GRAPH', payload: graph });

      const report = validate(state.code, graph);
      dispatch({ type: 'SET_VALIDATION', payload: report });
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [state.code]);

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
