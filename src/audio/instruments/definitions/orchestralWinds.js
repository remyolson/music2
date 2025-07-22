/**
 * Orchestral Woodwind Instruments with Sample Support
 * Flute, Clarinet, Oboe, Bassoon with breath simulation and extended techniques
 */
import * as Tone from 'tone';
import { sampleLibrary } from '../../samples/SampleLibrary.js';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

// Woodwind instrument configurations
const WOODWIND_CONFIGS = {
  flute: {
    name: 'Flute',
    range: { min: 'C4', max: 'D7' },
    breathiness: 0.15,
    airFlow: 0.8,
    embouchureFilter: { frequency: 3000, type: 'highpass' },
    defaultTechnique: 'normal'
  },
  clarinet: {
    name: 'Clarinet',
    range: { min: 'E3', max: 'C7' },
    breathiness: 0.08,
    airFlow: 0.6,
    embouchureFilter: { frequency: 800, type: 'bandpass', Q: 2 },
    defaultTechnique: 'normal'
  },
  oboe: {
    name: 'Oboe',
    range: { min: 'Bb3', max: 'A6' },
    breathiness: 0.05,
    airFlow: 0.4,
    embouchureFilter: { frequency: 1200, type: 'bandpass', Q: 3 },
    defaultTechnique: 'normal'
  },
  bassoon: {
    name: 'Bassoon',
    range: { min: 'Bb1', max: 'Eb5' },
    breathiness: 0.12,
    airFlow: 0.7,
    embouchureFilter: { frequency: 600, type: 'bandpass', Q: 2 },
    defaultTechnique: 'normal'
  },
  saxophone: {
    name: 'Saxophone',
    range: { min: 'Bb3', max: 'F#6' },
    breathiness: 0.1,
    airFlow: 0.9,
    embouchureFilter: { frequency: 1000, type: 'bandpass', Q: 1.5 },
    defaultTechnique: 'normal'
  }
};

// Available techniques for woodwind instruments
const WOODWIND_TECHNIQUES = {
  normal: { 
    name: 'Normal', 
    breathiness: 1.0, 
    attack: 0.05, 
    release: 0.3,
    harmonics: 1.0
  },
  flutter: { 
    name: 'Flutter Tonguing', 
    breathiness: 1.5, 
    attack: 0.02, 
    release: 0.2,
    harmonics: 1.2,
    flutter: { rate: 15, depth: 0.3 }
  },
  multiphonic: { 
    name: 'Multiphonic', 
    breathiness: 0.8, 
    attack: 0.1, 
    release: 0.4,
    harmonics: 2.5
  },
  breath_tone: { 
    name: 'Breath Tone', 
    breathiness: 3.0, 
    attack: 0.08, 
    release: 0.6,
    harmonics: 0.3
  },
  overblown: { 
    name: 'Overblown', 
    breathiness: 0.6, 
    attack: 0.03, 
    release: 0.2,
    harmonics: 1.8
  }
};

/**
 * Create a woodwind instrument definition
 * @param {string} instrumentType - Type of woodwind instrument
 * @returns {Object} Instrument definition
 */
