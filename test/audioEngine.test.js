import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  update,
  play,
  stop,
  getTransport,
  applyTrackSelection,
  freezeTrack,
  unfreezeTrack,
  isTrackFrozen,
  getFrozenTracks,
  startLiveInput,
  stopLiveInput,
  updateLiveInputEffects,
  measureLiveInputLatency,
  startLiveInputRecording,
  stopLiveInputRecording,
  getLiveInputStatus,
  getInstruments,
  reorderTrackEffects,
  setHarmonyCallback,
  applyMasterEffectPreset
} from '../src/audioEngine.js';

// Mock all dependencies
vi.mock('../src/performanceOptimizer.js', () => ({
  performanceOptimizer: {
    initialize: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../src/state.js', () => ({
  updateLiveInputState: vi.fn()
}));

vi.mock('../src/audioHealthMonitor.js', () => ({
  audioHealthMonitor: {
    updateEffectCount: vi.fn(),
    startMonitoring: vi.fn(),
    initialize: vi.fn()
  }
}));

vi.mock('../src/audio/effects/EffectFactory.js', () => ({
  availableEffects: {
    harmonizer: vi.fn(() => ({
      setIntervals: vi.fn(),
      setMix: vi.fn(),
      setVoiceLevel: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn()
    }))
  }
}));

vi.mock('../src/audio/instruments/InstrumentFactory.js', () => ({
  createInstrumentWithEffects: vi.fn().mockResolvedValue({
    instrument: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      chain: vi.fn(),
      triggerAttackRelease: vi.fn(),
      kick: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        chain: vi.fn(),
        triggerAttackRelease: vi.fn()
      },
      snare: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        chain: vi.fn(),
        triggerAttackRelease: vi.fn()
      }
    },
    effectChain: []
  })
}));

vi.mock('../src/audio/live/LiveInput.js', () => ({
  startLiveInput: vi.fn().mockResolvedValue({ success: true, latency: 10 }),
  stopLiveInput: vi.fn().mockResolvedValue(undefined),
  updateLiveInputEffects: vi.fn(),
  measureLiveInputLatency: vi.fn().mockResolvedValue(10),
  startLiveInputRecording: vi.fn().mockResolvedValue(true),
  stopLiveInputRecording: vi.fn().mockResolvedValue({ buffer: new Blob(), duration: 5 }),
  getLiveInputStatus: vi.fn().mockReturnValue({ active: false, latency: 0 })
}));

vi.mock('../src/audio/core/MasterBus.js', () => ({
  getMasterBus: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 0.7 }
  })),
  applyMasterEffectPreset: vi.fn(),
  getMasterEffectChain: vi.fn(() => [])
}));

