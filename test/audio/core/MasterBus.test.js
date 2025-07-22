import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  getMasterBus,
  applyMasterEffectPreset,
  getMasterEffectChain,
  disposeMasterBus
} from '../../../src/audio/core/MasterBus.js';

// Mock Tone.js - handled by vitest.config.js alias

// Mock effect factory
vi.mock('../../../src/audio/effects/EffectFactory.js', () => ({
  availableEffects: {
    reverb: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      set: vi.fn(),
      wet: { value: 0.5 }
    })),
    delay: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      set: vi.fn()
    })),
    harmonizer: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      setIntervals: vi.fn(),
      setMix: vi.fn()
    })),
    freezeReverb: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      wet: { value: 0.5 },
      children: [{
        roomSize: { value: 0.9 }
      }]
    }))
  }
}));

// Mock audio health monitor
vi.mock('../../../src/audioHealthMonitor.js', () => ({
  audioHealthMonitor: {
    initialize: vi.fn(),
    startMonitoring: vi.fn()
  }
}));

describe('MasterBus', () => {
  beforeEach(() => {
    // Reset module state between tests
    disposeMasterBus();
  });

  describe('getMasterBus', () => {
    it('should create and return master bus', () => {
      const masterBus = getMasterBus();
      
      expect(masterBus).toBeDefined();
      expect(masterBus.connect).toBeDefined();
      expect(masterBus.chain).toBeDefined();
      expect(masterBus.gain.value).toBe(0.2); // MASTER_BUS_CONFIG.gain
    });

    it('should return same instance on subsequent calls', () => {
      const bus1 = getMasterBus();
      const bus2 = getMasterBus();
      
      expect(bus1).toBe(bus2);
    });

    it('should initialize audio health monitor', async () => {
      const { audioHealthMonitor } = await import('../../../src/audioHealthMonitor.js');
      
      getMasterBus();
      
      expect(audioHealthMonitor.initialize).toHaveBeenCalled();
      expect(audioHealthMonitor.startMonitoring).toHaveBeenCalled();
    });
  });

  describe('applyMasterEffectPreset', () => {
    it('should apply effect preset with multiple effects', () => {
      const preset = {
        effects: [
          { type: 'reverb', params: { roomSize: 0.8, wet: 0.3 } },
          { type: 'delay', params: { delayTime: 0.25, feedback: 0.3 } }
        ]
      };
      
      applyMasterEffectPreset(preset);
      
      const effectChain = getMasterEffectChain();
      expect(effectChain.length).toBe(2);
    });

    it('should handle harmonizer effect with special parameters', () => {
      const preset = {
        effects: [
          { 
            type: 'harmonizer', 
            params: { 
              intervals: [3, 5, 12],
              mix: 0.5 
            } 
          }
        ]
      };
      
      applyMasterEffectPreset(preset);
      
      const effectChain = getMasterEffectChain();
      expect(effectChain.length).toBe(1);
      expect(effectChain[0].setIntervals).toHaveBeenCalledWith([3, 5, 12]);
      expect(effectChain[0].setMix).toHaveBeenCalledWith(0.5);
    });

    it('should handle freezeReverb effect with special parameters', () => {
      const preset = {
        effects: [
          { 
            type: 'freezeReverb', 
            params: { 
              decay: 80,
              wet: 0.4 
            } 
          }
        ]
      };
      
      applyMasterEffectPreset(preset);
      
      const effectChain = getMasterEffectChain();
      expect(effectChain.length).toBe(1);
      expect(effectChain[0].children[0].roomSize.value).toBeLessThanOrEqual(0.99);
      expect(effectChain[0].wet.value).toBe(0.4);
    });

    it('should clear effects when preset is null', () => {
      // First apply some effects
      applyMasterEffectPreset({
        effects: [{ type: 'reverb' }]
      });
      
      expect(getMasterEffectChain().length).toBe(1);
      
      // Then clear them
      applyMasterEffectPreset(null);
      
      expect(getMasterEffectChain().length).toBe(0);
    });

    it('should clear effects when preset has no effects', () => {
      // First apply some effects
      applyMasterEffectPreset({
        effects: [{ type: 'reverb' }]
      });
      
      // Then clear them
      applyMasterEffectPreset({ effects: [] });
      
      expect(getMasterEffectChain().length).toBe(0);
    });

    it('should handle unknown effect types gracefully', () => {
      const preset = {
        effects: [
          { type: 'reverb' },
          { type: 'unknown_effect' },
          { type: 'delay' }
        ]
      };
      
      applyMasterEffectPreset(preset);
      
      const effectChain = getMasterEffectChain();
      expect(effectChain.length).toBe(2); // Only valid effects
    });
  });

  describe('getMasterEffectChain', () => {
    it('should return empty array initially', () => {
      const chain = getMasterEffectChain();
      
      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBe(0);
    });

    it('should return current effect chain', () => {
      applyMasterEffectPreset({
        effects: [
          { type: 'reverb' },
          { type: 'delay' }
        ]
      });
      
      const chain = getMasterEffectChain();
      expect(chain.length).toBe(2);
    });
  });

  describe('disposeMasterBus', () => {
    it('should dispose all components', () => {
      // Create master bus and add effects
      getMasterBus();
      applyMasterEffectPreset({
        effects: [{ type: 'reverb' }]
      });
      
      disposeMasterBus();
      
      // After disposal, should create new instance
      const newBus = getMasterBus();
      expect(getMasterEffectChain().length).toBe(0);
    });

    it('should handle multiple dispose calls', () => {
      getMasterBus();
      
      // Should not throw
      disposeMasterBus();
      disposeMasterBus();
      disposeMasterBus();
    });
  });
});