import { describe, it, expect } from 'vitest';
import { validate, formatErrorForDisplay } from '../src/validationService.js';

describe('validationService', () => {
  describe('validate', () => {
    it('should validate valid music data', () => {
      const validData = JSON.stringify({
        tempo: 120,
        key: 'C',
        scale: 'major',
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { time: 0, value: 60, duration: 1 }
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
      expect(result.error.message).toContain('Invalid JSON');
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
    it('should format JSON parse errors', () => {
      const error = {
        message: 'Invalid JSON',
        line: 5,
        column: 10
      };

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toContain('Invalid JSON');
      expect(formatted).toContain('Line 5');
      expect(formatted).toContain('Column 10');
    });

    it('should format validation errors with path', () => {
      const error = {
        message: 'Invalid value',
        path: ['tracks', 0, 'notes', 1, 'value']
      };

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toContain('tracks[0].notes[1].value');
      expect(formatted).toContain('Invalid value');
    });

    it('should handle errors without specific formatting', () => {
      const error = {
        message: 'Generic error'
      };

      const formatted = formatErrorForDisplay(error);
      expect(formatted).toBe('Generic error');
    });
  });
});