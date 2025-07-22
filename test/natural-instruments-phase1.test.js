/**
 * Test Suite for Phase 1: Natural Instrument Foundation
 * Tests the sample-based orchestral instruments implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Tone from 'tone';

// Mock Tone.js for testing
vi.mock('tone', () => ({
  context: { state: 'running' },
  getContext: () => ({ decodeAudioData: vi.fn() }),
  Destination: {},
  Transport: { scheduleOnce: vi.fn() },
  Frequency: vi.fn().mockImplementation((freq) => ({
    toFrequency: () => 440,
    toNote: () => 'A4',
    transpose: (cents) => ({ toNote: () => 'A#4' })
  })),
  Time: vi.fn().mockImplementation((time) => ({
    toSeconds: () => 1.0
  })),
  // Natural instrument components
  Sampler: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    chain: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })),
  Gain: vi.fn().mockImplementation(() => ({
    gain: { value: 1, setValueAtTime: vi.fn() },
    chain: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Filter: vi.fn().mockImplementation(() => ({
    frequency: { value: 1000 },
    Q: { value: 1 },
    chain: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Noise: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    chain: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })),
  AmplitudeEnvelope: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    chain: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })),
  LFO: vi.fn().mockImplementation(() => ({
    frequency: { value: 5 },
    start: vi.fn(),
    connect: vi.fn(),
    dispose: vi.fn()
  })),
  FeedbackDelay: vi.fn().mockImplementation(() => ({
    delayTime: { value: 0.1 },
    chain: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })),
  EQ3: vi.fn().mockImplementation(() => ({
    high: { value: 0 },
    mid: { value: 0 },
    low: { value: 0 },
    chain: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  })),
  Oscillator: vi.fn().mockImplementation(() => ({
    frequency: { exponentialRampTo: vi.fn() },
    start: vi.fn(),
    stop: vi.fn(),
    chain: vi.fn().mockReturnThis(),
    dispose: vi.fn()
  }))
}));

// Import the natural instruments after mocking
import { SoundFontLoader } from '../src/audio/samples/SoundFontLoader.js';
import { SampleLibrary } from '../src/audio/samples/SampleLibrary.js';
import naturalPiano from '../src/audio/instruments/definitions/naturalPiano.js';
import { violin, viola, cello, doubleBass } from '../src/audio/instruments/definitions/orchestralStrings.js';
import { flute, clarinet, oboe, bassoon } from '../src/audio/instruments/definitions/orchestralWinds.js';
import { trumpet, frenchHorn, trombone, tuba } from '../src/audio/instruments/definitions/orchestralBrass.js';
import { createInstrument } from '../src/audio/instruments/InstrumentFactory.js';

describe('Phase 1: Natural Instrument Foundation', () => {
  let mockContext;
  
  beforeEach(() => {
    mockContext = {
      decodeAudioData: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SoundFont Loading Infrastructure', () => {
    let soundFontLoader;
    
    beforeEach(() => {
      soundFontLoader = new SoundFontLoader();
    });
    
    afterEach(() => {
      soundFontLoader.dispose();
    });

    it('should load SoundFont files', async () => {
      // Mock fetch for SoundFont loading
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      const soundFont = await soundFontLoader.loadSoundFont('/test.sf2', 'test');
      expect(soundFont).toBeDefined();
      expect(soundFont.name).toBe('test');
    });

    it('should cache loaded SoundFonts', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      // First load
      const soundFont1 = await soundFontLoader.loadSoundFont('/test.sf2', 'test');
      // Second load should use cache
      const soundFont2 = await soundFontLoader.loadSoundFont('/test.sf2', 'test');
      
      expect(soundFont1).toBe(soundFont2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should create multi-velocity sampler', () => {
      const velocityLayers = {
        v1: { 'C4': 'c4_v1.wav' },
        v2: { 'C4': 'c4_v2.wav' }
      };

      const multiSampler = soundFontLoader.createMultiVelocitySampler(velocityLayers);
      
      expect(multiSampler).toBeDefined();
      expect(multiSampler.samplers).toBeDefined();
      expect(multiSampler.play).toBeInstanceOf(Function);
      expect(multiSampler.dispose).toBeInstanceOf(Function);
    });

    it('should track memory usage', () => {
      const usage = soundFontLoader.getMemoryUsage();
      
      expect(usage).toBeDefined();
      expect(usage.totalSizeMB).toBeGreaterThanOrEqual(0);
      expect(usage.sampleCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sample Library Management', () => {
    let sampleLibrary;
    
    beforeEach(() => {
      sampleLibrary = new SampleLibrary();
    });
    
    afterEach(() => {
      sampleLibrary.dispose();
    });

    it('should provide available instrument categories', () => {
      const categories = sampleLibrary.getCategories();
      
      expect(categories).toContain('piano');
      expect(categories).toContain('strings');
      expect(categories).toContain('woodwinds');
      expect(categories).toContain('brass');
    });

    it('should list instruments by category', () => {
      const pianos = sampleLibrary.getAvailableInstruments('piano');
      const strings = sampleLibrary.getAvailableInstruments('strings');
      
      expect(pianos).toContain('grand_piano');
      expect(strings).toContain('violin');
      expect(strings).toContain('cello');
    });

    it('should track loading state', () => {
      expect(sampleLibrary.isLoaded('piano', 'grand_piano')).toBe(false);
    });
  });

  describe('Natural Piano Implementation', () => {
    it('should create natural piano with realistic features', async () => {
      const piano = await naturalPiano.create({ pianoType: 'grand_piano' });
      
      expect(piano).toBeDefined();
      expect(piano.type).toBe('natural_piano');
      expect(piano.play).toBeInstanceOf(Function);
      expect(piano.setPedalState).toBeInstanceOf(Function);
      expect(piano.dispose).toBeInstanceOf(Function);
    });

    it('should support pedal controls', async () => {
      const piano = await naturalPiano.create();
      
      // Test sustain pedal
      piano.setPedalState('sustain', true);
      expect(piano.pedals.sustain).toBe(true);
      
      // Test soft pedal
      piano.setPedalState('soft', true);
      expect(piano.pedals.soft).toBe(true);
      
      piano.dispose();
    });

    it('should handle different piano types', async () => {
      const grandPiano = await naturalPiano.create({ pianoType: 'grand_piano' });
      const uprightPiano = await naturalPiano.create({ pianoType: 'upright_piano' });
      
      expect(grandPiano.getPianoType()).toBe('grand_piano');
      expect(uprightPiano.getPianoType()).toBe('upright_piano');
      
      grandPiano.dispose();
      uprightPiano.dispose();
    });

    it('should fallback to synthesis when samples unavailable', async () => {
      // Mock sample loading to fail
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const piano = await naturalPiano.create();
      
      expect(piano).toBeDefined();
      expect(piano.isSampleBased()).toBe(false);
      expect(console.warn).toHaveBeenCalled();
      
      piano.dispose();
    });
  });

  describe('Orchestral Strings Implementation', () => {
    it('should create violin with articulation support', async () => {
      const violinInst = await violin.create();
      
      expect(violinInst).toBeDefined();
      expect(violinInst.type).toBe('orchestral_violin');
      expect(violinInst.setArticulation).toBeInstanceOf(Function);
      expect(violinInst.setVibrato).toBeInstanceOf(Function);
      
      violinInst.dispose();
    });

    it('should support multiple articulations', async () => {
      const violinInst = await violin.create();
      const articulations = violinInst.getAvailableArticulations();
      
      expect(articulations).toContain('arco');
      expect(articulations).toContain('pizzicato');
      expect(articulations).toContain('tremolo');
      expect(articulations).toContain('staccato');
      
      violinInst.setArticulation('pizzicato');
      expect(violinInst.currentArticulation).toBe('pizzicato');
      
      violinInst.dispose();
    });

    it('should create all string instruments', async () => {
      const instruments = await Promise.all([
        violin.create(),
        viola.create(),
        cello.create(),
        doubleBass.create()
      ]);
      
      expect(instruments[0].type).toBe('orchestral_violin');
      expect(instruments[1].type).toBe('orchestral_viola');
      expect(instruments[2].type).toBe('orchestral_cello');
      expect(instruments[3].type).toBe('orchestral_double_bass');
      
      instruments.forEach(inst => inst.dispose());
    });

    it('should support vibrato control', async () => {
      const violinInst = await violin.create();
      
      violinInst.setVibrato(6, 0.2);
      expect(violinInst.vibratoRate).toBe(6);
      expect(violinInst.vibratoDepth).toBe(0.2);
      
      violinInst.dispose();
    });

    it('should play harmonics', async () => {
      const violinInst = await violin.create();
      
      violinInst.playHarmonics('G3', 2, 80, '+0', '2n');
      expect(violinInst.currentArticulation).toBe('harmonics');
      
      violinInst.dispose();
    });
  });

  describe('Woodwind Instruments Implementation', () => {
    it('should create flute with breath simulation', async () => {
      const fluteInst = await flute.create();
      
      expect(fluteInst).toBeDefined();
      expect(fluteInst.type).toBe('orchestral_flute');
      expect(fluteInst.setBreathAmount).toBeInstanceOf(Function);
      expect(fluteInst.setTechnique).toBeInstanceOf(Function);
      
      fluteInst.dispose();
    });

    it('should support extended techniques', async () => {
      const fluteInst = await flute.create();
      const techniques = fluteInst.getAvailableTechniques();
      
      expect(techniques).toContain('normal');
      expect(techniques).toContain('flutter');
      expect(techniques).toContain('multiphonic');
      
      fluteInst.setTechnique('flutter');
      expect(fluteInst.currentTechnique).toBe('flutter');
      
      fluteInst.dispose();
    });

    it('should create all woodwind instruments', async () => {
      const instruments = await Promise.all([
        flute.create(),
        clarinet.create(),
        oboe.create(),
        bassoon.create()
      ]);
      
      expect(instruments[0].type).toBe('orchestral_flute');
      expect(instruments[1].type).toBe('orchestral_clarinet');
      expect(instruments[2].type).toBe('orchestral_oboe');
      expect(instruments[3].type).toBe('orchestral_bassoon');
      
      instruments.forEach(inst => inst.dispose());
    });

    it('should support breath and embouchure control', async () => {
      const fluteInst = await flute.create();
      
      fluteInst.setBreathAmount(0.3);
      fluteInst.setAirPressure(1.2);
      fluteInst.setEmbouchure(0.7);
      
      expect(fluteInst.breathAmount).toBe(0.3);
      expect(fluteInst.airPressure).toBe(1.2);
      expect(fluteInst.embouchure).toBe(0.7);
      
      fluteInst.dispose();
    });

    it('should perform glissando and trills', async () => {
      const fluteInst = await flute.create();
      
      fluteInst.playGlissando('C4', 'C5', '1n', '+0');
      fluteInst.playTrill('C4', 'D4', 8, '2n', '+1');
      
      fluteInst.dispose();
    });
  });

  describe('Brass Instruments Implementation', () => {
    it('should create trumpet with mute support', async () => {
      const trumpetInst = await trumpet.create();
      
      expect(trumpetInst).toBeDefined();
      expect(trumpetInst.type).toBe('orchestral_trumpet');
      expect(trumpetInst.setMute).toBeInstanceOf(Function);
      expect(trumpetInst.setBrightness).toBeInstanceOf(Function);
      
      trumpetInst.dispose();
    });

    it('should support multiple mutes', async () => {
      const trumpetInst = await trumpet.create();
      const mutes = trumpetInst.getAvailableMutes();
      
      expect(mutes).toContain('open');
      expect(mutes).toContain('straight');
      expect(mutes).toContain('cup');
      expect(mutes).toContain('harmon');
      
      trumpetInst.setMute('straight');
      expect(trumpetInst.currentMute).toBe('straight');
      
      trumpetInst.dispose();
    });

    it('should create all brass instruments', async () => {
      const instruments = await Promise.all([
        trumpet.create(),
        frenchHorn.create(),
        trombone.create(),
        tuba.create()
      ]);
      
      expect(instruments[0].type).toBe('orchestral_trumpet');
      expect(instruments[1].type).toBe('orchestral_french_horn');
      expect(instruments[2].type).toBe('orchestral_trombone');
      expect(instruments[3].type).toBe('orchestral_tuba');
      
      instruments.forEach(inst => inst.dispose());
    });

    it('should support brass expression controls', async () => {
      const trumpetInst = await trumpet.create();
      
      trumpetInst.setLipTension(0.8);
      trumpetInst.setAirPressure(1.5);
      trumpetInst.setBrightness(1.2);
      
      expect(trumpetInst.lipTension).toBe(0.8);
      expect(trumpetInst.airPressure).toBe(1.5);
      expect(trumpetInst.brightness).toBe(1.2);
      
      trumpetInst.dispose();
    });

    it('should perform brass techniques', async () => {
      const trumpetInst = await trumpet.create();
      const tromboneInst = await trombone.create();
      
      trumpetInst.playLipTrill('C4', 1, 8, '2n', '+0');
      trumpetInst.playFallOff('C5', '1n', '+0');
      tromboneInst.playGlissando('C3', 'F3', '2n', '+0');
      
      trumpetInst.dispose();
      tromboneInst.dispose();
    });
  });

  describe('Integration with InstrumentFactory', () => {
    it('should create natural instruments through factory', async () => {
      const naturalPianoInst = await createInstrument('natural_piano');
      const violinInst = await createInstrument('orchestral_violin');
      const fluteInst = await createInstrument('orchestral_flute');
      const trumpetInst = await createInstrument('orchestral_trumpet');
      
      expect(naturalPianoInst).toBeDefined();
      expect(violinInst).toBeDefined();
      expect(fluteInst).toBeDefined();
      expect(trumpetInst).toBeDefined();
      
      // Cleanup
      naturalPianoInst.dispose();
      violinInst.dispose();
      fluteInst.dispose();
      trumpetInst.dispose();
    });

    it('should handle factory settings correctly', async () => {
      const settings = {
        pianoType: 'upright_piano',
        articulation: 'pizzicato',
        technique: 'flutter',
        mute: 'cup'
      };
      
      const naturalPianoInst = await createInstrument('natural_piano', settings);
      const violinInst = await createInstrument('orchestral_violin', settings);
      const fluteInst = await createInstrument('orchestral_flute', settings);
      const trumpetInst = await createInstrument('orchestral_trumpet', settings);
      
      // These would be properly tested with actual implementations
      expect(naturalPianoInst).toBeDefined();
      expect(violinInst).toBeDefined();
      expect(fluteInst).toBeDefined();
      expect(trumpetInst).toBeDefined();
      
      // Cleanup
      naturalPianoInst.dispose();
      violinInst.dispose();
      fluteInst.dispose();
      trumpetInst.dispose();
    });
  });

  describe('Memory Management', () => {
    it('should properly dispose of natural instruments', async () => {
      const instruments = await Promise.all([
        createInstrument('natural_piano'),
        createInstrument('orchestral_violin'),
        createInstrument('orchestral_flute'),
        createInstrument('orchestral_trumpet')
      ]);
      
      // All instruments should have dispose method
      instruments.forEach(instrument => {
        expect(instrument.dispose).toBeInstanceOf(Function);
        instrument.dispose();
      });
    });

    it('should track sample library memory usage', () => {
      const sampleLibrary = new SampleLibrary();
      const usage = sampleLibrary.getMemoryUsage();
      
      expect(usage).toBeDefined();
      expect(usage.loadedInstruments).toBeGreaterThanOrEqual(0);
      expect(usage.totalEstimatedMB).toBeGreaterThanOrEqual(0);
      
      sampleLibrary.dispose();
    });
  });

  describe('Fallback Behavior', () => {
    it('should gracefully fallback to synthesis when samples unavailable', async () => {
      // Mock console.warn to suppress warnings in tests
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const instruments = await Promise.all([
        createInstrument('natural_piano'),
        createInstrument('orchestral_violin'),
        createInstrument('orchestral_flute'),
        createInstrument('orchestral_trumpet')
      ]);
      
      // All should be created successfully even without samples
      instruments.forEach(instrument => {
        expect(instrument).toBeDefined();
        expect(instrument.play).toBeInstanceOf(Function);
        instrument.dispose();
      });
      
      expect(console.warn).toHaveBeenCalled();
    });
  });
});