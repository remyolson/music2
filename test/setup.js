// Mock Tone.js for testing
import { vi } from 'vitest';

// Create mock Tone object
global.Tone = {
  context: {
    state: 'suspended',
    sampleRate: 44100,
    baseLatency: 0.01,
    outputLatency: 0.02,
  },
  start: vi.fn().mockResolvedValue(undefined),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    position: 0,
    state: 'stopped',
    bpm: {
      value: 120
    }
  },
  Destination: {},
  Gain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    gain: { value: 1 }
  })),
  Synth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn()
  })),
  PolySynth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn()
  })),
  Part: vi.fn((callback, notes) => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    mute: false,
    loop: true,
    loopEnd: 0,
    trackIndex: undefined
  })),
  Frequency: vi.fn((value, type) => ({
    toFrequency: () => 440 // Default A4
  })),
  now: vi.fn(() => 0),
  UserMedia: vi.fn(() => ({
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Recorder: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(new Blob()),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  }))
};

// Mock Web Audio API
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  }))
}));

// Mock MediaDevices API
global.navigator = {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{
        stop: vi.fn()
      }]
    })
  }
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});