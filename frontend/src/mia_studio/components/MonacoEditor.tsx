import React from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  isLoading: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ code, onChange, isLoading }) => {
  // Patch FE-9: Guard against mounting before data is ready
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium opacity-70">Initializing Secure Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full border border-white/5 rounded-lg overflow-hidden shadow-2xl bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
        }}
      />
    </div>
  );
};
