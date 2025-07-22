import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimingHumanizer } from '../src/audio/performance/TimingHumanizer.js';
import { VelocityPatternGenerator } from '../src/audio/performance/VelocityPatternGenerator.js';
import { MicroGroove } from '../src/audio/performance/MicroGroove.js';
import { EnsembleTimingSystem } from '../src/audio/performance/EnsembleTimingSystem.js';
import { HumanPerformanceSystem } from '../src/audio/performance/HumanPerformanceSystem.js';

// Mock Tone.js
vi.mock('tone', () => ({
  Transport: {
    scheduleOnce: vi.fn()
  },
  Frequency: vi.fn((value) => ({
    toMidi: () => typeof value === 'number' ? value : 60
  }))
}));

// Mock state
vi.mock('../src/state.js', () => ({
  state: {
    setState: vi.fn(),
    getState: vi.fn(() => ({})),
    subscribe: vi.fn(() => () => {})
  },
  updateLiveInputState: vi.fn()
}));

// Mock DisposalRegistry
vi.mock('../src/utils/DisposalRegistry.js', () => ({
  DisposalRegistry: vi.fn().mockImplementation(() => ({
    register: vi.fn(obj => obj),
    dispose: vi.fn()
  }))
}));

describe('Phase 2C: Human Performance System', () => {
  describe('Timing Humanizer', () => {
    let timingHumanizer;
    
    beforeEach(() => {
      timingHumanizer = new TimingHumanizer();
    });
    
    it('should add natural timing variations', () => {
      const note = { time: 1.0, velocity: 0.7 };
      const context = {
        instrumentType: 'piano',
        beatPosition: 0,
        velocity: 0.7
      };
      
      const processed = timingHumanizer.processNoteEvent(note, context);
      
      expect(processed.time).not.toBe(1.0);
      expect(Math.abs(processed.time - 1.0)).toBeLessThan(0.05); // Within 50ms
      expect(processed.humanizedTime).toBeDefined();
    });
    
    it('should apply swing timing', () => {
      timingHumanizer.setSwing(0.67); // Jazz swing
      
      const onBeat = { time: 1.0 };
      const offBeat = { time: 1.5 };
      
      const processedOn = timingHumanizer.processNoteEvent(onBeat, { beatPosition: 0 });
      const processedOff = timingHumanizer.processNoteEvent(offBeat, { beatPosition: 0.5 });
      
      // On-beat should be relatively unchanged
      expect(Math.abs(processedOn.time - 1.0)).toBeLessThan(0.03);
      
      // Off-beat should be delayed for swing
      expect(processedOff.time).toBeGreaterThan(1.5);
    });
    
    it('should handle instrument-specific timing', () => {
      const pianoNote = { time: 1.0 };
      const brassNote = { time: 1.0 };
      
      const pianoProcecssed = timingHumanizer.processNoteEvent(pianoNote, {
        instrumentType: 'piano',
        isMelody: true
      });
      
      const brassProcessed = timingHumanizer.processNoteEvent(brassNote, {
        instrumentType: 'brass'
      });
      
      // Brass should have attack delay
      expect(brassProcessed.time).toBeGreaterThan(pianoProcecssed.time);
    });
    
    it('should apply rubato', () => {
      timingHumanizer.setRubato(true, { intensity: 0.2 });
      
      const notes = [
        { time: 0 },
        { time: 0.5 },
        { time: 1.0 },
        { time: 1.5 }
      ];
      
      const processed = notes.map((note, i) => 
        timingHumanizer.processNoteEvent(note, {
          measurePosition: i / 4
        })
      );
      
      // Middle notes should be affected more by rubato
      expect(Math.abs(processed[1].time - 0.5)).toBeGreaterThan(
        Math.abs(processed[0].time - 0)
      );
    });
  });
  
  describe('Velocity Pattern Generator', () => {
    let velocityGenerator;
    
    beforeEach(() => {
      velocityGenerator = new VelocityPatternGenerator();
    });
    
    it('should generate natural velocity variations', () => {
      const velocities = [];
      
      for (let i = 0; i < 10; i++) {
        const velocity = velocityGenerator.generateVelocity({
          beatPosition: i % 4,
          dynamic: 'mf'
        });
        velocities.push(velocity);
      }
      
      // Should have variation
      const uniqueVelocities = new Set(velocities);
      expect(uniqueVelocities.size).toBeGreaterThan(5);
      
      // Should be within reasonable range
      velocities.forEach(v => {
        expect(v).toBeGreaterThan(0.3);
        expect(v).toBeLessThan(0.9);
      });
    });
    
    it('should apply accent patterns', () => {
      const downbeat = velocityGenerator.generateVelocity({
        beatPosition: 0,
        dynamic: 'mf'
      });
      
      const offbeat = velocityGenerator.generateVelocity({
        beatPosition: 1.5,
        dynamic: 'mf'
      });
      
      // Downbeats should generally be louder
      expect(downbeat).toBeGreaterThan(offbeat);
    });
    
    it('should handle instrument-specific dynamics', () => {
      const pianoVel = velocityGenerator.generateVelocity({
        instrumentType: 'piano',
        dynamic: 'pp'
      });
      
      const brassVel = velocityGenerator.generateVelocity({
        instrumentType: 'brass',
        dynamic: 'pp'
      });
      
      // Brass minimum velocity is higher
      expect(brassVel).toBeGreaterThan(pianoVel);
    });
    
    it('should create expression shapes', () => {
      const crescendo = [];
      
      for (let i = 0; i <= 10; i++) {
        const velocity = velocityGenerator.generateVelocity({
          expression: { crescendo: true, position: i / 10 }
        });
        crescendo.push(velocity);
      }
      
      // Should increase over time
      expect(crescendo[9]).toBeGreaterThan(crescendo[1]);
      expect(crescendo[5]).toBeGreaterThan(crescendo[2]);
    });
  });
  
  describe('Micro Groove', () => {
    let microGroove;
    
    beforeEach(() => {
      microGroove = new MicroGroove();
    });
    
    it('should apply groove timing', () => {
      microGroove.style = 'jazz-swing';
      
      const note = { time: 1.0, velocity: 0.7 };
      const grooved = microGroove.applyGroove(note, {
        beatPosition: 0.5,
        subdivisionPosition: 0.5
      });
      
      expect(grooved.time).not.toBe(1.0);
      expect(grooved.grooveApplied).toBe(true);
    });
    
    it('should apply instrument micro-timing', () => {
      const snareNote = { time: 1.0 };
      const groovedSnare = microGroove.applyGroove(snareNote, {
        instrumentType: 'drums',
        noteType: 'snare',
        beatPosition: 2 // Backbeat
      });
      
      // Snare backbeat should be slightly behind
      expect(groovedSnare.time).toBeGreaterThan(1.0);
    });
    
    it('should handle different groove styles', () => {
      const styles = ['straight', 'jazz-swing', 'funk', 'latin-clave'];
      const results = [];
      
      styles.forEach(style => {
        microGroove.style = style;
        const note = { time: 1.0 };
        const processed = microGroove.applyGroove(note, {
          subdivisionPosition: 0.25
        });
        results.push(processed);
      });
      
      // Different styles should produce different timings
      const timings = results.map(r => r.time);
      const uniqueTimings = new Set(timings);
      expect(uniqueTimings.size).toBeGreaterThan(2);
    });
  });
  
  describe('Ensemble Timing System', () => {
    let ensembleSystem;
    
    beforeEach(() => {
      ensembleSystem = new EnsembleTimingSystem();
    });
    
    afterEach(() => {
      ensembleSystem.reset();
    });
    
    it('should coordinate multiple instruments', () => {
      // Register instruments
      ensembleSystem.registerInstrument('piano', {
        type: 'piano',
        role: 'harmony'
      });
      
      ensembleSystem.registerInstrument('bass', {
        type: 'bass',
        role: 'bass'
      });
      
      const pianoNote = { time: 1.0 };
      const bassNote = { time: 1.0 };
      
      const pianoProcecssed = ensembleSystem.processEnsembleEvent(
        pianoNote, 'piano', {}
      );
      
      const bassProcessed = ensembleSystem.processEnsembleEvent(
        bassNote, 'bass', {}
      );
      
      // Bass should be slightly behind harmony
      expect(bassProcessed.time).toBeGreaterThan(pianoProcecssed.time);
    });
    
    it('should handle interaction patterns', () => {
      ensembleSystem.registerInstrument('lead', { role: 'lead' });
      ensembleSystem.registerInstrument('response', { role: 'harmony' });
      
      const leadNote = { time: 1.0 };
      const responseNote = { time: 1.1 };
      
      const processed = ensembleSystem.processEnsembleEvent(
        responseNote, 'response', {
          interaction: 'call-response',
          targetInstrument: 'lead'
        }
      );
      
      // Response should have additional delay
      expect(processed.time).toBeGreaterThan(1.1);
    });
    
    it('should adjust tightness', () => {
      ensembleSystem.registerInstrument('inst1', { skill: 'student' });
      ensembleSystem.registerInstrument('inst2', { skill: 'professional' });
      
      ensembleSystem.tightness = 0.5; // Loose
      const looseNote = ensembleSystem.processEnsembleEvent(
        { time: 1.0 }, 'inst1', {}
      );
      
      ensembleSystem.tightness = 0.95; // Tight
      const tightNote = ensembleSystem.processEnsembleEvent(
        { time: 1.0 }, 'inst2', {}
      );
      
      // Tight ensemble should have less variation
      expect(Math.abs(tightNote.time - 1.0)).toBeLessThan(
        Math.abs(looseNote.time - 1.0)
      );
    });
  });
  
  describe('Human Performance System Integration', () => {
    let performanceSystem;
    
    beforeEach(() => {
      performanceSystem = new HumanPerformanceSystem();
      performanceSystem.initialize();
    });
    
    afterEach(() => {
      performanceSystem.reset();
    });
    
    it('should process single notes', () => {
      const note = {
        time: 1.0,
        velocity: 0.7,
        value: 60,
        duration: 0.5
      };
      
      const processed = performanceSystem.processNote(note, {
        instrumentType: 'piano',
        instrumentId: 'piano1'
      });
      
      expect(processed.time).not.toBe(1.0);
      expect(processed.velocity).not.toBe(0.7);
      expect(processed.time).toBeGreaterThan(0.95);
      expect(processed.time).toBeLessThan(1.05);
    });
    
    it('should process note sequences', () => {
      const notes = [
        { time: 0, value: 60, velocity: 0.7 },
        { time: 0.5, value: 62, velocity: 0.7 },
        { time: 1.0, value: 64, velocity: 0.7 },
        { time: 1.5, value: 65, velocity: 0.7 }
      ];
      
      const processed = performanceSystem.processSequence(notes, {
        instrumentType: 'piano'
      });
      
      // Should maintain relative timing
      expect(processed[1].time - processed[0].time).toBeCloseTo(0.5, 1);
      
      // Should have velocity variation
      const velocities = processed.map(n => n.velocity);
      const uniqueVels = new Set(velocities);
      expect(uniqueVels.size).toBeGreaterThan(2);
    });
    
    it('should load performance profiles', () => {
      performanceSystem.loadProfile('jazz');
      
      const note = { time: 1.0, velocity: 0.7 };
      const jazzNote = performanceSystem.processNote(note, {
        instrumentType: 'piano',
        beatPosition: 0.5
      });
      
      performanceSystem.loadProfile('classical');
      const classicalNote = performanceSystem.processNote(note, {
        instrumentType: 'piano',
        beatPosition: 0.5
      });
      
      // Different profiles should produce different results
      expect(jazzNote.time).not.toBeCloseTo(classicalNote.time, 3);
    });
    
    it('should adjust skill level', () => {
      const note = { time: 1.0, velocity: 0.7 };
      
      performanceSystem.setSkillLevel('beginner');
      const beginnerNote = performanceSystem.processNote(note, {
        instrumentType: 'piano'
      });
      
      performanceSystem.setSkillLevel('virtuoso');
      const virtuosoNote = performanceSystem.processNote(note, {
        instrumentType: 'piano'
      });
      
      // Beginner should have more timing variation
      expect(Math.abs(beginnerNote.time - 1.0)).toBeGreaterThan(
        Math.abs(virtuosoNote.time - 1.0)
      );
    });
    
    it('should provide performance metrics', () => {
      // Process some notes
      const notes = Array(20).fill(null).map((_, i) => ({
        time: i * 0.25,
        velocity: 0.6 + Math.random() * 0.2,
        value: 60 + (i % 8)
      }));
      
      performanceSystem.processSequence(notes, {
        instrumentType: 'piano'
      });
      
      const metrics = performanceSystem.getMetrics();
      
      expect(metrics).toHaveProperty('timingAccuracy');
      expect(metrics).toHaveProperty('dynamicRange');
      expect(metrics).toHaveProperty('grooveStrength');
      expect(metrics).toHaveProperty('expressiveness');
      
      expect(metrics.timingAccuracy).toBeGreaterThan(0);
      expect(metrics.timingAccuracy).toBeLessThanOrEqual(1);
    });
  });
});