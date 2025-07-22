import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * Helper function to create FeedbackDelay with error handling
 * @param {Object} options - Delay options
 * @param {string} fallbackName - Name for logging
 * @returns {Object} FeedbackDelay or fallback Delay
 */
function createFeedbackDelaySafe(options, fallbackName = 'Effect') {
  try {
    return new Tone.FeedbackDelay(options);
  } catch (error) {
    console.warn(`${fallbackName} FeedbackDelay failed, using basic delay:`, error.message);
    return new Tone.Delay(options.delayTime || 0.1);
  }
}
import { ConvolutionReverb } from './ConvolutionReverb.js';

/**
 * ReverbSuite - Collection of professional reverb types
 * Includes Hall, Chamber, Room, Plate, and Spring reverbs
 */
export class ReverbSuite {
  constructor() {
    this.registry = new DisposalRegistry('reverb-suite');
    
    // Available reverb types
    this.reverbTypes = new Map();
    
    // Initialize reverb types
    this.initializeReverbs();
    
    // Current active reverb
    this.activeReverb = null;
    this.activeType = null;
    
    // Input/output nodes
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Set default reverb
    this.selectReverb('hall');
  }

  /**
   * Initialize all reverb types
   */
  initializeReverbs() {
    // Hall Reverb
    this.reverbTypes.set('hall', {
      create: () => this.createHallReverb(),
      presets: {
        small: {
          roomSize: 0.6,
          decay: 1.5,
          preDelay: 0.02,
          damping: 0.7,
          wet: 0.3
        },
        medium: {
          roomSize: 0.8,
          decay: 2.5,
          preDelay: 0.04,
          damping: 0.6,
          wet: 0.35
        },
        large: {
          roomSize: 0.95,
          decay: 4.0,
          preDelay: 0.08,
          damping: 0.5,
          wet: 0.4
        },
        cathedral: {
          roomSize: 0.99,
          decay: 6.0,
          preDelay: 0.1,
          damping: 0.4,
          wet: 0.5
        }
      }
    });
    
    // Chamber Reverb
    this.reverbTypes.set('chamber', {
      create: () => this.createChamberReverb(),
      presets: {
        small: {
          roomSize: 0.4,
          decay: 0.8,
          preDelay: 0.01,
          damping: 0.8,
          diffusion: 0.7,
          wet: 0.25
        },
        medium: {
          roomSize: 0.6,
          decay: 1.2,
          preDelay: 0.02,
          damping: 0.7,
          diffusion: 0.8,
          wet: 0.3
        },
        large: {
          roomSize: 0.75,
          decay: 1.8,
          preDelay: 0.03,
          damping: 0.65,
          diffusion: 0.85,
          wet: 0.35
        }
      }
    });
    
    // Room Reverb
    this.reverbTypes.set('room', {
      create: () => this.createRoomReverb(),
      presets: {
        bedroom: {
          roomSize: 0.2,
          decay: 0.4,
          preDelay: 0.005,
          damping: 0.9,
          earlyReflections: 0.8,
          wet: 0.15
        },
        studio: {
          roomSize: 0.35,
          decay: 0.6,
          preDelay: 0.008,
          damping: 0.85,
          earlyReflections: 0.7,
          wet: 0.2
        },
        livingRoom: {
          roomSize: 0.5,
          decay: 0.8,
          preDelay: 0.01,
          damping: 0.8,
          earlyReflections: 0.6,
          wet: 0.25
        }
      }
    });
    
    // Plate Reverb
    this.reverbTypes.set('plate', {
      create: () => this.createPlateReverb(),
      presets: {
        vintage: {
          decay: 2.0,
          preDelay: 0.01,
          damping: 0.5,
          brightness: 0.8,
          modulation: 0.1,
          wet: 0.35
        },
        modern: {
          decay: 1.5,
          preDelay: 0.005,
          damping: 0.6,
          brightness: 0.9,
          modulation: 0.05,
          wet: 0.3
        },
        lush: {
          decay: 3.0,
          preDelay: 0.02,
          damping: 0.4,
          brightness: 0.7,
          modulation: 0.15,
          wet: 0.4
        }
      }
    });
    
    // Spring Reverb
    this.reverbTypes.set('spring', {
      create: () => this.createSpringReverb(),
      presets: {
        guitarAmp: {
          decay: 1.2,
          tension: 0.7,
          damping: 0.6,
          bounce: 0.8,
          wet: 0.3
        },
        vintage: {
          decay: 1.5,
          tension: 0.6,
          damping: 0.5,
          bounce: 0.9,
          wet: 0.35
        },
        surf: {
          decay: 2.0,
          tension: 0.5,
          damping: 0.4,
          bounce: 0.95,
          wet: 0.45
        }
      }
    });
  }

