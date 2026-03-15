// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  let listeners: Map<string, (e: MediaQueryListEvent) => void>;
  let matchesMock: boolean;

  beforeEach(() => {
    listeners = new Map();
    matchesMock = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: matchesMock,
        media: query,
        addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.set(event, handler);
        }),
        removeEventListener: vi.fn((event: string) => {
          listeners.delete(event);
        }),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return false when motion is not reduced', () => {
    matchesMock = false;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('should return true when motion is reduced', () => {
    matchesMock = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('should register a change event listener', () => {
    renderHook(() => useReducedMotion());
    expect(listeners.has('change')).toBe(true);
  });

  it('should remove listener on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    expect(listeners.has('change')).toBe(true);
    unmount();
    // removeEventListener was called
    expect(window.matchMedia).toHaveBeenCalled();
  });
});
