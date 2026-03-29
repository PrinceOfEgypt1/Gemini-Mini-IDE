import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SidebarLayout } from '../../../src/components/layout/SidebarLayout';

describe('SidebarLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <SidebarLayout files={[]} onSelectFile={vi.fn()} />
    );
    expect(container.firstChild).toBeDefined();
  });

  it('passes files to Sidebar component', () => {
    const files = [
      { path: 'src/index.ts', content: 'export default {}' },
      { path: 'src/app.ts', content: 'console.log("hi")' },
    ];
    const { container } = render(
      <SidebarLayout files={files} onSelectFile={vi.fn()} />
    );
    expect(container.innerHTML).toContain('index.ts');
  });
});
