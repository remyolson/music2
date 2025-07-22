/**
 * Available instrument types
 */
export const INSTRUMENT_TYPES = [
  'synth_lead',
  'synth_bass',
  'piano',
  'strings',
  'brass',
  'drums_kit',
  'electric_guitar',
  'organ',
  'flute',
  'harp',
  'drums_electronic',
  'marimba',
  'trumpet',
  'violin',
  'saxophone',
  'pad_synth',
  'celesta',
  'vibraphone',
  'xylophone',
  'clarinet',
  'tuba',
  'choir',
  'banjo',
  'electric_piano',
  'granular_pad',
  'vocoder_synth'
];

/**
 * Drum note types
 */
export const DRUM_NOTES = {
  KICK: 'kick',
  SNARE: 'snare'
};

/**
 * Default drum pitches
 */
export const DRUM_PITCHES = {
  kick: 'C2',
  snare: 'A4'
};

/**
 * Default drum durations
 */
export const DRUM_DURATIONS = {
  kick: 0.1,
  snare: 0.05
};

/**
 * Instrument-specific default settings
 */
export const INSTRUMENT_DEFAULTS = {
  // Synth instruments
  synth_lead: {
    oscillator: { type: 'sawtooth' },
    portamento: 0
  },
  synth_bass: {
    oscillator: { type: 'square' },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0.3,
      release: 0.5,
      baseFrequency: 200,
      octaves: 2.5
    },
    portamento: 0
  },

  // Acoustic instruments
  piano: {
    oscillator: { type: 'fmsine' }
  },
  strings: {
    harmonicity: 2.8,
    modulationIndex: 5,
    oscillator: { type: 'triangle' },
    modulation: { type: 'sine' },
    filterFrequency: 2000,
    filterRolloff: -24
  },

  // Drums
  drums_kit: {
    kick: {
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
        attackCurve: 'exponential'
      }
    },
    snare: {
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0
      }
    }
  },

  // Vocoder settings
  vocoder_synth: {
    formantFrequencies: [700, 1220, 2600, 3200, 4400],
    formantQ: [12, 10, 8, 8, 6],
    formantGains: [0, -5, -10, -15, -20],
    pitchModulation: {
      frequency: 4,
      depth: 0.1,
      baseFrequency: 1000,
      octaves: 2,
      wet: 0.2
    }
  },

  // Granular pad settings
  granular_pad: {
    oscillator: {
      type: 'sawtooth',
      count: 3,
      spread: 40
    },
    grainSize: 0.1,
    grainDensity: 10,
    shimmer: 0.3
  }
};

/**
 * Instrument gain reduction factor
 */
export const INSTRUMENT_GAIN_FACTOR = 0.5;