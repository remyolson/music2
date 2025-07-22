/**
 * Synth Lead Instrument Definition
 */
import * as Tone from 'tone';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

export default {
  type: 'synth_lead',
  name: 'Synth Lead',
  category: 'synth',
  
  /**
   * Create a synth lead instrument
   * @param {Object} settings - Instrument settings
   * @returns {Tone.Synth} The created instrument
   */
  create(settings = {}) {
    const envelope = settings?.envelope || {};
    const noteTransition = settings?.noteTransition || 'normal';
    const portamentoTime = settings?.portamento || 0;
    const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
    
    return new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: envelope.attack ?? transitionSettings.attack ?? 0.02,
        decay: envelope.decay ?? 0.3,
        sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.7,
        release: envelope.release ?? transitionSettings.release ?? 1.0
      },
      portamento: portamentoTime
    });
  },
  
  /**
   * Default settings for this instrument
   */
  defaults: {
    volume: -12,
    oscillator: { type: 'sawtooth' },
    envelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.7,
      release: 1.0
    }
  },
  
  /**
   * Recommended effects for this instrument
   */
  recommendedEffects: [
    { type: 'reverb', wet: 0.2 },
    { type: 'delay', wet: 0.1, delayTime: 0.25 }
  ]
};