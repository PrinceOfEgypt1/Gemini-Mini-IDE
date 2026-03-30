import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { HistoryPanel } from '../../../src/components/analyze/HistoryPanel';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('HistoryPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows loading state initially', async () => {
    // Use real timers for this test since we just need to catch the initial render
    vi.useRealTimers();

    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => { resolvePromise = resolve; });
    mockedAxios.get.mockReturnValue(pendingPromise as never);

    render(<HistoryPanel />);

    expect(screen.getByText('Carregando histórico...')).toBeDefined();

    // Cleanup
    await act(async () => {
      resolvePromise!({ data: [] });
    });
  });

  it('shows empty state when no history returned', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    await act(async () => {
      render(<HistoryPanel />);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Nenhuma execução registrada.')).toBeDefined();
  });

  it('renders history items', async () => {
    const historyData = [
      {
        filename: 'test.ts',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'abc123def456',
        summary: 'Analysis of test module',
      },
    ];
    mockedAxios.get.mockResolvedValue({ data: historyData });

    await act(async () => {
      render(<HistoryPanel />);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Analysis of test module')).toBeDefined();
    expect(screen.getByText('ID: abc123')).toBeDefined();
  });

  it('silently handles fetch errors', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<HistoryPanel />);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Nenhuma execução registrada.')).toBeDefined();
  });
});
