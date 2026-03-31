import { useCallback, useState, type DragEvent } from 'react';
import { useAppState } from '../store/context';

export function FileUpload() {
  const { state, dispatch } = useAppState();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.tf')
    );

    if (files.length === 0) return;

    Promise.all(
      files.map(f =>
        f.text().then(content => ({ name: f.name, content }))
      )
    ).then(loaded => {
      dispatch({ type: 'ADD_FILES', payload: loaded });
    });
  }, [dispatch]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(
      f => f.name.endsWith('.tf')
    );
    if (files.length === 0) return;

    Promise.all(
      files.map(f =>
        f.text().then(content => ({ name: f.name, content }))
      )
    ).then(loaded => {
      dispatch({ type: 'ADD_FILES', payload: loaded });
    });
  }, [dispatch]);

  return (
    <div className="border-t border-slate-700">
      {/* File list */}
      {state.files.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {state.files.map(f => (
            <div key={f.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-400 truncate">📄 {f.name}</span>
              <button
                onClick={() => dispatch({ type: 'REMOVE_FILE', payload: f.name })}
                className="text-slate-500 hover:text-red-400 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mx-3 mb-3 mt-2 border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".tf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="text-xs text-slate-500">
            Drop <code>.tf</code> files here or <span className="text-blue-400 underline">browse</span>
          </div>
        </label>
      </div>
    </div>
  );
}
