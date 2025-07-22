/**
 * Sample Library Management System for Music2
 * Organizes and manages access to sample-based instruments
 */

import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { soundFontLoader } from './SoundFontLoader.js';
import * as Tone from 'tone';

// Sample library configurations
const SAMPLE_CONFIGS = {
  piano: {
    grand_piano: {
      url: '/samples/piano/grand_piano.sf2',
      velocityLayers: 4,
      noteRange: { min: 'A0', max: 'C8' },
      pedals: ['sustain', 'soft', 'sostenuto'],
      resonance: true
    },
    upright_piano: {
      url: '/samples/piano/upright_piano.sf2',
      velocityLayers: 3,
      noteRange: { min: 'A0', max: 'C8' },
      pedals: ['sustain']
    }
  },
  strings: {
    violin: {
      url: '/samples/strings/violin.sf2',
      velocityLayers: 4,
      noteRange: { min: 'G3', max: 'E7' },
      articulations: ['arco', 'pizzicato', 'tremolo', 'staccato', 'legato']
    },
    viola: {
      url: '/samples/strings/viola.sf2',
      velocityLayers: 4,
      noteRange: { min: 'C3', max: 'E6' },
      articulations: ['arco', 'pizzicato', 'tremolo', 'staccato', 'legato']
    },
    cello: {
      url: '/samples/strings/cello.sf2',
      velocityLayers: 4,
      noteRange: { min: 'C2', max: 'C6' },
      articulations: ['arco', 'pizzicato', 'tremolo', 'staccato', 'legato']
    },
    double_bass: {
      url: '/samples/strings/double_bass.sf2',
      velocityLayers: 3,
      noteRange: { min: 'E1', max: 'G4' },
      articulations: ['arco', 'pizzicato', 'staccato']
    }
  },
  woodwinds: {
    flute: {
      url: '/samples/woodwinds/flute.sf2',
      velocityLayers: 3,
      noteRange: { min: 'C4', max: 'D7' },
      techniques: ['normal', 'flutter', 'breath_noise']
    },
    clarinet: {
      url: '/samples/woodwinds/clarinet.sf2',
      velocityLayers: 3,
      noteRange: { min: 'E3', max: 'C7' },
      techniques: ['normal', 'flutter', 'multiphonic']
    },
    oboe: {
      url: '/samples/woodwinds/oboe.sf2',
      velocityLayers: 3,
      noteRange: { min: 'Bb3', max: 'A6' },
      techniques: ['normal', 'flutter']
    },
    bassoon: {
      url: '/samples/woodwinds/bassoon.sf2',
      velocityLayers: 3,
      noteRange: { min: 'Bb1', max: 'Eb5' },
      techniques: ['normal', 'flutter']
    }
  },
  brass: {
    trumpet: {
      url: '/samples/brass/trumpet.sf2',
      velocityLayers: 4,
      noteRange: { min: 'E3', max: 'D6' },
      mutes: ['open', 'straight', 'cup', 'harmon']
    },
    french_horn: {
      url: '/samples/brass/french_horn.sf2',
      velocityLayers: 3,
      noteRange: { min: 'B2', max: 'F5' },
      techniques: ['open', 'stopped', 'muted']
    },
    trombone: {
      url: '/samples/brass/trombone.sf2',
      velocityLayers: 4,
      noteRange: { min: 'E2', max: 'F5' },
      mutes: ['open', 'straight', 'cup']
    },
    tuba: {
      url: '/samples/brass/tuba.sf2',
      velocityLayers: 3,
      noteRange: { min: 'D1', max: 'F4' },
      mutes: ['open']
    }
  }
};

export class SampleLibrary {
  constructor() {
    this.registry = new DisposalRegistry('SampleLibrary');
    this.loadedInstruments = new Map();
    this.loadingPromises = new Map();
    this.fallbackSynths = new Map();
  }

