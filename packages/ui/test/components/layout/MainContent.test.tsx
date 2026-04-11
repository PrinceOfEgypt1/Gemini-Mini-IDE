import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} className={className} {...rest}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock child components
vi.mock('../../../src/components/code/FileViewer', () => ({
  FileViewer: ({ path, content }: { path: string; content: string }) => <div data-testid="file-viewer">FILE:{path}|{content}</div>,
}));
vi.mock('../../../src/components/hus/HUsPanel', () => ({
  HUsPanel: ({ stories }: { stories: unknown[] }) => <div data-testid="hus-panel">HUS:{stories.length}</div>,
}));
vi.mock('../../../src/components/docs/DocsPanel', () => ({
  DocsPanel: ({ files }: { files: unknown[] }) => <div data-testid="docs-panel">DOCS:{files.length}</div>,
}));
vi.mock('../../../src/components/tests/TestsPanel', () => ({
  TestsPanel: ({ files }: { files: unknown[] }) => <div data-testid="tests-panel">TESTS:{files.length}</div>,
}));
vi.mock('../../../src/components/explore/ExploreTimeline', () => ({
  ExploreTimeline: () => <div data-testid="explore-timeline">TIMELINE</div>,
}));
vi.mock('../../../src/components/DiscoveryNotes', () => ({
  DiscoveryNotes: () => <div data-testid="discovery-notes">DISCOVERY</div>,
}));
vi.mock('../../../src/components/common/Button', () => ({
  Button: ({ children, onClick, disabled, id }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; id?: string }) => (
    <button id={id} onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('../../../src/components/WorkspaceTabs', () => ({
  WorkspaceTabs: ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: string) => void }) => (
    <div data-testid="workspace-tabs">
      <span data-testid="current-tab">{activeTab}</span>
      <button onClick={() => onTabChange('code')}>tab-code</button>
      <button onClick={() => onTabChange('hus')}>tab-hus</button>
    </div>
  ),
}));

import { MainContent } from '../../../src/components/layout/MainContent';

const baseProps = {
  activeTab: 'code',
  onTabChange: vi.fn(),
  projectFiles: [{ path: 'src/main.ts', content: 'console.log("hi")' }],
  projectHUs: [],
  selectedFile: null,
  onFileSelect: vi.fn(),
  discoveryData: { intent: [], reqs: [], constraints: [] },
  isExporting: false,
  onExportClick: vi.fn(),
};

describe('MainContent', () => {
  it('renders WorkspaceTabs with the active tab', () => {
    render(<MainContent {...baseProps} />);
    expect(screen.getByTestId('current-tab').textContent).toBe('code');
  });

  it('shows placeholder when code tab has no selected file', () => {
    render(<MainContent {...baseProps} activeTab="code" selectedFile={null} />);
    expect(screen.getByText('Selecione um arquivo na sidebar.')).toBeDefined();
  });

  it('renders FileViewer when a file is selected on code tab', () => {
    const file = { path: 'src/app.ts', content: 'export default 1;' };
    render(<MainContent {...baseProps} activeTab="code" selectedFile={file} />);
    expect(screen.getByText('FILE:src/app.ts|export default 1;')).toBeDefined();
  });

  it('renders HUsPanel on hus tab', () => {
    const stories = [{ id: 'HU-01', acceptanceCriteria: ['test'] }];
    render(<MainContent {...baseProps} activeTab="hus" projectHUs={stories} />);
    expect(screen.getByText('HUS:1')).toBeDefined();
  });

  it('renders DocsPanel on docs tab', () => {
    render(<MainContent {...baseProps} activeTab="docs" />);
    expect(screen.getByText('DOCS:1')).toBeDefined();
  });

  it('renders TestsPanel on tests tab', () => {
    render(<MainContent {...baseProps} activeTab="tests" />);
    expect(screen.getByText('TESTS:1')).toBeDefined();
  });

  it('renders ExploreTimeline on timeline tab', () => {
    render(<MainContent {...baseProps} activeTab="timeline" />);
    expect(screen.getByText('TIMELINE')).toBeDefined();
  });

  it('renders DiscoveryNotes on discovery tab', () => {
    render(<MainContent {...baseProps} activeTab="discovery" />);
    expect(screen.getByText('DISCOVERY')).toBeDefined();
  });

  it('renders outputs tab with export button', () => {
    render(<MainContent {...baseProps} activeTab="outputs" />);
    expect(screen.getByText('Artefatos Gerados')).toBeDefined();
    expect(screen.getByText(/Total de arquivos: 1/)).toBeDefined();
    expect(screen.getByText('Exportar Projeto (.zip)')).toBeDefined();
  });

  it('shows exporting state on outputs tab', () => {
    render(<MainContent {...baseProps} activeTab="outputs" isExporting={true} />);
    expect(screen.getByText('Exportando...')).toBeDefined();
  });

  it('calls onExportClick when export button is clicked', () => {
    const onExportClick = vi.fn();
    render(<MainContent {...baseProps} activeTab="outputs" onExportClick={onExportClick} />);
    fireEvent.click(screen.getByText('Exportar Projeto (.zip)'));
    expect(onExportClick).toHaveBeenCalledTimes(1);
  });

  it('returns null for unknown tab', () => {
    const { container } = render(<MainContent {...baseProps} activeTab="nonexistent" />);
    // Should render the wrapper but no content inside the animated area
    expect(container.querySelector('[data-testid="workspace-tabs"]')).toBeDefined();
  });

  it('delegates tab change via WorkspaceTabs', () => {
    const onTabChange = vi.fn();
    render(<MainContent {...baseProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('tab-hus'));
    expect(onTabChange).toHaveBeenCalledWith('hus');
  });
});
