/**
 * SoundFont Loading System for Music2
 * Supports .sf2 and .sfz formats with memory management
 */

import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import * as Tone from 'tone';

export class SoundFontLoader {
  constructor() {
    this.registry = new DisposalRegistry('SoundFontLoader');
    this.loadedSoundFonts = new Map();
    this.sampleCache = new Map();
    this.loadPromises = new Map();
  }

  /**
   * Load a SoundFont file (.sf2 or .sfz)
   * @param {string} url - URL to the SoundFont file
   * @param {string} name - Unique identifier for this SoundFont
   * @returns {Promise<Object>} Parsed SoundFont data
   */
  async loadSoundFont(url, name) {
    if (this.loadedSoundFonts.has(name)) {
      return this.loadedSoundFonts.get(name);
    }

    if (this.loadPromises.has(name)) {
      return await this.loadPromises.get(name);
    }

    const loadPromise = this._loadSoundFontFile(url, name);
    this.loadPromises.set(name, loadPromise);

    try {
      const soundFont = await loadPromise;
      this.loadedSoundFonts.set(name, soundFont);
      this.loadPromises.delete(name);
      return soundFont;
    } catch (error) {
      this.loadPromises.delete(name);
      throw error;
    }
  }

  /**
   * Load individual samples from a SoundFont
   * @param {string} soundFontName - Name of the loaded SoundFont
   * @param {Object} config - Sample configuration
   * @returns {Promise<Object>} Tone.js Sampler configuration
   */
  async loadSamples(soundFontName, config) {
    const soundFont = this.loadedSoundFonts.get(soundFontName);
    if (!soundFont) {
      throw new Error(`SoundFont '${soundFontName}' not loaded`);
    }

    const samples = {};
    const velocityLayers = config.velocityLayers || 1;

    for (const [note, sampleData] of Object.entries(config.noteMap)) {
      if (velocityLayers > 1) {
        samples[note] = {};
        for (let v = 1; v <= velocityLayers; v++) {
          const velocityKey = `v${v}`;
          const sampleUrl = this._getSampleUrl(soundFont, sampleData, v);
          samples[note][velocityKey] = await this._loadAudioBuffer(sampleUrl);
        }
      } else {
        const sampleUrl = this._getSampleUrl(soundFont, sampleData);
        samples[note] = await this._loadAudioBuffer(sampleUrl);
      }
    }

    return samples;
  }

