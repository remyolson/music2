/**
 * Orchestral Brass Instruments with Sample Support
 * Trumpet, French Horn, Trombone, Tuba with mute variations and blend controls
 */
import * as Tone from 'tone';
import { sampleLibrary } from '../../samples/SampleLibrary.js';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

// Brass instrument configurations
const BRASS_CONFIGS = {
  trumpet: {
    name: 'Trumpet',
    range: { min: 'E3', max: 'D6' },
    brightness: 1.0,
    brassiness: 0.8,
    lipTension: 0.7,
    defaultMute: 'open',
    transposition: 0
  },
  french_horn: {
    name: 'French Horn',
    range: { min: 'B2', max: 'F5' },
    brightness: 0.6,
    brassiness: 0.6,
    lipTension: 0.5,
    defaultMute: 'open',
    transposition: 0
  },
  trombone: {
    name: 'Trombone',
    range: { min: 'E2', max: 'F5' },
    brightness: 0.7,
    brassiness: 0.9,
    lipTension: 0.6,
    defaultMute: 'open',
    transposition: 0
  },
  tuba: {
    name: 'Tuba',
    range: { min: 'D1', max: 'F4' },
    brightness: 0.4,
    brassiness: 1.0,
    lipTension: 0.3,
    defaultMute: 'open',
    transposition: 0
  }
};

// Available mutes for brass instruments
const BRASS_MUTES = {
  open: { 
    name: 'Open (No Mute)', 
    brightness: 1.0, 
    volume: 1.0,
    filterFreq: null,
    resonance: 1.0
  },
  straight: { 
    name: 'Straight Mute', 
    brightness: 1.4, 
    volume: 0.7,
    filterFreq: 2000,
    resonance: 0.6
  },
  cup: { 
    name: 'Cup Mute', 
    brightness: 0.6, 
    volume: 0.5,
    filterFreq: 1200,
    resonance: 0.4
  },
  harmon: { 
    name: 'Harmon Mute', 
    brightness: 2.0, 
    volume: 0.4,
    filterFreq: 3000,
    resonance: 0.3,
    nasal: true
  },
  bucket: { 
    name: 'Bucket Mute', 
    brightness: 0.3, 
    volume: 0.3,
    filterFreq: 800,
    resonance: 0.2
  },
  wah: { 
    name: 'Wah-Wah Mute', 
    brightness: 0.8, 
    volume: 0.6,
    filterFreq: 1500,
    resonance: 0.5,
    modulation: { rate: 4, depth: 0.3 }
  },
  stopped: { 
    name: 'Stopped (Hand)', 
    brightness: 0.4, 
    volume: 0.4,
    filterFreq: 1000,
    resonance: 0.3
  }
};

/**
 * Create a brass instrument definition
 * @param {string} instrumentType - Type of brass instrument
 * @returns {Object} Instrument definition
 */
