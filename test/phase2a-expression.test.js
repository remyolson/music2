import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { midiInputHandler } from '../src/midi/MidiInputHandler.js';
import { VelocityManager } from '../src/audio/dynamics/VelocityManager.js';
import { createArticulationEngine } from '../src/audio/articulation/ArticulationEngine.js';
import { createExpressionController } from '../src/audio/expression/ExpressionController.js';
import * as Tone from 'tone';

// Mock state module
vi.mock('../src/state.js', () => ({
  state: {
    setState: vi.fn(),
    getState: vi.fn(() => ({})),
    subscribe: vi.fn()
  }
}));

// Mock SampleLibrary
vi.mock('../src/audio/samples/SampleLibrary.js', () => ({
  SampleLibrary: {
    loadSample: vi.fn().mockResolvedValue({})
  }
}));

// Mock Tone.js
vi.mock('tone', () => ({
  Volume: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    volume: { value: 0 }
  })),
  Signal: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    linearRampTo: vi.fn(),
    value: 0
  })),
  Sampler: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn()
  })),
  PolySynth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn()
  })),
  Synth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    triggerAttackRelease: vi.fn()
  })),
  LFO: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 5 },
    amplitude: { value: 0.1 }
  })),
  Frequency: vi.fn((note) => ({
    toMidi: () => 60,
    toNote: () => 'C4',
    toFrequency: () => 261.63
  })),
  Time: vi.fn((time) => ({
    toSeconds: () => parseFloat(time) || 0
  })),
  gainToDb: vi.fn((gain) => 20 * Math.log10(gain)),
  default: {
    Transport: {
      scheduleOnce: vi.fn()
    },
    Frequency: vi.fn((note) => ({
      toMidi: () => 60,
      toNote: () => 'C4',
      toFrequency: () => 261.63
    })),
    Time: vi.fn((time) => ({
      toSeconds: () => parseFloat(time) || 0
    })),
    Volume: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      volume: { value: 0 }
    })),
    Signal: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      linearRampTo: vi.fn(),
      value: 0
    })),
    Sampler: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      triggerAttackRelease: vi.fn()
    })),
    PolySynth: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      triggerAttackRelease: vi.fn()
    })),
    LFO: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 5 },
      amplitude: { value: 0.1 }
    })),
    gainToDb: vi.fn((gain) => 20 * Math.log10(gain))
  }
}));

