import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * ParallelProcessor - Advanced parallel processing capabilities
 * Enables New York compression, parallel saturation, and more
 */
export class ParallelProcessor {
  constructor() {
    this.registry = new DisposalRegistry('parallel-processor');
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Parallel chains
    this.chains = new Map();
    
    // Dry signal
    this.dryGain = this.registry.register(new Tone.Gain(1));
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    
    // Initialize common parallel chains
    this.initializeChains();
  }

  /**
   * Initialize common parallel processing chains
   */
  initializeChains() {
    // New York compression
    this.createChain('nyCompression', {
      processors: [
        {
          type: 'filter',
          params: { type: 'highpass', frequency: 100 }
        },
        {
          type: 'compressor',
          params: { 
            threshold: -30, 
            ratio: 10, 
            attack: 0.001, 
            release: 0.1,
            knee: 0 
          }
        },
        {
          type: 'eq',
          params: { 
            low: { freq: 100, gain: 3 },
            high: { freq: 10000, gain: 2 }
          }
        }
      ],
      wetLevel: -6
    });
    
    // Parallel saturation
    this.createChain('saturation', {
      processors: [
        {
          type: 'filter',
          params: { type: 'bandpass', frequency: 1000, Q: 0.5 }
        },
        {
          type: 'distortion',
          params: { distortion: 0.3, oversample: '2x' }
        },
        {
          type: 'filter',
          params: { type: 'lowpass', frequency: 8000 }
        }
      ],
      wetLevel: -12
    });
    
    // Parallel exciter
    this.createChain('exciter', {
      processors: [
        {
          type: 'filter',
          params: { type: 'highpass', frequency: 3000 }
        },
        {
          type: 'chebyshev',
          params: { order: 3 }
        },
        {
          type: 'filter',
          params: { type: 'highshelf', frequency: 8000, gain: 6 }
        }
      ],
      wetLevel: -15
    });
    
    // Sub harmonic enhancement
    this.createChain('subHarmonic', {
      processors: [
        {
          type: 'filter',
          params: { type: 'lowpass', frequency: 120 }
        },
        {
          type: 'pitchShift',
          params: { pitch: -12 }
        },
        {
          type: 'filter',
          params: { type: 'lowpass', frequency: 80 }
        }
      ],
      wetLevel: -18
    });
    
    // Width enhancement
    this.createChain('widener', {
      processors: [
        {
          type: 'filter',
          params: { type: 'highpass', frequency: 200 }
        },
        {
          type: 'stereoWidener',
          params: { width: 1.5 }
        },
        {
          type: 'delay',
          params: { 
            delayTime: 0.015,
            feedback: 0,
            wet: 0.5
          }
        }
      ],
      wetLevel: -9
    });
  }

  /**
   * Create a parallel processing chain
   * @param {string} name 
   * @param {Object} config 
   */
  createChain(name, config) {
    if (this.chains.has(name)) {
      console.warn(`Chain '${name}' already exists`);
      return;
    }
    
    const chain = new ProcessingChain(name, config);
    this.registry.register(chain);
    this.chains.set(name, chain);
    
    // Connect
    this.input.connect(chain.input);
    chain.connect(this.output);
    
    return chain;
  }

  /**
   * Remove a chain
   * @param {string} name 
   */
  removeChain(name) {
    const chain = this.chains.get(name);
    if (!chain) return;
    
    this.input.disconnect(chain.input);
    chain.disconnect();
    chain.dispose();
    this.chains.delete(name);
  }

  /**
   * Set chain parameters
   * @param {string} chainName 
   * @param {Object} params 
   */
  setChainParameters(chainName, params) {
    const chain = this.chains.get(chainName);
    if (!chain) return;
    
    chain.setParameters(params);
  }

  /**
   * Set chain enabled state
   * @param {string} chainName 
   * @param {boolean} enabled 
   */
  setChainEnabled(chainName, enabled) {
    const chain = this.chains.get(chainName);
    if (!chain) return;
    
    chain.setEnabled(enabled);
  }

  /**
   * Set chain wet level
   * @param {string} chainName 
   * @param {number} level in dB
   */
  setChainWetLevel(chainName, level) {
    const chain = this.chains.get(chainName);
    if (!chain) return;
    
    chain.setWetLevel(level);
  }

