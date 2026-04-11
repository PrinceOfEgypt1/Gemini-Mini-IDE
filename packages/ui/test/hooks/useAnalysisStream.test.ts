import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysisStream } from '../../src/hooks/useAnalysisStream';

describe('useAnalysisStream', () => {
  it('returns initial state with isAnalyzing false', () => {
    const { result } = renderHook(() => useAnalysisStream());
    expect(result.current.isAnalyzing).toBe(false);
  });

  it('returns empty events array', () => {
    const { result } = renderHook(() => useAnalysisStream());
    expect(result.current.events).toEqual([]);
  });

  it('returns null partialProject', () => {
    const { result } = renderHook(() => useAnalysisStream());
    expect(result.current.partialProject).toBeNull();
  });

  it('exposes startAnalysis function', () => {
    const { result } = renderHook(() => useAnalysisStream());
    expect(typeof result.current.startAnalysis).toBe('function');
  });

  it('startAnalysis does not throw when called', async () => {
    const { result } = renderHook(() => useAnalysisStream());
    await act(async () => {
      await result.current.startAnalysis('test prompt');
    });
    // Stub function — should not change state
    expect(result.current.isAnalyzing).toBe(false);
  });
});
