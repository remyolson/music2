/**
 * Orchestral String Instruments with Sample Support
 * Violin, Viola, Cello, Double Bass with advanced articulations
 */
import * as Tone from 'tone';
import { sampleLibrary } from '../../samples/SampleLibrary.js';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

// String instrument configurations
const STRING_CONFIGS = {
  violin: {
    name: 'Violin',
    range: { min: 'G3', max: 'E7' },
    openStrings: ['G3', 'D4', 'A4', 'E5'],
    defaultArticulation: 'arco',
    transposition: 0
  },
  viola: {
    name: 'Viola',
    range: { min: 'C3', max: 'E6' },
    openStrings: ['C3', 'G3', 'D4', 'A4'],
    defaultArticulation: 'arco',
    transposition: 0
  },
  cello: {
    name: 'Cello',
    range: { min: 'C2', max: 'C6' },
    openStrings: ['C2', 'G2', 'D3', 'A3'],
    defaultArticulation: 'arco',
    transposition: -12
  },
  double_bass: {
    name: 'Double Bass',
    range: { min: 'E1', max: 'G4' },
    openStrings: ['E1', 'A1', 'D2', 'G2'],
    defaultArticulation: 'arco',
    transposition: -12
  }
};

// Available articulations for all string instruments
const ARTICULATIONS = {
  arco: { name: 'Arco (Bowed)', attack: 0.05, release: 0.3, curve: 'linear' },
  pizzicato: { name: 'Pizzicato (Plucked)', attack: 0.01, release: 0.8, curve: 'exponential' },
  tremolo: { name: 'Tremolo', attack: 0.02, release: 0.2, curve: 'linear' },
  staccato: { name: 'Staccato', attack: 0.01, release: 0.1, curve: 'exponential' },
  legato: { name: 'Legato', attack: 0.08, release: 0.5, curve: 'linear' },
  sul_ponticello: { name: 'Sul Ponticello', attack: 0.03, release: 0.2, curve: 'linear' },
  harmonics: { name: 'Natural Harmonics', attack: 0.02, release: 1.0, curve: 'exponential' }
};

/**
 * Create a string instrument definition
 * @param {string} instrumentType - Type of string instrument
 * @returns {Object} Instrument definition
 */
