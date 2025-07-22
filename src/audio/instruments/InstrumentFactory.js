/**
 * Instrument Factory - Creates and manages musical instruments
 */
import * as Tone from 'tone';
import {
  INSTRUMENT_DEFAULTS,
  DRUM_PITCHES,
  DRUM_DURATIONS,
  INSTRUMENT_GAIN_FACTOR
} from '../constants/index.js';
import { TRANSITION_PRESETS } from '../constants/limits.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { availableEffects } from '../effects/EffectFactory.js';
import { 
  createInstrumentLazy, 
  preloadCommonInstruments,
  getCacheStats 
} from './LazyInstrumentLoader.js';

// Import natural instrument definitions
import naturalPiano from './definitions/naturalPiano.js';
import { violin, viola, cello, doubleBass, stringSection } from './definitions/orchestralStrings.js';
import { flute, clarinet, oboe, bassoon, saxophone, woodwindSection } from './definitions/orchestralWinds.js';
import { trumpet, frenchHorn, trombone, tuba, brassSection } from './definitions/orchestralBrass.js';

/**
 * Creates an instrument based on type and settings
 * @param {string} type - Instrument type
 * @param {Object} settings - Instrument settings
 * @returns {Promise<Tone.Instrument>} The created instrument
 */
export async function createInstrument(type, settings = {}) {
  const envelope = settings?.envelope || {};
  const noteTransition = settings?.noteTransition || 'normal';
  const portamentoTime = settings?.portamento || 0;

  // Apply note transition presets - enhanced for smoother sound
  const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};

  switch (type) {
    // Natural Instruments with Sample Support
    case 'natural_piano':
      return await naturalPiano.create(settings);

    case 'orchestral_violin':
      return await violin.create(settings);
      
    case 'orchestral_viola':
      return await viola.create(settings);
      
    case 'orchestral_cello':
      return await cello.create(settings);
      
    case 'orchestral_double_bass':
      return await doubleBass.create(settings);

    case 'orchestral_flute':
      return await flute.create(settings);
      
    case 'orchestral_clarinet':
      return await clarinet.create(settings);
      
    case 'orchestral_oboe':
      return await oboe.create(settings);
      
    case 'orchestral_bassoon':
      return await bassoon.create(settings);
      
    case 'orchestral_saxophone':
      return await saxophone.create(settings);

    case 'orchestral_trumpet':
      return await trumpet.create(settings);
      
    case 'orchestral_french_horn':
      return await frenchHorn.create(settings);
      
    case 'orchestral_trombone':
      return await trombone.create(settings);
      
    case 'orchestral_tuba':
      return await tuba.create(settings);

    case 'string_section':
      return await stringSection.create(settings);
      
    case 'woodwind_section':
      return await woodwindSection.create(settings);
      
    case 'brass_section':
      return await brassSection.create(settings);

    // Original Synthesized Instruments
    case 'synth_lead':
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

    case 'synth_bass':
      return new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.005,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.4,
          release: envelope.release ?? transitionSettings.release ?? 0.7
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5,
          baseFrequency: 200,
          octaves: 2.5
        },
        portamento: portamentoTime
      });

    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fmsine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 0.4,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.6,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        }
      });

    case 'strings': {
      const registry = new DisposalRegistry('strings');
      const stringSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.8,
        modulationIndex: 5,
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.4,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.35,
          decay: 0.3,
          sustain: 0.7,
          release: 1.5
        }
      });
      // Add a lowpass filter to remove high frequency buzz
      const stringFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 2000,
        rolloff: -24
      });
      stringSynth.connect(stringFilter);
      registry.register(stringSynth);
      registry.register(stringFilter);
      
      // Add dispose method to the returned filter
      stringFilter.dispose = function() {
        registry.dispose();
      };
      
      return stringFilter;
    }

    case 'brass':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.02,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.4
        },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.5,
          release: 0.4,
          baseFrequency: 300,
          octaves: 3
        },
        portamento: portamentoTime
      });

    case 'drums_kit': {
      // Create multiple instances for polyphony
      const drumKit = {
        kick: new Tone.PolySynth(Tone.MembraneSynth, {
          maxPolyphony: 8,
          voice: {
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
          }
        }),
        // Create a simple synth for snare
        snare: new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.1
          }
        })
      };
      return drumKit;
    }

    case 'electric_guitar':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2,
          baseFrequency: 400,
          octaves: 2.5
        },
        portamento: portamentoTime
      });

    case 'organ':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.2
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.3,
          release: 0.5
        }
      });

    case 'flute':
      return new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.1,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.8,
          release: 0.5,
          baseFrequency: 800,
          octaves: 2
        },
        portamento: portamentoTime
      });

    case 'harp':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 2.0,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        }
      });

    case 'drums_electronic':
      return {
        kick: new Tone.PolySynth(Tone.MembraneSynth, {
          maxPolyphony: 8,
          voice: {
            pitchDecay: 0.08,
            octaves: 6,
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.001,
              decay: 0.3,
              sustain: 0.0,
              release: 0.5,
              attackCurve: 'exponential'
            }
          }
        }),
        // Use FM synth for electronic snare
        snare: new Tone.FMSynth({
          harmonicity: 0.5,
          modulationIndex: 10,
          oscillator: { type: 'square' },
          envelope: {
            attack: 0.001,
            decay: 0.06,
            sustain: 0,
            release: 0.07
          },
          modulation: { type: 'square' },
          modulationEnvelope: {
            attack: 0.001,
            decay: 0.06,
            sustain: 0,
            release: 0.07
          }
        })
      };

    case 'marimba':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 1.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.002,
          decay: 0.2,
          sustain: 0.0,
          release: 0.2
        }
      });

    case 'trumpet':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.7,
          release: 0.3,
          baseFrequency: 600,
          octaves: 3.5
        },
        portamento: portamentoTime
      });

    case 'violin':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.1,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 1.0
        }
      });

    case 'saxophone':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.03,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.03,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5,
          baseFrequency: 500,
          octaves: 3
        },
        portamento: portamentoTime
      });

    case 'pad_synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.8,
          decay: envelope.decay ?? 0.5,
          sustain: envelope.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        }
      });

    case 'celesta':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 15,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 1.5,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.001,
          decay: 0.5,
          sustain: 0.0,
          release: 0.5
        }
      });

    case 'vibraphone': {
      const registry = new DisposalRegistry('vibraphone');
      const vibeSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 2.0,
          sustain: envelope.sustain ?? 0.2,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.5,
          sustain: 0.2,
          release: 0.5
        }
      });
      // Add vibrato for authentic vibraphone sound
      const vibrato = new Tone.Vibrato({
        frequency: 5,
        depth: 0.1
      });
      vibeSynth.connect(vibrato);
      registry.register(vibeSynth);
      registry.register(vibrato);
      
      // Add dispose method to the returned vibrato
      vibrato.dispose = function() {
        registry.dispose();
      };
      
      return vibrato;
    }

    case 'xylophone':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        }
      });

    case 'clarinet':
      return new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.2,
          sustain: 0.6,
          release: 0.3,
          baseFrequency: 800,
          octaves: 1.5
        },
        portamento: portamentoTime
      });

    case 'tuba':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5,
          baseFrequency: 150,
          octaves: 2
        },
        portamento: portamentoTime
      });

    case 'choir': {
      const choirSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 5, spread: 40 },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.4,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        }
      });
      // Add filter for "ah" vowel sound
      const choirFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: 700,
        Q: 5
      });
      choirSynth.connect(choirFilter);
      return choirFilter;
    }

    case 'banjo':
      return new Tone.PluckSynth({
        attackNoise: 3,
        dampening: 3500,
        resonance: 0.95,
        release: envelope.release ?? transitionSettings.release ?? 0.5
      });

    case 'electric_piano':
      return new Tone.PolySynth(Tone.DuoSynth, {
        vibratoAmount: 0.5,
        vibratoRate: 5,
        harmonicity: 1.5,
        voice0: {
          volume: -10,
          oscillator: { type: 'sine' },
          envelope: {
            attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
            decay: envelope.decay ?? 0.3,
            sustain: envelope.sustain ?? 0.5,
            release: envelope.release ?? transitionSettings.release ?? 1.0
          }
        },
        voice1: {
          volume: -20,
          oscillator: { type: 'sine' },
          envelope: {
            attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
            decay: envelope.decay ?? 0.3,
            sustain: envelope.sustain ?? 0.5,
            release: envelope.release ?? transitionSettings.release ?? 1.0
          }
        }
      });

    case 'granular_pad': {
      // Create a custom granular pad synthesizer with evolving textures
      const registry = new DisposalRegistry('granularPad');
      const grainSize = settings?.grainSize || 0.1;
      const grainDensity = settings?.grainDensity || 10;
      const shimmer = settings?.shimmer || 0.3;

      // Using multiple detuned voices to create granular-like texture
      const granularPad = new Tone.PolySynth({
        maxPolyphony: 8,
        voice: Tone.FatOscillator,
        options: {
          oscillator: {
            type: 'sawtooth',
            count: 3,
            spread: 40
          },
          envelope: {
            attack: envelope.attack ?? 2.0,  // Long attack for evolving sound
            decay: envelope.decay ?? 1.0,
            sustain: envelope.sustain ?? 0.8,
            release: envelope.release ?? 4.0  // Long release for ambient tails
          }
        }
      });

      // Add shimmer effect with chorus and slight pitch modulation
      const shimmerChorus = new Tone.Chorus({
        frequency: 2 * shimmer,
        delayTime: 5,
        depth: 0.5,
        wet: shimmer
      });

      // Add subtle tremolo for movement
      const tremolo = new Tone.Tremolo({
        frequency: grainDensity / 4,
        depth: 0.2,
        wet: 0.3
      }).start();

      // Add filter for warmth
      const warmthFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 3000,
        rolloff: -12
      });

      // Create feedback delay for spaciousness
      const spatialDelay = new Tone.FeedbackDelay({
        delayTime: grainSize,
        feedback: 0.4,
        wet: 0.3
      });

      // Connect the chain
      granularPad.chain(shimmerChorus, tremolo, warmthFilter, spatialDelay);
      
      // Register all components
      registry.register(granularPad);
      registry.register(shimmerChorus);
      registry.register(tremolo);
      registry.register(warmthFilter);
      registry.register(spatialDelay);
      
      // Add dispose method to the returned delay
      spatialDelay.dispose = function() {
        registry.dispose();
      };

      return spatialDelay;
    }

    case 'vocoder_synth': {
      // Create a vocoder-style synth with formant filtering and pitch correction
      const vocoderCarrier = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? 0.5
        }
      });

      // Create 5-band formant filter bank
      const formantFrequencies = [700, 1220, 2600, 3200, 4400]; // Formant frequencies
      const formantQ = [12, 10, 8, 8, 6]; // Q values for each formant
      const formantGains = [0, -5, -10, -15, -20]; // Relative gains in dB

      const formantFilters = formantFrequencies.map((freq, i) => {
        const filter = new Tone.Filter({
          type: 'bandpass',
          frequency: freq,
          Q: formantQ[i]
        });
        const gain = new Tone.Gain(Tone.dbToGain(formantGains[i]));
        return { filter, gain };
      });

      // Create parallel filter bank
      const filterMixer = new Tone.Gain(0.3); // Reduce overall level to prevent clipping

      // Connect carrier to all formant filters in parallel
      formantFilters.forEach(({ filter, gain }) => {
        vocoderCarrier.connect(filter);
        filter.connect(gain);
        gain.connect(filterMixer);
      });

      // Add gentle pitch correction using AutoFilter modulation
      const pitchModulation = new Tone.AutoFilter({
        frequency: 4,
        depth: 0.1,
        baseFrequency: 1000,
        octaves: 2,
        wet: 0.2
      }).start();

      // Add smooth portamento for voice-like glides
      vocoderCarrier.set({ portamento: portamentoTime || 0.05 });

      // Connect the chain
      filterMixer.connect(pitchModulation);

      // Store formant control for dynamic adjustment
      pitchModulation.formantControl = (formantShift) => {
        // Shift formant frequencies based on formant parameter (-5 to +5)
        const shiftFactor = Math.pow(2, formantShift / 12); // Convert to frequency ratio
        formantFilters.forEach(({ filter }, i) => {
          filter.frequency.value = formantFrequencies[i] * shiftFactor;
        });
      };

      return pitchModulation;
    }

    default:
      return new Tone.Synth();
  }
}

