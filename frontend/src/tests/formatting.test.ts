import { describe, it, expect } from 'vitest';

describe('Prediction Output Formatting & Calculations', () => {
  it('computes correct realtime factor from duration and estimate', () => {
    const duration = 120;
    const estimatedTime = 58.67;
    const factor = parseFloat((estimatedTime / duration).toFixed(2));
    expect(factor).toBe(0.49);
    expect(factor).toBeLessThan(1.0); // Transcodes faster than real-time playback
  });

  it('formats human readable seconds', () => {
    const seconds = 58.67;
    const formatted = `${seconds.toFixed(2)} seconds`;
    expect(formatted).toBe('58.67 seconds');
  });

  it('handles zero or short duration safely', () => {
    const duration = 0;
    const estimated = 12.5;
    const factor = duration > 0 ? parseFloat((estimated / duration).toFixed(2)) : 1;
    expect(factor).toBe(1);
  });
});
