import { describe, it, expect } from 'vitest';
import { parseStreamEvent } from './stream';

describe('parseStreamEvent', () => {
  it('should parse valid JSON stream event', () => {
    const event = parseStreamEvent('{"type":"INFO","message":"hello","timestamp":123}');
    expect(event).toEqual({ type: 'INFO', message: 'hello', timestamp: 123 });
  });

  it('should return null for invalid JSON', () => {
    expect(parseStreamEvent('not json')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseStreamEvent('')).toBeNull();
  });

  it('should parse event with data field', () => {
    const event = parseStreamEvent('{"type":"FILE","message":"test","timestamp":1,"data":{"path":"a.ts"}}');
    expect(event).not.toBeNull();
    expect(event!.type).toBe('FILE');
    expect(event!.data).toEqual({ path: 'a.ts' });
  });

  it('should parse COMPLETE event type', () => {
    const event = parseStreamEvent('{"type":"COMPLETE","message":"done","timestamp":999}');
    expect(event!.type).toBe('COMPLETE');
  });

  it('should parse ERROR event type', () => {
    const event = parseStreamEvent('{"type":"ERROR","message":"fail","timestamp":0}');
    expect(event!.type).toBe('ERROR');
  });
});
