import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadInstrumentDefinition,
  createInstrumentLazy,
  preloadCommonInstruments,
  clearInstrumentCache,
  getCacheStats
} from '../../../src/audio/instruments/LazyInstrumentLoader.js';

// Mock the instrument definition modules
vi.mock('../../../src/audio/instruments/definitions/synthLead.js', () => ({
  default: {
    type: 'synth_lead',
    name: 'Synth Lead',
    create: vi.fn().mockReturnValue({
      connect: vi.fn(),
      chain: vi.fn(),
      dispose: vi.fn()
    })
  }
}));

vi.mock('../../../src/audio/instruments/definitions/piano.js', () => ({
  default: {
    type: 'piano',
    name: 'Piano',
    create: vi.fn().mockReturnValue({
      connect: vi.fn(),
      chain: vi.fn(),
      dispose: vi.fn()
    })
  }
}));

vi.mock('../../../src/audio/instruments/InstrumentFactory.js', () => ({
  createInstrument: vi.fn().mockReturnValue({
    connect: vi.fn(),
    chain: vi.fn(),
    dispose: vi.fn()
  })
}));

describe('LazyInstrumentLoader', () => {
  beforeEach(() => {
    clearInstrumentCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearInstrumentCache();
  });

  describe('loadInstrumentDefinition', () => {
    it('should load instrument definition lazily', async () => {
      const definition = await loadInstrumentDefinition('synth_lead');
      
      expect(definition).toBeDefined();
      expect(definition.type).toBe('synth_lead');
      expect(definition.name).toBe('Synth Lead');
      expect(definition.create).toBeDefined();
    });

    it('should cache loaded definitions', async () => {
      const def1 = await loadInstrumentDefinition('synth_lead');
      const def2 = await loadInstrumentDefinition('synth_lead');
      
      expect(def1).toBe(def2); // Same reference
      
      const stats = getCacheStats();
      expect(stats.cached).toBe(1);
      expect(stats.types).toContain('synth_lead');
    });

    it('should handle unknown instrument types', async () => {
      const definition = await loadInstrumentDefinition('unknown_instrument');
      
      expect(definition).toEqual({
        type: 'unknown_instrument',
        useFactory: true
      });
    });

    it('should handle concurrent loading of same instrument', async () => {
      const promises = [
        loadInstrumentDefinition('piano'),
        loadInstrumentDefinition('piano'),
        loadInstrumentDefinition('piano')
      ];
      
      const results = await Promise.all(promises);
      
      // All should be the same instance
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      
      const stats = getCacheStats();
      expect(stats.cached).toBe(1);
    });
  });

  describe('createInstrumentLazy', () => {
    it('should create instrument using loaded definition', async () => {
      const instrument = await createInstrumentLazy('synth_lead', {
        envelope: { attack: 0.1 }
      });
      
      expect(instrument).toBeDefined();
      expect(instrument.connect).toBeDefined();
    });

    it('should fall back to factory for instruments without definitions', async () => {
      const { createInstrument } = await import('../../../src/audio/instruments/InstrumentFactory.js');
      
      const instrument = await createInstrumentLazy('unknown_type', {});
      
      expect(createInstrument).toHaveBeenCalledWith('unknown_type', {});
    });
  });

  describe('preloadCommonInstruments', () => {
    it('should preload common instruments', async () => {
      await preloadCommonInstruments();
      
      const stats = getCacheStats();
      expect(stats.cached).toBeGreaterThanOrEqual(2); // At least synth_lead and piano
      expect(stats.types).toContain('synth_lead');
      expect(stats.types).toContain('piano');
    });
  });

  describe('clearInstrumentCache', () => {
    it('should clear all cached instruments', async () => {
      await loadInstrumentDefinition('synth_lead');
      await loadInstrumentDefinition('piano');
      
      let stats = getCacheStats();
      expect(stats.cached).toBe(2);
      
      clearInstrumentCache();
      
      stats = getCacheStats();
      expect(stats.cached).toBe(0);
      expect(stats.loading).toBe(0);
    });
  });
});