function createStringInstrument(instrumentType) {
  const config = STRING_CONFIGS[instrumentType];
  if (!config) {
    throw new Error(`Unknown string instrument: ${instrumentType}`);
  }

  return {
    type: `orchestral_${instrumentType}`,
    name: config.name,
    category: 'strings',
    polyphonic: true,
    sampleBased: true,
    
    /**
     * Create the string instrument
     * @param {Object} settings - Instrument settings
     * @returns {Object} Enhanced string instrument
     */
    async create(settings = {}) {
      const registry = new DisposalRegistry(`OrchestralStrings_${instrumentType}`);
      
      try {
        // Attempt to load sample-based strings
        const orchestralStrings = await sampleLibrary.createOrchestralStrings(instrumentType);
        return this._createSampleBasedStrings(orchestralStrings, settings, registry, config);
      } catch (error) {
        console.warn(`Falling back to synthesized ${instrumentType}:`, error);
        return this._createSynthesizedStrings(settings, registry, config);
      }
    },

    /**
     * Create enhanced sample-based string instrument
     * @private
     */
    _createSampleBasedStrings(orchestralStrings, settings, registry, config) {
      // Create vibrato LFO
      const vibratoLFO = registry.register(new Tone.LFO(5, 0));
      const vibratoGain = registry.register(new Tone.Gain(0));
      vibratoLFO.connect(vibratoGain);
      vibratoLFO.start();

      // Create bow noise simulation
      const bowNoise = registry.register(new Tone.Noise('brown'));
      const bowEnvelope = registry.register(new Tone.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 0.1,
        release: 0.3
      }));
      const bowFilter = registry.register(new Tone.Filter(800, 'highpass'));
      const bowGain = registry.register(new Tone.Gain(0.03));
      
      bowNoise.chain(bowEnvelope, bowFilter, bowGain, Tone.Destination);

      // Create string resonance simulation
      const resonanceGain = registry.register(new Tone.Gain(0.1));
      const resonanceDelay = registry.register(new Tone.FeedbackDelay(0.03, 0.15));
      const resonanceFilter = registry.register(new Tone.Filter(2000, 'bandpass'));
      
      resonanceGain.chain(resonanceFilter, resonanceDelay, Tone.Destination);

      return {
        type: `orchestral_${instrumentType}`,
        orchestralStrings,
        registry,
        config,
        
        // Performance state
        currentArticulation: settings.articulation || config.defaultArticulation,
        vibratoRate: 5,
        vibratoDepth: 0.1,
        bowPressure: 0.5,
        stringTension: 1.0,
        
        // Enhanced playing methods
        play: (notes, velocity = 100, time = '+0', duration = '4n') => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          const articulationSettings = ARTICULATIONS[this.currentArticulation];
          
          // Trigger bow noise for arco articulations
          if (this.currentArticulation === 'arco' || this.currentArticulation === 'legato') {
            bowEnvelope.triggerAttackRelease(duration, time);
          }
          
          // Add string resonance
          resonanceGain.gain.setValueAtTime(velocity / 1000, time);
          
          // Play with current articulation
          for (const note of noteArray) {
            orchestralStrings.setArticulation(this.currentArticulation);
            orchestralStrings.play(note, velocity, time, duration);
            
            // Add harmonic resonance for open strings
            if (this._isOpenString(note)) {
              this._addOpenStringResonance(note, velocity, time);
            }
          }
        },

        triggerAttack: (notes, time = '+0', velocity = 100) => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          const articulationSettings = ARTICULATIONS[this.currentArticulation];
          
          if (this.currentArticulation === 'arco' || this.currentArticulation === 'legato') {
            bowEnvelope.triggerAttack(time);
          }
          
          for (const note of noteArray) {
            orchestralStrings.setArticulation(this.currentArticulation);
            orchestralStrings.sampler.triggerAttack(note, time, velocity / 127);
          }
        },

        triggerRelease: (notes, time = '+0') => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          
          for (const note of noteArray) {
            orchestralStrings.sampler.triggerRelease(note, time);
          }
          
          bowEnvelope.triggerRelease(time);
        },

        triggerAttackRelease: (notes, duration, time = '+0', velocity = 100) => {
          this.play(notes, velocity, time, duration);
        },

        // Articulation control
        setArticulation: (articulation) => {
          if (ARTICULATIONS[articulation]) {
            this.currentArticulation = articulation;
            orchestralStrings.setArticulation(articulation);
          }
        },

        getAvailableArticulations: () => Object.keys(ARTICULATIONS),

        // Expression controls
        setVibrato: (rate = 5, depth = 0.1) => {
          this.vibratoRate = rate;
          this.vibratoDepth = depth;
          vibratoLFO.frequency.value = rate;
          vibratoGain.gain.value = depth;
          
          // Connect vibrato to orchestral strings if available
          if (orchestralStrings.addVibrato) {
            orchestralStrings.addVibrato(rate, depth);
          }
        },

        setBowPressure: (pressure) => {
          this.bowPressure = Math.max(0, Math.min(1, pressure));
          bowGain.gain.value = this.bowPressure * 0.05;
        },

        setStringTension: (tension) => {
          this.stringTension = Math.max(0.5, Math.min(2, tension));
          // Adjust resonance based on string tension
          resonanceDelay.delayTime.value = 0.03 / this.stringTension;
        },

        // Advanced techniques
        playHarmonics: (fundamentalNote, harmonicNumber = 2, velocity = 80, time = '+0', duration = '2n') => {
          const harmonicNote = Tone.Frequency(fundamentalNote).transpose(12 * Math.log2(harmonicNumber)).toNote();
          
          this.setArticulation('harmonics');
          this.play(harmonicNote, velocity * 0.6, time, duration);
        },

        playGlissando: (startNote, endNote, duration = '1n', time = '+0') => {
          const startFreq = Tone.Frequency(startNote).toFrequency();
          const endFreq = Tone.Frequency(endNote).toFrequency();
          
          // Create a gliding effect
          const glideOsc = registry.register(new Tone.Oscillator(startFreq, 'sawtooth'));
          const glideEnv = registry.register(new Tone.AmplitudeEnvelope({
            attack: 0.05,
            decay: 0,
            sustain: 1,
            release: 0.1
          }));
          
          glideOsc.chain(glideEnv, Tone.Destination);
          glideOsc.frequency.exponentialRampTo(endFreq, duration, time);
          glideEnv.triggerAttackRelease(duration, time);
        },

        // Section ensemble methods
        createSection: (sectionSize = 4, spread = 0.1) => {
          return this._createStringSection(sectionSize, spread, registry);
        },

        // Utility methods
        _isOpenString: (note) => {
          return config.openStrings.includes(note);
        },

        _addOpenStringResonance: (note, velocity, time) => {
          // Add sympathetic resonance for open string notes
          const resonanceNote = Tone.Frequency(note).transpose(-12).toNote();
          resonanceGain.gain.setValueAtTime(velocity / 2000, time);
        },

        _createStringSection: (size, spread, registry) => {
          const sectionPlayers = [];
          
          for (let i = 0; i < size; i++) {
            const detuning = (Math.random() - 0.5) * spread;
            const timing = (Math.random() - 0.5) * 0.02; // Small timing variations
            
            sectionPlayers.push({
              detuning,
              timing,
              play: (notes, velocity, time, duration) => {
                const adjustedTime = time + timing;
                const adjustedNotes = Array.isArray(notes) ? 
                  notes.map(note => Tone.Frequency(note).transpose(detuning * 100).toNote()) :
                  Tone.Frequency(notes).transpose(detuning * 100).toNote();
                
                this.play(adjustedNotes, velocity * (0.9 + Math.random() * 0.2), adjustedTime, duration);
              }
            });
          }
          
          return {
            players: sectionPlayers,
            playUnison: (notes, velocity, time, duration) => {
              sectionPlayers.forEach(player => {
                player.play(notes, velocity, time, duration);
              });
            }
          };
        },

        // Standard Tone.js interface
        chain: (...effects) => {
          orchestralStrings.sampler.chain(...effects);
          return this;
        },

        connect: (destination) => {
          orchestralStrings.sampler.connect(destination);
          return this;
        },

        disconnect: () => {
          orchestralStrings.sampler.disconnect();
          return this;
        },

        toDestination: () => {
          orchestralStrings.sampler.toDestination();
          return this;
        },

        // Information methods
        getConfig: () => config,
        isSampleBased: () => true,

        // Memory management
        dispose: () => {
          orchestralStrings.dispose();
          registry.dispose();
        }
      };
    },

    /**
     * Create fallback synthesized string instrument
     * @private
     */
    _createSynthesizedStrings(settings, registry, config) {
      const envelope = settings?.envelope || {};
      const noteTransition = settings?.noteTransition || 'normal';
      const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
      
      // Enhanced synthesis for realistic string sound
      const synth = registry.register(new Tone.PolySynth(Tone.Synth, {
        oscillator: { 
          type: 'sawtooth',
          partialCount: 8
        },
        filter: {
          frequency: 1200,
          type: 'lowpass',
          rolloff: -24
        },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.08,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 0.8
        },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.4,
          sustain: 0.2,
          release: 1.0,
          baseFrequency: 200,
          octaves: 4
        }
      }));

      // Add chorus for ensemble effect
      const chorus = registry.register(new Tone.Chorus(0.5, 2.5, 0.3));
      synth.chain(chorus, Tone.Destination);

      return {
        type: `orchestral_${instrumentType}`,
        synth,
        registry,
        config,
        currentArticulation: config.defaultArticulation,
        
        // Simplified interface matching sample-based version
        play: (notes, velocity = 100, time = '+0', duration = '4n') => {
          synth.triggerAttackRelease(notes, duration, time, velocity / 127);
        },

        triggerAttack: (notes, time = '+0', velocity = 100) => {
          synth.triggerAttack(notes, time, velocity / 127);
        },

        triggerRelease: (notes, time = '+0') => {
          synth.triggerRelease(notes, time);
        },

        triggerAttackRelease: (notes, duration, time = '+0', velocity = 100) => {
          synth.triggerAttackRelease(notes, duration, time, velocity / 127);
        },

        // Simplified articulation (affects envelope only)
        setArticulation: (articulation) => {
          this.currentArticulation = articulation;
          const settings = ARTICULATIONS[articulation];
          if (settings) {
            // Update synthesis parameters based on articulation
            if (articulation === 'pizzicato') {
              synth.set({ envelope: { attack: 0.01, release: 0.8 } });
            } else if (articulation === 'staccato') {
              synth.set({ envelope: { attack: 0.01, release: 0.1 } });
            }
          }
        },

        getAvailableArticulations: () => Object.keys(ARTICULATIONS),

        // Compatibility methods
        setVibrato: () => {}, // No-op for synthesis
        setBowPressure: () => {},
        setStringTension: () => {},
        playHarmonics: (note, harmonic, velocity, time, duration) => {
          const harmonicNote = Tone.Frequency(note).transpose(12 * Math.log2(harmonic)).toNote();
          this.play(harmonicNote, velocity * 0.6, time, duration);
        },

        chain: (...effects) => chorus.chain(...effects),
        connect: (destination) => chorus.connect(destination),
        disconnect: () => chorus.disconnect(),
        toDestination: () => chorus.toDestination(),
        
        getConfig: () => config,
        isSampleBased: () => false,
        dispose: () => registry.dispose()
      };
    },

    /**
     * Default settings for this string instrument
     */
    defaults: {
      volume: -6,
      maxPolyphony: 8,
      articulation: config.defaultArticulation,
      vibrato: { rate: 5, depth: 0.1 },
      bowPressure: 0.5,
      envelope: ARTICULATIONS[config.defaultArticulation]
    },

    /**
     * Recommended effects for string instruments
     */
    recommendedEffects: [
      { type: 'reverb', wet: 0.4, roomSize: 0.8, decay: 2.0 },
      { type: 'eq', low: 0.9, mid: 1.1, high: 1.2 },
      { type: 'chorus', rate: 0.5, depth: 0.3 }
    ]
  };
}

