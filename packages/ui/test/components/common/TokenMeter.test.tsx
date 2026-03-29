import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TokenMeter } from '../../../src/components/common/TokenMeter';

describe('TokenMeter', () => {
  it('renders with zero usage', () => {
    render(<TokenMeter chatHistory={[]} files={[]} />);
    expect(screen.getByText(/Memória da IA/)).toBeDefined();
    expect(screen.getByText(/0 \/ 131,072 tk/)).toBeDefined();
  });

  it('calculates token usage from chat history and files', () => {
    const chatHistory = [{ text: 'a'.repeat(350) }]; // ~100 tokens
    const files = [{ content: 'b'.repeat(350) }]; // ~100 tokens
    render(<TokenMeter chatHistory={chatHistory} files={files} />);
    // 700 chars / 3.5 = 200 tokens
    expect(screen.getByText(/200 \//)).toBeDefined();
  });

  it('shows healthy status for low usage', () => {
    render(<TokenMeter chatHistory={[]} files={[]} />);
    const bar = screen.getByTitle(/Memória Saudável/);
    expect(bar).toBeDefined();
  });

  it('shows high memory status for 75-95% usage', () => {
    // ~80% of 1000 tokens = 800 tokens * 3.5 = 2800 chars
    const chatHistory = [{ text: 'x'.repeat(2800) }];
    render(<TokenMeter chatHistory={chatHistory} files={[]} maxTokens={1000} />);
    const bar = screen.getByTitle(/Memória Alta/);
    expect(bar).toBeDefined();
  });

  it('shows critical status and warning for >95% usage', () => {
    // ~98% of 1000 tokens = 980 * 3.5 = 3430 chars
    const chatHistory = [{ text: 'x'.repeat(3430) }];
    render(<TokenMeter chatHistory={chatHistory} files={[]} maxTokens={1000} />);
    const bar = screen.getByTitle(/Limite do Modelo Próximo/);
    expect(bar).toBeDefined();
    expect(screen.getByText(/Limite do Modelo Próximo/)).toBeDefined();
  });

  it('handles null content in files gracefully', () => {
    const files = [{ content: null as unknown as string }];
    render(<TokenMeter chatHistory={[]} files={files} />);
    expect(screen.getByText(/0 \//)).toBeDefined();
  });
});
