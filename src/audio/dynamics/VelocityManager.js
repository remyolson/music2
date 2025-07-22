import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { SampleLibrary } from '../samples/SampleLibrary.js';

/**
 * VelocityManager - Handles multi-layer velocity switching and crossfading
 * Provides realistic velocity response for natural instruments
 */
export class VelocityManager {
  constructor(instrumentType) {
    this.instrumentType = instrumentType;
    this.registry = new DisposalRegistry(`velocity-${instrumentType}`);
    
    // Velocity layers storage
    this.velocityLayers = new Map();
    this.layerThresholds = [];
    this.currentLayer = null;
    
    // Crossfade settings
    this.crossfadeEnabled = true;
    this.crossfadeRange = 0.1; // Velocity range for crossfading
    
    // Velocity response curve
    this.velocityCurve = 'natural';
    this.curveParameters = {
      gamma: 1.0,
      min: 0.0,
      max: 1.0
    };
    
    // Dynamic range settings
    this.dynamicRange = {
      min: -60, // dB
      max: 0    // dB
    };
    
    // Round-robin settings for repeated notes
    this.roundRobinEnabled = false;
    this.roundRobinIndex = 0;
    this.roundRobinSamples = new Map();
  }

  /**
   * Initialize velocity layers for an instrument
   * @param {Object} config - Velocity layer configuration
   * @returns {Promise<void>}
   */
  async initialize(config) {
    const { layers = [], crossfade = true, roundRobin = false } = config;
    
    this.crossfadeEnabled = crossfade;
    this.roundRobinEnabled = roundRobin;
    
    // Sort layers by velocity threshold
    const sortedLayers = [...layers].sort((a, b) => a.threshold - b.threshold);
    
    // Load each velocity layer
    for (const layer of sortedLayers) {
      await this.loadVelocityLayer(layer);
    }
    
    // Set initial layer
    if (this.layerThresholds.length > 0) {
      this.currentLayer = this.velocityLayers.get(this.layerThresholds[0]);
    }
  }

  /**
   * Load a single velocity layer
   * @param {Object} layerConfig 
   * @returns {Promise<void>}
   */
  async loadVelocityLayer(layerConfig) {
    const { threshold, samples, synthConfig, name = `layer_${threshold}` } = layerConfig;
    
    const layer = {
      threshold,
      name,
      sources: new Map(),
      volume: this.registry.register(new Tone.Volume(0)),
      active: false
    };
    
    // Load samples if provided
    if (samples) {
      for (const [note, samplePath] of Object.entries(samples)) {
        try {
          const buffer = await SampleLibrary.loadSample(samplePath);
          const sampler = this.registry.register(new Tone.Sampler({
            [note]: buffer
          }));
          
          sampler.connect(layer.volume);
          layer.sources.set(note, sampler);
        } catch (error) {
          console.warn(`Failed to load sample for ${note} in layer ${name}:`, error);
        }
      }
    }
    
    // Create synth fallback if no samples or as backup
    if (synthConfig || layer.sources.size === 0) {
      const synth = this.createSynthForLayer(synthConfig || {});
      synth.connect(layer.volume);
      layer.sources.set('synth', synth);
    }
    
    // Store layer
    this.velocityLayers.set(threshold, layer);
    this.layerThresholds.push(threshold);
    this.layerThresholds.sort((a, b) => a - b);
  }