/**
 * Creates an instrument with effect chain applied
 * @param {Object} track - Track configuration
 * @param {Function} getMasterBus - Function to get the master bus
 * @returns {Object} Object containing instrument and effect chain
 */
export async function createInstrumentWithEffects(track, getMasterBus) {
  const instrument = createInstrument(track.instrument, track.settings);
  const effectChain = [];

  // Add gain stage to reduce individual instrument volumes
  const instrumentGain = new Tone.Gain(INSTRUMENT_GAIN_FACTOR);
  effectChain.push(instrumentGain);

  // Dynamically import effects to avoid circular dependency
  const { availableEffects } = await import('../effects/EffectFactory.js');

  // Apply global effects from track settings first
  if (track.settings?.globalEffects) {
    track.settings.globalEffects.forEach(globalEffect => {
      if (availableEffects[globalEffect.type]) {
        const effect = availableEffects[globalEffect.type]();
        if (effect.wet) {
          effect.wet.value = globalEffect.level ?? 0.5;
        }
        effectChain.push(effect);
      }
    });
  }

  // Collect unique note-level effects (for backward compatibility)
  const trackEffects = new Set();
  track.notes.forEach(note => {
    if (note.effect && availableEffects[note.effect]) {
      trackEffects.add(note.effect);
    }
  });

  trackEffects.forEach(effectName => {
    // Skip if already added as global effect
    const isGlobal = track.settings?.globalEffects?.some(e => e.type === effectName);
    if (!isGlobal) {
      const effect = availableEffects[effectName]();
      effectChain.push(effect);
    }
  });

  if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
    if (effectChain.length > 0) {
      instrument.kick.chain(...effectChain, getMasterBus());
      instrument.snare.chain(...effectChain, getMasterBus());
    } else {
      instrument.kick.connect(getMasterBus());
      instrument.snare.connect(getMasterBus());
    }
  } else {
    if (effectChain.length > 0) {
      instrument.chain(...effectChain, getMasterBus());
    } else {
      instrument.connect(getMasterBus());
    }
  }

  return { instrument, effectChain };
}