  /**
   * Create Hall Reverb
   */
  createHallReverb() {
    const reverb = new HallReverb();
    this.registry.register(reverb);
    return reverb;
  }

  /**
   * Create Chamber Reverb
   */
  createChamberReverb() {
    const reverb = new ChamberReverb();
    this.registry.register(reverb);
    return reverb;
  }

  /**
   * Create Room Reverb
   */
  createRoomReverb() {
    const reverb = new RoomReverb();
    this.registry.register(reverb);
    return reverb;
  }

  /**
   * Create Plate Reverb
   */
  createPlateReverb() {
    const reverb = new PlateReverb();
    this.registry.register(reverb);
    return reverb;
  }

  /**
   * Create Spring Reverb
   */
  createSpringReverb() {
    const reverb = new SpringReverb();
    this.registry.register(reverb);
    return reverb;
  }

  /**
   * Select and activate a reverb type
   * @param {string} type 
   */
  selectReverb(type) {
    const reverbConfig = this.reverbTypes.get(type);
    if (!reverbConfig) {
      console.warn(`Unknown reverb type: ${type}`);
      return;
    }
    
    // Disconnect current reverb
    if (this.activeReverb) {
      this.input.disconnect(this.activeReverb.input);
      this.activeReverb.disconnect();
    }
    
    // Create and connect new reverb
    this.activeReverb = reverbConfig.create();
    this.activeType = type;
    
    this.input.connect(this.activeReverb.input);
    this.activeReverb.connect(this.output);
  }

  /**
   * Load a preset for the current reverb
   * @param {string} presetName 
   */
  loadPreset(presetName) {
    if (!this.activeType || !this.activeReverb) return;
    
    const reverbConfig = this.reverbTypes.get(this.activeType);
    const preset = reverbConfig.presets[presetName];
    
    if (!preset) {
      console.warn(`Unknown preset '${presetName}' for reverb type '${this.activeType}'`);
      return;
    }
    
    this.activeReverb.setParameters(preset);
  }