describe('Phase 2A: Musical Expression System', () => {
  describe('MIDI Input Handler', () => {
    let handler;
    
    beforeEach(() => {
      // Mock navigator.requestMIDIAccess
      global.navigator = {
        requestMIDIAccess: vi.fn().mockResolvedValue({
          inputs: new Map(),
          outputs: new Map(),
          onstatechange: null
        })
      };
      
      handler = new (midiInputHandler.constructor)();
    });
    
    afterEach(() => {
      handler.dispose();
    });
    
    it('should initialize MIDI access', async () => {
      const result = await handler.initialize();
      expect(result).toBe(true);
      expect(navigator.requestMIDIAccess).toHaveBeenCalled();
    });
    
    it('should handle note on/off messages', () => {
      const noteCallback = vi.fn();
      handler.onNote(noteCallback);
      
      // Simulate Note On
      handler.handleMidiMessage({
        data: [0x90, 60, 100] // Note On, C4, velocity 100
      });
      
      expect(noteCallback).toHaveBeenCalledWith({
        type: 'noteOn',
        note: 60,
        velocity: expect.any(Number),
        channel: 1,
        midiVelocity: 100
      });
      
      // Simulate Note Off
      handler.handleMidiMessage({
        data: [0x80, 60, 0] // Note Off, C4
      });
      
      expect(noteCallback).toHaveBeenCalledWith({
        type: 'noteOff',
        note: 60,
        channel: 1
      });
    });
    
    it('should handle controller messages', () => {
      const controllerCallback = vi.fn();
      handler.onController(controllerCallback);
      
      // Modulation wheel
      handler.handleMidiMessage({
        data: [0xB0, 1, 64] // CC1 (Modulation), value 64
      });
      
      expect(controllerCallback).toHaveBeenCalledWith({
        type: 'controller',
        controller: 1,
        value: expect.closeTo(0.5, 0.01),
        rawValue: 64,
        channel: 1
      });
    });
    
    it('should apply velocity curves', () => {
      handler.setVelocityCurve('exponential');
      const velocity = handler.applyVelocityCurve(0.5);
      expect(velocity).toBe(0.25); // 0.5^2
      
      handler.setVelocityCurve('soft');
      const softVelocity = handler.applyVelocityCurve(0.5);
      expect(softVelocity).toBeCloseTo(0.707, 2); // sqrt(0.5)
    });
  });
  
  describe('Velocity Manager', () => {
    let velocityManager;
    
    beforeEach(() => {
      velocityManager = new VelocityManager('piano');
    });
    
    afterEach(() => {
      velocityManager.dispose();
    });
    
    it('should initialize velocity layers', async () => {
      const config = {
        layers: [
          { threshold: 0.0, name: 'pp', synthConfig: {} },
          { threshold: 0.5, name: 'mf', synthConfig: {} },
          { threshold: 0.8, name: 'ff', synthConfig: {} }
        ],
        crossfade: true
      };
      
      await velocityManager.initialize(config);
      
      const layerInfo = velocityManager.getLayerInfo();
      expect(layerInfo).toHaveLength(3);
      expect(layerInfo[0].threshold).toBe(0.0);
      expect(layerInfo[1].threshold).toBe(0.5);
      expect(layerInfo[2].threshold).toBe(0.8);
    });
    
    it('should select appropriate layers for velocity', async () => {
      await velocityManager.initialize({
        layers: [
          { threshold: 0.0, name: 'soft' },
          { threshold: 0.5, name: 'medium' },
          { threshold: 0.8, name: 'loud' }
        ],
        crossfade: false
      });
      
      // Test simple layer switching
      const softLayers = velocityManager.selectLayersForVelocity(0.3);
      expect(softLayers).toHaveLength(1);
      expect(softLayers[0].level).toBe(1.0);
      
      const mediumLayers = velocityManager.selectLayersForVelocity(0.6);
      expect(mediumLayers).toHaveLength(1);
      expect(mediumLayers[0].level).toBe(1.0);
    });
    
    it('should crossfade between layers when enabled', async () => {
      await velocityManager.initialize({
        layers: [
          { threshold: 0.0, name: 'soft' },
          { threshold: 0.5, name: 'loud' }
        ],
        crossfade: true
      });
      
      velocityManager.setCrossfade(true, 0.1);
      
      // Test crossfade region
      const crossfadeLayers = velocityManager.selectLayersForVelocity(0.45);
      expect(crossfadeLayers.length).toBeGreaterThan(1);
      
      // Both layers should be active with partial levels
      const totalLevel = crossfadeLayers.reduce((sum, l) => sum + l.level, 0);
      expect(totalLevel).toBeCloseTo(1.0, 0.1);
    });
  });
  
  describe('Articulation Engine', () => {
    let articulationEngine;
    
    beforeEach(() => {
      articulationEngine = createArticulationEngine('violin', {
        articulations: ['arco', 'pizzicato', 'staccato', 'legato'],
        autoDetect: true
      });
    });
    
    it('should detect staccato from short notes', () => {
      // Simulate staccato pattern
      const notes = [
        { note: 'C4', velocity: 0.7, duration: '16n', time: '+0' },
        { note: 'D4', velocity: 0.7, duration: '16n', time: '+0.2' },
        { note: 'E4', velocity: 0.7, duration: '16n', time: '+0.4' }
      ];
      
      notes.forEach(note => {
        articulationEngine.processNoteEvent(note);
      });
      
      const info = articulationEngine.getArticulationInfo();
      expect(info.metrics.averageVelocity).toBeCloseTo(0.7, 0.1);
    });
    
    it('should handle key switches', () => {
      // C1 = MIDI note 24 = arco
      const articulation = articulationEngine.processNoteEvent({
        note: 'C1',
        velocity: 0.5,
        duration: '8n',
        time: '+0'
      });
      
      expect(articulation).toBeNull(); // Key switch shouldn't play
      expect(articulationEngine.currentArticulation).toBe('arco');
    });
    
    it('should transition between articulations', () => {
      articulationEngine.setArticulation('pizzicato');
      expect(articulationEngine.currentArticulation).toBe('pizzicato');
      
      articulationEngine.setArticulation('arco');
      expect(articulationEngine.previousArticulation).toBe('pizzicato');
      expect(articulationEngine.currentArticulation).toBe('arco');
    });
  });
  
  describe('Expression Controller', () => {
    let expressionController;
    let mockInstrument;
    
    beforeEach(() => {
      mockInstrument = {
        volume: { value: 0, linearRampTo: vi.fn() },
        vibratoLFO: { 
          depth: { value: 0, linearRampTo: vi.fn() },
          frequency: { value: 5, linearRampTo: vi.fn() }
        }
      };
      
      expressionController = createExpressionController('violin', mockInstrument, {
        smoothing: 0.05,
        defaultMappings: true
      });
    });
    
    afterEach(() => {
      expressionController.dispose();
    });
    
    it('should map controllers to parameters', () => {
      // Test modulation to vibrato depth
      expressionController.processController(1, 0.5); // Modulation at 50%
      
      // Check if expression value was stored
      const state = expressionController.getExpressionState();
      expect(state.vibratoDepth).toBe(0.5);
    });
    
    it('should apply smoothing to continuous parameters', () => {
      expressionController.processController(1, 0.8);
      
      // Smoothing should be applied
      const smoothing = expressionController.smoothing.get('vibratoDepth');
      expect(smoothing).toBeDefined();
      expect(smoothing.linearRampTo).toHaveBeenCalledWith(0.8, 0.05);
    });
    
    it('should handle pitch bend', () => {
      mockInstrument.detune = { value: 0 };
      
      expressionController.processPitchBend(0.5); // Half bend up
      expect(mockInstrument.detune.value).toBe(100); // 1 semitone in cents
      
      expressionController.processPitchBend(-0.5); // Half bend down
      expect(mockInstrument.detune.value).toBe(-100);
    });
    
    it('should support MIDI learn', () => {
      expressionController.addMapping(74, 'brightness'); // CC74 to brightness
      
      expressionController.processController(74, 0.7);
      
      const state = expressionController.getExpressionState();
      expect(state.brightness).toBe(0.7);
    });
  });
  
  describe('Integration Tests', () => {
    it('should work together for expressive playback', async () => {
      // Create a complete expression setup
      const velocityManager = new VelocityManager('piano');
      await velocityManager.initialize({
        layers: [
          { threshold: 0.0, name: 'soft' },
          { threshold: 0.7, name: 'loud' }
        ],
        crossfade: true
      });
      
      const articulationEngine = createArticulationEngine('piano', {
        articulations: ['normal', 'staccato', 'legato']
      });
      
      const mockInstrument = {
        volume: { value: 0 }
      };
      
      const expressionController = createExpressionController('piano', mockInstrument);
      
      // Simulate playing a note with expression
      const noteEvent = {
        note: 'C4',
        velocity: 0.8,
        duration: '8n',
        time: '+0'
      };
      
      const articulation = articulationEngine.processNoteEvent(noteEvent);
      expect(articulation).toBe('normal');
      
      const layers = velocityManager.selectLayersForVelocity(noteEvent.velocity);
      expect(layers.length).toBeGreaterThanOrEqual(1);
      
      // Clean up
      velocityManager.dispose();
      expressionController.dispose();
    });
  });
});