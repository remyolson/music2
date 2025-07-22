import { vi } from 'vitest';

// Create mocked Tone.js
const Tone = {
  context: {
    state: 'suspended',
    sampleRate: 44100,
    baseLatency: 0.01,
    outputLatency: 0.02,
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 5 })
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
  now: vi.fn(() => 0),
  
  // Effects
  Gain: vi.fn((value) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    chain: vi.fn(),
    gain: { value: value || 1, rampTo: vi.fn().mockResolvedValue(undefined) }
  })),
  Freeverb: vi.fn((params) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn(),
    wet: { value: params?.wet || 0.5 },
    roomSize: { value: params?.roomSize || 0.7 }
  })),
  FeedbackDelay: vi.fn((params) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn(),
    feedback: { value: params?.feedback || 0.5 },
    delayTime: { value: params?.delayTime || 0.25 },
    wet: { value: params?.wet || 0.5 }
  })),
  Distortion: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn(),
    wet: { value: 0.5 }
  })),
  Chorus: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn(),
    wet: { value: 0.5 }
  })),
  PitchShift: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    pitch: 0,
    wet: { value: 1 }
  })),
  Phaser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn()
  })),
  AutoFilter: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn().mockReturnThis(),
    set: vi.fn()
  })),
  Tremolo: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn().mockReturnThis(),
    set: vi.fn()
  })),
  BitCrusher: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn()
  })),
  AutoWah: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    set: vi.fn()
  })),
  
  // Instruments
  Synth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
    chain: vi.fn()
  })),
  MonoSynth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
    chain: vi.fn()
  })),
  PolySynth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    set: vi.fn(),
    chain: vi.fn()
  })),
  FMSynth: vi.fn(() => ({})),
  DuoSynth: vi.fn(() => ({})),
  MembraneSynth: vi.fn(() => ({})),
  PluckSynth: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    chain: vi.fn()
  })),
  FatOscillator: vi.fn(() => ({})),
  
  // Utilities
  Filter: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Vibrato: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Compressor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  Limiter: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn()
  })),
  
  // Live input
  UserMedia: vi.fn(() => ({
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    chain: vi.fn()
  })),
  Recorder: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(new Blob())
  })),
  Oscillator: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  AmplitudeEnvelope: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn()
  })),
  ToneAudioBuffer: vi.fn((buffer) => ({
    duration: buffer?.duration || 1
  })),
  
  // Other
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
  }))
};

// Export both default and named exports to match Tone.js module structure
export default Tone;

// Also export individual components for named imports
export const {
  context,
  start,
  Transport,
  Destination,
  now,
  Gain,
  Freeverb,
  FeedbackDelay,
  Distortion,
  Chorus,
  PitchShift,
  Phaser,
  AutoFilter,
  Tremolo,
  BitCrusher,
  AutoWah,
  Synth,
  MonoSynth,
  PolySynth,
  FMSynth,
  DuoSynth,
  MembraneSynth,
  PluckSynth,
  FatOscillator,
  Filter,
  Vibrato,
  Compressor,
  Limiter,
  UserMedia,
  Recorder,
  Oscillator,
  AmplitudeEnvelope,
  ToneAudioBuffer,
  Part,
  Frequency
} = Tone;