function createWoodwindInstrument(instrumentType) {
  const config = WOODWIND_CONFIGS[instrumentType];
  if (!config) {
    throw new Error(`Unknown woodwind instrument: ${instrumentType}`);
  }

  return {
    type: `orchestral_${instrumentType}`,
    name: config.name,
    category: 'woodwinds',
    polyphonic: false, // Most woodwinds are monophonic
    sampleBased: true,
    
    /**
     * Create the woodwind instrument
     * @param {Object} settings - Instrument settings
     * @returns {Object} Enhanced woodwind instrument
     */
    async create(settings = {}) {
      const registry = new DisposalRegistry(`OrchestralWinds_${instrumentType}`);
      
      try {
        // Attempt to load sample-based woodwinds
        const orchestralWinds = await sampleLibrary.loadInstrument('woodwinds', instrumentType);
        return this._createSampleBasedWinds(orchestralWinds, settings, registry, config);
      } catch (error) {
        console.warn(`Falling back to synthesized ${instrumentType}:`, error);
        return this._createSynthesizedWinds(settings, registry, config);
      }
    },

    /**
     * Create enhanced sample-based woodwind instrument
     * @private
     */
    _createSampleBasedWinds(orchestralWinds, settings, registry, config) {
      // Create breath noise simulation
      const breathNoise = registry.register(new Tone.Noise('pink'));
      const breathEnvelope = registry.register(new Tone.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 0.3,
        release: 0.4
      }));
      const breathFilter = registry.register(new Tone.Filter(2000, 'highpass'));
      const breathGain = registry.register(new Tone.Gain(config.breathiness));
      
      breathNoise.chain(breathEnvelope, breathFilter, breathGain, Tone.Destination);

      // Create air flow simulation
      const airFlowNoise = registry.register(new Tone.Noise('white'));
      const airFlowFilter = registry.register(new Tone.Filter(config.embouchureFilter.frequency, config.embouchureFilter.type));
      if (config.embouchureFilter.Q) {
        airFlowFilter.Q.value = config.embouchureFilter.Q;
      }
      const airFlowGain = registry.register(new Tone.Gain(config.airFlow * 0.02));
      const airFlowEnvelope = registry.register(new Tone.AmplitudeEnvelope({
        attack: 0.05,
        decay: 0,
        sustain: 1,
        release: 0.1
      }));
      
      airFlowNoise.chain(airFlowEnvelope, airFlowFilter, airFlowGain, Tone.Destination);

      // Create flutter tonguing LFO
      const flutterLFO = registry.register(new Tone.LFO(15, 0));
      const flutterGain = registry.register(new Tone.Gain(0));
      flutterLFO.connect(flutterGain);
      flutterLFO.start();

      // Create vibrato control
      const vibratoLFO = registry.register(new Tone.LFO(5, 0));
      const vibratoGain = registry.register(new Tone.Gain(0));
      vibratoLFO.connect(vibratoGain);
      vibratoLFO.start();

      return {
        type: `orchestral_${instrumentType}`,
        orchestralWinds,
        registry,
        config,
        
        // Performance state
        currentTechnique: settings.technique || config.defaultTechnique,
        breathAmount: config.breathiness,
        airPressure: 1.0,
        embouchure: 0.5,
        vibratoRate: 5,
        vibratoDepth: 0.1,
        
        // Enhanced playing methods
        play: (note, velocity = 100, time = '+0', duration = '4n') => {
          const technique = WOODWIND_TECHNIQUES[this.currentTechnique];
          
          // Trigger breath noise
          const breathIntensity = technique.breathiness * this.breathAmount;
          breathGain.gain.setValueAtTime(breathIntensity * velocity / 1000, time);
          breathEnvelope.triggerAttackRelease(duration, time);
          
          // Trigger air flow
          airFlowEnvelope.triggerAttackRelease(duration, time);
          
          // Handle flutter tonguing
          if (technique.flutter) {
            flutterLFO.frequency.value = technique.flutter.rate;
            flutterGain.gain.value = technique.flutter.depth;
          } else {
            flutterGain.gain.value = 0;
          }
          
          // Play the note
          if (orchestralWinds.play) {
            orchestralWinds.play(note, velocity, time, duration);
          } else {
            orchestralWinds.triggerAttackRelease(note, duration, time, velocity / 127);
          }
        },

        triggerAttack: (note, time = '+0', velocity = 100) => {
          const technique = WOODWIND_TECHNIQUES[this.currentTechnique];
          
          breathEnvelope.triggerAttack(time);
          airFlowEnvelope.triggerAttack(time);
          
          if (orchestralWinds.triggerAttack) {
            orchestralWinds.triggerAttack(note, time, velocity / 127);
          }
        },

        triggerRelease: (note, time = '+0') => {
          breathEnvelope.triggerRelease(time);
          airFlowEnvelope.triggerRelease(time);
          
          if (orchestralWinds.triggerRelease) {
            orchestralWinds.triggerRelease(note, time);
          }
        },

        triggerAttackRelease: (note, duration, time = '+0', velocity = 100) => {
          this.play(note, velocity, time, duration);
        },

        // Technique control
        setTechnique: (technique) => {
          if (WOODWIND_TECHNIQUES[technique]) {
            this.currentTechnique = technique;
            const settings = WOODWIND_TECHNIQUES[technique];
            
            // Update breath characteristics
            this.breathAmount = config.breathiness * settings.breathiness;
            breathGain.gain.value = this.breathAmount;
          }
        },

        getAvailableTechniques: () => Object.keys(WOODWIND_TECHNIQUES),

        // Expression controls
        setBreathAmount: (amount) => {
          this.breathAmount = Math.max(0, Math.min(2, amount));
          breathGain.gain.value = this.breathAmount * 0.1;
        },

        setAirPressure: (pressure) => {
          this.airPressure = Math.max(0.1, Math.min(2, pressure));
          airFlowGain.gain.value = config.airFlow * this.airPressure * 0.02;
        },

        setEmbouchure: (position) => {
          this.embouchure = Math.max(0, Math.min(1, position));
          // Adjust filter frequency based on embouchure
          const baseFreq = config.embouchureFilter.frequency;
          const newFreq = baseFreq * (0.7 + this.embouchure * 0.6);
          airFlowFilter.frequency.value = newFreq;
        },

        setVibrato: (rate = 5, depth = 0.1) => {
          this.vibratoRate = rate;
          this.vibratoDepth = depth;
          vibratoLFO.frequency.value = rate;
          vibratoGain.gain.value = depth;
        },

        // Advanced techniques
        playGlissando: (startNote, endNote, duration = '1n', time = '+0') => {
          // Create smooth pitch transition for woodwinds
          this.triggerAttack(startNote, time);
          
          // Use a simple oscillator for glissando effect
          const glideOsc = registry.register(new Tone.Oscillator(startNote, 'sine'));
          const glideEnv = registry.register(new Tone.AmplitudeEnvelope({
            attack: 0.05,
            decay: 0,
            sustain: 1,
            release: 0.1
          }));
          
          glideOsc.chain(glideEnv, Tone.Destination);
          glideOsc.frequency.exponentialRampTo(Tone.Frequency(endNote).toFrequency(), duration, time);
          glideEnv.triggerAttackRelease(duration, time);
        },

        playTrill: (fundamentalNote, trillNote, rate = 8, duration = '2n', time = '+0') => {
          const trillLFO = registry.register(new Tone.LFO(rate, 0));
          trillLFO.start();
          
          // Alternate between notes rapidly
          let currentNote = fundamentalNote;
          const interval = Tone.Time('64n').toSeconds();
          
          for (let i = 0; i < Tone.Time(duration).toSeconds() / interval; i++) {
            const noteTime = time + (i * interval);
            currentNote = currentNote === fundamentalNote ? trillNote : fundamentalNote;
            this.play(currentNote, 80, `+${noteTime}`, '64n');
          }
        },

        // Multiphonic simulation (for instruments that support it)
        playMultiphonic: (fundamentalNote, partialNotes, velocity = 80, time = '+0', duration = '2n') => {
          this.setTechnique('multiphonic');
          
          // Play fundamental
          this.play(fundamentalNote, velocity, time, duration);
          
          // Add partials with reduced volume
          partialNotes.forEach((partial, index) => {
            const partialVelocity = velocity * (0.3 - index * 0.05);
            setTimeout(() => {
              this.play(partial, partialVelocity, time, duration);
            }, 10 * (index + 1)); // Slight stagger
          });
        },

        // Information methods
        getConfig: () => config,
        getCurrentTechnique: () => this.currentTechnique,
        getRange: () => config.range,
        isSampleBased: () => true,

        // Standard Tone.js interface
        chain: (...effects) => {
          if (orchestralWinds.chain) {
            orchestralWinds.chain(...effects);
          }
          return this;
        },

        connect: (destination) => {
          if (orchestralWinds.connect) {
            orchestralWinds.connect(destination);
          }
          return this;
        },

        disconnect: () => {
          if (orchestralWinds.disconnect) {
            orchestralWinds.disconnect();
          }
          return this;
        },

        toDestination: () => {
          if (orchestralWinds.toDestination) {
            orchestralWinds.toDestination();
          }
          return this;
        },

        // Memory management
        dispose: () => {
          if (orchestralWinds.dispose) {
            orchestralWinds.dispose();
          }
          registry.dispose();
        }
      };
    },

    /**
     * Create fallback synthesized woodwind instrument
     * @private
     */
    _createSynthesizedWinds(settings, registry, config) {
      const envelope = settings?.envelope || {};
      const noteTransition = settings?.noteTransition || 'normal';
      const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
      
      // Create different synthesis approaches for different woodwinds
      let synth;
      
      if (instrumentType === 'flute') {
        // Flute: sine wave with some noise
        synth = registry.register(new Tone.MonoSynth({
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.05,
            decay: 0.1,
            sustain: 0.9,
            release: 0.3
          },
          filter: {
            frequency: 4000,
            type: 'lowpass'
          },
          filterEnvelope: {
            attack: 0.02,
            decay: 0.2,
            sustain: 0.3,
            release: 0.5,
            baseFrequency: 1000,
            octaves: 2
          }
        }));
      } else if (instrumentType === 'clarinet') {
        // Clarinet: square wave (odd harmonics)
        synth = registry.register(new Tone.MonoSynth({
          oscillator: { type: 'square' },
          envelope: {
            attack: 0.08,
            decay: 0.2,
            sustain: 0.8,
            release: 0.4
          },
          filter: {
            frequency: 1500,
            type: 'bandpass',
            Q: 2
          }
        }));
      } else {
        // Default for oboe, bassoon: sawtooth with filtering
        synth = registry.register(new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.7,
            release: 0.5
          },
          filter: {
            frequency: config.embouchureFilter.frequency,
            type: config.embouchureFilter.type,
            Q: config.embouchureFilter.Q || 1
          }
        }));
      }

      // Add breath noise
      const breathNoise = registry.register(new Tone.Noise('pink'));
      const breathFilter = registry.register(new Tone.Filter(2000, 'highpass'));
      const breathGain = registry.register(new Tone.Gain(config.breathiness * 0.05));
      const breathEnv = registry.register(new Tone.AmplitudeEnvelope({
        attack: 0.1,
        decay: 0.2,
        sustain: 0.3,
        release: 0.4
      }));
      
      breathNoise.chain(breathEnv, breathFilter, breathGain, Tone.Destination);

      return {
        type: `orchestral_${instrumentType}`,
        synth,
        registry,
        config,
        currentTechnique: config.defaultTechnique,
        
        // Simplified interface matching sample-based version
        play: (note, velocity = 100, time = '+0', duration = '4n') => {
          breathEnv.triggerAttackRelease(duration, time);
          synth.triggerAttackRelease(note, duration, time, velocity / 127);
        },

        triggerAttack: (note, time = '+0', velocity = 100) => {
          breathEnv.triggerAttack(time);
          synth.triggerAttack(note, time, velocity / 127);
        },

        triggerRelease: (note, time = '+0') => {
          breathEnv.triggerRelease(time);
          synth.triggerRelease(time);
        },

        triggerAttackRelease: (note, duration, time = '+0', velocity = 100) => {
          this.play(note, velocity, time, duration);
        },

        // Simplified technique control
        setTechnique: (technique) => {
          this.currentTechnique = technique;
          // Basic envelope adjustments based on technique
          const settings = WOODWIND_TECHNIQUES[technique];
          if (settings) {
            synth.set({
              envelope: {
                attack: settings.attack,
                release: settings.release
              }
            });
          }
        },

        getAvailableTechniques: () => Object.keys(WOODWIND_TECHNIQUES),

        // Simplified controls
        setBreathAmount: (amount) => {
          breathGain.gain.value = config.breathiness * amount * 0.05;
        },

        setAirPressure: () => {}, // No-op for synthesis
        setEmbouchure: () => {},
        setVibrato: () => {},

        // Compatibility methods
        chain: (...effects) => synth.chain(...effects),
        connect: (destination) => synth.connect(destination),
        disconnect: () => synth.disconnect(),
        toDestination: () => synth.toDestination(),
        
        getConfig: () => config,
        getCurrentTechnique: () => this.currentTechnique,
        getRange: () => config.range,
        isSampleBased: () => false,
        dispose: () => registry.dispose()
      };
    },

    /**
     * Default settings for this woodwind instrument
     */
    defaults: {
      volume: -6,
      maxPolyphony: 1, // Most woodwinds are monophonic
      technique: config.defaultTechnique,
      breath: { amount: config.breathiness, pressure: 1.0 },
      embouchure: 0.5,
      vibrato: { rate: 5, depth: 0.1 },
      envelope: WOODWIND_TECHNIQUES[config.defaultTechnique]
    },

    /**
     * Recommended effects for woodwind instruments
     */
    recommendedEffects: [
      { type: 'reverb', wet: 0.3, roomSize: 0.6, decay: 1.8 },
      { type: 'eq', low: 0.8, mid: 1.0, high: 1.3 },
      { type: 'chorus', rate: 0.3, depth: 0.2 }
    ]
  };
}

