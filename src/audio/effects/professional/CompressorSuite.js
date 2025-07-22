import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * CompressorSuite - Professional compression types
 * VCA, FET, Opto, Tube, and Multi-band compressors
 */
export class CompressorSuite {
  constructor() {
    this.registry = new DisposalRegistry('compressor-suite');
    
    // Available compressor types
    this.compressorTypes = new Map();
    this.initializeCompressors();
    
    // Current active compressor
    this.activeCompressor = null;
    this.activeType = null;
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Metering
    this.inputMeter = this.registry.register(new Tone.Meter());
    this.outputMeter = this.registry.register(new Tone.Meter());
    this.grMeter = this.registry.register(new Tone.Meter());
    
    // Connect meters
    this.input.connect(this.inputMeter);
    this.output.connect(this.outputMeter);
    
    // Set default compressor
    this.selectCompressor('vca');
  }

  /**
   * Initialize compressor types
   */
  initializeCompressors() {
    // VCA Compressor - Clean and precise
    this.compressorTypes.set('vca', {
      create: () => new VCACompressor(),
      character: 'clean',
      description: 'Transparent compression with precise control'
    });
    
    // FET Compressor - Fast and punchy (1176 style)
    this.compressorTypes.set('fet', {
      create: () => new FETCompressor(),
      character: 'aggressive',
      description: 'Fast attack, punchy character, adds harmonics'
    });
    
    // Opto Compressor - Smooth and musical (LA-2A style)
    this.compressorTypes.set('opto', {
      create: () => new OptoCompressor(),
      character: 'smooth',
      description: 'Gentle compression with program-dependent timing'
    });
    
    // Tube Compressor - Warm and vintage
    this.compressorTypes.set('tube', {
      create: () => new TubeCompressor(),
      character: 'warm',
      description: 'Adds warmth and harmonic saturation'
    });
    
    // Multi-band Compressor
    this.compressorTypes.set('multiband', {
      create: () => new MultibandCompressor(),
      character: 'surgical',
      description: 'Frequency-specific compression control'
    });
  }

  /**
   * Select compressor type
   * @param {string} type 
   */
  selectCompressor(type) {
    const config = this.compressorTypes.get(type);
    if (!config) {
      console.warn(`Unknown compressor type: ${type}`);
      return;
    }
    
    // Disconnect current
    if (this.activeCompressor) {
      this.input.disconnect(this.activeCompressor.input);
      this.activeCompressor.disconnect();
      this.activeCompressor.dispose();
    }
    
    // Create new compressor
    this.activeCompressor = config.create();
    this.activeType = type;
    this.registry.register(this.activeCompressor);
    
    // Connect
    this.input.connect(this.activeCompressor.input);
    this.activeCompressor.connect(this.output);
    
    // Connect GR meter if available
    if (this.activeCompressor.gainReduction) {
      this.activeCompressor.gainReduction.connect(this.grMeter);
    }
  }

  /**
   * Get current parameters
   * @returns {Object}
   */
  getParameters() {
    if (!this.activeCompressor) return {};
    return this.activeCompressor.getParameters();
  }

  /**
   * Set parameters
   * @param {Object} params 
   */
  setParameters(params) {
    if (!this.activeCompressor) return;
    this.activeCompressor.setParameters(params);
  }

  /**
   * Get metering data
   * @returns {Object}
   */
  getMeters() {
    return {
      input: this.inputMeter.getValue(),
      output: this.outputMeter.getValue(),
      gainReduction: this.grMeter.getValue()
    };
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
    if (this.activeCompressor) {
      this.activeCompressor.dispose();
    }
    this.registry.dispose();
  }
}

/**
 * VCA Compressor - Clean and transparent
 */
