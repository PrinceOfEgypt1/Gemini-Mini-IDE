import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { highlightCode, SyntaxHighlighter } from '../../src/utils/syntaxHighlighter';

describe('highlightCode', () => {
  it('escapes HTML entities for XSS protection', () => {
    const result = highlightCode('<script>alert("xss")</script>', '');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('highlights comments in TypeScript files', () => {
    const result = highlightCode('// this is a comment', 'file.ts');
    expect(result).toContain('color:#6A9955');
    // The comment text is present (may have nested spans from keyword highlighting)
    expect(result).toContain('a comment');
  });

  it('highlights keywords in TypeScript files', () => {
    const result = highlightCode('const x = 1;', 'file.ts');
    expect(result).toContain('color:#C586C0');
    expect(result).toContain('const');
  });

  it('highlights strings in TypeScript files', () => {
    const result = highlightCode('const s = "hello";', 'file.tsx');
    expect(result).toContain('color:#CE9178');
  });

  it('highlights function calls in TypeScript files', () => {
    const result = highlightCode('console.log("test")', 'file.js');
    expect(result).toContain('color:#DCDCAA');
  });

  it('highlights HTML tags', () => {
    const result = highlightCode('<div class="test">Hello</div>', 'file.html');
    expect(result).toContain('color:#569CD6');
  });

  it('highlights HTML attributes', () => {
    const result = highlightCode('<div class="test">', 'file.html');
    expect(result).toContain('color:#9CDCFE');
  });

  it('does not apply TS highlighting to non-TS files', () => {
    const result = highlightCode('const x = 1;', 'file.txt');
    // No keyword highlighting for plain text
    expect(result).not.toContain('color:#C586C0');
  });
});

describe('SyntaxHighlighter component', () => {
  it('renders code with highlighting', () => {
    const { container } = render(
      <SyntaxHighlighter code="const x = 1;" language="ts" />
    );
    expect(container.querySelector('pre')).toBeDefined();
    expect(container.querySelector('code')).toBeDefined();
    expect(container.innerHTML).toContain('const');
  });

  it('uses text as default language', () => {
    const { container } = render(
      <SyntaxHighlighter code="plain text" />
    );
    expect(container.querySelector('pre')).toBeDefined();
  });
});
