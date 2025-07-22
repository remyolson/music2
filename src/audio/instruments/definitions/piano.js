/**
 * Piano Instrument Definition
 */
import * as Tone from 'tone';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

export default {
  type: 'piano',
  name: 'Piano',
  category: 'keyboard',
  polyphonic: true,
  
  /**
   * Create a piano instrument
   * @param {Object} settings - Instrument settings
   * @returns {Tone.PolySynth} The created instrument
   */
  create(settings = {}) {
    const envelope = settings?.envelope || {};
    const noteTransition = settings?.noteTransition || 'normal';
    const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
    
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fmsine' },
      envelope: {
        attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
        decay: envelope.decay ?? 0.4,
        sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.6,
        release: envelope.release ?? transitionSettings.release ?? 1.5
      }
    });
  },
  
  /**
   * Default settings for this instrument
   */
  defaults: {
    volume: -8,
    maxPolyphony: 8,
    envelope: {
      attack: 0.01,
      decay: 0.4,
      sustain: 0.6,
      release: 1.5
    }
  },
  
  /**
   * Recommended effects for this instrument
   */
  recommendedEffects: [
    { type: 'reverb', wet: 0.3, roomSize: 0.6 }
  ]
};