function createBrassInstrument(instrumentType) {
  const config = BRASS_CONFIGS[instrumentType];
  if (!config) {
    throw new Error(`Unknown brass instrument: ${instrumentType}`);
  }

  return {
    type: `orchestral_${instrumentType}`,
    name: config.name,
    category: 'brass',
    polyphonic: instrumentType === 'french_horn', // French horn can play stopped + open
    sampleBased: true,
    
    /**
     * Create the brass instrument
     * @param {Object} settings - Instrument settings
     * @returns {Object} Enhanced brass instrument
     */
    async create(settings = {}) {
      const registry = new DisposalRegistry(`OrchestralBrass_${instrumentType}`);
      
      try {
        // Attempt to load sample-based brass
        const orchestralBrass = await sampleLibrary.loadInstrument('brass', instrumentType);
        return this._createSampleBasedBrass(orchestralBrass, settings, registry, config);
      } catch (error) {
        console.warn(`Falling back to synthesized ${instrumentType}:`, error);
        return this._createSynthesizedBrass(settings, registry, config);
      }
    },

    /**
     * Create enhanced sample-based brass instrument
     * @private
     */
    _createSampleBasedBrass(orchestralBrass, settings, registry, config) {
      // Create mute filtering system
      const muteFilter = registry.register(new Tone.Filter(2000, 'lowpass'));
      const muteGain = registry.register(new Tone.Gain(1.0));
      const muteResonance = registry.register(new Tone.Filter(1000, 'bandpass'));
      
      // Create brass brightness control
      const brightnessEQ = registry.register(new Tone.EQ3(0, 0, 0));
      
      // Create lip buzz simulation
      const lipBuzz = registry.register(new Tone.Oscillator(220, 'sawtooth'));
      const lipBuzzEnv = registry.register(new Tone.AmplitudeEnvelope({
        attack: 0.01,
        decay: 0.05,
        sustain: 0.8,
        release: 0.1
      }));
      const lipBuzzGain = registry.register(new Tone.Gain(0.02));
      
      lipBuzz.chain(lipBuzzEnv, lipBuzzGain, Tone.Destination);

      // Create valve noise (for trumpet/tuba)
      let valveNoise = null;
      if (instrumentType === 'trumpet' || instrumentType === 'tuba') {
        valveNoise = registry.register(new Tone.Noise('pink'));
        const valveEnv = registry.register(new Tone.AmplitudeEnvelope({
          attack: 0.001,
          decay: 0.01,
          sustain: 0,
          release: 0.005
        }));
        const valveGain = registry.register(new Tone.Gain(0.015));
        
        valveNoise.chain(valveEnv, valveGain, Tone.Destination);
      }

      // Create brass section blend control
      const sectionGain = registry.register(new Tone.Gain(1.0));
      const sectionDelay = registry.register(new Tone.Delay(0.001)); // Slight ensemble delay
      
      // Main audio chain - check if chain method exists
      if (orchestralBrass && orchestralBrass.chain) {
        orchestralBrass.chain(muteGain, muteFilter, muteResonance, brightnessEQ, sectionGain, sectionDelay, Tone.Destination);
      } else if (orchestralBrass && orchestralBrass.connect) {
        // Fallback: connect directly without effect chain
        orchestralBrass.connect(Tone.Destination);
      } else {
        console.warn('Orchestral brass missing both chain and connect methods');
      }

      return {
        type: `orchestral_${instrumentType}`,
        orchestralBrass,
        registry,
        config,
        
        // Performance state
        currentMute: settings.mute || config.defaultMute,
        lipTension: config.lipTension,
        airPressure: 1.0,
        brightness: config.brightness,
        sectionBlend: 0.0, // 0 = solo, 1 = full blend
        
        // Enhanced playing methods
        play: (notes, velocity = 100, time = '+0', duration = '4n') => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          const muteSettings = BRASS_MUTES[this.currentMute];
          
          // Apply mute characteristics
          this._applyMuteSettings(muteSettings);
          
          // Trigger lip buzz simulation
          lipBuzzEnv.triggerAttackRelease(duration, time);
          
          // Trigger valve noise for appropriate instruments
          if (valveNoise) {
            valveNoise.start(time);
            valveNoise.stop(time + 0.01);
          }
          
          // Play notes with brass characteristics
          for (const note of noteArray) {
            const adjustedVelocity = this._calculateBrassVelocity(velocity, note);
            
            if (orchestralBrass.play) {
              orchestralBrass.play(note, adjustedVelocity, time, duration);
            } else {
              orchestralBrass.triggerAttackRelease(note, duration, time, adjustedVelocity / 127);
            }
          }
        },

        triggerAttack: (notes, time = '+0', velocity = 100) => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          const muteSettings = BRASS_MUTES[this.currentMute];
          
          this._applyMuteSettings(muteSettings);
          lipBuzzEnv.triggerAttack(time);
          
          if (valveNoise) {
            valveNoise.start(time);
          }
          
          for (const note of noteArray) {
            const adjustedVelocity = this._calculateBrassVelocity(velocity, note);
            
            if (orchestralBrass.triggerAttack) {
              orchestralBrass.triggerAttack(note, time, adjustedVelocity / 127);
            }
          }
        },

        triggerRelease: (notes, time = '+0') => {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          
          lipBuzzEnv.triggerRelease(time);
          
          if (valveNoise) {
            valveNoise.stop(time);
          }
          
          for (const note of noteArray) {
            if (orchestralBrass.triggerRelease) {
              orchestralBrass.triggerRelease(note, time);
            }
          }
        },

        triggerAttackRelease: function(notes, duration, time = '+0', velocity = 100) {
          this.play(notes, velocity, time, duration);
        },

        // Mute control
        setMute: function(muteType) {
          if (BRASS_MUTES[muteType]) {
            this.currentMute = muteType;
            const muteSettings = BRASS_MUTES[muteType];
            this._applyMuteSettings(muteSettings);
          }
        },

        getAvailableMutes: () => {
          // Return mutes appropriate for this instrument
          const allMutes = Object.keys(BRASS_MUTES);
          
          if (instrumentType === 'french_horn') {
            return allMutes.filter(m => ['open', 'stopped'].includes(m));
          } else if (instrumentType === 'tuba') {
            return allMutes.filter(m => ['open', 'straight', 'cup'].includes(m));
          } else {
            return allMutes; // Trumpet and trombone support most mutes
          }
        },

        // Expression controls
        setLipTension: (tension) => {
          this.lipTension = Math.max(0.1, Math.min(1.5, tension));
          lipBuzz.frequency.value = 220 * this.lipTension;
          lipBuzzGain.gain.value = 0.02 * this.lipTension;
        },

        setAirPressure: (pressure) => {
          this.airPressure = Math.max(0.3, Math.min(2.0, pressure));
          muteGain.gain.value = BRASS_MUTES[this.currentMute].volume * this.airPressure;
        },

        setBrightness: (brightness) => {
          this.brightness = Math.max(0.1, Math.min(2.0, brightness));
          const highGain = Math.log(this.brightness + 1) * 3; // Logarithmic scaling
          brightnessEQ.high.value = highGain;
        },

        setSectionBlend: (blend) => {
          this.sectionBlend = Math.max(0, Math.min(1, blend));
          sectionDelay.delayTime.value = this.sectionBlend * 0.002; // Max 2ms delay
          sectionGain.gain.value = 0.8 + (this.sectionBlend * 0.2); // Slight volume boost in ensemble
        },

        // Advanced brass techniques
        playLipTrill: (fundamentalNote, semitones = 1, rate = 8, duration = '2n', time = '+0') => {
          const trillNote = Tone.Frequency(fundamentalNote).transpose(semitones * 100).toNote();
          
          const trillInterval = 1 / (rate * 2); // Alternate between notes
          const noteCount = Math.floor(Tone.Time(duration).toSeconds() / trillInterval);
          
          for (let i = 0; i < noteCount; i++) {
            const noteTime = time + (i * trillInterval);
            const currentNote = i % 2 === 0 ? fundamentalNote : trillNote;
            this.play(currentNote, 80, `+${noteTime}`, `${trillInterval}s`);
          }
        },

        playGlissando: (startNote, endNote, duration = '1n', time = '+0') => {
          // For trombone, use slide positions; for others, simulate with pitch bend
          if (instrumentType === 'trombone') {
            // Smooth trombone slide
            this.triggerAttack(startNote, time);
            
            // Create pitch glide effect
            const glideOsc = registry.register(new Tone.Oscillator(startNote, 'sawtooth'));
            const glideEnv = registry.register(new Tone.AmplitudeEnvelope({
              attack: 0.05,
              decay: 0,
              sustain: 1,
              release: 0.1
            }));
            
            glideOsc.chain(glideEnv, Tone.Destination);
            glideOsc.frequency.exponentialRampTo(Tone.Frequency(endNote).toFrequency(), duration, time);
            glideEnv.triggerAttackRelease(duration, time);
          } else {
            // Discrete steps for valve instruments
            const steps = 8;
            const stepDuration = Tone.Time(duration).toSeconds() / steps;
            const startFreq = Tone.Frequency(startNote).toFrequency();
            const endFreq = Tone.Frequency(endNote).toFrequency();
            
            for (let i = 0; i <= steps; i++) {
              const ratio = i / steps;
              const currentFreq = startFreq * Math.pow(endFreq / startFreq, ratio);
              const currentNote = Tone.Frequency(currentFreq).toNote();
              const noteTime = time + (i * stepDuration);
              
              this.play(currentNote, 70, `+${noteTime}`, `${stepDuration}s`);
            }
          }
        },

        playFallOff: (startNote, duration = '1n', time = '+0') => {
          // Brass fall-off effect
          this.triggerAttack(startNote, time);
          
          const fallOff = registry.register(new Tone.Oscillator(startNote, 'sawtooth'));
          const fallEnv = registry.register(new Tone.AmplitudeEnvelope({
            attack: 0,
            decay: 0,
            sustain: 1,
            release: 0.2
          }));
          
          fallOff.chain(fallEnv, Tone.Destination);
          fallOff.frequency.exponentialRampTo(Tone.Frequency(startNote).transpose(-1200).toFrequency(), duration, time);
          fallEnv.triggerAttackRelease(duration, time);
        },

        // Internal helper methods
        _applyMuteSettings(muteSettings) {
          muteGain.gain.value = muteSettings.volume * this.airPressure;
          
          if (muteSettings.filterFreq) {
            muteFilter.frequency.value = muteSettings.filterFreq;
            muteResonance.frequency.value = muteSettings.filterFreq;
            muteResonance.Q.value = (1 - muteSettings.resonance) * 10;
          } else {
            muteFilter.frequency.value = 20000; // Bypass filter
          }
          
          // Apply brightness adjustment
          const brightnessMultiplier = muteSettings.brightness * this.brightness;
          const highGain = Math.log(brightnessMultiplier + 1) * 3;
          brightnessEQ.high.value = highGain;
        },

        _calculateBrassVelocity(velocity, note) {
          // Brass instruments are harder to play in extreme registers
          const noteFreq = Tone.Frequency(note).toFrequency();
          const rangeMin = Tone.Frequency(config.range.min).toFrequency();
          const rangeMax = Tone.Frequency(config.range.max).toFrequency();
          
          // Reduce velocity for extreme high/low notes
          let multiplier = 1.0;
          if (noteFreq < rangeMin * 1.5 || noteFreq > rangeMax * 0.8) {
            multiplier = 0.8;
          }
          
          return Math.round(velocity * multiplier * this.airPressure);
        },

        // Information methods
        getConfig: () => config,
        getCurrentMute: () => this.currentMute,
        getRange: () => config.range,
        isSampleBased: () => true,

        // Standard Tone.js interface
        chain: (...effects) => {
          sectionDelay.chain(...effects);
          return this;
        },

        connect: (destination) => {
          sectionDelay.connect(destination);
          return this;
        },

        disconnect: () => {
          sectionDelay.disconnect();
          return this;
        },

        toDestination: () => {
          sectionDelay.toDestination();
          return this;
        },

        // Memory management
        dispose: () => {
          if (orchestralBrass.dispose) {
            orchestralBrass.dispose();
          }
          registry.dispose();
        }
      };
    },

    /**
     * Create fallback synthesized brass instrument
     * @private
     */
    _createSynthesizedBrass(settings, registry, config) {
      const envelope = settings?.envelope || {};
      const noteTransition = settings?.noteTransition || 'normal';
      const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
      
      // Create brass-like synthesis
      const synth = registry.register(new Tone.MonoSynth({
        oscillator: { 
          type: 'sawtooth',
          partialCount: 16 // Rich harmonic content
        },
        filter: {
          frequency: 2000,
          type: 'lowpass',
          rolloff: -12
        },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8,
          baseFrequency: 200,
          octaves: 3
        }
      }));

      // Add brass distortion for character
      const distortion = registry.register(new Tone.Distortion(0.4));
      const brassEQ = registry.register(new Tone.EQ3(-3, 2, 4)); // Brass EQ curve
      
      synth.chain(distortion, brassEQ, Tone.Destination);

      return {
        type: `orchestral_${instrumentType}`,
        synth,
        registry,
        config,
        currentMute: config.defaultMute,
        
        // Simplified interface matching sample-based version
        play: function(notes, velocity = 100, time = '+0', duration = '4n') {
          const noteArray = Array.isArray(notes) ? notes : [notes];
          // For synthesis, only play one note (brass instruments are typically monophonic)
          const note = noteArray[0];
          synth.triggerAttackRelease(note, duration, time, velocity / 127);
        },

        triggerAttack: function(notes, time = '+0', velocity = 100) {
          const note = Array.isArray(notes) ? notes[0] : notes;
          synth.triggerAttack(note, time, velocity / 127);
        },

        triggerRelease: function(notes, time = '+0') {
          synth.triggerRelease(time);
        },

        triggerAttackRelease: function(notes, duration, time = '+0', velocity = 100) {
          this.play(notes, velocity, time, duration);
        },

        // Simplified mute control (affects filter and distortion)
        setMute: function(muteType) {
          this.currentMute = muteType;
          const muteSettings = BRASS_MUTES[muteType];
          
          if (muteSettings.filterFreq) {
            synth.filter.frequency.value = muteSettings.filterFreq;
            distortion.distortion = 0.2; // Muted sound
          } else {
            synth.filter.frequency.value = 2000;
            distortion.distortion = 0.4; // Open sound
          }
        },

        getAvailableMutes: () => this.getAvailableMutes(),

        // Simplified controls
        setLipTension: () => {},
        setAirPressure: (pressure) => {
          synth.volume.value = -12 + (pressure * 6); // -12dB to -6dB range
        },
        setBrightness: (brightness) => {
          brassEQ.high.value = brightness * 4 - 2; // -2dB to +6dB
        },
        setSectionBlend: () => {},

        // Compatibility methods
        chain: (...effects) => brassEQ.chain(...effects),
        connect: (destination) => brassEQ.connect(destination),
        disconnect: () => brassEQ.disconnect(),
        toDestination: () => brassEQ.toDestination(),
        
        getConfig: () => config,
        getCurrentMute: () => this.currentMute,
        getRange: () => config.range,
        isSampleBased: () => false,
        dispose: () => registry.dispose()
      };
    },

    /**
     * Default settings for this brass instrument
     */
    defaults: {
      volume: -4,
      maxPolyphony: instrumentType === 'french_horn' ? 2 : 1,
      mute: config.defaultMute,
      lipTension: config.lipTension,
      airPressure: 1.0,
      brightness: config.brightness,
      sectionBlend: 0.0,
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 0.3
      }
    },

    /**
     * Recommended effects for brass instruments
     */
    recommendedEffects: [
      { type: 'reverb', wet: 0.35, roomSize: 0.9, decay: 2.2 },
      { type: 'eq', low: 1.0, mid: 1.2, high: 1.4 },
      { type: 'compressor', threshold: -18, ratio: 3, attack: 0.01, release: 0.1 }
    ]
  };
}

