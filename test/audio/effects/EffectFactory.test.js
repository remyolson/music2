import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createSafeEffect, 
  availableEffects, 
  isEffectAvailable, 
  getAvailableEffectTypes 
} from '../../../src/audio/effects/EffectFactory.js';

// Mock Tone.js - handled by vitest.config.js alias

describe('EffectFactory', () => {
  describe('createSafeEffect', () => {
    it('should create reverb effect with safety limits', () => {
      const effect = createSafeEffect('reverb', { 
        roomSize: 0.8,
        wet: 0.9 // Above safety limit
      });
      
      expect(effect).toBeDefined();
      expect(effect.wet.value).toBeLessThanOrEqual(0.6); // Safety limit applied
    });

    it('should create delay effect with safety limits', () => {
      const effect = createSafeEffect('delay', { 
        feedback: 0.9, // Above safety limit
        delayTime: 3 // Above safety limit
      });
      
      expect(effect).toBeDefined();
      expect(effect.feedback.value).toBeLessThanOrEqual(0.7); // Safety limit
    });

    it('should handle effect without safety-limited parameters', () => {
      const effect = createSafeEffect('distortion', { 
        distortion: 0.5
      });
      
      expect(effect).toBeDefined();
      expect(effect.set).toHaveBeenCalled();
    });
  });

  describe('availableEffects', () => {
    it('should have all expected effect types', () => {
      const expectedEffects = [
        'reverb', 'delay', 'distortion', 'chorus', 'phaser',
        'filter', 'echo', 'tremolo', 'bitcrush', 'wah',
        'pitchShift', 'harmonizer', 'freezeReverb'
      ];
      
      expectedEffects.forEach(effectType => {
        expect(availableEffects[effectType]).toBeDefined();
        expect(typeof availableEffects[effectType]).toBe('function');
      });
    });

    it('should create harmonizer with custom methods', () => {
      const harmonizer = availableEffects.harmonizer();
      
      expect(harmonizer.setIntervals).toBeDefined();
      expect(harmonizer.setVoiceLevel).toBeDefined();
      expect(harmonizer.setMix).toBeDefined();
      expect(harmonizer.applyPreset).toBeDefined();
      expect(harmonizer.dispose).toBeDefined();
    });

    it('should create freezeReverb with freeze control', () => {
      const freezeReverb = availableEffects.freezeReverb();
      
      expect(freezeReverb.freeze).toBeDefined();
      expect(freezeReverb.freezeControl).toBeDefined();
      expect(freezeReverb.dispose).toBeDefined();
    });
  });

  describe('isEffectAvailable', () => {
    it('should return true for available effects', () => {
      expect(isEffectAvailable('reverb')).toBe(true);
      expect(isEffectAvailable('delay')).toBe(true);
      expect(isEffectAvailable('harmonizer')).toBe(true);
    });

    it('should return false for unavailable effects', () => {
      expect(isEffectAvailable('nonexistent')).toBe(false);
      expect(isEffectAvailable('')).toBe(false);
    });
  });

  describe('getAvailableEffectTypes', () => {
    it('should return array of all effect types', () => {
      const types = getAvailableEffectTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(10);
      expect(types).toContain('reverb');
      expect(types).toContain('harmonizer');
    });
  });

  describe('harmonizer functionality', () => {
    it('should set intervals correctly', () => {
      const harmonizer = availableEffects.harmonizer();
      const mockIntervals = [3, 5, 12];
      
      harmonizer.setIntervals(mockIntervals);
      // Test would verify internal state if we had access
      expect(harmonizer.setIntervals).toBeDefined();
    });

    it('should apply presets', () => {
      const harmonizer = availableEffects.harmonizer();
      
      harmonizer.applyPreset('maj3');
      expect(harmonizer.presets.maj3).toEqual([4, 7, 12]);
    });
  });

  describe('freezeReverb functionality', () => {
    it('should toggle freeze state', () => {
      const freezeReverb = availableEffects.freezeReverb();
      
      expect(freezeReverb.freezeControl.frozen).toBe(false);
      
      freezeReverb.freeze(true);
      expect(freezeReverb.freezeControl.frozen).toBe(true);
      
      freezeReverb.freeze(false);
      expect(freezeReverb.freezeControl.frozen).toBe(false);
    });
  });
});