  /**
   * Load a sample-based instrument
   * @param {string} category - Instrument category (piano, strings, etc.)
   * @param {string} instrument - Specific instrument name
   * @returns {Promise<Object>} Loaded instrument instance
   */
  async loadInstrument(category, instrument) {
    const key = `${category}:${instrument}`;
    
    if (this.loadedInstruments.has(key)) {
      return this.loadedInstruments.get(key);
    }

    if (this.loadingPromises.has(key)) {
      return await this.loadingPromises.get(key);
    }

    const loadPromise = this._loadInstrumentData(category, instrument);
    this.loadingPromises.set(key, loadPromise);

    try {
      const instrumentInstance = await loadPromise;
      this.loadedInstruments.set(key, instrumentInstance);
      this.loadingPromises.delete(key);
      return instrumentInstance;
    } catch (error) {
      console.error(`Failed to load ${key}, falling back to synthesis`, error);
      this.loadingPromises.delete(key);
      return this._createFallbackSynth(category, instrument);
    }
  }

  /**
   * Get available instruments by category
   * @param {string} category - Instrument category
   * @returns {Array<string>} Available instrument names
   */
  getAvailableInstruments(category) {
    return Object.keys(SAMPLE_CONFIGS[category] || {});
  }

  /**
   * Get all available categories
   * @returns {Array<string>} Available categories
   */
  getCategories() {
    return Object.keys(SAMPLE_CONFIGS);
  }

  /**
   * Check if an instrument is loaded
   * @param {string} category - Instrument category
   * @param {string} instrument - Instrument name
   * @returns {boolean} Whether instrument is loaded
   */
  isLoaded(category, instrument) {
    const key = `${category}:${instrument}`;
    return this.loadedInstruments.has(key);
  }

  /**
   * Preload a set of instruments for immediate availability
   * @param {Array<Object>} instruments - Array of {category, instrument} objects
   * @returns {Promise<void>}
   */
  async preloadInstruments(instruments) {
    const loadPromises = instruments.map(({ category, instrument }) =>
      this.loadInstrument(category, instrument)
    );
    
    await Promise.allSettled(loadPromises);
  }

  /**
   * Unload an instrument to free memory
   * @param {string} category - Instrument category
   * @param {string} instrument - Instrument name
   */
  unloadInstrument(category, instrument) {
    const key = `${category}:${instrument}`;
    const instrumentInstance = this.loadedInstruments.get(key);
    
    if (instrumentInstance) {
      if (instrumentInstance.dispose) {
        instrumentInstance.dispose();
      }
      this.loadedInstruments.delete(key);
    }
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    const soundFontMemory = soundFontLoader.getMemoryUsage();
    
    return {
      loadedInstruments: this.loadedInstruments.size,
      fallbackSynths: this.fallbackSynths.size,
      soundFontMemory,
      totalEstimatedMB: soundFontMemory.totalSizeMB + (this.fallbackSynths.size * 0.1)
    };
  }

  /**
   * Create a natural piano with advanced features
   * @param {string} type - Piano type (grand_piano, upright_piano)
   * @returns {Promise<Object>} Piano instrument instance
   */
  async createNaturalPiano(type = 'grand_piano') {
    const config = SAMPLE_CONFIGS.piano[type];
    if (!config) {
      throw new Error(`Unknown piano type: ${type}`);
    }

    try {
      // Load the piano SoundFont
      await soundFontLoader.loadSoundFont(config.url, `piano_${type}`);
      
      // Create multi-velocity sampler
      const samples = await this._generatePianoSamples(config);
      const sampler = soundFontLoader.createMultiVelocitySampler(samples, {
        attack: 0.01,
        release: 0.8,
        curve: 'exponential'
      });

      // Add piano-specific features
      const piano = this._enhancePianoRealism(sampler, config);
      
      return this.registry.register(piano);
    } catch (error) {
      console.warn(`Failed to load ${type} samples, using synthesized piano`, error);
      return this._createFallbackPiano(type);
    }
  }

