import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FileViewer } from '../../../src/components/code/FileViewer';

describe('FileViewer', () => {
  it('shows empty file state when content is null', () => {
    render(<FileViewer path="src/index.ts" content={null} />);
    expect(screen.getByText('Arquivo vazio ou não carregado')).toBeDefined();
    expect(screen.getByText('src/index.ts')).toBeDefined();
  });

  it('shows empty file state when content is undefined', () => {
    render(<FileViewer path="test.ts" />);
    expect(screen.getByText('Arquivo vazio ou não carregado')).toBeDefined();
  });

  it('renders file content with header metadata', () => {
    const content = 'line1\nline2\nline3';
    render(<FileViewer path="src/app.tsx" content={content} language="tsx" />);
    expect(screen.getByText('src/app.tsx')).toBeDefined();
    expect(screen.getByText(/3 linhas/)).toBeDefined();
    expect(screen.getByText(/linhas • tsx/)).toBeDefined();
  });

  it('uses plaintext as default language', () => {
    render(<FileViewer path="file.txt" content="hello" />);
    expect(screen.getByText(/plaintext/)).toBeDefined();
  });
});