  /**
   * Create synthesizer for a velocity layer
   * @param {Object} config 
   * @returns {Tone.Synth}
   */
  createSynthForLayer(config) {
    const synth = this.registry.register(new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 32,
      voice: {
        oscillator: config.oscillator || { type: 'sine' },
        envelope: config.envelope || {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5
        }
      }
    }));
    
    return synth;
  }

  /**
   * Select appropriate layers for a given velocity
   * @param {number} velocity - Normalized velocity (0-1)
   * @returns {Array} Active layers with mix levels
   */
  selectLayersForVelocity(velocity) {
    const activeLayers = [];
    
    // Apply velocity curve
    const curvedVelocity = this.applyVelocityCurve(velocity);
    
    if (!this.crossfadeEnabled) {
      // Simple layer switching
      let selectedThreshold = this.layerThresholds[0];
      
      for (const threshold of this.layerThresholds) {
        if (curvedVelocity >= threshold) {
          selectedThreshold = threshold;
        } else {
          break;
        }
      }
      
      activeLayers.push({
        layer: this.velocityLayers.get(selectedThreshold),
        level: 1.0
      });
    } else {
      // Crossfading between layers
      for (let i = 0; i < this.layerThresholds.length; i++) {
        const threshold = this.layerThresholds[i];
        const nextThreshold = this.layerThresholds[i + 1] || 1.0;
        
        if (curvedVelocity >= threshold - this.crossfadeRange && 
            curvedVelocity <= nextThreshold + this.crossfadeRange) {
          
          // Calculate crossfade amount
          let level = 1.0;
          
          if (i > 0 && curvedVelocity < threshold + this.crossfadeRange) {
            // Fade out as we approach next layer
            const fadeStart = threshold - this.crossfadeRange;
            const fadeRange = this.crossfadeRange * 2;
            level = 1.0 - ((curvedVelocity - fadeStart) / fadeRange);
          } else if (i < this.layerThresholds.length - 1 && 
                     curvedVelocity > nextThreshold - this.crossfadeRange) {
            // Fade in as we leave previous layer
            const fadeStart = nextThreshold - this.crossfadeRange;
            const fadeRange = this.crossfadeRange * 2;
            level = (curvedVelocity - fadeStart) / fadeRange;
          }
          
          if (level > 0.01) {
            activeLayers.push({
              layer: this.velocityLayers.get(threshold),
              level
            });
          }
        }
      }
    }
    
    return activeLayers;
  }

  /**
   * Play a note with velocity sensitivity
   * @param {string} note - Note to play
   * @param {number} velocity - Velocity (0-1)
   * @param {string} time - When to play
   * @param {number} duration - Note duration
   * @returns {Object} Active sources for stopping later
   */
  playNote(note, velocity, time = '+0', duration = '8n') {
    const activeSources = [];
    const activeLayers = this.selectLayersForVelocity(velocity);
    
    // Calculate volume based on velocity and dynamic range
    const dynamicVolume = this.calculateDynamicVolume(velocity);
    
    for (const { layer, level } of activeLayers) {
      // Set layer volume based on crossfade level and dynamics
      const layerVolume = dynamicVolume + Tone.gainToDb(level);
      layer.volume.volume.value = layerVolume;
      
      // Check if layer has specific sample for this note
      let source = layer.sources.get(note);
      
      // Fall back to synth if no sample
      if (!source) {
        source = layer.sources.get('synth');
      }
      
      if (source) {
        // Handle round-robin if enabled
        if (this.roundRobinEnabled && layer.sources.size > 1) {
          const rrSources = Array.from(layer.sources.values());
          source = rrSources[this.roundRobinIndex % rrSources.length];
          this.roundRobinIndex++;
        }
        
        // Play the source
        if (source.triggerAttackRelease) {
          source.triggerAttackRelease(note, duration, time, velocity);
        } else if (source.triggerAttack) {
          source.triggerAttack(note, time, velocity);
          Tone.Transport.scheduleOnce(() => {
            source.triggerRelease(note);
          }, `${time} + ${duration}`);
        }
        
        activeSources.push({ source, layer, note });
      }
    }
    
    return activeSources;
  }

  /**
   * Stop a note
   * @param {Array} activeSources - Sources returned from playNote
   * @param {string} time - When to stop
   */
  stopNote(activeSources, time = '+0') {
    for (const { source, note } of activeSources) {
      if (source.triggerRelease) {
        source.triggerRelease(note, time);
      }
    }
  }

  /**
   * Apply velocity curve transformation
   * @param {number} velocity - Raw velocity (0-1)
   * @returns {number} Transformed velocity
   */
  applyVelocityCurve(velocity) {
    switch (this.velocityCurve) {
      case 'linear':
        return velocity;
        
      case 'natural':
        // Natural instrument response (slightly compressed at extremes)
        return 0.5 + 0.4 * Math.tanh(3 * (velocity - 0.5));
        
      case 'compressed':
        // Compressed dynamic range
        return 0.3 + 0.4 * velocity;
        
      case 'expanded':
        // Expanded dynamic range
        return Math.pow(velocity, 1.5);
        
      case 'soft':
        // Easier to play soft
        return Math.pow(velocity, 0.7);
        
      case 'hard':
        // Harder to play soft
        return Math.pow(velocity, 2);
        
      case 'custom':
        // Custom curve with parameters
        const { gamma, min, max } = this.curveParameters;
        return min + (max - min) * Math.pow(velocity, gamma);
        
      default:
        return velocity;
    }
  }

  /**
   * Calculate dynamic volume based on velocity
   * @param {number} velocity - Velocity (0-1)
   * @returns {number} Volume in dB
   */
  calculateDynamicVolume(velocity) {
    const { min, max } = this.dynamicRange;
    return min + (max - min) * velocity;
  }

  /**
   * Set velocity curve type
   * @param {string} curve - Curve type
   * @param {Object} parameters - Curve parameters
   */
  setVelocityCurve(curve, parameters = {}) {
    this.velocityCurve = curve;
    if (curve === 'custom') {
      this.curveParameters = { ...this.curveParameters, ...parameters };
    }
  }

  /**
   * Set dynamic range
   * @param {number} minDb - Minimum volume in dB
   * @param {number} maxDb - Maximum volume in dB
   */
  setDynamicRange(minDb, maxDb) {
    this.dynamicRange.min = minDb;
    this.dynamicRange.max = maxDb;
  }

  /**
   * Enable/disable crossfading
   * @param {boolean} enabled 
   * @param {number} range - Crossfade range (0-0.5)
   */
  setCrossfade(enabled, range = 0.1) {
    this.crossfadeEnabled = enabled;
    this.crossfadeRange = Math.max(0, Math.min(0.5, range));
  }

  /**
   * Connect all layers to destination
   * @param {Tone.ToneNode} destination 
   */
  connect(destination) {
    for (const layer of this.velocityLayers.values()) {
      layer.volume.connect(destination);
    }
  }

  /**
   * Disconnect all layers
   */
  disconnect() {
    for (const layer of this.velocityLayers.values()) {
      layer.volume.disconnect();
    }
  }

  /**
   * Get velocity layer info
   * @returns {Array} Layer information
   */
  getLayerInfo() {
    return this.layerThresholds.map(threshold => {
      const layer = this.velocityLayers.get(threshold);
      return {
        threshold,
        name: layer.name,
        sourceCount: layer.sources.size,
        active: layer.active
      };
    });
  }

  /**
   * Clean up and dispose
   */
  dispose() {
    // Disconnect all layers
    this.disconnect();
    
    // Clear maps
    this.velocityLayers.clear();
    this.layerThresholds = [];
    this.roundRobinSamples.clear();
    
    // Dispose registry
    this.registry.dispose();
  }
}

