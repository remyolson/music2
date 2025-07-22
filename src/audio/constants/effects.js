/**
 * Default parameters for each effect type
 */
export const EFFECT_DEFAULTS = {
  reverb: {
    roomSize: 0.7,
    dampening: 3000,
    wet: 0.3
  },
  delay: {
    delayTime: 0.25,
    feedback: 0.3,
    wet: 0.2
  },
  distortion: {
    distortion: 0.4,
    wet: 0.5
  },
  chorus: {
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.7,
    wet: 0.5
  },
  phaser: {
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 350,
    wet: 0.5
  },
  filter: {
    frequency: 1,
    depth: 1,
    wet: 0.5
  },
  echo: {
    delayTime: 0.125,
    feedback: 0.5,
    wet: 0.4
  },
  tremolo: {
    frequency: 10,
    depth: 0.5,
    wet: 0.5
  },
  bitcrush: {
    bits: 4,
    wet: 0.5
  },
  wah: {
    baseFrequency: 100,
    octaves: 6,
    sensitivity: 0,
    wet: 0.5
  },
  pitchShift: {
    pitch: 0,
    windowSize: 0.1,
    delayTime: 0,
    feedback: 0,
    wet: 1.0
  },
  freezeReverb: {
    roomSize: 0.9,
    dampening: 5000,
    wet: 0.5,
    feedbackDelay: {
      delayTime: 0.5,
      feedback: 0.7,
      wet: 0.3
    },
    modulation: {
      frequency: 0.5,
      delayTime: 2,
      depth: 0.3,
      wet: 0.3
    }
  }
};

/**
 * Freeze reverb control settings
 */
export const FREEZE_REVERB_CONFIG = {
  frozen: {
    feedback: 0.85,
    roomSize: 0.95
  },
  unfrozen: {
    feedback: 0.7,
    roomSize: 0.9
  }
};

/**
 * Harmonizer presets for different chord types
 */
export const HARMONIZER_PRESETS = {
  maj3: [4, 7, 12],       // Major 3rd, 5th, octave
  min3: [3, 7, 12],       // Minor 3rd, 5th, octave
  fifth: [7, 12, 19],     // 5th, octave, octave+5th
  octave: [12, -12],      // Octave up and down
  power: [7, 12],         // Power chord (5th, octave)
  sus4: [5, 7, 12],       // Sus4 chord intervals
  jazz: [3, 6, 11],       // Minor 3rd, tritone, major 7th
  bon_iver: [3, 7, 10, 15] // Minor 3rd, 5th, minor 7th, minor 10th
};

/**
 * Maximum number of voices for harmonizer
 */
export const HARMONIZER_MAX_VOICES = 4;

/**
 * Default voice level for harmonizer
 */
export const HARMONIZER_DEFAULT_VOICE_LEVEL = 0.5;