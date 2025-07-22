/**
 * MidiMappings - Standard MIDI controller mappings for Music2
 * Defines how MIDI controllers map to instrument and effect parameters
 */

// Standard MIDI CC numbers
export const MIDI_CC = {
  // Performance Controllers
  MODULATION: 1,
  BREATH: 2,
  FOOT_CONTROLLER: 4,
  PORTAMENTO_TIME: 5,
  VOLUME: 7,
  BALANCE: 8,
  PAN: 10,
  EXPRESSION: 11,
  
  // Effect Controllers
  EFFECT_1: 12,
  EFFECT_2: 13,
  
  // Sound Controllers
  SOUND_CONTROLLER_1: 70,  // Brightness/Filter
  SOUND_CONTROLLER_2: 71,  // Harmonic Content
  SOUND_CONTROLLER_3: 72,  // Release Time
  SOUND_CONTROLLER_4: 73,  // Attack Time
  SOUND_CONTROLLER_5: 74,  // Brightness/Cutoff
  SOUND_CONTROLLER_6: 75,  // Decay Time
  SOUND_CONTROLLER_7: 76,  // Vibrato Rate
  SOUND_CONTROLLER_8: 77,  // Vibrato Depth
  SOUND_CONTROLLER_9: 78,  // Vibrato Delay
  SOUND_CONTROLLER_10: 79, // Undefined
  
  // Pedals and Switches
  SUSTAIN_PEDAL: 64,
  PORTAMENTO_SWITCH: 65,
  SOSTENUTO_PEDAL: 66,
  SOFT_PEDAL: 67,
  LEGATO_SWITCH: 68,
  HOLD_2: 69,
  
  // Filter and Envelope
  FILTER_RESONANCE: 71,
  FILTER_CUTOFF: 74,
  ENV_ATTACK: 73,
  ENV_DECAY: 75,
  ENV_RELEASE: 72,
  
  // Effects Depth
  REVERB_DEPTH: 91,
  TREMOLO_DEPTH: 92,
  CHORUS_DEPTH: 93,
  DETUNE_DEPTH: 94,
  PHASER_DEPTH: 95,
  
  // Data Entry
  DATA_ENTRY_MSB: 6,
  DATA_ENTRY_LSB: 38,
  
  // Channel Mode Messages
  ALL_SOUND_OFF: 120,
  RESET_ALL_CONTROLLERS: 121,
  LOCAL_CONTROL: 122,
  ALL_NOTES_OFF: 123
};

