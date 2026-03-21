/**
 * @fileoverview Consumer-level integration tests for BG-08.
 *
 * These tests render App.tsx (the real consumer) and verify that:
 *   - The "timeline" tab uses the official ExploreTimeline (not a stub).
 *   - The "overview" tab uses the official DiscoveryNotes (not a stub).
 *
 * Regression detection:
 *   - If App.tsx reverts to importing the ExploreTimeline stub, the timeline
 *     tests fail because the stub renders "Eventos recentes aparecerão aqui."
 *     instead of filter buttons and "Nenhum evento registrado."
 *   - If the DiscoveryNotes stub is reintroduced, the overview tests fail
 *     because the stub renders static "Criar aplicação React" and ignores the
 *     data prop (so UX placeholders like "O que você quer construir?" would
 *     not appear).
 */

import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

// ---------------------------------------------------------------------------
// Environment setup for jsdom
// ---------------------------------------------------------------------------

beforeAll(() => {
  // matchMedia is used by useReducedMotion hook
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // scrollIntoView is not available in jsdom
  Element.prototype.scrollIntoView = vi.fn();

  // Prevent onboarding tour from running
  localStorage.setItem('mini-ide-tour-seen', 'true');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('App consumer — ExploreTimeline integration (BG-08)', () => {
  it('timeline tab renders the official ExploreTimeline, not the stub', () => {
    render(<App />);

    // Click the "Timeline" tab in WorkspaceTabs
    const timelineTab = screen.getByText('Timeline');
    fireEvent.click(timelineTab);

    // --- OFFICIAL ExploreTimeline distinguishing behavior ---
    // 1. The official component shows "Nenhum evento registrado" when events=[]
    expect(screen.getByText(/Nenhum evento registrado/i)).toBeDefined();

    // 2. The official component renders category filter buttons
    //    The stub has NO buttons — only static text.
    const buttons = screen.getAllByRole('button');
    const filterLabels = buttons.map(b => b.textContent);
    expect(filterLabels).toContain('analysis');
    expect(filterLabels).toContain('system');
    expect(filterLabels).toContain('user-message');

    // 3. The official component shows a TIMELINE counter header
    expect(screen.getByText(/TIMELINE \(0\)/i)).toBeDefined();

    // 4. The stub's text must NOT be present
    expect(screen.queryByText('Eventos recentes aparecerão aqui.')).toBeNull();
  });
});

describe('App consumer — DiscoveryNotes integration (BG-08)', () => {
  it('overview tab renders the official DiscoveryNotes, not the stub', () => {
    render(<App />);

    // The overview tab is active by default. DiscoveryNotes is rendered
    // on the right half of the overview grid.

    // --- OFFICIAL DiscoveryNotes distinguishing behavior ---
    // 1. The official component renders UX placeholder texts when data is empty.
    //    These are specific to the official implementation.
    expect(screen.getByText(/O que você quer construir/i)).toBeDefined();
    expect(screen.getByText(/O que o sistema deve ter/i)).toBeDefined();
    expect(screen.getByText(/O que é proibido/i)).toBeDefined();

    // 2. The official component renders three section headers
    expect(screen.getByText(/Intenção/i)).toBeDefined();
    expect(screen.getByText(/Requisitos/i)).toBeDefined();
    expect(screen.getByText(/Restrições/i)).toBeDefined();

    // 3. The stub's hardcoded static text must NOT be present.
    //    The stub always shows "Criar aplicação React" regardless of data.
    expect(screen.queryByText('Criar aplicação React')).toBeNull();
    // The stub shows "Nenhum requisito capturado..." as static text
    expect(screen.queryByText('Nenhum requisito capturado...')).toBeNull();
  });
});