class VCACompressor {
  constructor() {
    this.registry = new DisposalRegistry('vca-compressor');
    
    // Main compressor
    this.compressor = this.registry.register(new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.1,
      knee: 2
    }));
    
    // Sidechain filter
    this.sidechainFilter = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 80
    }));
    
    // Makeup gain
    this.makeupGain = this.registry.register(new Tone.Gain(1));
    
    // Mix control (parallel compression)
    this.dryGain = this.registry.register(new Tone.Gain(0));
    this.wetGain = this.registry.register(new Tone.Gain(1));
    this.mixGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.mixGain;
    
    // Gain reduction signal
    this.gainReduction = this.registry.register(new Tone.Subtract());
    this.registry.register(new Tone.Signal(0)).connect(this.gainReduction);
    
    // Connect
    this.input.connect(this.dryGain);
    this.input.connect(this.sidechainFilter);
    this.sidechainFilter.connect(this.compressor);
    this.compressor.connect(this.wetGain);
    this.compressor.connect(this.gainReduction, 0, 1);
    
    this.dryGain.connect(this.mixGain);
    this.wetGain.connect(this.makeupGain);
    this.makeupGain.connect(this.mixGain);
    
    // Parameters
    this.parameters = {
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.1,
      knee: 2,
      makeup: 0,
      mix: 1.0,
      sidechainHPF: 80
    };
  }

  setParameters(params) {
    if (params.threshold !== undefined) {
      this.parameters.threshold = params.threshold;
      this.compressor.threshold.value = params.threshold;
    }
    if (params.ratio !== undefined) {
      this.parameters.ratio = params.ratio;
      this.compressor.ratio.value = params.ratio;
    }
    if (params.attack !== undefined) {
      this.parameters.attack = params.attack;
      this.compressor.attack.value = params.attack;
    }
    if (params.release !== undefined) {
      this.parameters.release = params.release;
      this.compressor.release.value = params.release;
    }
    if (params.knee !== undefined) {
      this.parameters.knee = params.knee;
      this.compressor.knee.value = params.knee;
    }
    if (params.makeup !== undefined) {
      this.parameters.makeup = params.makeup;
      this.makeupGain.gain.value = Math.pow(10, params.makeup / 20);
    }
    if (params.mix !== undefined) {
      this.parameters.mix = params.mix;
      this.wetGain.gain.value = params.mix;
      this.dryGain.gain.value = 1 - params.mix;
    }
    if (params.sidechainHPF !== undefined) {
      this.parameters.sidechainHPF = params.sidechainHPF;
      this.sidechainFilter.frequency.value = params.sidechainHPF;
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * FET Compressor - Fast and aggressive (1176 style)
 */
class FETCompressor {
  constructor() {
    this.registry = new DisposalRegistry('fet-compressor');
    
    // Main compressor with FET characteristics
    this.compressor = this.registry.register(new Tone.Compressor({
      threshold: -20,
      ratio: 8,
      attack: 0.0002, // Very fast attack
      release: 0.05,
      knee: 0 // Hard knee
    }));
    
    // FET saturation
    this.saturation = this.registry.register(new Tone.Distortion({
      distortion: 0.05,
      wet: 0.3
    }));
    
    // Output transformer simulation
    this.transformer = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 15000,
      rolloff: -12
    }));
    
    // Makeup gain
    this.makeupGain = this.registry.register(new Tone.Gain(1));
    
    // All-buttons mode (extreme compression)
    this.allButtonsMode = false;
    this.extremeCompressor = this.registry.register(new Tone.Compressor({
      threshold: -40,
      ratio: 20,
      attack: 0.0001,
      release: 0.01
    }));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Connect normal path
    this.connectNormalMode();
    
    // Parameters
    this.parameters = {
      input: 0,
      output: 0,
      attack: 0.0002,
      release: 0.05,
      ratio: 8,
      allButtons: false
    };
  }

  connectNormalMode() {
    this.input.disconnect();
    this.input.connect(this.compressor);
    this.compressor.connect(this.saturation);
    this.saturation.connect(this.transformer);
    this.transformer.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
  }

  connectAllButtonsMode() {
    this.input.disconnect();
    this.input.connect(this.extremeCompressor);
    this.extremeCompressor.connect(this.saturation);
    this.saturation.connect(this.transformer);
    this.transformer.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
  }

  setParameters(params) {
    if (params.input !== undefined) {
      this.parameters.input = params.input;
      const gain = Math.pow(10, params.input / 20);
      this.input.gain.value = gain;
      // Adjust threshold inversely
      this.compressor.threshold.value = -20 - params.input;
    }
    if (params.output !== undefined) {
      this.parameters.output = params.output;
      this.makeupGain.gain.value = Math.pow(10, params.output / 20);
    }
    if (params.attack !== undefined) {
      this.parameters.attack = params.attack;
      this.compressor.attack.value = params.attack;
    }
    if (params.release !== undefined) {
      this.parameters.release = params.release;
      this.compressor.release.value = params.release;
    }
    if (params.ratio !== undefined) {
      this.parameters.ratio = params.ratio;
      this.compressor.ratio.value = params.ratio;
    }
    if (params.allButtons !== undefined) {
      this.parameters.allButtons = params.allButtons;
      this.allButtonsMode = params.allButtons;
      if (params.allButtons) {
        this.connectAllButtonsMode();
      } else {
        this.connectNormalMode();
      }
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Opto Compressor - Smooth and musical (LA-2A style)
 */
class OptoCompressor {
  constructor() {
    this.registry = new DisposalRegistry('opto-compressor');
    
    // Envelope follower for opto simulation
    this.envelope = this.registry.register(new Tone.Envelope({
      attack: 0.01,
      decay: 0,
      sustain: 1,
      release: 0.5
    }));
    
    // Main compressor with program-dependent timing
    this.compressor = this.registry.register(new Tone.Compressor({
      threshold: -12,
      ratio: 3,
      attack: 0.01,
      release: 0.5,
      knee: 10 // Soft knee for opto character
    }));
    
    // Tube warmth
    this.warmth = this.registry.register(new Tone.Distortion({
      distortion: 0.02,
      wet: 0.5
    }));
    
    // Frequency-dependent behavior
    this.tilt = this.registry.register(new Tone.Filter({
      type: 'lowshelf',
      frequency: 200,
      gain: 2
    }));
    
    // Output stage
    this.makeupGain = this.registry.register(new Tone.Gain(1));
    
    // Peak reduction meter simulation
    this.peakReduction = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Connect
    this.input.connect(this.compressor);
    this.compressor.connect(this.warmth);
    this.warmth.connect(this.tilt);
    this.tilt.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
    
    // Parameters
    this.parameters = {
      peakReduction: 0,
      gain: 0,
      compress: true,
      limit: false,
      emphasis: 0
    };
    
    // Update timing based on input
    this.setupProgramDependentTiming();
  }

  setupProgramDependentTiming() {
    // Simulate opto cell behavior - slower on louder signals
    setInterval(() => {
      if (this.parameters.compress || this.parameters.limit) {
        const level = this.envelope.value;
        // Adjust release time based on signal level
        const baseRelease = this.parameters.limit ? 0.05 : 0.5;
        this.compressor.release.value = baseRelease * (1 + level * 2);
      }
    }, 50);
  }

  setParameters(params) {
    if (params.peakReduction !== undefined) {
      this.parameters.peakReduction = params.peakReduction;
      // Map knob position to threshold
      this.compressor.threshold.value = -params.peakReduction;
    }
    if (params.gain !== undefined) {
      this.parameters.gain = params.gain;
      this.makeupGain.gain.value = Math.pow(10, params.gain / 20);
    }
    if (params.compress !== undefined) {
      this.parameters.compress = params.compress;
      if (params.compress && !params.limit) {
        this.compressor.ratio.value = 3;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.5;
      }
    }
    if (params.limit !== undefined) {
      this.parameters.limit = params.limit;
      if (params.limit) {
        this.compressor.ratio.value = 100;
        this.compressor.attack.value = 0.001;
        this.compressor.release.value = 0.05;
      }
    }
    if (params.emphasis !== undefined) {
      this.parameters.emphasis = params.emphasis;
      this.tilt.gain.value = params.emphasis * 4;
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Tube Compressor - Warm and vintage
 */
class TubeCompressor {
  constructor() {
    this.registry = new DisposalRegistry('tube-compressor');
    
    // Input stage saturation
    this.inputSaturation = this.registry.register(new Tone.Distortion({
      distortion: 0.1,
      wet: 0.2
    }));
    
    // Main compressor
    this.compressor = this.registry.register(new Tone.Compressor({
      threshold: -18,
      ratio: 6,
      attack: 0.005,
      release: 0.2,
      knee: 6
    }));
    
    // Tube harmonics
    this.harmonics = this.registry.register(new Tone.Chebyshev({
      order: 3,
      wet: 0.15
    }));
    
    // Transformer emulation
    this.transformer = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 1000,
      Q: 0.5
    }));
    
    // Output saturation
    this.outputSaturation = this.registry.register(new Tone.Distortion({
      distortion: 0.05,
      wet: 0.3
    }));
    
    // Tone control
    this.toneControl = this.registry.register(new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0
    }));
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Connect
    this.input.connect(this.inputSaturation);
    this.inputSaturation.connect(this.compressor);
    this.compressor.connect(this.harmonics);
    this.harmonics.connect(this.transformer);
    this.transformer.connect(this.outputSaturation);
    this.outputSaturation.connect(this.toneControl);
    this.toneControl.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      input: 0,
      threshold: -18,
      ratio: 6,
      attack: 0.005,
      release: 0.2,
      warmth: 0.5,
      tone: 0,
      output: 0
    };
  }

  setParameters(params) {
    if (params.input !== undefined) {
      this.parameters.input = params.input;
      this.input.gain.value = Math.pow(10, params.input / 20);
    }
    if (params.threshold !== undefined) {
      this.parameters.threshold = params.threshold;
      this.compressor.threshold.value = params.threshold;
    }
    if (params.ratio !== undefined) {
      this.parameters.ratio = params.ratio;
      this.compressor.ratio.value = params.ratio;
    }
    if (params.attack !== undefined) {
      this.parameters.attack = params.attack;
      this.compressor.attack.value = params.attack;
    }
    if (params.release !== undefined) {
      this.parameters.release = params.release;
      this.compressor.release.value = params.release;
    }
    if (params.warmth !== undefined) {
      this.parameters.warmth = params.warmth;
      this.inputSaturation.distortion = params.warmth * 0.2;
      this.harmonics.wet.value = params.warmth * 0.3;
      this.outputSaturation.distortion = params.warmth * 0.1;
    }
    if (params.tone !== undefined) {
      this.parameters.tone = params.tone;
      this.toneControl.low.value = params.tone < 0 ? params.tone * 3 : 0;
      this.toneControl.high.value = params.tone > 0 ? params.tone * 3 : 0;
    }
    if (params.output !== undefined) {
      this.parameters.output = params.output;
      this.outputGain.gain.value = Math.pow(10, params.output / 20);
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Multiband Compressor - Frequency-specific compression
 */
class MultibandCompressor {
  constructor() {
    this.registry = new DisposalRegistry('multiband-compressor');
    
    // Crossover frequencies
    this.lowCrossover = 250;
    this.midCrossover = 2000;
    
    // Band splitters
    this.splitter = this.registry.register(new Tone.MultibandSplit({
      lowFrequency: this.lowCrossover,
      highFrequency: this.midCrossover
    }));
    
    // Compressors for each band
    this.lowCompressor = this.registry.register(new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.01,
      release: 0.2
    }));
    
    this.midCompressor = this.registry.register(new Tone.Compressor({
      threshold: -24,
      ratio: 3,
      attack: 0.005,
      release: 0.1
    }));
    
    this.highCompressor = this.registry.register(new Tone.Compressor({
      threshold: -24,
      ratio: 3,
      attack: 0.001,
      release: 0.05
    }));
    
    // Band gains
    this.lowGain = this.registry.register(new Tone.Gain(1));
    this.midGain = this.registry.register(new Tone.Gain(1));
    this.highGain = this.registry.register(new Tone.Gain(1));
    
    // Output mixer
    this.outputMixer = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputMixer;
    
    // Connect
    this.input.connect(this.splitter);
    
    this.splitter.low.connect(this.lowCompressor);
    this.splitter.mid.connect(this.midCompressor);
    this.splitter.high.connect(this.highCompressor);
    
    this.lowCompressor.connect(this.lowGain);
    this.midCompressor.connect(this.midGain);
    this.highCompressor.connect(this.highGain);
    
    this.lowGain.connect(this.outputMixer);
    this.midGain.connect(this.outputMixer);
    this.highGain.connect(this.outputMixer);
    
    // Parameters
    this.parameters = {
      lowCrossover: 250,
      highCrossover: 2000,
      low: {
        threshold: -24,
        ratio: 4,
        attack: 0.01,
        release: 0.2,
        gain: 0
      },
      mid: {
        threshold: -24,
        ratio: 3,
        attack: 0.005,
        release: 0.1,
        gain: 0
      },
      high: {
        threshold: -24,
        ratio: 3,
        attack: 0.001,
        release: 0.05,
        gain: 0
      }
    };
  }

  setParameters(params) {
    // Crossover frequencies
    if (params.lowCrossover !== undefined) {
      this.parameters.lowCrossover = params.lowCrossover;
      this.splitter.lowFrequency.value = params.lowCrossover;
    }
    if (params.highCrossover !== undefined) {
      this.parameters.highCrossover = params.highCrossover;
      this.splitter.highFrequency.value = params.highCrossover;
    }
    
    // Low band
    if (params.low) {
      if (params.low.threshold !== undefined) {
        this.parameters.low.threshold = params.low.threshold;
        this.lowCompressor.threshold.value = params.low.threshold;
      }
      if (params.low.ratio !== undefined) {
        this.parameters.low.ratio = params.low.ratio;
        this.lowCompressor.ratio.value = params.low.ratio;
      }
      if (params.low.attack !== undefined) {
        this.parameters.low.attack = params.low.attack;
        this.lowCompressor.attack.value = params.low.attack;
      }
      if (params.low.release !== undefined) {
        this.parameters.low.release = params.low.release;
        this.lowCompressor.release.value = params.low.release;
      }
      if (params.low.gain !== undefined) {
        this.parameters.low.gain = params.low.gain;
        this.lowGain.gain.value = Math.pow(10, params.low.gain / 20);
      }
    }
    
    // Mid band
    if (params.mid) {
      if (params.mid.threshold !== undefined) {
        this.parameters.mid.threshold = params.mid.threshold;
        this.midCompressor.threshold.value = params.mid.threshold;
      }
      if (params.mid.ratio !== undefined) {
        this.parameters.mid.ratio = params.mid.ratio;
        this.midCompressor.ratio.value = params.mid.ratio;
      }
      if (params.mid.attack !== undefined) {
        this.parameters.mid.attack = params.mid.attack;
        this.midCompressor.attack.value = params.mid.attack;
      }
      if (params.mid.release !== undefined) {
        this.parameters.mid.release = params.mid.release;
        this.midCompressor.release.value = params.mid.release;
      }
      if (params.mid.gain !== undefined) {
        this.parameters.mid.gain = params.mid.gain;
        this.midGain.gain.value = Math.pow(10, params.mid.gain / 20);
      }
    }
    
    // High band
    if (params.high) {
      if (params.high.threshold !== undefined) {
        this.parameters.high.threshold = params.high.threshold;
        this.highCompressor.threshold.value = params.high.threshold;
      }
      if (params.high.ratio !== undefined) {
        this.parameters.high.ratio = params.high.ratio;
        this.highCompressor.ratio.value = params.high.ratio;
      }
      if (params.high.attack !== undefined) {
        this.parameters.high.attack = params.high.attack;
        this.highCompressor.attack.value = params.high.attack;
      }
      if (params.high.release !== undefined) {
        this.parameters.high.release = params.high.release;
        this.highCompressor.release.value = params.high.release;
      }
      if (params.high.gain !== undefined) {
        this.parameters.high.gain = params.high.gain;
        this.highGain.gain.value = Math.pow(10, params.high.gain / 20);
      }
    }
  }

  getParameters() {
    return JSON.parse(JSON.stringify(this.parameters));
  }

  connect(destination) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createCompressorSuite() {
  return new CompressorSuite();
}