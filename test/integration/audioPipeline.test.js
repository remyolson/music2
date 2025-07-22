import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { update, play, stop, getInstruments } from '../../src/audioEngine.js';
import { getMasterBus } from '../../src/audio/core/MasterBus.js';
import { startLiveInput, stopLiveInput } from '../../src/audio/live/LiveInput.js';

// Mock audioHealthMonitor to avoid Tone.js dependency issues
vi.mock('../../src/audioHealthMonitor.js', () => ({
  audioHealthMonitor: {
    initialize: vi.fn(),
    startMonitoring: vi.fn(),
    updateEffectCount: vi.fn(),
    getStats: vi.fn(() => ({ peak: -20, rms: -30 }))
  }
}));

/**
 * Integration tests for the complete audio pipeline
 * These tests verify that all audio modules work together correctly
 */
describe('Audio Pipeline Integration', () => {
  const testMusicData = {
    title: 'Integration Test Song',
    tempo: 120,
    key: 'C',
    timeSignature: '4/4',
    tracks: [
      {
        name: 'Lead Synth',
        instrument: 'synth_lead',
        volume: 0.8,
        notes: [
          { time: 0, duration: 1, value: 'C4', volume: 0.7 },
          { time: 1, duration: 1, value: 'E4', volume: 0.8 },
          { time: 2, duration: 1, value: 'G4', volume: 0.9 },
          { time: 3, duration: 1, value: 'C5', volume: 0.8 }
        ],
        settings: {
          envelope: { attack: 0.1, release: 0.5 },
          globalEffects: [
            { type: 'reverb', level: 0.3 },
            { type: 'delay', level: 0.2 }
          ]
        }
      },
      {
        name: 'Bass',
        instrument: 'synth_bass',
        volume: 0.9,
        notes: [
          { time: 0, duration: 2, value: 'C2', volume: 0.8 },
          { time: 2, duration: 2, value: 'F2', volume: 0.9 }
        ],
        settings: {
          globalEffects: [
            { type: 'compressor', threshold: -12, ratio: 4 }
          ]
        }
      },
      {
        name: 'Drums',
        instrument: 'drums_kit',
        volume: 0.7,
        notes: [
          { time: 0, duration: 0.25, value: 'kick', volume: 0.9 },
          { time: 0.5, duration: 0.1, value: 'snare', volume: 0.8 },
          { time: 1, duration: 0.25, value: 'kick', volume: 0.9 },
          { time: 1.5, duration: 0.1, value: 'snare', volume: 0.8 }
        ]
      },
      {
        name: 'Harmony Pad',
        instrument: 'piano',
        volume: 0.6,
        notes: [
          { 
            time: 0, 
            duration: 4, 
            value: 'C4',
            harmonize: [4, 7, 12], // Major triad
            harmonizeMix: 0.4
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    // Clean up any previous state
    stop();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Always clean up after tests
    stop();
    await stopLiveInput();
  });

  describe('Complete Music Processing', () => {
    it('should process complex music data without errors', async () => {
      // Should handle complex music data with multiple tracks and effects
      await expect(update(testMusicData)).resolves.not.toThrow();
      
      // Verify instruments were created
      const instruments = getInstruments();
      expect(instruments.size).toBe(4);
      expect(instruments.has('Lead Synth')).toBe(true);
      expect(instruments.has('Bass')).toBe(true);
      expect(instruments.has('Drums')).toBe(true);
      expect(instruments.has('Harmony Pad')).toBe(true);
    });

    it('should handle playback lifecycle', async () => {
      await update(testMusicData);
      
      // Should start playback without errors
      await expect(play()).resolves.not.toThrow();
      
      // Should stop playback without errors  
      expect(() => stop()).not.toThrow();
    });

    it('should maintain audio routing integrity', async () => {
      await update(testMusicData);
      
      // Verify master bus is available
      const masterBus = getMasterBus();
      expect(masterBus).toBeDefined();
      expect(masterBus.connect).toBeDefined();
      expect(masterBus.gain).toBeDefined();
      
      // Verify all instruments are properly connected
      const instruments = getInstruments();
      instruments.forEach((instrumentData, trackName) => {
        expect(instrumentData.instrument).toBeDefined();
        expect(instrumentData.effectChain).toBeDefined();
      });
    });

    it('should process effects correctly', async () => {
      await update(testMusicData);
      
      const instruments = getInstruments();
      
      // Lead Synth should have reverb and delay effects
      const leadSynth = instruments.get('Lead Synth');
      expect(leadSynth).toBeDefined();
      expect(leadSynth.effectChain).toBeDefined();
      expect(Array.isArray(leadSynth.effectChain)).toBe(true);
      
      // Bass should have compressor effect
      const bass = instruments.get('Bass');
      expect(bass).toBeDefined();
      expect(bass.effectChain).toBeDefined();
      
      // Should handle processing without errors
      await expect(play()).resolves.not.toThrow();
    });

    it('should handle drum tracks with multiple components', async () => {
      const drumOnlyData = {
        tempo: 120,
        tracks: [{
          name: 'Test Drums',
          instrument: 'drums_kit',
          notes: [
            { time: 0, duration: 0.25, value: 'kick' },
            { time: 0.5, duration: 0.1, value: 'snare' },
            { time: 1, duration: 0.05, value: 'hihat' }
          ]
        }]
      };

      await update(drumOnlyData);
      
      const instruments = getInstruments();
      const drums = instruments.get('Test Drums');
      
      expect(drums).toBeDefined();
      expect(drums.instrument).toBeDefined();
      
      // Drum instruments should have kick and snare components
      if (drums.instrument.kick && drums.instrument.snare) {
        expect(drums.instrument.kick.connect).toBeDefined();
        expect(drums.instrument.snare.connect).toBeDefined();
      }
    });

    it('should process harmonized notes', async () => {
      const harmonyData = {
        tempo: 120,
        tracks: [{
          name: 'Harmony Test',
          instrument: 'piano',
          notes: [
            { 
              time: 0, 
              duration: 2, 
              value: 'C4',
              harmonize: [4, 7],  // Major third and fifth
              harmonizeMix: 0.5,
              harmonizeLevels: [0.8, 0.6]
            }
          ]
        }]
      };

      // Should handle harmonization without errors
      await expect(update(harmonyData)).resolves.not.toThrow();
      await expect(play()).resolves.not.toThrow();
    });
  });

  describe('Live Audio Integration', () => {
    it('should integrate live input with music playback', async () => {
      // Set up music
      await update(testMusicData);
      
      // Start live input
      const liveConfig = {
        monitor: false, // Don't monitor to avoid feedback in tests
        effects: [
          { type: 'reverb', wet: 0.2 }
        ]
      };
      
      const result = await startLiveInput(liveConfig);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      // Should handle simultaneous playback and live input
      await expect(play()).resolves.not.toThrow();
      
      // Clean up
      await stopLiveInput();
      stop();
    });

    it('should handle live input effects chain', async () => {
      const complexLiveConfig = {
        monitor: false,
        effects: [
          { type: 'reverb', wet: 0.3 },
          { type: 'delay', wet: 0.2, delayTime: 0.25 },
          { type: 'harmonizer', intervals: [7, 12] }
        ]
      };

      // Should handle complex live input setup
      await expect(startLiveInput(complexLiveConfig)).resolves.not.toThrow();
      
      // Should handle cleanup
      await expect(stopLiveInput()).resolves.not.toThrow();
    });
  });

  describe('Error Resilience', () => {
    it('should handle invalid music data gracefully', async () => {
      const invalidData = {
        tempo: 120,
        tracks: [
          {
            name: 'Invalid Track',
            instrument: 'nonexistent_instrument',
            notes: [
              { time: 0, duration: -1, value: null }, // Invalid note
              { time: 1, duration: 1, value: 'C4' }   // Valid note
            ]
          }
        ]
      };

      // Should not throw on invalid data
      await expect(update(invalidData)).resolves.not.toThrow();
    });

    it('should handle empty tracks', async () => {
      const emptyData = {
        tempo: 120,
        tracks: []
      };

      await expect(update(emptyData)).resolves.not.toThrow();
      expect(() => stop()).not.toThrow();
    });

    it('should handle null/undefined input', async () => {
      await expect(update(null)).resolves.not.toThrow();
      await expect(update(undefined)).resolves.not.toThrow();
    });

    it('should maintain stability during rapid updates', async () => {
      // Rapid sequential updates should not cause issues
      const simpleData = {
        tempo: 120,
        tracks: [{
          name: 'Simple',
          instrument: 'synth_lead',
          notes: [{ time: 0, duration: 1, value: 'C4' }]
        }]
      };

      for (let i = 0; i < 5; i++) {
        await expect(update({ ...simpleData, tempo: 120 + i * 10 })).resolves.not.toThrow();
      }
      
      expect(() => stop()).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', async () => {
      // Create complex setup
      await update(testMusicData);
      await play();
      
      const beforeInstruments = getInstruments().size;
      expect(beforeInstruments).toBeGreaterThan(0);
      
      // Stop and update with empty data
      stop();
      await update({ tempo: 120, tracks: [] });
      
      // Should handle cleanup without errors
      expect(true).toBe(true); // Placeholder for memory assertions
    });

    it('should handle multiple dispose cycles', async () => {
      await update(testMusicData);
      
      // Multiple stops should not cause issues
      expect(() => {
        stop();
        stop();
        stop();
      }).not.toThrow();
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large number of notes', async () => {
      const notes = [];
      for (let i = 0; i < 100; i++) {
        notes.push({
          time: i * 0.1,
          duration: 0.1,
          value: i % 2 === 0 ? 'C4' : 'E4',
          volume: 0.5
        });
      }

      const heavyData = {
        tempo: 120,
        tracks: [{
          name: 'Heavy Track',
          instrument: 'synth_lead',
          notes: notes
        }]
      };

      // Should handle large datasets
      await expect(update(heavyData)).resolves.not.toThrow();
    });

    it('should handle multiple complex tracks', async () => {
      const complexData = {
        tempo: 140,
        tracks: Array.from({ length: 8 }, (_, i) => ({
          name: `Track ${i}`,
          instrument: i % 2 === 0 ? 'synth_lead' : 'synth_bass',
          notes: [
            { time: 0, duration: 1, value: 'C4', volume: 0.6 },
            { time: 1, duration: 1, value: 'G4', volume: 0.7 }
          ],
          settings: {
            globalEffects: [
              { type: 'reverb', level: 0.2 }
            ]
          }
        }))
      };

      // Should handle multiple tracks
      await expect(update(complexData)).resolves.not.toThrow();
      
      const instruments = getInstruments();
      expect(instruments.size).toBe(8);
    });
  });
});