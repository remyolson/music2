/**
 * Available instrument types
 */
export const INSTRUMENT_TYPES = [
  // Natural sample-based instruments
  'natural_piano',
  'orchestral_violin',
  'orchestral_viola',
  'orchestral_cello',
  'orchestral_double_bass',
  'orchestral_flute',
  'orchestral_clarinet',
  'orchestral_oboe',
  'orchestral_bassoon',
  'orchestral_saxophone',
  'orchestral_trumpet',
  'orchestral_french_horn',
  'orchestral_trombone',
  'orchestral_tuba',
  'string_section',
  'woodwind_section',
  'brass_section',
  // Original synthesized instruments
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
  // Natural sample-based instruments
  natural_piano: {
    volume: -6,
    maxPolyphony: 16,
    pianoType: 'grand_piano',
    resonance: 0.15,
    hammerHardness: 0.8,
    pedals: { sustain: false, soft: false, sostenuto: false }
  },
  orchestral_violin: {
    volume: -6,
    maxPolyphony: 8,
    articulation: 'arco',
    vibrato: { rate: 5, depth: 0.1 },
    bowPressure: 0.5
  },
  orchestral_viola: {
    volume: -6,
    maxPolyphony: 8,
    articulation: 'arco',
    vibrato: { rate: 5, depth: 0.1 },
    bowPressure: 0.5
  },
  orchestral_cello: {
    volume: -6,
    maxPolyphony: 8,
    articulation: 'arco',
    vibrato: { rate: 5, depth: 0.1 },
    bowPressure: 0.5
  },
  orchestral_double_bass: {
    volume: -6,
    maxPolyphony: 8,
    articulation: 'arco',
    vibrato: { rate: 5, depth: 0.1 },
    bowPressure: 0.5
  },
  orchestral_flute: {
    volume: -6,
    maxPolyphony: 1,
    technique: 'normal',
    breath: { amount: 0.15, pressure: 1.0 },
    embouchure: 0.5
  },
  orchestral_clarinet: {
    volume: -6,
    maxPolyphony: 1,
    technique: 'normal',
    breath: { amount: 0.08, pressure: 1.0 },
    embouchure: 0.5
  },
  orchestral_oboe: {
    volume: -6,
    maxPolyphony: 1,
    technique: 'normal',
    breath: { amount: 0.05, pressure: 1.0 },
    embouchure: 0.5
  },
  orchestral_bassoon: {
    volume: -6,
    maxPolyphony: 1,
    technique: 'normal',
    breath: { amount: 0.12, pressure: 1.0 },
    embouchure: 0.5
  },
  orchestral_saxophone: {
    volume: -6,
    maxPolyphony: 1,
    technique: 'normal',
    breath: { amount: 0.1, pressure: 1.0 },
    embouchure: 0.5
  },
  orchestral_trumpet: {
    volume: -4,
    maxPolyphony: 1,
    mute: 'open',
    lipTension: 0.7,
    airPressure: 1.0,
    brightness: 1.0
  },
  orchestral_french_horn: {
    volume: -4,
    maxPolyphony: 2,
    mute: 'open',
    lipTension: 0.5,
    airPressure: 1.0,
    brightness: 0.6
  },
  orchestral_trombone: {
    volume: -4,
    maxPolyphony: 1,
    mute: 'open',
    lipTension: 0.6,
    airPressure: 1.0,
    brightness: 0.7
  },
  orchestral_tuba: {
    volume: -4,
    maxPolyphony: 1,
    mute: 'open',
    lipTension: 0.3,
    airPressure: 1.0,
    brightness: 0.4
  },

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