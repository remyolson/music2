/**
 * Drums Kit Instrument Definition
 */
import * as Tone from 'tone';
import { DRUM_PITCHES, DRUM_DURATIONS } from '../../constants/index.js';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

export default {
  type: 'drums_kit',
  name: 'Acoustic Drums',
  category: 'drums',
  isDrums: true,
  
  /**
   * Create a drums kit instrument
   * @param {Object} settings - Instrument settings
   * @returns {Object} Drum kit with multiple components
   */
  create(settings = {}) {
    const registry = new DisposalRegistry('drums_kit');
    
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4
      }
    });
    registry.register(kick);
    
    const snare = new Tone.Synth({
      oscillator: { type: 'noise', noise: { type: 'white' } },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.1
      }
    });
    registry.register(snare);
    
    const hihat = new Tone.Synth({
      oscillator: { type: 'noise', noise: { type: 'white' } },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.01
      }
    });
    registry.register(hihat);
    
    const crash = new Tone.Synth({
      oscillator: { type: 'noise', noise: { type: 'white' } },
      envelope: {
        attack: 0.001,
        decay: 1,
        sustain: 0.1,
        release: 3
      }
    });
    registry.register(crash);
    
    const tom = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 5,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.1,
        release: 0.5
      }
    });
    registry.register(tom);
    
    return {
      kick,
      snare,
      hihat,
      crash,
      tom,
      dispose: () => registry.dispose()
    };
  },
  
  /**
   * Default drum mappings
   */
  drumMap: {
    kick: { pitch: DRUM_PITCHES.kick, duration: DRUM_DURATIONS.kick },
    snare: { pitch: DRUM_PITCHES.snare, duration: DRUM_DURATIONS.snare },
    hihat: { pitch: DRUM_PITCHES.hihat, duration: DRUM_DURATIONS.hihat },
    crash: { pitch: DRUM_PITCHES.crash, duration: DRUM_DURATIONS.crash },
    tom: { pitch: DRUM_PITCHES.tom, duration: DRUM_DURATIONS.tom }
  },
  
  /**
   * Recommended effects for drums
   */
  recommendedEffects: [
    { type: 'reverb', wet: 0.1, roomSize: 0.3 },
    { type: 'compressor', threshold: -12, ratio: 4 }
  ]
};