import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { SyntaxHighlighter } from '../../utils/syntaxHighlighter';

interface GeneratedFile {
  path: string;
  content: string;
}

interface DocsPanelProps {
  files?: GeneratedFile[];
}

// Interface para satisfazer o linter e TS
interface MarkdownCodeProps extends React.ClassAttributes<HTMLElement>, React.HTMLAttributes<HTMLElement> {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ files = [] }) => {
  const docFile = useMemo(() => {
    if (!files || files.length === 0) return null;

    // 1. Tenta encontrar README (case insensitive, em qualquer pasta)
    const readme = files.find(f => f.path.toLowerCase().includes('readme.md'));
    if (readme) return readme;

    // 2. Fallback: Qualquer arquivo markdown
    return files.find(f => f.path.endsWith('.md'));
  }, [files]);

  if (!docFile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>Nenhuma documentação encontrada.</p>
        <p className="text-xs mt-2">O Agente deve gerar um arquivo README.md.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)] rounded-lg border border-[var(--border-main)]">
      <div className="px-4 py-3 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-panel)]">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--brand-primary)]">📄</span>
          {docFile.path}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <article className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)]">
          <ReactMarkdown
            components={{
              h1: ({node: _node, ...props}) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-main)] pb-2" {...props} />,
              h2: ({node: _node, ...props}) => <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3" {...props} />,
              h3: ({node: _node, ...props}) => <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2" {...props} />,
              ul: ({node: _node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({node: _node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({node: _node, ...props}) => <li className="pl-1" {...props} />,
              blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-[var(--brand-primary)] pl-4 italic text-[var(--text-muted)] bg-[var(--bg-panel-hover)]/30 py-2 pr-2 rounded-r mb-4" {...props} />,
              a: ({node: _node, ...props}) => <a className="text-[var(--brand-primary)] hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
              p: ({node: _node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              
              code: ({node: _node, inline, className, children, ...props}: MarkdownCodeProps) => {
                 const match = /language-(\w+)/.exec(className || '');
                 return !inline ? (
                    <div className="my-4 rounded-lg overflow-hidden border border-[var(--border-main)]">
                      <SyntaxHighlighter code={String(children).replace(/\n$/, '')} language={match ? match[1] : ''} />
                    </div>
                 ) : (
                    <code className="bg-[var(--bg-panel-hover)] px-1.5 py-0.5 rounded text-[var(--brand-primary)] font-mono text-xs border border-[var(--border-main)]" {...props}>{children}</code>
                 )
              },
            }}
          >
            {docFile.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};
