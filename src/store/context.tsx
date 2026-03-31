import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import { reducer, initialState, type AppState, type Action } from './reducer';
import { parseTerraform } from '../parser';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced parse on code change
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const graph = parseTerraform(state.code);
      dispatch({ type: 'SET_GRAPH', payload: graph });
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