  /**
   * Set dry level
   * @param {number} level in dB
   */
  setDryLevel(level) {
    this.dryGain.gain.value = Math.pow(10, level / 20);
  }

  /**
   * Get all chain states
   * @returns {Object}
   */
  getChainStates() {
    const states = {};
    
    this.chains.forEach((chain, name) => {
      states[name] = chain.getState();
    });
    
    return states;
  }

  /**
   * Create preset
   * @returns {Object}
   */
  createPreset() {
    return {
      dryLevel: 20 * Math.log10(this.dryGain.gain.value),
      chains: this.getChainStates()
    };
  }

  /**
   * Load preset
   * @param {Object} preset 
   */
  loadPreset(preset) {
    if (preset.dryLevel !== undefined) {
      this.setDryLevel(preset.dryLevel);
    }
    
    if (preset.chains) {
      Object.entries(preset.chains).forEach(([name, state]) => {
        const chain = this.chains.get(name);
        if (chain) {
          chain.loadState(state);
        }
      });
    }
  }

  /**
   * Connect to destination
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.output.connect(destination);
    return this;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.output.disconnect();
    return this;
  }

  /**
   * Dispose
   */
  dispose() {
    this.chains.forEach(chain => chain.dispose());
    this.chains.clear();
    this.registry.dispose();
  }
}

/**
 * Individual processing chain
 */
class ProcessingChain {
  constructor(name, config = {}) {
    this.registry = new DisposalRegistry(`chain-${name}`);
    this.name = name;
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Processors
    this.processors = [];
    
    // Wet level control
    this.wetGain = this.registry.register(new Tone.Gain(1));
    
    // Enable/bypass
    this.enableGain = this.registry.register(new Tone.Gain(1));
    
    // Build chain
    this.buildChain(config.processors || []);
    
    // Set initial wet level
    this.setWetLevel(config.wetLevel || 0);
    
    // Connect final stage
    const lastProcessor = this.processors[this.processors.length - 1] || this.input;
    lastProcessor.connect(this.wetGain);
    this.wetGain.connect(this.enableGain);
    this.enableGain.connect(this.output);
    
    // State
    this.enabled = true;
    this.parameters = {};
  }

  /**
   * Build processing chain
   * @param {Array} processorConfigs 
   */
  buildChain(processorConfigs) {
    let current = this.input;
    
    processorConfigs.forEach((config, index) => {
      const processor = this.createProcessor(config.type, config.params);
      if (processor) {
        this.registry.register(processor);
        this.processors.push(processor);
        
        current.connect(processor.input || processor);
        current = processor.output || processor;
        
        // Store parameters
        this.parameters[`processor${index}`] = config.params || {};
      }
    });
  }

  /**
   * Create a processor
   * @param {string} type 
   * @param {Object} params 
   * @returns {Tone.ToneAudioNode}
   */
  createProcessor(type, params = {}) {
    switch (type) {
      case 'compressor':
        return new Tone.Compressor(params);
        
      case 'filter':
        return new Tone.Filter(params);
        
      case 'eq':
        return this.createEQ(params);
        
      case 'distortion':
        return new Tone.Distortion(params);
        
      case 'chebyshev':
        return new Tone.Chebyshev(params);
        
      case 'pitchShift':
        try {
          return new Tone.PitchShift(params);
        } catch (error) {
          console.warn('PitchShift failed in ParallelProcessor, using filter fallback:', error.message);
          return new Tone.Filter(440, 'bandpass');
        }
        
      case 'stereoWidener':
        return new Tone.StereoWidener(params);
        
      case 'delay':
        try {
          return new Tone.FeedbackDelay(params);
        } catch (error) {
          console.warn('FeedbackDelay failed in ParallelProcessor, using basic delay:', error.message);
          return new Tone.Delay(params.delayTime || 0.1);
        }
        
      case 'reverb':
        return new Tone.Reverb(params);
        
      case 'chorus':
        return new Tone.Chorus(params);
        
      case 'phaser':
        return new Tone.Phaser(params);
        
      default:
        console.warn(`Unknown processor type: ${type}`);
        return null;
    }
  }

