import React, { useState } from 'react';
import { FileViewer } from '../code/FileViewer';

interface GeneratedFile {
  path: string;
  content: string;
}

interface TestsPanelProps {
  files?: GeneratedFile[];
}

export const TestsPanel: React.FC<TestsPanelProps> = ({ files = [] }) => {
  const [selectedTest, setSelectedTest] = useState<GeneratedFile | null>(null);

  // Filtra arquivos que parecem testes
  const testFiles = files.filter(f => 
    f.path.match(/(\.|\/)(test|spec)\.(ts|js|tsx|jsx)$/i) || f.path.includes("/tests/") || f.path.includes("/__tests__/")
  );

  if (testFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p>Nenhum arquivo de teste identificado.</p>
        <p className="text-xs mt-2">Peça ao agente para gerar testes unitários.</p>
      </div>
    );
  }

  if (selectedTest) {
    return (
      <div className="h-full flex flex-col">
         <div className="mb-2 flex items-center gap-2">
            <button 
              onClick={() => setSelectedTest(null)}
              className="text-xs bg-[var(--bg-panel-hover)] px-2 py-1 rounded hover:bg-[var(--border-main)] transition-colors"
            >
              ← Voltar para lista
            </button>
            <span className="text-sm font-semibold">{selectedTest.path}</span>
         </div>
         <div className="flex-1 overflow-hidden rounded-lg border border-[var(--border-main)]">
            <FileViewer path={selectedTest.path} content={selectedTest.content} />
         </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {testFiles.map((file) => (
        <div 
          key={file.path}
          onClick={() => setSelectedTest(file)}
          className="p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg cursor-pointer hover:border-[var(--brand-primary)] hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] group-hover:bg-[var(--success)]/20 transition-colors">
               🧪
            </div>
            <div className="overflow-hidden">
               <h4 className="text-sm font-medium text-[var(--text-primary)] truncate" title={file.path}>
                 {file.path.split('/').pop()}
               </h4>
               <p className="text-xs text-[var(--text-muted)] truncate">{file.path}</p>
            </div>
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-2 flex justify-between items-center">
             <span>{file.content.length} bytes</span>
             <span className="text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity">Ver código →</span>
          </div>
        </div>
      ))}
    </div>
  );
};