  /**
   * Create orchestral string section
   * @param {string} instrument - String instrument name
   * @returns {Promise<Object>} String instrument instance
   */
  async createOrchestralStrings(instrument) {
    const config = SAMPLE_CONFIGS.strings[instrument];
    if (!config) {
      throw new Error(`Unknown string instrument: ${instrument}`);
    }

    try {
      await soundFontLoader.loadSoundFont(config.url, `strings_${instrument}`);
      
      const samples = await this._generateStringSamples(config);
      const sampler = soundFontLoader.createMultiVelocitySampler(samples, {
        attack: 0.05,
        release: 0.3,
        curve: 'linear'
      });

      const strings = this._enhanceStringRealism(sampler, config);
      
      return this.registry.register(strings);
    } catch (error) {
      console.warn(`Failed to load ${instrument} samples, using synthesis`, error);
      return this._createFallbackStrings(instrument);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    for (const instrument of this.loadedInstruments.values()) {
      if (instrument.dispose) {
        instrument.dispose();
      }
    }
    
    for (const synth of this.fallbackSynths.values()) {
      synth.dispose();
    }
    
    this.loadedInstruments.clear();
    this.fallbackSynths.clear();
    this.loadingPromises.clear();
    this.registry.dispose();
  }

  // Private methods

  async _loadInstrumentData(category, instrument) {
    const config = SAMPLE_CONFIGS[category]?.[instrument];
    if (!config) {
      throw new Error(`No configuration found for ${category}:${instrument}`);
    }

    // Load the SoundFont
    const soundFontName = `${category}_${instrument}`;
    await soundFontLoader.loadSoundFont(config.url, soundFontName);

    // Generate samples based on configuration
    const samples = await this._generateSamplesForInstrument(config);
    
    // Create the appropriate sampler type
    let sampler;
    if (config.velocityLayers > 1) {
      sampler = soundFontLoader.createMultiVelocitySampler(samples);
    } else {
      sampler = soundFontLoader.createSampler(samples);
    }

    // Add instrument-specific enhancements
    const enhanced = this._addInstrumentEnhancements(sampler, config, category);
    
    return enhanced;
  }

  async _generateSamplesForInstrument(config) {
    // Generate note mappings based on instrument range and configuration
    const samples = {};
    const { noteRange, velocityLayers = 1 } = config;
    
    // For now, return a placeholder structure
    // In production, this would parse the actual SoundFont data
    const notes = this._generateNoteRange(noteRange.min, noteRange.max);
    
    for (const note of notes) {
      if (velocityLayers > 1) {
        samples[note] = {};
        for (let v = 1; v <= velocityLayers; v++) {
          samples[note][`v${v}`] = `${note}_v${v}.wav`;
        }
      } else {
        samples[note] = `${note}.wav`;
      }
    }
    
    return samples;
  }

  async _generatePianoSamples(config) {
    // Generate piano-specific sample mapping with multiple velocity layers
    const samples = {};
    const notes = this._generateNoteRange('A0', 'C8');
    
    for (const note of notes) {
      samples[note] = {};
      for (let v = 1; v <= config.velocityLayers; v++) {
        samples[note][`v${v}`] = `piano_${note}_v${v}.wav`;
      }
    }
    
    return { samples };
  }

  async _generateStringSamples(config) {
    const samples = {};
    const notes = this._generateNoteRange(config.noteRange.min, config.noteRange.max);
    
    for (const articulation of config.articulations) {
      samples[articulation] = {};
      for (const note of notes) {
        samples[articulation][note] = {};
        for (let v = 1; v <= config.velocityLayers; v++) {
          samples[articulation][note][`v${v}`] = `${articulation}_${note}_v${v}.wav`;
        }
      }
    }
    
    return samples;
  }

  _generateNoteRange(minNote, maxNote) {
    // Generate array of note names between min and max
    // This is a simplified version - in production, use proper music theory library
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const result = [];
    
    // For now, return a subset for demonstration
    for (let octave = 0; octave <= 8; octave++) {
      for (const note of notes) {
        result.push(`${note}${octave}`);
      }
    }
    
    return result.slice(21, 109); // Piano range A0-C8
  }

  _enhancePianoRealism(sampler, config) {
    const piano = {
      sampler,
      pedals: {
        sustain: false,
        soft: false,
        sostenuto: false
      },
      
      play: (note, velocity = 100, time, duration) => {
        // Apply pedal effects
        const modifiedVelocity = this.pedals.soft ? velocity * 0.7 : velocity;
        sampler.play(note, modifiedVelocity, time, duration);
        
        // Handle sustain pedal
        if (this.pedals.sustain && duration) {
          // Extend release time
          const extendedDuration = duration * 2;
          return extendedDuration;
        }
        return duration;
      },
      
      setPedal: (pedalType, value) => {
        if (config.pedals.includes(pedalType)) {
          piano.pedals[pedalType] = value;
        }
      },
      
      dispose: () => sampler.dispose()
    };

    return piano;
  }

  _enhanceStringRealism(sampler, config) {
    const strings = {
      sampler,
      currentArticulation: 'arco',
      
      setArticulation: (articulation) => {
        if (config.articulations.includes(articulation)) {
          strings.currentArticulation = articulation;
        }
      },
      
      play: (note, velocity = 100, time, duration) => {
        // Use current articulation
        const articulationSampler = sampler.samplers?.[strings.currentArticulation] || sampler;
        if (articulationSampler && articulationSampler.play) {
          articulationSampler.play(note, velocity, time, duration);
        } else if (articulationSampler && articulationSampler.triggerAttackRelease) {
          articulationSampler.triggerAttackRelease(note, duration, time, velocity / 127);
        } else {
          console.warn('String sampler missing play method, falling back to basic synthesis');
        }
      },
      
      addVibrato: (rate = 5, depth = 0.1) => {
        // Add vibrato effect
        const vibrato = this.registry.register(new Tone.Vibrato(rate, depth));
        sampler.chain(vibrato, Tone.Destination);
        return vibrato;
      },
      
      dispose: () => sampler.dispose()
    };

    return strings;
  }

  _addInstrumentEnhancements(sampler, config, category) {
    // Add category-specific enhancements
    switch (category) {
      case 'piano':
        return this._enhancePianoRealism(sampler, config);
      case 'strings':
        return this._enhanceStringRealism(sampler, config);
      case 'woodwinds':
        return this._enhanceWindRealism(sampler, config);
      case 'brass':
        return this._enhanceBrassRealism(sampler, config);
      default:
        return sampler;
    }
  }

  _enhanceWindRealism(sampler, config) {
    return {
      sampler,
      breathNoise: 0.1,
      
      setBreathNoise: (amount) => {
        this.breathNoise = Math.max(0, Math.min(1, amount));
      },
      
      play: (note, velocity, time, duration) => {
        // Add breath noise simulation
        sampler.play(note, velocity, time, duration);
      },
      
      dispose: () => sampler.dispose()
    };
  }

  _enhanceBrassRealism(sampler, config) {
    return {
      sampler,
      currentMute: 'open',
      
      setMute: (muteType) => {
        if (config.mutes?.includes(muteType)) {
          this.currentMute = muteType;
        }
      },
      
      play: (note, velocity, time, duration) => {
        // Apply mute effects
        const modifiedVelocity = this.currentMute !== 'open' ? velocity * 0.8 : velocity;
        sampler.play(note, modifiedVelocity, time, duration);
      },
      
      dispose: () => sampler.dispose()
    };
  }

  _createFallbackSynth(category, instrument) {
    // Create synthesized fallback when samples fail to load
    const key = `${category}:${instrument}`;
    
    if (this.fallbackSynths.has(key)) {
      return this.fallbackSynths.get(key);
    }

    let synth;
    
    switch (category) {
      case 'piano':
        synth = this._createFallbackPiano(instrument);
        break;
      case 'strings':
        synth = this._createFallbackStrings(instrument);
        break;
      default:
        synth = this.registry.register(new Tone.PolySynth());
    }
    
    this.fallbackSynths.set(key, synth);
    return synth;
  }

  _createFallbackPiano(type) {
    // Enhanced FM piano synthesis
    const synth = this.registry.register(new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2,
      modulationIndex: 20,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.8 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 }
    }));

    return {
      synth,
      play: (note, velocity, time, duration) => {
        synth.triggerAttackRelease(note, duration, time, velocity / 127);
      },
      dispose: () => synth.dispose()
    };
  }

  _createFallbackStrings(instrument) {
    // Enhanced sawtooth synthesis for strings
    const synth = this.registry.register(new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      filter: { frequency: 1000, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
      filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 0.7, baseFrequency: 200, octaves: 4 }
    }));

    return {
      synth,
      play: (note, velocity, time, duration) => {
        synth.triggerAttackRelease(note, duration, time, velocity / 127);
      },
      dispose: () => synth.dispose()
    };
  }
}

// Singleton instance
export const sampleLibrary = new SampleLibrary();