  /**
   * Create a Tone.js Sampler from loaded samples
   * @param {Object} samples - Sample configuration
   * @param {Object} options - Sampler options
   * @returns {Tone.Sampler} Configured Sampler instance
   */
  createSampler(samples, options = {}) {
    // Validate samples parameter
    if (!samples || typeof samples !== 'object' || Object.keys(samples).length === 0) {
      console.warn('Invalid or empty samples object, creating fallback synthesizer');
      return this.registry.register(new Tone.PolySynth(Tone.Synth));
    }

    // Clean samples object - remove any null/undefined values
    const cleanSamples = {};
    Object.entries(samples).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        cleanSamples[key] = value;
      }
    });

    if (Object.keys(cleanSamples).length === 0) {
      console.warn('No valid samples after cleaning, creating fallback synthesizer');
      return this.registry.register(new Tone.PolySynth(Tone.Synth));
    }

    const defaultOptions = {
      release: 0.1,
      baseUrl: '',
      onload: () => console.log('Samples loaded'),
      onerror: (error) => console.error('Sample loading error:', error),
    };

    // Filter out null/undefined values that can cause Tone.js errors
    const cleanOptions = {};
    Object.entries({ ...defaultOptions, ...options }).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        cleanOptions[key] = value;
      }
    });

    // Ensure no null/undefined values in the final options
    const samplerOptions = { ...cleanOptions, urls: cleanSamples };
    
    try {
      const sampler = this.registry.register(new Tone.Sampler(samplerOptions));
      return sampler;
    } catch (error) {
      console.warn('Failed to create Tone.Sampler, creating fallback:', error);
      // Return a simple PolySynth as fallback with enhanced interface
      const fallbackSynth = this.registry.register(new Tone.PolySynth(Tone.Synth));
      
      // Add missing methods that orchestral instruments expect
      fallbackSynth.play = function(note, velocity = 100, time = '+0', duration = '4n') {
        this.triggerAttackRelease(note, duration, time, velocity / 127);
      };
      
      fallbackSynth.setArticulation = function(articulation) {
        // No-op for basic synth
      };
      
      fallbackSynth.addVibrato = function(rate, depth) {
        // No-op for basic synth
      };
      
      return fallbackSynth;
    }
  }

  /**
   * Create a multi-velocity sampler for realistic dynamics
   * @param {Object} velocityLayers - Samples organized by velocity
   * @param {Object} options - Sampler options
   * @returns {Object} Multi-velocity sampler system
   */
  createMultiVelocitySampler(velocityLayers, options = {}) {
    const samplers = {};
    const velocityRanges = this._calculateVelocityRanges(Object.keys(velocityLayers));

    for (const [velocityKey, samples] of Object.entries(velocityLayers)) {
      samplers[velocityKey] = this.createSampler(samples, {
        ...options,
        volume: this._getVelocityVolume(velocityKey)
      });
    }

    return {
      samplers,
      velocityRanges,
      play: (note, velocity = 127, time, duration) => {
        const velocityKey = this._getVelocityLayer(velocity, velocityRanges);
        const sampler = samplers[velocityKey];
        
        if (sampler) {
          sampler.triggerAttackRelease(note, duration, time, velocity / 127);
        }
      },
      dispose: () => {
        Object.values(samplers).forEach(sampler => sampler.dispose());
      }
    };
  }

  /**
   * Preload samples for immediate playback
   * @param {Array<string>} sampleUrls - URLs of samples to preload
   * @returns {Promise<void>}
   */
  async preloadSamples(sampleUrls) {
    const loadPromises = sampleUrls.map(url => this._loadAudioBuffer(url));
    await Promise.all(loadPromises);
  }

  /**
   * Clear sample cache to free memory
   * @param {string} pattern - Optional pattern to match for selective clearing
   */
  clearCache(pattern) {
    if (pattern) {
      for (const [key, buffer] of this.sampleCache.entries()) {
        if (key.includes(pattern)) {
          this.sampleCache.delete(key);
        }
      }
    } else {
      this.sampleCache.clear();
    }
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    let totalSize = 0;
    let sampleCount = 0;

    for (const [key, buffer] of this.sampleCache.entries()) {
      if (buffer instanceof AudioBuffer) {
        totalSize += buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32
        sampleCount++;
      }
    }

    return {
      totalSizeMB: totalSize / (1024 * 1024),
      sampleCount,
      loadedSoundFonts: this.loadedSoundFonts.size,
      cachedSamples: this.sampleCache.size
    };
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clearCache();
    this.loadedSoundFonts.clear();
    this.loadPromises.clear();
    this.registry.dispose();
  }

  // Private methods

  async _loadSoundFontFile(url, name) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load SoundFont: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (url.endsWith('.sf2')) {
        return await this._parseSF2(arrayBuffer, name);
      } else if (url.endsWith('.sfz')) {
        return await this._parseSFZ(arrayBuffer, name);
      } else {
        throw new Error(`Unsupported SoundFont format: ${url}`);
      }
    } catch (error) {
      console.error(`Error loading SoundFont ${name}:`, error);
      throw error;
    }
  }

  async _parseSF2(arrayBuffer, name) {
    // Simplified SF2 parsing - in production, use a proper SF2 library
    // This is a placeholder that demonstrates the structure
    return {
      name,
      type: 'sf2',
      data: arrayBuffer,
      instruments: [],
      samples: new Map(),
      presets: []
    };
  }

  async _parseSFZ(arrayBuffer, name) {
    // Simplified SFZ parsing - in production, use a proper SFZ library
    const text = new TextDecoder().decode(arrayBuffer);
    return {
      name,
      type: 'sfz',
      text,
      regions: [],
      samples: new Map()
    };
  }

  _getSampleUrl(soundFont, sampleData, velocity = 1) {
    // Generate sample URL based on SoundFont data and velocity layer
    if (soundFont.type === 'sf2') {
      return `data:audio/wav;base64,${sampleData.data}`;
    } else {
      return sampleData.file || sampleData.url;
    }
  }

  async _loadAudioBuffer(url) {
    if (this.sampleCache.has(url)) {
      return this.sampleCache.get(url);
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer);
      
      this.sampleCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load audio buffer: ${url}`, error);
      throw error;
    }
  }

  _calculateVelocityRanges(velocityKeys) {
    const ranges = {};
    const numLayers = velocityKeys.length;
    
    velocityKeys.forEach((key, index) => {
      const min = Math.floor((index / numLayers) * 127);
      const max = Math.floor(((index + 1) / numLayers) * 127);
      ranges[key] = { min, max };
    });

    return ranges;
  }

  _getVelocityLayer(velocity, ranges) {
    for (const [key, range] of Object.entries(ranges)) {
      if (velocity >= range.min && velocity <= range.max) {
        return key;
      }
    }
    return Object.keys(ranges)[0]; // fallback
  }

  _getVelocityVolume(velocityKey) {
    // Extract velocity number from key like 'v1', 'v2', etc.
    const velocityNum = parseInt(velocityKey.replace('v', ''));
    return -12 + (velocityNum - 1) * 4; // dB scaling
  }
}

// Singleton instance
export const soundFontLoader = new SoundFontLoader();