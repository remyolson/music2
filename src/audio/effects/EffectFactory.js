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
 * Helper function to create effects safely with AudioWorklet error handling
 * @param {Function} createEffect - Function to create the primary effect
 * @param {Function} createFallback - Function to create fallback effect
 * @param {string} effectName - Name of the effect for logging
 * @returns {Object} The created effect (primary or fallback)
 */
function createEffectSafely(createEffect, createFallback, effectName) {
  try {
    const effect = createEffect();
    
    // For effects that might have async AudioWorklet loading, wrap in a promise-like error handler
    if (effect && typeof effect.toDestination === 'function') {
      // This is a Tone.js effect, add error event listener if possible
      if (effect.context && effect.context.onerror) {
        const originalOnError = effect.context.onerror;
        effect.context.onerror = (error) => {
          console.warn(`Late ${effectName} error caught, effect might be unstable:`, error);
          originalOnError?.call(effect.context, error);
        };
      }
    }
    
    return effect;
  } catch (error) {
    // Handle AudioWorklet registration errors
    if (error.message.includes('already registered') || 
        error.message.includes('AudioWorkletProcessor') ||
        error.message.includes('registerProcessor') ||
        error.name === 'InvalidStateError' ||
        error.name === 'NotSupportedError') {
      console.warn(`${effectName} AudioWorklet registration failed, using fallback:`, error.message);
      return createFallback();
    }
    
    // Handle other errors (missing audio context, etc.)
    if (error.message.includes('AudioContext') || error.message.includes('audio')) {
      console.warn(`${effectName} audio error, using fallback:`, error.message);
      return createFallback();
    }
    
    // Unexpected errors - still provide fallback but log more details
    console.error(`Unexpected error creating ${effectName}, using fallback:`, error);
    return createFallback();
  }
}

/**
 * Available effect factories
 */
export const availableEffects = {
  reverb: () => new Tone.Freeverb(EFFECT_DEFAULTS.reverb),
  
  delay: () => createEffectSafely(
    () => new Tone.FeedbackDelay(EFFECT_DEFAULTS.delay),
    () => new Tone.Delay(EFFECT_DEFAULTS.delay.delayTime),
    'FeedbackDelay'
  ),
  
  distortion: () => new Tone.Distortion(EFFECT_DEFAULTS.distortion),
  chorus: () => new Tone.Chorus(EFFECT_DEFAULTS.chorus),
  phaser: () => new Tone.Phaser(EFFECT_DEFAULTS.phaser),
  filter: () => new Tone.AutoFilter(EFFECT_DEFAULTS.filter).start(),
  
  echo: () => createEffectSafely(
    () => new Tone.FeedbackDelay(EFFECT_DEFAULTS.echo),
    () => new Tone.Delay(EFFECT_DEFAULTS.echo.delayTime),
    'Echo'
  ),
  
  tremolo: () => new Tone.Tremolo(EFFECT_DEFAULTS.tremolo).start(),
  
  bitcrush: (() => {
    let hasWarnedDev = false; // Only warn once in development
    
    return () => {
      // Temporary workaround: disable BitCrusher in development due to AudioWorklet conflicts
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        if (!hasWarnedDev) {
          console.warn('BitCrusher disabled in development environment, using Distortion fallback');
          hasWarnedDev = true;
        }
        return new Tone.Distortion(0.8);
      }
      
      return createEffectSafely(
        () => new Tone.BitCrusher(EFFECT_DEFAULTS.bitcrush),
        () => new Tone.Distortion(0.8),
        'BitCrusher'
      );
    };
  })(),
  
  wah: () => new Tone.AutoWah(EFFECT_DEFAULTS.wah),
  
  pitchShift: () => createEffectSafely(
    () => new Tone.PitchShift(EFFECT_DEFAULTS.pitchShift),
    () => new Tone.Filter(400, 'highpass'),
    'PitchShift'
  ),
  
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
    const pitchShifter = createEffectSafely(
      () => new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
        wet: 1.0
      }),
      () => new Tone.Filter(440, 'bandpass'), // Basic filter as fallback
      `Harmonizer Voice ${i} PitchShift`
    );

    const voice = {
      pitchShifter,
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
        // Check if this is a real PitchShift or a fallback filter
        if (voices[index].pitchShifter.pitch !== undefined) {
          voices[index].pitchShifter.pitch = interval;
        } else if (voices[index].pitchShifter.frequency) {
          // For filter fallback, adjust frequency based on interval
          const baseFreq = 440;
          const newFreq = baseFreq * Math.pow(2, interval / 12);
          voices[index].pitchShifter.frequency.value = Math.min(Math.max(newFreq, 20), 20000);
        }
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

  // Add feedback delay for infinite sustain (with error handling for worklet registration)
  const feedbackDelay = createEffectSafely(
    () => new Tone.FeedbackDelay(EFFECT_DEFAULTS.freezeReverb.feedbackDelay),
    () => new Tone.Delay(EFFECT_DEFAULTS.freezeReverb.feedbackDelay.delayTime),
    'FreezeReverb FeedbackDelay'
  );
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