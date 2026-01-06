// Utility Functions Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  copyToClipboard, 
  throttle, 
  debounce, 
  normalizeGyroData, 
  degToRad, 
  lerp 
} from '../src/utils.js';

describe('Utils', () => {
  describe('normalizeGyroData', () => {
    it('should normalize valid gyroscope data', () => {
      const result = normalizeGyroData(180, 45, -30);
      expect(result.alpha).toBe(180);
      expect(result.beta).toBe(45);
      expect(result.gamma).toBe(-30);
    });

    it('should handle null values', () => {
      const result = normalizeGyroData(null, null, null);
      expect(result.alpha).toBe(0);
      expect(result.beta).toBe(0);
      expect(result.gamma).toBe(0);
    });

    it('should handle mixed null and valid values', () => {
      const result = normalizeGyroData(180, null, -30);
      expect(result.alpha).toBe(180);
      expect(result.beta).toBe(0);
      expect(result.gamma).toBe(-30);
    });
  });

  describe('degToRad', () => {
    it('should convert degrees to radians', () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should handle negative degrees', () => {
      expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it('should handle factor outside 0-1 range', () => {
      expect(lerp(0, 10, 2)).toBe(20);
      expect(lerp(0, 10, -1)).toBe(-10);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should throttle function calls', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled();
      throttled();
      throttled();

      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(func).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments correctly', () => {
      const func = vi.fn();
      const throttled = throttle(func, 100);

      throttled('arg1', 'arg2');
      expect(func).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      debounced();
      debounced();

      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on new calls', () => {
      const func = vi.fn();
      const debounced = debounce(func, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('copyToClipboard', () => {
    it('should use navigator.clipboard if available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue();
      Object.defineProperty(global.navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true
      });

      await copyToClipboard('test text');
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should fallback to execCommand if clipboard not available', async () => {
      Object.defineProperty(global.navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      await copyToClipboard('fallback text');

      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(removeChildSpy).toHaveBeenCalled();
      
      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});

