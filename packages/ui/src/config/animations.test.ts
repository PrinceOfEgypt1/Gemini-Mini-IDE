import { describe, it, expect } from 'vitest';
import {
  withTransition,
  getAccessibleVariants,
  getAccessibleTransition,
  TRANSITIONS,
  REDUCED_MOTION_TRANSITIONS,
  reducedMotionVariants,
  fadeInOut,
  slideInFromLeft,
} from './animations';

describe('withTransition', () => {
  it('should add default transition to variants', () => {
    const result = withTransition(fadeInOut);
    expect(result.hidden).toHaveProperty('transition');
    expect(result.visible).toHaveProperty('transition');
  });

  it('should use custom transition when provided', () => {
    const custom = { duration: 1.5 };
    const result = withTransition(fadeInOut, custom);
    expect((result.visible as Record<string, unknown>).transition).toEqual(custom);
  });

  it('should preserve existing transition on variant', () => {
    const variants = {
      hidden: { opacity: 0, transition: { duration: 0.1 } },
      visible: { opacity: 1 },
    };
    const result = withTransition(variants, { duration: 0.5 });
    // hidden already has transition, should keep it
    expect((result.hidden as Record<string, unknown>).transition).toEqual({ duration: 0.1 });
    // visible has no transition, should get the provided one
    expect((result.visible as Record<string, unknown>).transition).toEqual({ duration: 0.5 });
  });

  it('should handle empty variants object', () => {
    const result = withTransition({});
    expect(result).toEqual({});
  });
});

describe('getAccessibleVariants', () => {
  it('should return normal variants when prefersReducedMotion is false', () => {
    const result = getAccessibleVariants(slideInFromLeft, false);
    expect(result).toBe(slideInFromLeft);
  });

  it('should return reduced motion variants when prefersReducedMotion is true', () => {
    const result = getAccessibleVariants(slideInFromLeft, true);
    expect(result).toBe(reducedMotionVariants);
  });

  it('should not contain x/y transforms in reduced variants', () => {
    const result = getAccessibleVariants(slideInFromLeft, true);
    expect((result.hidden as Record<string, unknown>).x).toBeUndefined();
    expect((result.hidden as Record<string, unknown>).y).toBeUndefined();
  });
});

describe('getAccessibleTransition', () => {
  it('should return normal transition when prefersReducedMotion is false', () => {
    const result = getAccessibleTransition(TRANSITIONS.slow, false);
    expect(result).toBe(TRANSITIONS.slow);
  });

  it('should return instant transition when prefersReducedMotion is true', () => {
    const result = getAccessibleTransition(TRANSITIONS.slow, true);
    expect(result).toBe(REDUCED_MOTION_TRANSITIONS.instant);
    expect((result as Record<string, unknown>).duration).toBe(0);
  });
});

describe('TRANSITIONS constants', () => {
  it('should have fast, normal, slow durations in order', () => {
    expect((TRANSITIONS.fast as Record<string, unknown>).duration).toBeLessThan(
      (TRANSITIONS.normal as Record<string, unknown>).duration as number
    );
    expect((TRANSITIONS.normal as Record<string, unknown>).duration).toBeLessThan(
      (TRANSITIONS.slow as Record<string, unknown>).duration as number
    );
  });

  it('should have spring variants', () => {
    expect((TRANSITIONS.spring as Record<string, unknown>).type).toBe('spring');
    expect((TRANSITIONS.springBouncy as Record<string, unknown>).type).toBe('spring');
    expect((TRANSITIONS.springSmooth as Record<string, unknown>).type).toBe('spring');
  });
});
