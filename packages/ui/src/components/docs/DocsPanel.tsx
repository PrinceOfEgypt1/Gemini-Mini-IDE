import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

interface GeneratedFile {
  path: string;
  content: string;
}

interface DocsPanelProps {
  files?: GeneratedFile[];
}

// Tipagem explícita para substituir o 'any' proibido
interface MarkdownCodeProps extends React.HTMLAttributes<HTMLElement> {
  node?: unknown;
  inline?: boolean;
  children?: React.ReactNode;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ files = [] }) => {
  const docFile = useMemo(() => {
    const readme = files.find(f => f.path === 'README.md' || f.path === './README.md');
    if (readme) return readme;

    const anyMd = files.find(f => f.path.endsWith('.md') && !f.path.includes('/'));
    if (anyMd) return anyMd;

    return files.find(f => f.path.endsWith('.md'));
  }, [files]);

  if (!docFile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>Nenhuma documentação encontrada.</p>
        <p className="text-xs mt-2">Gere um projeto para ver o README.md aqui.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 pb-2 border-b border-[var(--border-main)] flex justify-between items-center">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--brand-primary)]">📄</span>
          {docFile.path}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 markdown-content">
        <article className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)]">
          <ReactMarkdown
            components={{
              // Usamos _node para indicar explicitamente que a variável é ignorada (satisfaz o linter)
              h1: ({node: _node, ...props}) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 mt-2 pb-2 border-b border-[var(--border-main)]" {...props} />,
              h2: ({node: _node, ...props}) => <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 mt-6" {...props} />,
              h3: ({node: _node, ...props}) => <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2 mt-4" {...props} />,
              p: ({node: _node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              ul: ({node: _node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({node: _node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({node: _node, ...props}) => <li className="" {...props} />,
              
              // Correção da tipagem e uso de variáveis ignoradas
              code: ({node: _node, inline, className: _className, children, ...props}: MarkdownCodeProps) => {
                 return inline ? (
                    <code className="bg-[var(--bg-panel-hover)] px-1 py-0.5 rounded text-[var(--brand-primary)] font-mono text-xs" {...props}>{children}</code>
                 ) : (
                    <pre className="bg-[var(--bg-panel)] border border-[var(--border-main)] p-3 rounded-lg overflow-x-auto mb-4 font-mono text-xs text-[var(--text-secondary)]">
                      <code {...props}>{children}</code>
                    </pre>
                 )
              },
              blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-[var(--brand-primary)] pl-4 italic text-[var(--text-muted)] mb-4" {...props} />,
              a: ({node: _node, ...props}) => <a className="text-[var(--brand-primary)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
            }}
          >
            {docFile.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};