  /**
   * Get available presets for current reverb
   * @returns {Array}
   */
  getAvailablePresets() {
    if (!this.activeType) return [];
    
    const reverbConfig = this.reverbTypes.get(this.activeType);
    return Object.keys(reverbConfig.presets);
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
   * Clean up
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Hall Reverb - Large space simulation
 */
class HallReverb {
  constructor() {
    this.registry = new DisposalRegistry('hall-reverb');
    
    // Main reverb
    this.reverb = this.registry.register(new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.04
    }));
    
    // Additional processing
    this.filter = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 100
    }));
    
    this.damping = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 4000
    }));
    
    // Modulation for movement
    this.chorus = this.registry.register(new Tone.Chorus({
      frequency: 0.5,
      delayTime: 3.5,
      depth: 0.3,
      spread: 180,
      wet: 0.2
    }));
    
    // Gain stages
    this.inputGain = this.registry.register(new Tone.Gain(1));
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Dry/wet
    this.dryGain = this.registry.register(new Tone.Gain(0.7));
    this.wetGain = this.registry.register(new Tone.Gain(0.3));
    
    // Connect
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet path
    this.inputGain.connect(this.filter);
    this.filter.connect(this.reverb);
    this.reverb.connect(this.damping);
    this.damping.connect(this.chorus);
    this.chorus.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Initialize reverb
    this.reverb.generate();
  }

  setParameters(params) {
    if (params.roomSize !== undefined) {
      // Map room size to decay
      this.reverb.decay = params.roomSize * 6;
    }
    if (params.decay !== undefined) {
      this.reverb.decay = params.decay;
    }
    if (params.preDelay !== undefined) {
      this.reverb.preDelay = params.preDelay;
    }
    if (params.damping !== undefined) {
      this.damping.frequency.value = 8000 * (1 - params.damping);
    }
    if (params.wet !== undefined) {
      this.wetGain.gain.value = params.wet;
      this.dryGain.gain.value = 1 - params.wet;
    }
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Chamber Reverb - Medium space with character
 */
class ChamberReverb {
  constructor() {
    this.registry = new DisposalRegistry('chamber-reverb');
    
    // Multiple short reverbs for complexity
    this.reverb1 = this.registry.register(new Tone.Reverb({
      decay: 0.8,
      preDelay: 0.01
    }));
    
    this.reverb2 = this.registry.register(new Tone.Reverb({
      decay: 1.2,
      preDelay: 0.02
    }));
    
    // Filters
    this.highpass = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 200
    }));
    
    this.lowpass = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 6000
    }));
    
    // Diffusion network
    this.allpass1 = this.registry.register(new Tone.MultibandSplit({
      lowFrequency: 400,
      highFrequency: 2500
    }));
    
    // Gains
    this.inputGain = this.registry.register(new Tone.Gain(1));
    this.outputGain = this.registry.register(new Tone.Gain(1));
    this.dryGain = this.registry.register(new Tone.Gain(0.7));
    this.wetGain = this.registry.register(new Tone.Gain(0.3));
    
    // Connect
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet - parallel reverbs
    this.inputGain.connect(this.highpass);
    this.highpass.fan(this.reverb1, this.reverb2);
    this.reverb1.connect(this.lowpass);
    this.reverb2.connect(this.lowpass);
    this.lowpass.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Initialize
    this.reverb1.generate();
    this.reverb2.generate();
  }

  setParameters(params) {
    if (params.roomSize !== undefined) {
      this.reverb1.decay = params.roomSize * 1.5;
      this.reverb2.decay = params.roomSize * 2;
    }
    if (params.decay !== undefined) {
      this.reverb1.decay = params.decay * 0.7;
      this.reverb2.decay = params.decay;
    }
    if (params.preDelay !== undefined) {
      this.reverb1.preDelay = params.preDelay;
      this.reverb2.preDelay = params.preDelay * 1.5;
    }
    if (params.damping !== undefined) {
      this.lowpass.frequency.value = 8000 * (1 - params.damping);
    }
    if (params.diffusion !== undefined) {
      // Adjust filter frequencies for diffusion
      this.highpass.frequency.value = 200 - (params.diffusion * 100);
    }
    if (params.wet !== undefined) {
      this.wetGain.gain.value = params.wet;
      this.dryGain.gain.value = 1 - params.wet;
    }
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Room Reverb - Small space simulation
 */
class RoomReverb {
  constructor() {
    this.registry = new DisposalRegistry('room-reverb');
    
    // Short reverb
    this.reverb = this.registry.register(new Tone.Reverb({
      decay: 0.5,
      preDelay: 0.005
    }));
    
    // Early reflections
    this.earlyReflections = this.registry.register(createFeedbackDelaySafe({
      delayTime: 0.02,
      feedback: 0.2,
      wet: 0.5
    }, 'PlateReverb Early Reflections'));
    
    // Room character
    this.roomFilter = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 1000,
      Q: 0.5
    }));
    
    // Gains
    this.inputGain = this.registry.register(new Tone.Gain(1));
    this.outputGain = this.registry.register(new Tone.Gain(1));
    this.dryGain = this.registry.register(new Tone.Gain(0.8));
    this.wetGain = this.registry.register(new Tone.Gain(0.2));
    this.earlyGain = this.registry.register(new Tone.Gain(0.3));
    
    // Connect
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Early reflections
    this.inputGain.connect(this.earlyReflections);
    this.earlyReflections.connect(this.earlyGain);
    this.earlyGain.connect(this.outputGain);
    
    // Main reverb
    this.inputGain.connect(this.roomFilter);
    this.roomFilter.connect(this.reverb);
    this.reverb.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Initialize
    this.reverb.generate();
  }

  setParameters(params) {
    if (params.roomSize !== undefined) {
      this.reverb.decay = params.roomSize;
      this.earlyReflections.delayTime.value = params.roomSize * 0.05;
    }
    if (params.decay !== undefined) {
      this.reverb.decay = params.decay;
    }
    if (params.preDelay !== undefined) {
      this.reverb.preDelay = params.preDelay;
    }
    if (params.damping !== undefined) {
      this.roomFilter.frequency.value = 2000 * (1 - params.damping) + 500;
    }
    if (params.earlyReflections !== undefined) {
      this.earlyGain.gain.value = params.earlyReflections * 0.4;
    }
    if (params.wet !== undefined) {
      this.wetGain.gain.value = params.wet;
      this.dryGain.gain.value = 1 - params.wet;
    }
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Plate Reverb - Classic studio reverb
 */
class PlateReverb {
  constructor() {
    this.registry = new DisposalRegistry('plate-reverb');
    
    // Main reverb with metallic character
    this.reverb = this.registry.register(new Tone.Reverb({
      decay: 2.0,
      preDelay: 0.01
    }));
    
    // Modulation for shimmer
    this.vibrato = this.registry.register(new Tone.Vibrato({
      frequency: 1.5,
      depth: 0.1,
      wet: 1.0
    }));
    
    // Brightness control
    this.trebleBoost = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 3000,
      gain: 3
    }));
    
    // Diffusion
    this.allpass = this.registry.register(new Tone.Phaser({
      frequency: 0.2,
      depth: 2,
      baseFrequency: 1000,
      wet: 0.5
    }));
    
    // Gains
    this.inputGain = this.registry.register(new Tone.Gain(1));
    this.outputGain = this.registry.register(new Tone.Gain(1));
    this.dryGain = this.registry.register(new Tone.Gain(0.65));
    this.wetGain = this.registry.register(new Tone.Gain(0.35));
    
    // Connect
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet
    this.inputGain.connect(this.trebleBoost);
    this.trebleBoost.connect(this.reverb);
    this.reverb.connect(this.vibrato);
    this.vibrato.connect(this.allpass);
    this.allpass.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Initialize
    this.reverb.generate();
  }

  setParameters(params) {
    if (params.decay !== undefined) {
      this.reverb.decay = params.decay;
    }
    if (params.preDelay !== undefined) {
      this.reverb.preDelay = params.preDelay;
    }
    if (params.damping !== undefined) {
      // Damping affects high frequency content
      const cutoff = 8000 * (1 - params.damping);
      this.trebleBoost.frequency.value = cutoff;
    }
    if (params.brightness !== undefined) {
      this.trebleBoost.gain.value = params.brightness * 6 - 3;
    }
    if (params.modulation !== undefined) {
      this.vibrato.depth.value = params.modulation * 0.2;
      this.allpass.depth.value = params.modulation * 4;
    }
    if (params.wet !== undefined) {
      this.wetGain.gain.value = params.wet;
      this.dryGain.gain.value = 1 - params.wet;
    }
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Spring Reverb - Guitar amp style
 */
class SpringReverb {
  constructor() {
    this.registry = new DisposalRegistry('spring-reverb');
    
    // Simulate spring characteristics
    this.spring1 = this.registry.register(createFeedbackDelaySafe({
      delayTime: 0.03,
      feedback: 0.85,
      wet: 1.0
    }, 'SpringReverb Spring1'));
    
    this.spring2 = this.registry.register(createFeedbackDelaySafe({
      delayTime: 0.041,
      feedback: 0.82,
      wet: 1.0
    }, 'SpringReverb Spring2'));
    
    // Metallic resonance
    this.resonance = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 2500,
      Q: 5
    }));
    
    // Spring "bounce"
    this.modulation = this.registry.register(new Tone.Tremolo({
      frequency: 7,
      depth: 0.3,
      spread: 180,
      wet: 1.0
    })).start();
    
    // Character filter
    this.toneFilter = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 5000
    }));
    
    // Gains
    this.inputGain = this.registry.register(new Tone.Gain(1));
    this.outputGain = this.registry.register(new Tone.Gain(1));
    this.dryGain = this.registry.register(new Tone.Gain(0.7));
    this.wetGain = this.registry.register(new Tone.Gain(0.3));
    this.springMix = this.registry.register(new Tone.Gain(0.5));
    
    // Connect
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet - parallel springs
    this.inputGain.connect(this.resonance);
    this.resonance.fan(this.spring1, this.spring2);
    this.spring1.connect(this.springMix);
    this.spring2.connect(this.springMix);
    this.springMix.connect(this.modulation);
    this.modulation.connect(this.toneFilter);
    this.toneFilter.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
  }

  setParameters(params) {
    if (params.decay !== undefined) {
      const feedback = Math.min(0.95, params.decay / 3);
      this.spring1.feedback.value = feedback;
      this.spring2.feedback.value = feedback * 0.95;
    }
    if (params.tension !== undefined) {
      // Higher tension = shorter delay times
      this.spring1.delayTime.value = 0.05 * (1 - params.tension * 0.5);
      this.spring2.delayTime.value = 0.065 * (1 - params.tension * 0.5);
    }
    if (params.damping !== undefined) {
      this.toneFilter.frequency.value = 8000 * (1 - params.damping);
    }
    if (params.bounce !== undefined) {
      this.modulation.depth.value = params.bounce * 0.5;
      this.resonance.Q.value = 2 + params.bounce * 8;
    }
    if (params.wet !== undefined) {
      this.wetGain.gain.value = params.wet;
      this.dryGain.gain.value = 1 - params.wet;
    }
  }

  connect(destination) {
    this.outputGain.connect(destination);
  }

  disconnect() {
    this.outputGain.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createReverbSuite() {
  return new ReverbSuite();
}