// Export all woodwind instruments
export const flute = createWoodwindInstrument('flute');
export const clarinet = createWoodwindInstrument('clarinet');
export const oboe = createWoodwindInstrument('oboe');
export const bassoon = createWoodwindInstrument('bassoon');
export const saxophone = createWoodwindInstrument('saxophone');

// Export woodwind section factory
export const woodwindSection = {
  type: 'woodwind_section',
  name: 'Woodwind Section',
  category: 'woodwinds',
  
  async create(settings = {}) {
    const registry = new DisposalRegistry('WoodwindSection');
    
    // Load all woodwind instruments
    const fluteSection = await flute.create(settings);
    const oboeSection = await oboe.create(settings);
    const clarinetSection = await clarinet.create(settings);
    const bassoonSection = await bassoon.create(settings);
    
    return {
      type: 'woodwind_section',
      sections: { fluteSection, oboeSection, clarinetSection, bassoonSection },
      
      playChord: (chord, velocity = 100, time = '+0', duration = '1n') => {
        const notes = Array.isArray(chord) ? chord : [chord];
        
        // Distribute notes across woodwind sections
        if (notes.length >= 4) {
          fluteSection.play(notes[notes.length - 1], velocity, time, duration);
          oboeSection.play(notes[notes.length - 2], velocity, time, duration);
          clarinetSection.play(notes[notes.length - 3], velocity, time, duration);
          bassoonSection.play(notes[notes.length - 4], velocity, time, duration);
        }
      },
      
      playMelody: (melody, instrument = 'flute', velocity = 100, time = '+0') => {
        const section = this.sections[`${instrument}Section`];
        if (section && Array.isArray(melody)) {
          melody.forEach((note, index) => {
            const noteTime = time + (index * 0.5); // Half-second intervals
            section.play(note.note || note, note.velocity || velocity, `+${noteTime}`, note.duration || '2n');
          });
        }
      },
      
      dispose: () => {
        Object.values(this.sections).forEach(section => section.dispose());
        registry.dispose();
      }
    };
  }
};