// Export all brass instruments
export const trumpet = createBrassInstrument('trumpet');
export const frenchHorn = createBrassInstrument('french_horn');
export const trombone = createBrassInstrument('trombone');
export const tuba = createBrassInstrument('tuba');

// Export brass section factory
export const brassSection = {
  type: 'brass_section',
  name: 'Brass Section',
  category: 'brass',
  
  async create(settings = {}) {
    const registry = new DisposalRegistry('BrassSection');
    
    // Load all brass instruments
    const trumpetSection = await trumpet.create(settings);
    const hornSection = await frenchHorn.create(settings);
    const tromboneSection = await trombone.create(settings);
    const tubaSection = await tuba.create(settings);
    
    const brassSection = {
      type: 'brass_section',
      sections: { trumpetSection, hornSection, tromboneSection, tubaSection },
      
      playChord: function(chord, velocity = 100, time = '+0', duration = '1n') {
        const notes = Array.isArray(chord) ? chord : [chord];
        
        // Distribute notes across brass sections
        if (notes.length >= 4) {
          trumpetSection.play(notes[notes.length - 1], velocity, time, duration);
          hornSection.play(notes[notes.length - 2], velocity * 0.9, time, duration);
          tromboneSection.play(notes[notes.length - 3], velocity * 0.95, time, duration);
          tubaSection.play(notes[notes.length - 4], velocity, time, duration);
        }
      },
      
      triggerAttackRelease: function(notes, duration, time = '+0', velocity = 100) {
        this.playChord(notes, velocity, time, duration);
      },
      
      playFanfare: function(pattern, velocity = 100, time = '+0') {
        // Play a typical brass fanfare pattern
        if (Array.isArray(pattern)) {
          pattern.forEach((chord, index) => {
            const chordTime = time + (index * 1.0); // 1-second intervals
            this.playChord(chord.notes || chord, chord.velocity || velocity, `+${chordTime}`, chord.duration || '2n');
          });
        }
      },
      
      setSectionMutes: function(muteConfig) {
        // Set different mutes for each section
        if (muteConfig.trumpet) trumpetSection.setMute(muteConfig.trumpet);
        if (muteConfig.horn) hornSection.setMute(muteConfig.horn);
        if (muteConfig.trombone) tromboneSection.setMute(muteConfig.trombone);
        if (muteConfig.tuba) tubaSection.setMute(muteConfig.tuba);
      },
      
      chain: function(...effects) {
        // Chain effects to all sections
        Object.values(this.sections).forEach(section => {
          if (section.chain) section.chain(...effects);
        });
        return this;
      },
      
      connect: function(destination) {
        // Connect all sections to destination
        Object.values(this.sections).forEach(section => {
          if (section.connect) section.connect(destination);
        });
        return this;
      },
      
      disconnect: function() {
        // Disconnect all sections
        Object.values(this.sections).forEach(section => {
          if (section.disconnect) section.disconnect();
        });
        return this;
      },
      
      toDestination: function() {
        // Connect all sections to destination
        Object.values(this.sections).forEach(section => {
          if (section.toDestination) section.toDestination();
        });
        return this;
      },
      
      dispose: function() {
        Object.values(this.sections).forEach(section => section.dispose());
        registry.dispose();
      }
    };
    
    return brassSection;
  }
};