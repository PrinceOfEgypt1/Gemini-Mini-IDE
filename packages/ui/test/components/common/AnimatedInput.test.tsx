import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    input: React.forwardRef(({ className, onFocus, onBlur, onChange, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }, ref: React.Ref<HTMLInputElement>) => (
      <input ref={ref} className={className} onFocus={onFocus} onBlur={onBlur} onChange={onChange} {...rest} />
    )),
    label: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLLabelElement>) => (
      <label ref={ref} className={className} {...rest}>{children}</label>
    )),
    span: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLSpanElement>) => (
      <span ref={ref} className={className} {...rest}>{children}</span>
    )),
    p: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLParagraphElement>) => (
      <p ref={ref} className={className} {...rest}>{children}</p>
    )),
  },
}));

vi.mock('../../../src/config/animations', () => ({
  TRANSITIONS: { fast: { duration: 0.1 }, normal: { duration: 0.2 } },
}));

import { AnimatedInput } from '../../../src/components/common/AnimatedInput';

describe('AnimatedInput', () => {
  it('renders a text input', () => {
    render(<AnimatedInput />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders with a label', () => {
    render(<AnimatedInput label="Email" />);
    expect(screen.getByText('Email')).toBeDefined();
  });

  it('renders with an error message', () => {
    render(<AnimatedInput error="Campo obrigatorio" />);
    expect(screen.getByText('Campo obrigatorio')).toBeDefined();
  });

  it('applies error border style', () => {
    render(<AnimatedInput error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-500');
  });

  it('renders with an icon', () => {
    render(<AnimatedInput icon={<span data-testid="input-icon">@</span>} />);
    expect(screen.getByTestId('input-icon')).toBeDefined();
  });

  it('applies pl-10 class when icon is present', () => {
    render(<AnimatedInput icon={<span>@</span>} />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('pl-10');
  });

  it('handles focus and blur events', () => {
    render(<AnimatedInput label="Name" />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.blur(input);
    // No crash, component handles state internally
    expect(input).toBeDefined();
  });

  it('handles change events and updates hasValue state', () => {
    const onChange = vi.fn();
    render(<AnimatedInput onChange={onChange} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<AnimatedInput ref={ref} />);
    expect(ref.current).toBeDefined();
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('renders without animation when animated=false', () => {
    render(<AnimatedInput animated={false} label="Static" />);
    expect(screen.getByText('Static')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<AnimatedInput className="extra-class" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('extra-class');
  });
});
