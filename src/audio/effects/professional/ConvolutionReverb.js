import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * ConvolutionReverb - Professional convolution reverb with impulse response support
 * Simulates real acoustic spaces using recorded impulse responses
 */
export class ConvolutionReverb {
  constructor() {
    this.registry = new DisposalRegistry('convolution-reverb');
    
    // Create main reverb
    this.reverb = this.registry.register(new Tone.Convolver());
    
    // Pre-delay for clarity
    this.preDelay = this.registry.register(new Tone.Delay({
      delayTime: 0.02,
      maxDelay: 0.5
    }));
    
    // Input gain
    this.inputGain = this.registry.register(new Tone.Gain(1));
    
    // Dry/wet mixer
    this.dryGain = this.registry.register(new Tone.Gain(0.5));
    this.wetGain = this.registry.register(new Tone.Gain(0.5));
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // EQ for shaping reverb
    this.lowShelf = this.registry.register(new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 200,
      highFrequency: 2000
    }));
    
    // High-pass filter for clarity
    this.highPass = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 80,
      rolloff: -12
    }));
    
    // Connect signal path
    this.input = this.inputGain;
    this.output = this.outputGain;
    
    // Dry path
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.outputGain);
    
    // Wet path
    this.inputGain.connect(this.preDelay);
    this.preDelay.connect(this.highPass);
    this.highPass.connect(this.reverb);
    this.reverb.connect(this.lowShelf);
    this.lowShelf.connect(this.wetGain);
    this.wetGain.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      wet: 0.3,
      preDelay: 0.02,
      size: 1.0,
      decay: 2.0,
      lowCut: 80,
      highCut: 12000,
      lowShelf: 0,
      highShelf: 0,
      modulation: 0.1
    };
    
    // Built-in impulse responses
    this.impulseResponses = new Map();
    this.initializeImpulseResponses();
    
    // Current IR
    this.currentIR = null;
    
    // Set default IR
    this.loadImpulseResponse('medium-hall');
  }

  /**
   * Initialize built-in impulse responses
   */
  initializeImpulseResponses() {
    // Define IR metadata
    this.impulseResponses.set('small-room', {
      name: 'Small Room',
      category: 'room',
      size: 'small',
      character: 'intimate',
      decay: 0.8,
      brightness: 0.7,
      url: null // Will use synthetic IR
    });
    
    this.impulseResponses.set('medium-hall', {
      name: 'Medium Hall',
      category: 'hall',
      size: 'medium',
      character: 'warm',
      decay: 2.0,
      brightness: 0.6,
      url: null
    });
    
    this.impulseResponses.set('large-hall', {
      name: 'Large Concert Hall',
      category: 'hall',
      size: 'large',
      character: 'spacious',
      decay: 3.5,
      brightness: 0.5,
      url: null
    });
    
    this.impulseResponses.set('cathedral', {
      name: 'Cathedral',
      category: 'hall',
      size: 'huge',
      character: 'ethereal',
      decay: 5.0,
      brightness: 0.4,
      url: null
    });
    
    this.impulseResponses.set('chamber', {
      name: 'Chamber',
      category: 'room',
      size: 'medium',
      character: 'focused',
      decay: 1.2,
      brightness: 0.65,
      url: null
    });
    
    this.impulseResponses.set('plate', {
      name: 'Plate Reverb',
      category: 'plate',
      size: 'medium',
      character: 'vintage',
      decay: 2.5,
      brightness: 0.8,
      url: null
    });
    
    this.impulseResponses.set('spring', {
      name: 'Spring Reverb',
      category: 'spring',
      size: 'small',
      character: 'metallic',
      decay: 1.5,
      brightness: 0.9,
      url: null
    });
    
    this.impulseResponses.set('parking-garage', {
      name: 'Parking Garage',
      category: 'space',
      size: 'large',
      character: 'concrete',
      decay: 2.8,
      brightness: 0.75,
      url: null
    });
    
    this.impulseResponses.set('forest', {
      name: 'Forest',
      category: 'outdoor',
      size: 'huge',
      character: 'diffuse',
      decay: 1.5,
      brightness: 0.3,
      url: null
    });
  }

  /**
   * Load an impulse response
   * @param {string} irName 
   */
  async loadImpulseResponse(irName) {
    const irData = this.impulseResponses.get(irName);
    if (!irData) {
      console.warn(`Impulse response '${irName}' not found`);
      return;
    }
    
    this.currentIR = irName;
    
    if (irData.url) {
      // Load real IR from URL
      try {
        await this.reverb.load(irData.url);
      } catch (error) {
        console.error('Failed to load impulse response:', error);
        // Fall back to synthetic
        this.generateSyntheticIR(irData);
      }
    } else {
      // Generate synthetic IR based on parameters
      this.generateSyntheticIR(irData);
    }
    
    // Adjust parameters based on IR characteristics
    this.adjustParametersForIR(irData);
  }

  /**
   * Generate synthetic impulse response
   * @param {Object} irData 
   */
  generateSyntheticIR(irData) {
    // Create synthetic IR using Tone.js reverb
    // This is a simplified approach - real convolution would use actual IR files
    const syntheticReverb = new Tone.Reverb({
      decay: irData.decay,
      preDelay: 0.01,
      wet: 1.0
    });
    
    // Generate and set buffer
    syntheticReverb.generate().then(() => {
      // Get the generated buffer
      const buffer = syntheticReverb._convolver.buffer;
      
      // Apply character adjustments
      this.processIRBuffer(buffer, irData);
      
      // Set the buffer to our convolver
      this.reverb.buffer = buffer;
      
      // Clean up
      syntheticReverb.dispose();
    });
  }

  /**
   * Process IR buffer to add character
   * @param {AudioBuffer} buffer 
   * @param {Object} irData 
   */
  processIRBuffer(buffer, irData) {
    const sampleRate = buffer.sampleRate;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      // Apply character-specific processing
      switch (irData.character) {
        case 'vintage':
          // Add some saturation/warmth
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = Math.tanh(channelData[i] * 1.5) * 0.8;
          }
          break;
          
        case 'metallic':
          // Add metallic resonances (spring reverb)
          const resonanceFreq = 2000 / sampleRate;
          let phase = 0;
          for (let i = 0; i < channelData.length; i++) {
            phase += resonanceFreq * 2 * Math.PI;
            channelData[i] += Math.sin(phase) * channelData[i] * 0.3;
          }
          break;
          
        case 'concrete':
          // Add harsh early reflections
          for (let i = 100; i < channelData.length; i++) {
            if (i % 500 < 50) {
              channelData[i] *= 1.5;
            }
          }
          break;
          
        case 'diffuse':
          // Smooth out for outdoor spaces
          for (let i = 1; i < channelData.length - 1; i++) {
            channelData[i] = (channelData[i-1] + channelData[i] + channelData[i+1]) / 3;
          }
          break;
      }
      
      // Apply brightness
      if (irData.brightness !== 0.5) {
        const cutoff = irData.brightness * 10000 + 2000;
        this.applySimpleFilter(channelData, cutoff, sampleRate);
      }
    }
  }

  /**
   * Apply simple lowpass filter to buffer data
   * @param {Float32Array} data 
   * @param {number} cutoff 
   * @param {number} sampleRate 
   */
  applySimpleFilter(data, cutoff, sampleRate) {
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);
    
    let prev = 0;
    for (let i = 0; i < data.length; i++) {
      data[i] = prev + alpha * (data[i] - prev);
      prev = data[i];
    }
  }

  /**
   * Adjust parameters based on IR characteristics
   * @param {Object} irData 
   */
  adjustParametersForIR(irData) {
    // Adjust pre-delay based on size
    switch (irData.size) {
      case 'small':
        this.setPreDelay(0.01);
        break;
      case 'medium':
        this.setPreDelay(0.02);
        break;
      case 'large':
        this.setPreDelay(0.04);
        break;
      case 'huge':
        this.setPreDelay(0.08);
        break;
    }
    
    // Adjust EQ based on character
    switch (irData.character) {
      case 'warm':
        this.setLowShelf(2);
        this.setHighShelf(-2);
        break;
      case 'bright':
        this.setLowShelf(-1);
        this.setHighShelf(3);
        break;
      case 'vintage':
        this.setLowShelf(1);
        this.setHighShelf(-4);
        break;
      case 'metallic':
        this.setLowShelf(-2);
        this.setHighShelf(4);
        break;
    }
  }

  /**
   * Load custom impulse response from URL or file
   * @param {string} url 
   * @param {string} name 
   */
  async loadCustomIR(url, name = 'custom') {
    try {
      await this.reverb.load(url);
      
      // Add to IR list
      this.impulseResponses.set(name, {
        name: name,
        category: 'custom',
        url: url,
        size: 'unknown',
        character: 'custom',
        decay: 2.0,
        brightness: 0.5
      });
      
      this.currentIR = name;
    } catch (error) {
      console.error('Failed to load custom impulse response:', error);
      throw error;
    }
  }

  /**
   * Set wet/dry mix
   * @param {number} wet 0-1
   */
  setWet(wet) {
    this.parameters.wet = Math.max(0, Math.min(1, wet));
    this.wetGain.gain.rampTo(this.parameters.wet, 0.05);
    this.dryGain.gain.rampTo(1 - this.parameters.wet, 0.05);
  }

  /**
   * Set pre-delay time
   * @param {number} time in seconds
   */
  setPreDelay(time) {
    this.parameters.preDelay = Math.max(0, Math.min(0.5, time));
    this.preDelay.delayTime.rampTo(this.parameters.preDelay, 0.05);
  }

  /**
   * Set room size (affects decay)
   * @param {number} size 0-2
   */
  setSize(size) {
    this.parameters.size = Math.max(0, Math.min(2, size));
    // Size affects the reverb characteristics
    // In a real implementation, this might switch between IRs
  }

  /**
   * Set decay time
   * @param {number} decay in seconds
   */
  setDecay(decay) {
    this.parameters.decay = Math.max(0.1, Math.min(10, decay));
    // With real IRs, this would involve stretching/compressing the IR
  }

  /**
   * Set low cut frequency
   * @param {number} freq in Hz
   */
  setLowCut(freq) {
    this.parameters.lowCut = Math.max(20, Math.min(500, freq));
    this.highPass.frequency.rampTo(this.parameters.lowCut, 0.1);
  }

  /**
   * Set high cut frequency
   * @param {number} freq in Hz
   */
  setHighCut(freq) {
    this.parameters.highCut = Math.max(1000, Math.min(20000, freq));
    // Would need additional lowpass filter
  }

  /**
   * Set low shelf gain
   * @param {number} gain in dB
   */
  setLowShelf(gain) {
    this.parameters.lowShelf = Math.max(-12, Math.min(12, gain));
    this.lowShelf.low.rampTo(this.parameters.lowShelf, 0.1);
  }

  /**
   * Set high shelf gain
   * @param {number} gain in dB
   */
  setHighShelf(gain) {
    this.parameters.highShelf = Math.max(-12, Math.min(12, gain));
    this.lowShelf.high.rampTo(this.parameters.highShelf, 0.1);
  }

  /**
   * Get list of available impulse responses
   * @returns {Array}
   */
  getAvailableIRs() {
    return Array.from(this.impulseResponses.entries()).map(([key, data]) => ({
      id: key,
      name: data.name,
      category: data.category,
      size: data.size,
      character: data.character
    }));
  }

  /**
   * Get current parameters
   * @returns {Object}
   */
  getParameters() {
    return { ...this.parameters };
  }

  /**
   * Set all parameters at once
   * @param {Object} params 
   */
  setParameters(params) {
    if (params.wet !== undefined) this.setWet(params.wet);
    if (params.preDelay !== undefined) this.setPreDelay(params.preDelay);
    if (params.size !== undefined) this.setSize(params.size);
    if (params.decay !== undefined) this.setDecay(params.decay);
    if (params.lowCut !== undefined) this.setLowCut(params.lowCut);
    if (params.highCut !== undefined) this.setHighCut(params.highCut);
    if (params.lowShelf !== undefined) this.setLowShelf(params.lowShelf);
    if (params.highShelf !== undefined) this.setHighShelf(params.highShelf);
  }

  /**
   * Create preset
   * @param {string} name 
   * @returns {Object}
   */
  createPreset(name) {
    return {
      name,
      ir: this.currentIR,
      parameters: this.getParameters()
    };
  }

  /**
   * Load preset
   * @param {Object} preset 
   */
  async loadPreset(preset) {
    if (preset.ir) {
      await this.loadImpulseResponse(preset.ir);
    }
    if (preset.parameters) {
      this.setParameters(preset.parameters);
    }
  }

  /**
   * Connect to destination
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.outputGain.connect(destination);
    return this;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.outputGain.disconnect();
    return this;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.registry.dispose();
  }
}

// Factory function for effects system
export function createConvolutionReverb() {
  return new ConvolutionReverb();
}