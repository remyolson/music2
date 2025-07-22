import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createInstrument,
  createInstrumentWithEffects,
  getInstrumentDefaults,
  getDrumConstants
} from '../../../src/audio/instruments/InstrumentFactory.js';

// Mock Tone.js - handled by vitest.config.js alias

// Mock effect factory
vi.mock('../../../src/audio/effects/EffectFactory.js', () => ({
  availableEffects: {
    reverb: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      wet: { value: 0.5 }
    })),
    delay: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn()
    }))
  }
}));

describe('InstrumentFactory', () => {
  describe('createInstrument', () => {
    it('should create synth_lead instrument', () => {
      const instrument = createInstrument('synth_lead', {
        envelope: { attack: 0.1 },
        portamento: 0.05
      });
      
      expect(instrument).toBeDefined();
      expect(instrument.connect).toBeDefined();
      expect(instrument.dispose).toBeDefined();
    });

    it('should create synth_bass instrument', () => {
      const instrument = createInstrument('synth_bass');
      
      expect(instrument).toBeDefined();
      expect(instrument.connect).toBeDefined();
    });

    it('should create piano instrument', () => {
      const instrument = createInstrument('piano');
      
      expect(instrument).toBeDefined();
    });

    it('should create drums_kit with kick and snare', () => {
      const drumKit = createInstrument('drums_kit');
      
      expect(drumKit).toBeDefined();
      expect(drumKit.kick).toBeDefined();
      expect(drumKit.snare).toBeDefined();
    });

    it('should create drums_electronic with kick and snare', () => {
      const drumKit = createInstrument('drums_electronic');
      
      expect(drumKit).toBeDefined();
      expect(drumKit.kick).toBeDefined();
      expect(drumKit.snare).toBeDefined();
    });

    it('should create strings with filter', () => {
      const strings = createInstrument('strings');
      
      expect(strings).toBeDefined();
      expect(strings.dispose).toBeDefined();
    });

    it('should create vibraphone with vibrato', () => {
      const vibraphone = createInstrument('vibraphone');
      
      expect(vibraphone).toBeDefined();
      expect(vibraphone.dispose).toBeDefined();
    });

    it('should create banjo (PluckSynth)', () => {
      const banjo = createInstrument('banjo');
      
      expect(banjo).toBeDefined();
      expect(banjo.triggerAttackRelease).toBeDefined();
    });

    it('should apply note transition settings', () => {
      const instrument = createInstrument('synth_lead', {
        noteTransition: 'legato'
      });
      
      expect(instrument).toBeDefined();
    });

    it('should create default Synth for unknown type', () => {
      const instrument = createInstrument('unknown_type');
      
      expect(instrument).toBeDefined();
    });
  });

  describe('createInstrumentWithEffects', () => {
    it('should create instrument with effect chain', async () => {
      const getMasterBus = vi.fn().mockReturnValue({
        connect: vi.fn()
      });
      
      const track = {
        name: 'Lead',
        instrument: 'synth_lead',
        notes: [],
        settings: {
          globalEffects: [
            { type: 'reverb', level: 0.3 },
            { type: 'delay', level: 0.2 }
          ]
        }
      };
      
      const result = await createInstrumentWithEffects(track, getMasterBus);
      
      expect(result).toBeDefined();
      expect(result.instrument).toBeDefined();
      expect(result.effectChain).toBeDefined();
      expect(result.effectChain.length).toBeGreaterThan(0);
    });

    it('should handle track without effects', async () => {
      const getMasterBus = vi.fn().mockReturnValue({
        connect: vi.fn()
      });
      
      const track = {
        name: 'Bass',
        instrument: 'synth_bass',
        notes: []
      };
      
      const result = await createInstrumentWithEffects(track, getMasterBus);
      
      expect(result).toBeDefined();
      expect(result.instrument).toBeDefined();
      expect(result.effectChain).toBeDefined();
    });

    it('should handle drums with effect chain', async () => {
      const getMasterBus = vi.fn().mockReturnValue({
        connect: vi.fn()
      });
      
      const track = {
        name: 'Drums',
        instrument: 'drums_kit',
        notes: [],
        settings: {
          globalEffects: [{ type: 'reverb', level: 0.1 }]
        }
      };
      
      const result = await createInstrumentWithEffects(track, getMasterBus);
      
      expect(result).toBeDefined();
      expect(result.instrument.kick).toBeDefined();
      expect(result.instrument.snare).toBeDefined();
    });
  });

  describe('getInstrumentDefaults', () => {
    it('should return defaults for known instruments', () => {
      const synthDefaults = getInstrumentDefaults('synth_lead');
      expect(synthDefaults).toBeDefined();
      expect(synthDefaults.oscillator).toBeDefined();
      
      const drumsDefaults = getInstrumentDefaults('drums_kit');
      expect(drumsDefaults).toBeDefined();
      expect(drumsDefaults.kick).toBeDefined();
      expect(drumsDefaults.snare).toBeDefined();
    });

    it('should return empty object for unknown instrument', () => {
      const defaults = getInstrumentDefaults('unknown');
      expect(defaults).toEqual({});
    });
  });

  describe('getDrumConstants', () => {
    it('should return drum pitches and durations', () => {
      const drumConstants = getDrumConstants();
      
      expect(drumConstants.pitches).toBeDefined();
      expect(drumConstants.pitches.kick).toBe('C2');
      expect(drumConstants.pitches.snare).toBe('A4');
      
      expect(drumConstants.durations).toBeDefined();
      expect(drumConstants.durations.kick).toBe(0.1);
      expect(drumConstants.durations.snare).toBe(0.05);
    });
  });
});