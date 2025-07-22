import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  startLiveInput,
  stopLiveInput,
  updateLiveInputEffects,
  measureLiveInputLatency,
  startLiveInputRecording,
  stopLiveInputRecording,
  getLiveInputStatus,
  resetLiveInputState
} from '../../../src/audio/live/LiveInput.js';

// Mock Tone.js - handled by vitest.config.js alias

// Mock navigator.mediaDevices
global.navigator = {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => []
    })
  }
};

// Mock state
vi.mock('../../../src/state.js', () => ({
  updateLiveInputState: vi.fn()
}));

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
    })),
    harmonizer: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      setIntervals: vi.fn()
    }))
  }
}));

describe('LiveInput', () => {
  const mockGetMasterBus = vi.fn().mockReturnValue({
    connect: vi.fn()
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset live input state before each test
    resetLiveInputState();
  });
  
  afterEach(async () => {
    // Clean up any active live input
    await stopLiveInput();
    resetLiveInputState();
  });

  describe('startLiveInput', () => {
    it('should start live input successfully', async () => {
      const result = await startLiveInput({}, mockGetMasterBus);
      
      expect(result).toEqual({
        success: true,
        latency: expect.any(Number)
      });
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should apply configuration options', async () => {
      const config = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
        monitor: true
      };
      
      await startLiveInput(config, mockGetMasterBus);
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          latency: 0
        })
      });
    });

    it('should initialize with effects', async () => {
      const config = {
        effects: [
          { type: 'reverb', params: { roomSize: 0.8 } },
          { type: 'delay', params: { delayTime: 0.25 } }
        ]
      };
      
      await startLiveInput(config, mockGetMasterBus);
      
      const status = getLiveInputStatus();
      expect(status.effectCount).toBe(2);
    });

    it('should not start if already active', async () => {
      await startLiveInput({}, mockGetMasterBus);
      
      // Clear mock to check second call
      vi.clearAllMocks();
      
      await startLiveInput({}, mockGetMasterBus);
      
      expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });

    it('should handle getUserMedia error', async () => {
      navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
        new Error('Permission denied')
      );
      
      await expect(startLiveInput({}, mockGetMasterBus))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('stopLiveInput', () => {
    it('should stop live input and clean up', async () => {
      // Start first
      await startLiveInput({}, mockGetMasterBus);
      
      // Then stop
      await stopLiveInput();
      
      const status = getLiveInputStatus();
      expect(status.active).toBe(false);
      expect(status.latency).toBe(0);
      expect(status.effectCount).toBe(0);
    });

    it('should fade out smoothly', async () => {
      await startLiveInput({}, mockGetMasterBus);
      
      const { updateLiveInputState } = await import('../../../src/state.js');
      
      await stopLiveInput();
      
      expect(updateLiveInputState).toHaveBeenCalledWith({
        active: false,
        latency: 0,
        recording: false,
        effectCount: 0
      });
    });

    it('should handle stop when not active', async () => {
      // Should not throw
      await stopLiveInput();
    });
  });

  describe('updateLiveInputEffects', () => {
    it('should update effects chain', async () => {
      await startLiveInput({}, mockGetMasterBus);
      
      const effectsConfig = [
        { type: 'reverb', params: { roomSize: 0.9 }, mix: 0.4 },
        { type: 'harmonizer', intervals: [3, 5, 12] }
      ];
      
      updateLiveInputEffects(effectsConfig);
      
      const status = getLiveInputStatus();
      expect(status.effectCount).toBe(2);
    });

    it('should handle empty effects', async () => {
      await startLiveInput({
        effects: [{ type: 'reverb' }]
      }, mockGetMasterBus);
      
      updateLiveInputEffects([]);
      
      const status = getLiveInputStatus();
      expect(status.effectCount).toBe(0);
    });

    it('should do nothing if input not active', () => {
      // Should not throw
      updateLiveInputEffects([{ type: 'reverb' }]);
    });
  });

  describe('measureLiveInputLatency', () => {
    it('should measure and return latency', async () => {
      await startLiveInput({}, mockGetMasterBus);
      
      const latency = await measureLiveInputLatency();
      
      expect(latency).toBeGreaterThan(0);
      expect(typeof latency).toBe('number');
    });

    it('should return undefined if not active', async () => {
      const latency = await measureLiveInputLatency();
      
      expect(latency).toBeUndefined();
    });
  });

  describe('recording functions', () => {
    it('should start recording', async () => {
      await startLiveInput({}, mockGetMasterBus);
      
      const result = await startLiveInputRecording();
      
      expect(result).toBe(true);
      
      const status = getLiveInputStatus();
      expect(status.recording).toBe(true);
    });

    it('should not start recording if not active', async () => {
      const result = await startLiveInputRecording();
      
      expect(result).toBe(null);
    });

    it('should stop recording and return buffer', async () => {
      await startLiveInput({}, mockGetMasterBus);
      await startLiveInputRecording();
      
      const result = await stopLiveInputRecording();
      
      expect(result).toEqual({
        buffer: expect.any(Object),
        duration: 5
      });
      
      const status = getLiveInputStatus();
      expect(status.recording).toBe(false);
    });

    it('should return null if not recording', async () => {
      const result = await stopLiveInputRecording();
      
      expect(result).toBe(null);
    });
  });

  describe('getLiveInputStatus', () => {
    it('should return correct initial status', () => {
      const status = getLiveInputStatus();
      
      expect(status).toEqual({
        active: false,
        latency: 0,
        recording: false,
        effectCount: 0
      });
    });

    it('should return updated status after start', async () => {
      await startLiveInput({
        effects: [{ type: 'reverb' }]
      }, mockGetMasterBus);
      
      const status = getLiveInputStatus();
      
      expect(status.active).toBe(true);
      expect(status.latency).toBeGreaterThan(0);
      expect(status.effectCount).toBe(1);
    });
  });
});