// Export all string instruments
export const violin = createStringInstrument('violin');
export const viola = createStringInstrument('viola');
export const cello = createStringInstrument('cello');
export const doubleBass = createStringInstrument('double_bass');

// Export string section factory
export const stringSection = {
  type: 'string_section',
  name: 'String Section',
  category: 'strings',
  
  async create(settings = {}) {
    const registry = new DisposalRegistry('StringSection');
    
    // Load all string instruments
    const violinI = await violin.create({ ...settings, section: 'first' });
    const violinII = await violin.create({ ...settings, section: 'second' });
    const violaSection = await viola.create(settings);
    const celloSection = await cello.create(settings);
    const bassSection = await doubleBass.create(settings);
    
    return {
      type: 'string_section',
      sections: { violinI, violinII, violaSection, celloSection, bassSection },
      
      playChord: (chord, velocity = 100, time = '+0', duration = '1n') => {
        const notes = Array.isArray(chord) ? chord : [chord];
        
        // Distribute notes across sections
        if (notes.length >= 4) {
          violinI.play(notes[notes.length - 1], velocity, time, duration);
          violinII.play(notes[notes.length - 2], velocity, time, duration);
          violaSection.play(notes[notes.length - 3], velocity, time, duration);
          celloSection.play(notes[notes.length - 4], velocity, time, duration);
          if (notes.length > 4) {
            bassSection.play(notes[0], velocity, time, duration);
          }
        }
      },
      
      dispose: () => {
        Object.values(this.sections).forEach(section => section.dispose());
        registry.dispose();
      }
    };
  }
};