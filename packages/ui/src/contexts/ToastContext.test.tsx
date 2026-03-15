// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('useToast outside provider', () => {
    it('should throw when used outside ToastProvider', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useToast())).toThrow(
        'useToast deve ser usado dentro de um ToastProvider'
      );
      spy.mockRestore();
    });
  });

  describe('ToastProvider', () => {
    it('should provide showToast function', () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      expect(typeof result.current.showToast).toBe('function');
    });

    it('should not throw when showing a toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      expect(() => {
        act(() => result.current.showToast('test message'));
      }).not.toThrow();
    });

    it('should accept type parameter', () => {
      const { result } = renderHook(() => useToast(), { wrapper });
      expect(() => {
        act(() => result.current.showToast('success!', 'success'));
        act(() => result.current.showToast('error!', 'error'));
        act(() => result.current.showToast('warn!', 'warning'));
      }).not.toThrow();
    });
  });
});
