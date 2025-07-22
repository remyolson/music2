import { describe, it, expect } from 'vitest';
import { validate, formatErrorForDisplay } from '../src/validationService.js';

describe('validationService', () => {
  describe('validate', () => {
    it('should validate valid music data', () => {
      const validData = JSON.stringify({
        title: 'Test Song',
        tempo: 120,
        key: 'C',
        scale: 'major',
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { time: 0, value: 'C4', duration: 1 }
            ]
          }
        ]
      });

      const result = validate(validData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.tempo).toBe(120);
    });

    it('should handle invalid JSON', () => {
      const invalidJSON = '{ invalid json';
      const result = validate(invalidJSON);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('JSON Syntax Error');
    });

    it('should validate schema constraints', () => {
      const invalidData = JSON.stringify({
        tempo: -10, // Invalid tempo
        key: 'C',
        scale: 'major',
        tracks: []
      });

      const result = validate(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty input', () => {
      const result = validate('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format error strings into DOM elements', () => {
      const error = 'Error line 1\nError line 2\nError line 3';

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toHaveLength(3);
      expect(formatted[0].textContent).toBe('Error line 1');
      expect(formatted[1].textContent).toBe('Error line 2');
      expect(formatted[2].textContent).toBe('Error line 3');
      expect(formatted[0].className).toBe('error-message');
    });

    it('should handle single line errors', () => {
      const error = 'Single error message';

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].textContent).toBe('Single error message');
    });

    it('should handle empty strings', () => {
      const error = '';

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].textContent).toBe('');
    });
  });
});