/**
 * Velocity configuration presets for different instrument types
 */
export const VELOCITY_PRESETS = {
  piano: {
    layers: [
      { threshold: 0.0, name: 'pp', synthConfig: { oscillator: { type: 'sine' } } },
      { threshold: 0.25, name: 'p', synthConfig: { oscillator: { type: 'triangle' } } },
      { threshold: 0.5, name: 'mf', synthConfig: { oscillator: { type: 'sawtooth4' } } },
      { threshold: 0.75, name: 'f', synthConfig: { oscillator: { type: 'sawtooth8' } } },
      { threshold: 0.9, name: 'ff', synthConfig: { oscillator: { type: 'square' } } }
    ],
    crossfade: true,
    velocityCurve: 'natural',
    dynamicRange: { min: -50, max: 0 }
  },
  
  strings: {
    layers: [
      { threshold: 0.0, name: 'pp', synthConfig: { envelope: { attack: 0.1 } } },
      { threshold: 0.3, name: 'p', synthConfig: { envelope: { attack: 0.05 } } },
      { threshold: 0.6, name: 'f', synthConfig: { envelope: { attack: 0.02 } } },
      { threshold: 0.85, name: 'ff', synthConfig: { envelope: { attack: 0.01 } } }
    ],
    crossfade: true,
    velocityCurve: 'soft',
    dynamicRange: { min: -40, max: 0 }
  },
  
  brass: {
    layers: [
      { threshold: 0.0, name: 'p', synthConfig: { oscillator: { type: 'sawtooth' } } },
      { threshold: 0.4, name: 'mf', synthConfig: { oscillator: { type: 'square' } } },
      { threshold: 0.7, name: 'f', synthConfig: { oscillator: { type: 'pulse' } } },
      { threshold: 0.9, name: 'ff', synthConfig: { oscillator: { type: 'pwm' } } }
    ],
    crossfade: true,
    velocityCurve: 'hard',
    dynamicRange: { min: -35, max: 5 }
  },
  
  winds: {
    layers: [
      { threshold: 0.0, name: 'pp', synthConfig: { oscillator: { type: 'sine' } } },
      { threshold: 0.35, name: 'p', synthConfig: { oscillator: { type: 'triangle' } } },
      { threshold: 0.65, name: 'f', synthConfig: { oscillator: { type: 'sawtooth' } } },
      { threshold: 0.85, name: 'ff', synthConfig: { oscillator: { type: 'square' } } }
    ],
    crossfade: true,
    velocityCurve: 'natural',
    dynamicRange: { min: -45, max: 0 }
  }
};