  /**
   * Create EQ processor
   * @param {Object} params 
   * @returns {Object}
   */
  createEQ(params) {
    const eq = {
      input: this.registry.register(new Tone.Gain(1)),
      output: this.registry.register(new Tone.Gain(1))
    };
    
    let current = eq.input;
    
    // Low shelf
    if (params.low) {
      const lowShelf = this.registry.register(new Tone.Filter({
        type: 'lowshelf',
        frequency: params.low.freq || 100,
        gain: params.low.gain || 0
      }));
      current.connect(lowShelf);
      current = lowShelf;
    }
    
    // Mid bands
    if (params.mid) {
      const midBands = Array.isArray(params.mid) ? params.mid : [params.mid];
      midBands.forEach(band => {
        const filter = this.registry.register(new Tone.Filter({
          type: 'peaking',
          frequency: band.freq || 1000,
          Q: band.Q || 1,
          gain: band.gain || 0
        }));
        current.connect(filter);
        current = filter;
      });
    }
    
    // High shelf
    if (params.high) {
      const highShelf = this.registry.register(new Tone.Filter({
        type: 'highshelf',
        frequency: params.high.freq || 10000,
        gain: params.high.gain || 0
      }));
      current.connect(highShelf);
      current = highShelf;
    }
    
    current.connect(eq.output);
    
    return eq;
  }

  /**
   * Set chain parameters
   * @param {Object} params 
   */
  setParameters(params) {
    Object.assign(this.parameters, params);
    
    // Update processor parameters
    // This would need more detailed implementation
    // based on processor types and parameter mapping
  }

  /**
   * Set enabled state
   * @param {boolean} enabled 
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.enableGain.gain.rampTo(enabled ? 1 : 0, 0.05);
  }

  /**
   * Set wet level
   * @param {number} level in dB
   */
  setWetLevel(level) {
    this.wetGain.gain.value = Math.pow(10, level / 20);
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      enabled: this.enabled,
      wetLevel: 20 * Math.log10(this.wetGain.gain.value),
      parameters: { ...this.parameters }
    };
  }

  /**
   * Load state
   * @param {Object} state 
   */
  loadState(state) {
    if (state.enabled !== undefined) {
      this.setEnabled(state.enabled);
    }
    
    if (state.wetLevel !== undefined) {
      this.setWetLevel(state.wetLevel);
    }
    
    if (state.parameters) {
      this.setParameters(state.parameters);
    }
  }

  /**
   * Connect to destination
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.output.connect(destination);
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.output.disconnect();
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Parallel processing presets
 */
export const parallelPresets = {
  drums: {
    dryLevel: 0,
    chains: {
      nyCompression: {
        enabled: true,
        wetLevel: -6,
        parameters: {
          processor1: { threshold: -25, ratio: 12 }
        }
      },
      saturation: {
        enabled: true,
        wetLevel: -12,
        parameters: {
          processor1: { distortion: 0.2 }
        }
      },
      exciter: {
        enabled: false,
        wetLevel: -15
      }
    }
  },
  
  vocals: {
    dryLevel: 0,
    chains: {
      nyCompression: {
        enabled: true,
        wetLevel: -9,
        parameters: {
          processor1: { threshold: -20, ratio: 6 }
        }
      },
      exciter: {
        enabled: true,
        wetLevel: -12,
        parameters: {}
      },
      widener: {
        enabled: true,
        wetLevel: -15
      }
    }
  },
  
  bass: {
    dryLevel: 0,
    chains: {
      saturation: {
        enabled: true,
        wetLevel: -9,
        parameters: {
          processor1: { distortion: 0.15 }
        }
      },
      subHarmonic: {
        enabled: true,
        wetLevel: -12,
        parameters: {}
      }
    }
  },
  
  master: {
    dryLevel: 0,
    chains: {
      nyCompression: {
        enabled: true,
        wetLevel: -12,
        parameters: {
          processor1: { threshold: -15, ratio: 4 }
        }
      },
      exciter: {
        enabled: true,
        wetLevel: -18,
        parameters: {}
      },
      widener: {
        enabled: true,
        wetLevel: -15,
        parameters: {}
      }
    }
  }
};

// Factory function
export function createParallelProcessor() {
  return new ParallelProcessor();
}