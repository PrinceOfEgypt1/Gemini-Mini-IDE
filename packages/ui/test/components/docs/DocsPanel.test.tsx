import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DocsPanel } from '../../../src/components/docs/DocsPanel';

describe('DocsPanel', () => {
  it('shows empty state when no files provided', () => {
    render(<DocsPanel />);
    expect(screen.getByText('Nenhuma documentação encontrada.')).toBeDefined();
  });

  it('shows empty state for empty array', () => {
    render(<DocsPanel files={[]} />);
    expect(screen.getByText('Nenhuma documentação encontrada.')).toBeDefined();
  });

  it('shows empty state when no markdown files exist', () => {
    const files = [
      { path: 'src/index.ts', content: 'export default {}' },
    ];
    render(<DocsPanel files={files} />);
    expect(screen.getByText('Nenhuma documentação encontrada.')).toBeDefined();
  });

  it('renders README.md content when found', () => {
    const files = [
      { path: 'src/index.ts', content: 'export default {}' },
      { path: 'README.md', content: '# My Project\n\nHello world' },
    ];
    render(<DocsPanel files={files} />);
    expect(screen.getByText('README.md')).toBeDefined();
    expect(screen.getByText('My Project')).toBeDefined();
  });

  it('prioritizes README.md over other markdown files', () => {
    const files = [
      { path: 'docs/GUIDE.md', content: '# Guide' },
      { path: 'README.md', content: '# Main README' },
    ];
    render(<DocsPanel files={files} />);
    expect(screen.getByText('README.md')).toBeDefined();
    expect(screen.getByText('Main README')).toBeDefined();
  });

  it('falls back to any .md file when no README exists', () => {
    const files = [
      { path: 'src/index.ts', content: 'code' },
      { path: 'docs/CHANGELOG.md', content: '# Changelog\n\nFirst release' },
    ];
    render(<DocsPanel files={files} />);
    expect(screen.getByText('docs/CHANGELOG.md')).toBeDefined();
    expect(screen.getByText('Changelog')).toBeDefined();
  });
});
