// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset document classes
    document.documentElement.classList.remove('dark', 'light');
  });

  describe('useTheme outside provider', () => {
    it('should throw when used outside ThemeProvider', () => {
      // Suppress console.error for expected error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme deve ser usado dentro de um ThemeProvider'
      );
      spy.mockRestore();
    });
  });

  describe('ThemeProvider', () => {
    it('should default to dark theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('dark');
    });

    it('should read saved theme from localStorage', () => {
      localStorage.setItem('mini-ide-theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');
    });

    it('should toggle theme from dark to light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => result.current.toggleTheme());
      expect(result.current.theme).toBe('light');
    });

    it('should toggle theme from light back to dark', () => {
      localStorage.setItem('mini-ide-theme', 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => result.current.toggleTheme());
      expect(result.current.theme).toBe('dark');
    });

    it('should set theme directly', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => result.current.setTheme('light'));
      expect(result.current.theme).toBe('light');
    });

    it('should save theme to localStorage on change', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      act(() => result.current.toggleTheme());
      expect(localStorage.getItem('mini-ide-theme')).toBe('light');
    });
  });
});
