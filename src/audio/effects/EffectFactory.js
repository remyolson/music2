/**
 * Effect Factory - Creates and manages audio effects
 */
import * as Tone from 'tone';
import {
  EFFECT_DEFAULTS,
  FREEZE_REVERB_CONFIG,
  HARMONIZER_PRESETS,
  HARMONIZER_MAX_VOICES,
  HARMONIZER_DEFAULT_VOICE_LEVEL
} from '../constants/index.js';
import { SAFE_LIMITS } from '../constants/limits.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * Creates an effect with safety limits applied
 * @param {string} type - Effect type
 * @param {Object} params - Effect parameters
 * @returns {Tone.Effect} The created effect
 */
export function createSafeEffect(type, params = {}) {
  // Apply safety limits to parameters
  if (params.feedback !== undefined) {
    params.feedback = Math.min(params.feedback, SAFE_LIMITS.feedback);
  }
  if (params.wet !== undefined) {
    params.wet = Math.min(params.wet, SAFE_LIMITS.wet);
  }
  if (params.decay !== undefined) {
    params.decay = Math.min(params.decay, SAFE_LIMITS.reverbDecay);
  }
  if (params.delayTime !== undefined) {
    params.delayTime = Math.min(params.delayTime, SAFE_LIMITS.delayTime);
  }

  const effect = availableEffects[type]();

  // Apply parameters
  if (effect.set) {
    effect.set(params);
  } else {
    Object.keys(params).forEach(param => {
      if (effect[param] && effect[param].value !== undefined) {
        effect[param].value = params[param];
      }
    });
  }

  return effect;
}

/**
 * Available effect factories
 */
export const availableEffects = {
  reverb: () => new Tone.Freeverb(EFFECT_DEFAULTS.reverb),
  delay: () => new Tone.FeedbackDelay(EFFECT_DEFAULTS.delay),
  distortion: () => new Tone.Distortion(EFFECT_DEFAULTS.distortion),
  chorus: () => new Tone.Chorus(EFFECT_DEFAULTS.chorus),
  phaser: () => new Tone.Phaser(EFFECT_DEFAULTS.phaser),
  filter: () => new Tone.AutoFilter(EFFECT_DEFAULTS.filter).start(),
  echo: () => new Tone.FeedbackDelay(EFFECT_DEFAULTS.echo),
  tremolo: () => new Tone.Tremolo(EFFECT_DEFAULTS.tremolo).start(),
  bitcrush: () => new Tone.BitCrusher(EFFECT_DEFAULTS.bitcrush),
  wah: () => new Tone.AutoWah(EFFECT_DEFAULTS.wah),
  pitchShift: () => new Tone.PitchShift(EFFECT_DEFAULTS.pitchShift),
  harmonizer: createHarmonizer,
  freezeReverb: createFreezeReverb
};

/**
 * Creates a harmonizer effect with multiple pitch shifters
 * @returns {Object} Harmonizer effect with custom API
 */