// Default controller mappings by instrument type
export const DEFAULT_MAPPINGS = {
  // Piano mappings
  piano: {
    [MIDI_CC.SUSTAIN_PEDAL]: 'sustainPedal',
    [MIDI_CC.SOFT_PEDAL]: 'softPedal',
    [MIDI_CC.SOSTENUTO_PEDAL]: 'sostenutoPedal',
    [MIDI_CC.MODULATION]: 'resonance',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'hammerHardness',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'sympatheticResonance',
    [MIDI_CC.EXPRESSION]: 'dynamicRange'
  },
  
  // String instrument mappings
  strings: {
    [MIDI_CC.MODULATION]: 'vibratoDepth',
    [MIDI_CC.BREATH]: 'bowPressure',
    [MIDI_CC.EXPRESSION]: 'bowSpeed',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'brightness',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'harmonics',
    [MIDI_CC.SOUND_CONTROLLER_7]: 'vibratoRate',
    [MIDI_CC.SOUND_CONTROLLER_8]: 'vibratoDepth',
    [MIDI_CC.PORTAMENTO_TIME]: 'portamentoTime',
    [MIDI_CC.LEGATO_SWITCH]: 'legato'
  },
  
  // Wind instrument mappings
  winds: {
    [MIDI_CC.BREATH]: 'breathPressure',
    [MIDI_CC.MODULATION]: 'vibratoDepth',
    [MIDI_CC.EXPRESSION]: 'airPressure',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'embouchure',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'breathNoise',
    [MIDI_CC.SOUND_CONTROLLER_7]: 'vibratoRate',
    [MIDI_CC.SOUND_CONTROLLER_8]: 'vibratoDepth',
    [MIDI_CC.PORTAMENTO_TIME]: 'portamentoTime'
  },
  
  // Brass instrument mappings
  brass: {
    [MIDI_CC.BREATH]: 'airPressure',
    [MIDI_CC.MODULATION]: 'lipTension',
    [MIDI_CC.EXPRESSION]: 'dynamics',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'brightness',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'mute',
    [MIDI_CC.SOUND_CONTROLLER_3]: 'valveNoise',
    [MIDI_CC.SOUND_CONTROLLER_7]: 'vibratoRate',
    [MIDI_CC.SOUND_CONTROLLER_8]: 'vibratoDepth',
    [MIDI_CC.PORTAMENTO_TIME]: 'glissandoTime'
  },
  
  // Synthesizer mappings
  synth: {
    [MIDI_CC.MODULATION]: 'filterCutoff',
    [MIDI_CC.BREATH]: 'filterResonance',
    [MIDI_CC.EXPRESSION]: 'amplitude',
    [MIDI_CC.FILTER_CUTOFF]: 'filterCutoff',
    [MIDI_CC.FILTER_RESONANCE]: 'filterResonance',
    [MIDI_CC.ENV_ATTACK]: 'envelopeAttack',
    [MIDI_CC.ENV_DECAY]: 'envelopeDecay',
    [MIDI_CC.ENV_RELEASE]: 'envelopeRelease',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'oscillatorType',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'detune',
    [MIDI_CC.PORTAMENTO_TIME]: 'portamentoTime'
  },
  
  // Percussion mappings
  percussion: {
    [MIDI_CC.MODULATION]: 'pitch',
    [MIDI_CC.EXPRESSION]: 'dynamics',
    [MIDI_CC.SOUND_CONTROLLER_1]: 'tone',
    [MIDI_CC.SOUND_CONTROLLER_2]: 'decay',
    [MIDI_CC.SOUND_CONTROLLER_3]: 'damping'
  }
};

// Articulation key switches (note numbers that trigger articulations)
export const ARTICULATION_KEYSWITCHES = {
  strings: {
    24: 'arco',        // C1
    25: 'pizzicato',   // C#1
    26: 'tremolo',     // D1
    27: 'staccato',    // D#1
    28: 'legato',      // E1
    29: 'sul_ponticello', // F1
    30: 'harmonics',   // F#1
    31: 'col_legno',   // G1
    32: 'bartok_pizz', // G#1
    33: 'spiccato'     // A1
  },
  
  winds: {
    24: 'normal',      // C1
    25: 'flutter',     // C#1
    26: 'multiphonic', // D1
    27: 'breath_tone', // D#1
    28: 'slap_tongue', // E1
    29: 'key_click',   // F1
    30: 'whistle_tone' // F#1
  },
  
  brass: {
    24: 'open',        // C1
    25: 'straight_mute', // C#1
    26: 'cup_mute',    // D1
    27: 'harmon_mute', // D#1
    28: 'bucket_mute', // E1
    29: 'plunger_mute', // F1
    30: 'stopped',     // F#1
    31: 'lip_trill',   // G1
    32: 'fall',        // G#1
    33: 'doit'         // A1
  }
};

// Expression curve presets
export const EXPRESSION_CURVES = {
  linear: (value) => value,
  exponential: (value) => Math.pow(value, 2),
  logarithmic: (value) => Math.log(1 + value * 9) / Math.log(10),
  sigmoid: (value) => 1 / (1 + Math.exp(-12 * (value - 0.5))),
  custom: (value, params = {}) => {
    const { gamma = 1, min = 0, max = 1 } = params;
    return min + (max - min) * Math.pow(value, gamma);
  }
};