/**
 * Gets default settings for an instrument type
 * @param {string} type - Instrument type
 * @returns {Object} Default settings
 */
export function getInstrumentDefaults(type) {
  return INSTRUMENT_DEFAULTS[type] || {};
}

/**
 * Gets drum-specific constants
 * @returns {Object} Drum pitches and durations
 */
export function getDrumConstants() {
  return {
    pitches: DRUM_PITCHES,
    durations: DRUM_DURATIONS
  };
}

/**
 * Creates an instrument with lazy loading support
 * @param {string} type - Instrument type
 * @param {Object} settings - Instrument settings
 * @returns {Promise<Tone.Instrument>} The created instrument
 */
export async function createInstrumentAsync(type, settings = {}) {
  return createInstrumentLazy(type, settings);
}

/**
 * Creates an instrument with effects using lazy loading
 * @param {Object} track - Track configuration
 * @param {Function} getMasterBus - Function to get the master bus
 * @returns {Promise<Object>} Instrument and effect chain
 */
export async function createInstrumentWithEffectsAsync(track, getMasterBus) {
  // Create instrument with lazy loading
  const instrument = await createInstrumentAsync(track.instrument, track.settings);
  
  // Rest of the logic is the same as createInstrumentWithEffects
  const effectChain = [];
  
  // Apply gain factor
  if (instrument.volume) {
    const gainAdjustment = INSTRUMENT_GAIN_FACTOR[track.instrument];
    if (gainAdjustment !== undefined) {
      instrument.volume.value = gainAdjustment;
    }
  }
  
  // Create effect chain
  if (track.settings?.globalEffects) {
    track.settings.globalEffects.forEach(effectConfig => {
      if (availableEffects[effectConfig.type]) {
        const effect = availableEffects[effectConfig.type]();
        if (effect.wet && effectConfig.level !== undefined) {
          effect.wet.value = effectConfig.level;
        }
        effectChain.push(effect);
      }
    });
  }
  
  // Add track-specific effects
  const trackEffects = track.effects || [];
  trackEffects.forEach(effectName => {
    const isGlobal = track.settings?.globalEffects?.some(e => e.type === effectName);
    if (!isGlobal) {
      const effect = availableEffects[effectName]();
      effectChain.push(effect);
    }
  });
  
  // Connect routing
  if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
    if (effectChain.length > 0) {
      instrument.kick.chain(...effectChain, getMasterBus());
      instrument.snare.chain(...effectChain, getMasterBus());
    } else {
      instrument.kick.connect(getMasterBus());
      instrument.snare.connect(getMasterBus());
    }
  } else {
    if (effectChain.length > 0) {
      instrument.chain(...effectChain, getMasterBus());
    } else {
      instrument.connect(getMasterBus());
    }
  }
  
  return { instrument, effectChain };
}

/**
 * Preload commonly used instruments for better performance
 * @returns {Promise<void>}
 */
export async function preloadInstruments() {
  return preloadCommonInstruments();
}

/**
 * Get instrument loader cache statistics
 * @returns {Object} Cache statistics
 */
export function getInstrumentCacheStats() {
  return getCacheStats();
}