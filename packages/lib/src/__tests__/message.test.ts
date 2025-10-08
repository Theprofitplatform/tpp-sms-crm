import { describe, it, expect } from 'vitest';
import { calculateMessageParts, appendOptOutLine, isStopKeyword } from '../utils/message';

describe('Message Utilities', () => {
  describe('calculateMessageParts', () => {
    it('should calculate single part for short GSM-7 message', () => {
      const message = 'Hello world';
      expect(calculateMessageParts(message)).toBe(1);
    });

    it('should calculate multiple parts for long GSM-7 message', () => {
      const message = 'A'.repeat(200); // Longer than 160 chars
      expect(calculateMessageParts(message)).toBe(2);
    });

    it('should calculate single part for short Unicode message', () => {
      const message = 'Hello 🌍';
      expect(calculateMessageParts(message)).toBe(1);
    });

    it('should calculate multiple parts for long Unicode message', () => {
      const message = '🌍'.repeat(100); // Longer than 70 chars
      expect(calculateMessageParts(message)).toBeGreaterThan(1);
    });
  });

  describe('appendOptOutLine', () => {
    it('should append opt-out line to message', () => {
      const message = 'Hello world';
      const result = appendOptOutLine(message);
      expect(result).toBe('Hello world Reply STOP to opt out.');
    });
  });

  describe('isStopKeyword', () => {
    it('should detect STOP keyword', () => {
      expect(isStopKeyword('STOP')).toBe(true);
      expect(isStopKeyword('stop')).toBe(true);
      expect(isStopKeyword('  STOP  ')).toBe(true);
    });

    it('should detect other stop keywords', () => {
      expect(isStopKeyword('END')).toBe(true);
      expect(isStopKeyword('UNSUBSCRIBE')).toBe(true);
      expect(isStopKeyword('CANCEL')).toBe(true);
    });

    it('should return false for non-stop messages', () => {
      expect(isStopKeyword('Hello')).toBe(false);
      expect(isStopKeyword('START')).toBe(false);
    });
  });
});