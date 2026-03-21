import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const hoisted = vi.hoisted(() => ({
  showToastMock: vi.fn(),
  exportProjectZipMock: vi.fn(async () => undefined),
  startOnboardingTourMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: hoisted.showToastMock }),
}));

vi.mock('../../src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/hooks', () => ({
  useReducedMotion: () => false,
}));

vi.mock('../../src/services/api', () => ({
  api: {
    exportProjectZip: (...args: unknown[]) => hoisted.exportProjectZipMock(...args),
    analyze: vi.fn(),
  },
}));

vi.mock('../../src/services/tour', () => ({
  startOnboardingTour: () => hoisted.startOnboardingTourMock(),
}));

vi.mock('../../src/utils/discoveryParser', () => ({
  parseDiscoveryMessage: vi.fn((message: string, current: unknown) => current),
}));

vi.mock('../../src/components/DiscoveryNotes', () => ({
  DiscoveryNotes: ({ data }: { data: { intent?: string[] } }) => (
    <div>DISCOVERY:{data.intent?.length ?? 0}</div>
  ),
}));

vi.mock('../../src/components/explore/ExploreTimeline', () => ({
  ExploreTimeline: () => <div>OFFICIAL_TIMELINE</div>,
}));

vi.mock('../../src/components/WorkspaceTabs', () => ({
  WorkspaceTabs: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div>
      <div data-testid="active-tab">{activeTab}</div>
      <button onClick={() => onTabChange('overview')}>Overview</button>
      <button onClick={() => onTabChange('timeline')}>Timeline</button>
      <button onClick={() => onTabChange('outputs')}>Outputs</button>
      <button onClick={() => onTabChange('code')}>Code</button>
    </div>
  ),
}));

vi.mock('../../src/components/Sidebar', () => ({
  Sidebar: ({
    files,
    onSelectFile,
  }: {
    files: Array<{ path: string; content: string }>;
    onSelectFile: (path: string) => void;
  }) => (
    <div>
      {files.map((file) => (
        <button key={file.path} onClick={() => onSelectFile(file.path)}>
          open:{file.path}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../src/components/hus/HUsPanel', () => ({
  HUsPanel: ({ stories }: { stories: unknown[] }) => <div>HUS:{stories.length}</div>,
}));

vi.mock('../../src/components/docs/DocsPanel', () => ({
  DocsPanel: ({ files }: { files: unknown[] }) => <div>DOCS:{files.length}</div>,
}));

vi.mock('../../src/components/tests/TestsPanel', () => ({
  TestsPanel: ({ files }: { files: unknown[] }) => <div>TESTS:{files.length}</div>,
}));

vi.mock('../../src/components/code/FileViewer', () => ({
  FileViewer: ({ path }: { path: string }) => <div>FILE:{path}</div>,
}));

vi.mock('../../src/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    id,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    id?: string;
    disabled?: boolean;
  }) => (
    <button id={id} onClick={onClick} data-disabled={disabled ? 'true' : 'false'}>
      {children}
    </button>
  ),
}));

vi.mock('../../src/components/common/TokenMeter', () => ({
  TokenMeter: () => <div>TOKEN_METER</div>,
}));

vi.mock('../../src/components/wizard/ProjectWizard', () => ({
  ProjectWizard: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>ProjectWizard</div> : null),
}));

vi.mock('../../src/components/wizard/QuickStartGallery', () => ({
  QuickStartGallery: ({
    isOpen,
    onSelectTemplate,
    onStartTour,
  }: {
    isOpen: boolean;
    onSelectTemplate: (prompt: string) => void;
    onStartTour: () => void;
  }) =>
    isOpen ? (
      <div>
        <div>QuickStartGallery</div>
        <button onClick={() => onSelectTemplate('modelo pronto')}>mock-select-template</button>
        <button onClick={onStartTour}>mock-start-tour</button>
      </div>
    ) : null,
}));

vi.mock('../../src/components/settings/SettingsModal', () => ({
  SettingsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>SettingsModal</div> : null),
}));

vi.mock('../../src/components/help/HelpModal', () => ({
  HelpModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>HelpModal</div> : null),
}));

vi.mock('../../src/components/chat/ConversationChat', async () => {
  const ReactModule = await import('react');
  return {
    ConversationChat: ReactModule.forwardRef(function ConversationChatMock(
      { onProjectGenerated }: { onProjectGenerated: (result: unknown) => void },
      _ref: unknown,
    ) {
      return (
        <button
          onClick={() =>
            onProjectGenerated({
              engine: {
                files: [{ path: 'src/App.tsx', content: 'export default 1;' }],
              },
              product: { userStories: [] },
              summary: 'seeded',
            })
          }
        >
          seed-project
        </button>
      );
    }),
  };
});

import App from '../../src/App';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('mini-ide-tour-seen', 'true');
});

describe('App interaction coverage for BG-08', () => {
  it('opens header modals and injects quick-start template into the textarea', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Criar'));
    expect(screen.getByText('ProjectWizard')).toBeDefined();

    fireEvent.click(screen.getByText('Quick Start'));
    expect(screen.getByText('QuickStartGallery')).toBeDefined();

    fireEvent.click(screen.getByText('mock-select-template'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('modelo pronto');

    fireEvent.click(screen.getByText('⚙️'));
    expect(screen.getByText('SettingsModal')).toBeDefined();

    fireEvent.click(screen.getByText('?'));
    expect(screen.getByText('HelpModal')).toBeDefined();
  });

  it('uses ctrl+enter in classic mode and opens settings when API key is missing', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Chat Classico'));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'mensagem via teclado' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(hoisted.showToastMock).toHaveBeenCalledWith(
      'Configure sua API Key nas Preferências para continuar.',
      'warning',
    );
    expect(screen.getByText('SettingsModal')).toBeDefined();
  });

  it('selects a generated file from the sidebar and switches to code view', () => {
    render(<App />);

    fireEvent.click(screen.getByText('seed-project'));
    fireEvent.click(screen.getByText('open:src/App.tsx'));

    expect(screen.getByText('FILE:src/App.tsx')).toBeDefined();
    expect(screen.getByTestId('active-tab').textContent).toBe('code');
  });

  it('exports a generated project from the outputs tab', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('seed-project'));
    fireEvent.click(screen.getByText('Outputs'));
    fireEvent.click(screen.getByText('Baixar Projeto Completo (.zip)'));

    await waitFor(() => {
      expect(hoisted.exportProjectZipMock).toHaveBeenCalledTimes(1);
    });

    expect(hoisted.showToastMock).toHaveBeenCalledWith(
      'Projeto exportado com sucesso!',
      'success',
    );
  });
});
