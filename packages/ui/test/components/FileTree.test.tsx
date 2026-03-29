import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileTree } from '../../src/components/FileTree';
import type { FileNode } from '../../src/utils/fileTree';

describe('FileTree', () => {
  it('shows empty state when no nodes', () => {
    render(<FileTree nodes={[]} />);
    expect(screen.getByText('Nenhum arquivo gerado ainda.')).toBeDefined();
  });

  it('renders file nodes', () => {
    const nodes: FileNode[] = [
      { name: 'index.ts', path: 'src/index.ts', type: 'file' },
      { name: 'app.tsx', path: 'src/app.tsx', type: 'file' },
    ];
    render(<FileTree nodes={nodes} />);
    expect(screen.getByText('index.ts')).toBeDefined();
    expect(screen.getByText('app.tsx')).toBeDefined();
  });

  it('renders folder nodes with children', () => {
    const nodes: FileNode[] = [
      {
        name: 'src',
        path: 'src',
        type: 'folder',
        children: [
          { name: 'index.ts', path: 'src/index.ts', type: 'file' },
        ],
      },
    ];
    render(<FileTree nodes={nodes} />);
    expect(screen.getByText('src')).toBeDefined();
    expect(screen.getByText('index.ts')).toBeDefined();
  });

  it('toggles folder visibility on click', () => {
    const nodes: FileNode[] = [
      {
        name: 'src',
        path: 'src',
        type: 'folder',
        children: [
          { name: 'index.ts', path: 'src/index.ts', type: 'file' },
        ],
      },
    ];
    render(<FileTree nodes={nodes} />);
    // Folder is open by default
    expect(screen.getByText('index.ts')).toBeDefined();
    // Click to close
    fireEvent.click(screen.getByText('src'));
    expect(screen.queryByText('index.ts')).toBeNull();
    // Click to reopen
    fireEvent.click(screen.getByText('src'));
    expect(screen.getByText('index.ts')).toBeDefined();
  });

  it('calls onSelectFile when a file node is clicked', () => {
    const onSelectFile = vi.fn();
    const nodes: FileNode[] = [
      { name: 'index.ts', path: 'src/index.ts', type: 'file' },
    ];
    render(<FileTree nodes={nodes} onSelectFile={onSelectFile} />);
    fireEvent.click(screen.getByText('index.ts'));
    expect(onSelectFile).toHaveBeenCalledWith('src/index.ts');
  });
});