function createHarmonizer() {
  // Create a harmonizer with multiple pitch shifters
  const harmonizer = new Tone.Gain();
  const registry = new DisposalRegistry('harmonizer');

  // Create multiple pitch shifters for different harmony voices
  const voices = [];
  const maxVoices = HARMONIZER_MAX_VOICES; // Support up to 4 harmony voices

  for (let i = 0; i < maxVoices; i++) {
    const voice = {
      pitchShifter: new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
        wet: 1.0
      }),
      gain: new Tone.Gain(HARMONIZER_DEFAULT_VOICE_LEVEL) // Individual voice level control
    };

    // Chain: input -> pitch shifter -> gain -> output
    voice.pitchShifter.connect(voice.gain);
    voices.push(voice);
    
    // Register components for disposal
    registry.register(voice.pitchShifter);
    registry.register(voice.gain);
  }

  // Dry signal path
  const dryGain = new Tone.Gain(1.0);
  registry.register(dryGain);

  // Mix control
  const wetGain = new Tone.Gain(0.5);
  const outputGain = new Tone.Gain(1.0);
  registry.register(wetGain);
  registry.register(outputGain);

  // Connect dry path
  harmonizer.connect(dryGain);
  dryGain.connect(outputGain);

  // Connect wet path (harmonies)
  voices.forEach(voice => {
    harmonizer.connect(voice.pitchShifter);
    voice.gain.connect(wetGain);
  });
  wetGain.connect(outputGain);

  // API for controlling the harmonizer
  harmonizer.setIntervals = function(intervals) {
    // intervals is an array like [3, 5, 12] for 3rd, 5th, octave
    intervals.forEach((interval, index) => {
      if (index < voices.length) {
        voices[index].pitchShifter.pitch = interval;
        voices[index].gain.gain.value = interval !== 0 ? HARMONIZER_DEFAULT_VOICE_LEVEL : 0;
      }
    });

    // Mute unused voices
    for (let i = intervals.length; i < voices.length; i++) {
      voices[i].gain.gain.value = 0;
    }
  };

  harmonizer.setVoiceLevel = function(voiceIndex, level) {
    if (voiceIndex >= 0 && voiceIndex < voices.length) {
      voices[voiceIndex].gain.gain.value = level;
    }
  };

  harmonizer.setMix = function(mix) {
    // mix: 0 = dry only, 1 = wet only
    dryGain.gain.value = 1 - mix;
    wetGain.gain.value = mix;
  };

  // Preset intervals
  harmonizer.presets = HARMONIZER_PRESETS;

  harmonizer.applyPreset = function(presetName) {
    const preset = this.presets[presetName];
    if (preset) {
      this.setIntervals(preset);
    }
  };

  // Return the output
  harmonizer.output = outputGain;

  // Override connect to use output
  harmonizer.connect = function(destination) {
    return outputGain.connect(destination);
  };

  // Add dispose method
  harmonizer.dispose = function() {
    registry.dispose();
  };

  return harmonizer;
}

/**
 * Creates a freeze reverb effect with infinite sustain capability
 * @returns {Object} Freeze reverb effect with custom API
 */
function createFreezeReverb() {
  // Create a freeze reverb with infinite sustain capability
  const registry = new DisposalRegistry('freezeReverb');
  
  // Use Freeverb which doesn't require async initialization
  const reverb = new Tone.Freeverb(EFFECT_DEFAULTS.freezeReverb);
  registry.register(reverb);

  // Add feedback delay for infinite sustain
  const feedbackDelay = new Tone.FeedbackDelay(EFFECT_DEFAULTS.freezeReverb.feedbackDelay);
  registry.register(feedbackDelay);

  // Add modulation for tail movement
  const modulation = new Tone.Chorus(EFFECT_DEFAULTS.freezeReverb.modulation);
  registry.register(modulation);

  // Create custom freeze control
  const freezeControl = {
    _frozen: false,
    _originalFeedback: 0.95,

    freeze: function(enable) {
      this._frozen = enable;
      if (enable) {
        feedbackDelay.feedback.value = FREEZE_REVERB_CONFIG.frozen.feedback;
        reverb.roomSize.value = FREEZE_REVERB_CONFIG.frozen.roomSize;
      } else {
        feedbackDelay.feedback.value = FREEZE_REVERB_CONFIG.unfrozen.feedback;
        reverb.roomSize.value = FREEZE_REVERB_CONFIG.unfrozen.roomSize;
      }
    },

    get frozen() {
      return this._frozen;
    }
  };

  // Chain the effects
  const chain = new Tone.Gain();
  registry.register(chain);
  chain.chain(reverb, feedbackDelay, modulation);

  // Attach freeze control to the chain
  chain.freezeControl = freezeControl;
  chain.freeze = (enable) => freezeControl.freeze(enable);

  // Add dispose method
  chain.dispose = function() {
    registry.dispose();
  };

  return chain;
}

/**
 * Checks if an effect type is available
 * @param {string} type - Effect type to check
 * @returns {boolean} True if effect type exists
 */
export function isEffectAvailable(type) {
  return type in availableEffects;
}

/**
 * Gets list of all available effect types
 * @returns {string[]} Array of effect type names
 */
export function getAvailableEffectTypes() {
  return Object.keys(availableEffects);
}