// Controller value ranges and scaling
export const CONTROLLER_RANGES = {
  // Vibrato ranges
  vibratoRate: { min: 0.1, max: 10, scale: 'logarithmic' },
  vibratoDepth: { min: 0, max: 0.5, scale: 'linear' },
  
  // Filter ranges
  filterCutoff: { min: 20, max: 20000, scale: 'logarithmic' },
  filterResonance: { min: 0.1, max: 30, scale: 'exponential' },
  
  // Envelope ranges
  envelopeAttack: { min: 0.001, max: 2, scale: 'exponential' },
  envelopeDecay: { min: 0.01, max: 2, scale: 'exponential' },
  envelopeRelease: { min: 0.01, max: 5, scale: 'exponential' },
  
  // Expression ranges
  bowPressure: { min: 0, max: 1, scale: 'linear' },
  bowSpeed: { min: 0, max: 1, scale: 'linear' },
  breathPressure: { min: 0, max: 1, scale: 'linear' },
  airPressure: { min: 0, max: 1.5, scale: 'linear' },
  lipTension: { min: 0.5, max: 2, scale: 'linear' },
  embouchure: { min: 0.5, max: 1.5, scale: 'linear' },
  
  // Piano ranges
  hammerHardness: { min: 0.1, max: 1, scale: 'linear' },
  sympatheticResonance: { min: 0, max: 0.5, scale: 'linear' },
  
  // General ranges
  portamentoTime: { min: 0, max: 0.5, scale: 'exponential' },
  brightness: { min: 0.5, max: 2, scale: 'linear' },
  dynamics: { min: 0, max: 1, scale: 'linear' }
};

/**
 * Get appropriate mapping for an instrument type
 * @param {string} instrumentType 
 * @returns {Object} Controller mappings
 */
export function getMappingForInstrument(instrumentType) {
  // Check for specific instrument family
  if (instrumentType.includes('piano')) return DEFAULT_MAPPINGS.piano;
  if (instrumentType.includes('violin') || instrumentType.includes('viola') || 
      instrumentType.includes('cello') || instrumentType.includes('bass')) return DEFAULT_MAPPINGS.strings;
  if (instrumentType.includes('flute') || instrumentType.includes('clarinet') || 
      instrumentType.includes('oboe') || instrumentType.includes('bassoon') ||
      instrumentType.includes('saxophone')) return DEFAULT_MAPPINGS.winds;
  if (instrumentType.includes('trumpet') || instrumentType.includes('horn') || 
      instrumentType.includes('trombone') || instrumentType.includes('tuba')) return DEFAULT_MAPPINGS.brass;
  if (instrumentType.includes('drum') || instrumentType.includes('percussion')) return DEFAULT_MAPPINGS.percussion;
  
  // Default to synth mappings
  return DEFAULT_MAPPINGS.synth;
}

/**
 * Get articulation keyswitches for an instrument family
 * @param {string} instrumentType 
 * @returns {Object} Keyswitch mappings
 */
export function getKeyswitchesForInstrument(instrumentType) {
  if (instrumentType.includes('violin') || instrumentType.includes('viola') || 
      instrumentType.includes('cello') || instrumentType.includes('bass')) {
    return ARTICULATION_KEYSWITCHES.strings;
  }
  if (instrumentType.includes('flute') || instrumentType.includes('clarinet') || 
      instrumentType.includes('oboe') || instrumentType.includes('bassoon')) {
    return ARTICULATION_KEYSWITCHES.winds;
  }
  if (instrumentType.includes('trumpet') || instrumentType.includes('horn') || 
      instrumentType.includes('trombone') || instrumentType.includes('tuba')) {
    return ARTICULATION_KEYSWITCHES.brass;
  }
  
  return {};
}

/**
 * Scale a controller value according to its range
 * @param {string} parameter 
 * @param {number} value - Normalized value (0-1)
 * @returns {number} Scaled value
 */
export function scaleControllerValue(parameter, value) {
  const range = CONTROLLER_RANGES[parameter];
  if (!range) return value;
  
  const { min, max, scale } = range;
  const curve = EXPRESSION_CURVES[scale] || EXPRESSION_CURVES.linear;
  const scaledNormalized = curve(value);
  
  return min + (max - min) * scaledNormalized;
}

/**
 * Create a custom mapping profile
 * @param {Object} mappings 
 * @returns {Object} Mapping profile
 */
export function createCustomMapping(mappings = {}) {
  return {
    controllers: { ...mappings },
    learn: function(cc, parameter) {
      this.controllers[cc] = parameter;
    },
    remove: function(cc) {
      delete this.controllers[cc];
    },
    get: function(cc) {
      return this.controllers[cc];
    },
    getAll: function() {
      return { ...this.controllers };
    }
  };
}