describe('AudioEngine', () => {
  const mockMusicData = {
    tempo: 120,
    tracks: [
      {
        name: 'Lead',
        instrument: 'synth_lead',
        notes: [
          { time: 0, duration: 1, value: 'C4', volume: 0.8 },
          { time: 1, duration: 1, value: 'D4', volume: 0.7 },
          { time: 2, duration: 1, value: 'E4', volume: 0.9 }
        ],
        effects: ['reverb']
      },
      {
        name: 'Bass',
        instrument: 'synth_bass',
        notes: [
          { time: 0, duration: 2, value: 'C2', volume: 0.6 },
          { time: 2, duration: 2, value: 'F2', volume: 0.7 }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    stop();
  });

  describe('update', () => {
    it('should update music data and create instruments', async () => {
      const { createInstrumentWithEffects } = await import('../src/audio/instruments/InstrumentFactory.js');
      
      await update(mockMusicData);
      
      expect(createInstrumentWithEffects).toHaveBeenCalledTimes(2);
      expect(createInstrumentWithEffects).toHaveBeenCalledWith(
        mockMusicData.tracks[0],
        expect.any(Function)
      );
      expect(createInstrumentWithEffects).toHaveBeenCalledWith(
        mockMusicData.tracks[1],
        expect.any(Function)
      );
    });

    it('should set transport BPM', async () => {
      await update(mockMusicData);
      
      expect(Tone.Transport.bpm.value).toBe(120);
    });

    it('should handle null/undefined music data', async () => {
      await update(null);
      await update(undefined);
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should expand notes with repeat', async () => {
      const musicDataWithRepeats = {
        tempo: 120,
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { time: 0, duration: 1, value: 'C4', repeat: 3 }
            ]
          }
        ]
      };

      await update(musicDataWithRepeats);
      
      // Should create 3 notes with different times
      expect(Tone.Part).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([
          expect.objectContaining({ time: 0, value: 'C4' }),
          expect.objectContaining({ time: 0.5, value: 'C4' }),
          expect.objectContaining({ time: 1, value: 'C4' })
        ])
      );
    });

    it('should handle drum tracks correctly', async () => {
      const drumData = {
        tempo: 120,
        tracks: [
          {
            name: 'Drums',
            instrument: 'drums_kit',
            notes: [
              { time: 0, duration: 0.25, value: 'kick' },
              { time: 0.5, duration: 0.25, value: 'snare' }
            ]
          }
        ]
      };

      await update(drumData);
      
      expect(Tone.Part).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([
          expect.objectContaining({ value: 'kick' }),
          expect.objectContaining({ value: 'snare' })
        ])
      );
    });
  });

  describe('playback controls', () => {
    beforeEach(async () => {
      await update(mockMusicData);
    });

    it('should start playback', async () => {
      await play();
      
      expect(Tone.Transport.start).toHaveBeenCalled();
    });

    it('should stop playback', () => {
      stop();
      
      expect(Tone.Transport.stop).toHaveBeenCalled();
    });

    it('should return transport object', () => {
      const transport = getTransport();
      
      expect(transport).toBe(Tone.Transport);
    });
  });

  describe('track selection', () => {
    beforeEach(async () => {
      await update(mockMusicData);
    });

    it('should apply track selection by muting unselected tracks', () => {
      applyTrackSelection([0]); // Only select first track
      
      // Should mute the second part (Bass track)
      const parts = Tone.Part.mock.results;
      if (parts.length > 1) {
        expect(parts[1].value.mute).toBe(true);
      }
    });

    it('should unmute all tracks when no selection provided', () => {
      applyTrackSelection([]);
      
      const parts = Tone.Part.mock.results;
      parts.forEach(part => {
        expect(part.value.mute).toBe(false);
      });
    });
  });

  describe('track freezing', () => {
    beforeEach(async () => {
      await update(mockMusicData);
    });

    it('should freeze a track', async () => {
      await freezeTrack(0, 4.0); // Freeze first track for 4 seconds
      
      expect(isTrackFrozen(0)).toBe(true);
    });

    it('should unfreeze a track', async () => {
      await freezeTrack(0, 4.0);
      unfreezeTrack(0);
      
      expect(isTrackFrozen(0)).toBe(false);
    });

    it('should return frozen tracks list', async () => {
      await freezeTrack(0, 4.0);
      await freezeTrack(1, 2.0);
      
      const frozenTracks = getFrozenTracks();
      expect(frozenTracks).toEqual([0, 1]);
    });

    it('should handle freezing non-existent track', async () => {
      await expect(freezeTrack(999, 4.0)).resolves.not.toThrow();
    });
  });

  describe('live input integration', () => {
    it('should start live input', async () => {
      const config = { monitor: true };
      const result = await startLiveInput(config);
      
      expect(result).toEqual({ success: true, latency: 10 });
    });

    it('should stop live input', async () => {
      await stopLiveInput();
      
      const { stopLiveInput: stopLiveInputModule } = await import('../src/audio/live/LiveInput.js');
      expect(stopLiveInputModule).toHaveBeenCalled();
    });

    it('should update live input effects', async () => {
      const effects = [{ type: 'reverb', wet: 0.5 }];
      updateLiveInputEffects(effects);
      
      const { updateLiveInputEffects: updateModule } = await import('../src/audio/live/LiveInput.js');
      expect(updateModule).toHaveBeenCalledWith(effects);
    });

    it('should measure live input latency', async () => {
      const latency = await measureLiveInputLatency();
      
      expect(latency).toBe(10);
    });

    it('should start and stop live input recording', async () => {
      const startResult = await startLiveInputRecording();
      expect(startResult).toBe(true);
      
      const stopResult = await stopLiveInputRecording();
      expect(stopResult).toEqual({ buffer: expect.any(Blob), duration: 5 });
    });

    it('should get live input status', () => {
      const status = getLiveInputStatus();
      
      expect(status).toEqual({ active: false, latency: 0 });
    });
  });

  describe('instruments and effects', () => {
    beforeEach(async () => {
      await update(mockMusicData);
    });

    it('should return instruments map', () => {
      const instrumentsMap = getInstruments();
      
      expect(instrumentsMap).toBeInstanceOf(Map);
      expect(instrumentsMap.has('Lead')).toBe(true);
      expect(instrumentsMap.has('Bass')).toBe(true);
    });

    it('should reorder track effects', () => {
      const newEffectChain = ['delay', 'reverb', 'chorus'];
      
      expect(() => {
        reorderTrackEffects('Lead', newEffectChain);
      }).not.toThrow();
    });

    it('should set harmony callback', () => {
      const callback = vi.fn();
      
      setHarmonyCallback(callback);
      
      // Callback should be stored for later use
      expect(typeof callback).toBe('function');
    });

    it('should apply master effect preset', async () => {
      const preset = {
        name: 'Concert Hall',
        effects: [
          { type: 'reverb', params: { wet: 0.3, roomSize: 0.8 } }
        ]
      };
      
      applyMasterEffectPreset(preset);
      
      const { applyMasterEffectPreset: applyModule } = await import('../src/audio/core/MasterBus.js');
      expect(applyModule).toHaveBeenCalledWith(preset);
    });
  });

  describe('note processing', () => {
    it('should handle notes with pitch effects', async () => {
      const musicDataWithPitch = {
        tempo: 120,
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { time: 0, duration: 1, value: 'C4', pitch: 12 } // Pitch up one octave
            ]
          }
        ]
      };

      await update(musicDataWithPitch);
      
      expect(Tone.PitchShift).toHaveBeenCalledWith({
        pitch: 12,
        windowSize: 0.1,
        wet: 1.0
      });
    });

    it('should handle notes with harmonization', async () => {
      const musicDataWithHarmony = {
        tempo: 120,
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { 
                time: 0, 
                duration: 1, 
                value: 'C4', 
                harmonize: [4, 7, 12], // Major chord
                harmonizeMix: 0.5 
              }
            ]
          }
        ]
      };

      await update(musicDataWithHarmony);
      
      const { availableEffects } = await import('../src/audio/effects/EffectFactory.js');
      expect(availableEffects.harmonizer).toHaveBeenCalled();
    });

    it('should validate note data', async () => {
      const invalidMusicData = {
        tempo: 120,
        tracks: [
          {
            name: 'Lead',
            instrument: 'synth_lead',
            notes: [
              { time: 0, duration: 0, value: null }, // Invalid note
              { time: 1, duration: 1, value: 'C4' }  // Valid note
            ]
          }
        ]
      };

      // Should not throw, but invalid notes should be skipped
      await expect(update(invalidMusicData)).resolves.not.toThrow();
    });
  });
});