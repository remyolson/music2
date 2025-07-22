/**
 * Safety limits for audio effects to prevent feedback loops and audio damage
 */
export const SAFE_LIMITS = {
  feedback: 0.7,      // Maximum feedback to prevent runaway
  wet: 0.6,          // Maximum wet level
  reverbDecay: 10,   // Maximum reverb decay time
  delayTime: 2,      // Maximum delay time in seconds
};

/**
 * Master bus settings for global audio processing
 */
export const MASTER_BUS_CONFIG = {
  gain: 0.2,         // Master gain to prevent clipping
  limiterThreshold: -6,  // Limiter threshold in dB
  compressor: {
    threshold: -12,
    ratio: 4,
    attack: 0.003,
    release: 0.25
  },
  highpass: {
    frequency: 20,   // Remove DC offset
    rolloff: -24
  }
};

/**
 * Default envelope settings for instruments
 */
export const DEFAULT_ENVELOPE = {
  attack: 0.02,
  decay: 0.1,
  sustain: 0.5,
  release: 1.0
};

/**
 * Note transition presets for different playing styles
 */
export const TRANSITION_PRESETS = {
  smooth: { attack: 0.1, release: 1.5, sustain: 0.8 },
  legato: { attack: 0.02, release: 0.3, sustain: 0.9 },
  staccato: { attack: 0.001, release: 0.05, sustain: 0.2 },
  normal: { attack: 0.02, release: 0.5, sustain: 0.7 }
};

/**
 * Audio processing limits
 */
export const PROCESSING_LIMITS = {
  maxPolyphony: 8,
  maxEffectsPerTrack: 10,
  maxTracks: 16
};