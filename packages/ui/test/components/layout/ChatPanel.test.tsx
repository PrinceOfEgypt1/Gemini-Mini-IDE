import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ChatPanel } from '../../../src/components/layout/ChatPanel';

// ConversationChat uses scrollIntoView which jsdom doesn't implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatPanel', () => {
  const defaultProps = {
    chatMode: 'interactive' as const,
    onChatModeChange: vi.fn(),
    onProjectGenerated: vi.fn(),
    onToast: vi.fn(),
  };

  it('renders chat mode toggle buttons', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getAllByText('Chat Interativo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Chat Classico')).toBeDefined();
  });

  it('calls onChatModeChange when classic tab is clicked', () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Chat Classico'));
    expect(defaultProps.onChatModeChange).toHaveBeenCalledWith('classic');
  });

  it('calls onChatModeChange when interactive tab is clicked', () => {
    render(<ChatPanel {...defaultProps} chatMode="classic" />);
    fireEvent.click(screen.getAllByText('Chat Interativo')[0]);
    expect(defaultProps.onChatModeChange).toHaveBeenCalledWith('interactive');
  });

  it('shows classic mode placeholder when in classic mode', () => {
    render(<ChatPanel {...defaultProps} chatMode="classic" />);
    expect(screen.getByText('Chat clássico em desenvolvimento...')).toBeDefined();
  });
});
