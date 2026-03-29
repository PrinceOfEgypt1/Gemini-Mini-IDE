import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TestsPanel } from '../../../src/components/tests/TestsPanel';

describe('TestsPanel', () => {
  it('shows empty state when no files provided', () => {
    render(<TestsPanel />);
    expect(screen.getByText('Nenhum arquivo de teste identificado.')).toBeDefined();
  });

  it('shows empty state when no test files match', () => {
    const files = [
      { path: 'src/index.ts', content: 'export default {}' },
      { path: 'src/app.tsx', content: '<App />' },
    ];
    render(<TestsPanel files={files} />);
    expect(screen.getByText('Nenhum arquivo de teste identificado.')).toBeDefined();
  });

  it('identifies and renders test files', () => {
    const files = [
      { path: 'src/index.ts', content: 'code' },
      { path: 'src/app.test.ts', content: 'test content' },
      { path: 'src/__tests__/util.ts', content: 'test util' },
    ];
    render(<TestsPanel files={files} />);
    expect(screen.getByText('app.test.ts')).toBeDefined();
    expect(screen.getByText('util.ts')).toBeDefined();
  });

  it('shows file viewer when a test is selected', () => {
    const files = [
      { path: 'src/app.test.ts', content: 'describe("app", () => {})' },
    ];
    render(<TestsPanel files={files} />);
    fireEvent.click(screen.getByText('app.test.ts'));
    expect(screen.getByText('← Voltar para lista')).toBeDefined();
    // Path appears in both header and FileViewer
    expect(screen.getAllByText('src/app.test.ts').length).toBeGreaterThanOrEqual(1);
  });

  it('returns to list view when back button is clicked', () => {
    const files = [
      { path: 'src/app.test.ts', content: 'test code' },
    ];
    render(<TestsPanel files={files} />);
    fireEvent.click(screen.getByText('app.test.ts'));
    fireEvent.click(screen.getByText('← Voltar para lista'));
    expect(screen.queryByText('← Voltar para lista')).toBeNull();
    expect(screen.getByText('app.test.ts')).toBeDefined();
  });
});
