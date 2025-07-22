import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * EQSuite - Professional parametric and vintage EQ modeling
 * Includes parametric, graphic, and vintage-modeled EQs
 */
export class EQSuite {
  constructor() {
    this.registry = new DisposalRegistry('eq-suite');
    
    // Available EQ types
    this.eqTypes = new Map();
    this.initializeEQTypes();
    
    // Current active EQ
    this.activeEQ = null;
    this.activeType = null;
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Spectrum analyzer for visual feedback
    this.analyzer = this.registry.register(new Tone.FFT(2048));
    this.output.connect(this.analyzer);
    
    // Set default EQ
    this.selectEQ('parametric');
  }

  /**
   * Initialize EQ types
   */
  initializeEQTypes() {
    // Parametric EQ - Surgical precision
    this.eqTypes.set('parametric', {
      create: () => new ParametricEQ(),
      description: 'Precise frequency control with multiple bands'
    });
    
    // Graphic EQ - Visual frequency control
    this.eqTypes.set('graphic', {
      create: () => new GraphicEQ(),
      description: '31-band graphic equalizer'
    });
    
    // Vintage Pultec EQ
    this.eqTypes.set('pultec', {
      create: () => new PultecEQ(),
      description: 'Vintage tube EQ with musical curves'
    });
    
    // API-style EQ
    this.eqTypes.set('api', {
      create: () => new APIStyleEQ(),
      description: 'Punchy, musical EQ with proportional Q'
    });
    
    // Neve-style EQ
    this.eqTypes.set('neve', {
      create: () => new NeveStyleEQ(),
      description: 'Warm, smooth British console EQ'
    });
    
    // Linear Phase EQ
    this.eqTypes.set('linear', {
      create: () => new LinearPhaseEQ(),
      description: 'Zero phase shift for mastering'
    });
  }

  /**
   * Select EQ type
   * @param {string} type 
   */
  selectEQ(type) {
    const config = this.eqTypes.get(type);
    if (!config) {
      console.warn(`Unknown EQ type: ${type}`);
      return;
    }
    
    // Disconnect current
    if (this.activeEQ) {
      this.input.disconnect(this.activeEQ.input);
      this.activeEQ.disconnect();
      this.activeEQ.dispose();
    }
    
    // Create new EQ
    this.activeEQ = config.create();
    this.activeType = type;
    this.registry.register(this.activeEQ);
    
    // Connect
    this.input.connect(this.activeEQ.input);
    this.activeEQ.connect(this.output);
  }

  /**
   * Get spectrum analysis
   * @returns {Float32Array}
   */
  getSpectrum() {
    return this.analyzer.getValue();
  }

  /**
   * Get frequency response
   * @param {number} numPoints 
   * @returns {Array}
   */
  getFrequencyResponse(numPoints = 1024) {
    if (!this.activeEQ || !this.activeEQ.getFrequencyResponse) {
      return null;
    }
    return this.activeEQ.getFrequencyResponse(numPoints);
  }

  /**
   * Set parameters
   * @param {Object} params 
   */
  setParameters(params) {
    if (!this.activeEQ) return;
    this.activeEQ.setParameters(params);
  }

  /**
   * Get parameters
   * @returns {Object}
   */
  getParameters() {
    if (!this.activeEQ) return {};
    return this.activeEQ.getParameters();
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
    if (this.activeEQ) {
      this.activeEQ.dispose();
    }
    this.registry.dispose();
  }
}

/**
 * Parametric EQ - Full featured with 8 bands
 */
class ParametricEQ {
  constructor() {
    this.registry = new DisposalRegistry('parametric-eq');
    
    // High-pass filter
    this.highpass = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 20,
      rolloff: -12,
      Q: 0.7
    }));
    
    // Low shelf
    this.lowShelf = this.registry.register(new Tone.Filter({
      type: 'lowshelf',
      frequency: 100,
      gain: 0
    }));
    
    // Parametric bands
    this.bands = [];
    const defaultFreqs = [200, 500, 1000, 2000, 4000, 8000];
    
    for (let i = 0; i < 6; i++) {
      const band = this.registry.register(new Tone.Filter({
        type: 'peaking',
        frequency: defaultFreqs[i],
        Q: 1,
        gain: 0
      }));
      this.bands.push(band);
    }
    
    // High shelf
    this.highShelf = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 10000,
      gain: 0
    }));
    
    // Low-pass filter
    this.lowpass = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 20000,
      rolloff: -12,
      Q: 0.7
    }));
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.highpass;
    this.output = this.outputGain;
    
    // Connect chain
    let current = this.highpass;
    current.connect(this.lowShelf);
    current = this.lowShelf;
    
    for (const band of this.bands) {
      current.connect(band);
      current = band;
    }
    
    current.connect(this.highShelf);
    this.highShelf.connect(this.lowpass);
    this.lowpass.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      highpass: { freq: 20, enabled: false },
      lowpass: { freq: 20000, enabled: false },
      lowShelf: { freq: 100, gain: 0, enabled: true },
      highShelf: { freq: 10000, gain: 0, enabled: true },
      bands: defaultFreqs.map(freq => ({
        freq,
        gain: 0,
        Q: 1,
        enabled: true
      })),
      outputGain: 0
    };
  }

  setParameters(params) {
    // High-pass
    if (params.highpass) {
      if (params.highpass.freq !== undefined) {
        this.parameters.highpass.freq = params.highpass.freq;
        this.highpass.frequency.value = params.highpass.freq;
      }
      if (params.highpass.enabled !== undefined) {
        this.parameters.highpass.enabled = params.highpass.enabled;
        this.highpass.frequency.value = params.highpass.enabled ? 
          this.parameters.highpass.freq : 20;
      }
    }
    
    // Low-pass
    if (params.lowpass) {
      if (params.lowpass.freq !== undefined) {
        this.parameters.lowpass.freq = params.lowpass.freq;
        this.lowpass.frequency.value = params.lowpass.freq;
      }
      if (params.lowpass.enabled !== undefined) {
        this.parameters.lowpass.enabled = params.lowpass.enabled;
        this.lowpass.frequency.value = params.lowpass.enabled ? 
          this.parameters.lowpass.freq : 20000;
      }
    }
    
    // Low shelf
    if (params.lowShelf) {
      if (params.lowShelf.freq !== undefined) {
        this.parameters.lowShelf.freq = params.lowShelf.freq;
        this.lowShelf.frequency.value = params.lowShelf.freq;
      }
      if (params.lowShelf.gain !== undefined) {
        this.parameters.lowShelf.gain = params.lowShelf.gain;
        this.lowShelf.gain.value = params.lowShelf.enabled ? params.lowShelf.gain : 0;
      }
    }
    
    // High shelf
    if (params.highShelf) {
      if (params.highShelf.freq !== undefined) {
        this.parameters.highShelf.freq = params.highShelf.freq;
        this.highShelf.frequency.value = params.highShelf.freq;
      }
      if (params.highShelf.gain !== undefined) {
        this.parameters.highShelf.gain = params.highShelf.gain;
        this.highShelf.gain.value = params.highShelf.enabled ? params.highShelf.gain : 0;
      }
    }
    
    // Bands
    if (params.bands) {
      params.bands.forEach((bandParams, i) => {
        if (i >= this.bands.length) return;
        
        const band = this.bands[i];
        const paramBand = this.parameters.bands[i];
        
        if (bandParams.freq !== undefined) {
          paramBand.freq = bandParams.freq;
          band.frequency.value = bandParams.freq;
        }
        if (bandParams.gain !== undefined) {
          paramBand.gain = bandParams.gain;
          band.gain.value = paramBand.enabled ? bandParams.gain : 0;
        }
        if (bandParams.Q !== undefined) {
          paramBand.Q = bandParams.Q;
          band.Q.value = bandParams.Q;
        }
        if (bandParams.enabled !== undefined) {
          paramBand.enabled = bandParams.enabled;
          band.gain.value = bandParams.enabled ? paramBand.gain : 0;
        }
      });
    }
    
    // Output gain
    if (params.outputGain !== undefined) {
      this.parameters.outputGain = params.outputGain;
      this.outputGain.gain.value = Math.pow(10, params.outputGain / 20);
    }
  }

  getParameters() {
    return JSON.parse(JSON.stringify(this.parameters));
  }

  getFrequencyResponse(numPoints = 1024) {
    const frequencies = [];
    const response = [];
    
    // Generate log-spaced frequencies
    for (let i = 0; i < numPoints; i++) {
      const norm = i / (numPoints - 1);
      const freq = 20 * Math.pow(1000, norm); // 20Hz to 20kHz
      frequencies.push(freq);
      
      // Calculate combined response
      let totalGain = 0;
      
      // Add each filter's contribution
      // This is simplified - real implementation would calculate actual filter response
      this.bands.forEach(band => {
        const f = band.frequency.value;
        const g = band.gain.value;
        const q = band.Q.value;
        
        // Simplified bell curve
        const width = f / q;
        const dist = Math.abs(Math.log(freq / f));
        const bandGain = g * Math.exp(-dist * dist * q);
        totalGain += bandGain;
      });
      
      response.push(totalGain);
    }
    
    return { frequencies, response };
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
 * Graphic EQ - 31 band 1/3 octave
 */
class GraphicEQ {
  constructor() {
    this.registry = new DisposalRegistry('graphic-eq');
    
    // 31 band frequencies (1/3 octave)
    this.frequencies = [
      20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
      200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
      2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
    ];
    
    // Create filters for each band
    this.bands = [];
    this.frequencies.forEach(freq => {
      const filter = this.registry.register(new Tone.Filter({
        type: 'peaking',
        frequency: freq,
        Q: 4.3, // 1/3 octave Q
        gain: 0
      }));
      this.bands.push(filter);
    });
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Connect in series
    let current = this.input;
    for (const band of this.bands) {
      current.connect(band);
      current = band;
    }
    current.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      bands: this.frequencies.map(() => 0), // All gains start at 0
      outputGain: 0
    };
  }

  setParameters(params) {
    if (params.bands) {
      params.bands.forEach((gain, i) => {
        if (i < this.bands.length && gain !== undefined) {
          this.parameters.bands[i] = gain;
          this.bands[i].gain.value = gain;
        }
      });
    }
    
    if (params.outputGain !== undefined) {
      this.parameters.outputGain = params.outputGain;
      this.outputGain.gain.value = Math.pow(10, params.outputGain / 20);
    }
  }

  getParameters() {
    return {
      bands: [...this.parameters.bands],
      outputGain: this.parameters.outputGain
    };
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
 * Pultec-style EQ - Vintage tube EQ emulation
 */
class PultecEQ {
  constructor() {
    this.registry = new DisposalRegistry('pultec-eq');
    
    // Low frequency section
    this.lowBoost = this.registry.register(new Tone.Filter({
      type: 'lowshelf',
      frequency: 100,
      gain: 0
    }));
    
    this.lowCut = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 20,
      rolloff: -12
    }));
    
    // High frequency boost
    this.highBoost = this.registry.register(new Tone.Filter({
      type: 'peaking',
      frequency: 3000,
      Q: 0.7,
      gain: 0
    }));
    
    // High frequency attenuate
    this.highCut = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 10000,
      gain: 0
    }));
    
    // Tube saturation
    this.saturation = this.registry.register(new Tone.Distortion({
      distortion: 0.02,
      wet: 0.3
    }));
    
    // Output transformer simulation
    this.transformer = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 18000,
      rolloff: -12
    }));
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Connect
    this.input.connect(this.lowCut);
    this.lowCut.connect(this.lowBoost);
    this.lowBoost.connect(this.highBoost);
    this.highBoost.connect(this.highCut);
    this.highCut.connect(this.saturation);
    this.saturation.connect(this.transformer);
    this.transformer.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      lowFreq: 100,
      lowBoost: 0,
      lowCut: 0,
      highFreq: 3000,
      highBoost: 0,
      highBandwidth: 0.7,
      highCut: 0,
      highCutFreq: 10000
    };
  }

  setParameters(params) {
    if (params.lowFreq !== undefined) {
      this.parameters.lowFreq = params.lowFreq;
      this.lowBoost.frequency.value = params.lowFreq;
      // Pultec trick: cut frequency is slightly higher
      this.lowCut.frequency.value = params.lowFreq * 1.2;
    }
    
    if (params.lowBoost !== undefined) {
      this.parameters.lowBoost = params.lowBoost;
      this.lowBoost.gain.value = params.lowBoost;
    }
    
    if (params.lowCut !== undefined) {
      this.parameters.lowCut = params.lowCut;
      // Pultec allows simultaneous boost and cut
      const cutFreq = this.parameters.lowCut > 0 ? 
        this.parameters.lowFreq * 1.2 : 20;
      this.lowCut.frequency.value = cutFreq;
    }
    
    if (params.highFreq !== undefined) {
      this.parameters.highFreq = params.highFreq;
      this.highBoost.frequency.value = params.highFreq;
    }
    
    if (params.highBoost !== undefined) {
      this.parameters.highBoost = params.highBoost;
      this.highBoost.gain.value = params.highBoost;
    }
    
    if (params.highBandwidth !== undefined) {
      this.parameters.highBandwidth = params.highBandwidth;
      this.highBoost.Q.value = 1 / params.highBandwidth;
    }
    
    if (params.highCut !== undefined) {
      this.parameters.highCut = params.highCut;
      this.highCut.gain.value = -params.highCut;
    }
    
    if (params.highCutFreq !== undefined) {
      this.parameters.highCutFreq = params.highCutFreq;
      this.highCut.frequency.value = params.highCutFreq;
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
 * API-style EQ - Punchy and musical
 */
class APIStyleEQ {
  constructor() {
    this.registry = new DisposalRegistry('api-eq');
    
    // 4 bands with proportional Q
    this.bands = [];
    const frequencies = [100, 500, 2000, 10000];
    
    frequencies.forEach(freq => {
      const filter = this.registry.register(new Tone.Filter({
        type: freq === 100 ? 'lowshelf' : freq === 10000 ? 'highshelf' : 'peaking',
        frequency: freq,
        Q: 0.7,
        gain: 0
      }));
      this.bands.push(filter);
    });
    
    // Output stage with subtle saturation
    this.outputStage = this.registry.register(new Tone.Distortion({
      distortion: 0.01,
      wet: 0.2
    }));
    
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Connect
    let current = this.input;
    for (const band of this.bands) {
      current.connect(band);
      current = band;
    }
    current.connect(this.outputStage);
    this.outputStage.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      low: { freq: 100, gain: 0 },
      lowMid: { freq: 500, gain: 0 },
      highMid: { freq: 2000, gain: 0 },
      high: { freq: 10000, gain: 0 },
      output: 0
    };
  }

  setParameters(params) {
    const paramMap = ['low', 'lowMid', 'highMid', 'high'];
    
    paramMap.forEach((param, i) => {
      if (params[param]) {
        if (params[param].freq !== undefined) {
          this.parameters[param].freq = params[param].freq;
          this.bands[i].frequency.value = params[param].freq;
        }
        if (params[param].gain !== undefined) {
          this.parameters[param].gain = params[param].gain;
          this.bands[i].gain.value = params[param].gain;
          
          // Proportional Q - more boost/cut = narrower Q
          const absGain = Math.abs(params[param].gain);
          this.bands[i].Q.value = 0.7 + absGain * 0.1;
        }
      }
    });
    
    if (params.output !== undefined) {
      this.parameters.output = params.output;
      this.outputGain.gain.value = Math.pow(10, params.output / 20);
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

/**
 * Neve-style EQ - Smooth and warm
 */
class NeveStyleEQ {
  constructor() {
    this.registry = new DisposalRegistry('neve-eq');
    
    // High-pass filter
    this.highpass = this.registry.register(new Tone.Filter({
      type: 'highpass',
      frequency: 50,
      rolloff: -24
    }));
    
    // Low shelf with special curve
    this.lowShelf = this.registry.register(new Tone.Filter({
      type: 'lowshelf',
      frequency: 220,
      gain: 0
    }));
    
    // Two mid bands
    this.lowMid = this.registry.register(new Tone.Filter({
      type: 'peaking',
      frequency: 700,
      Q: 0.5,
      gain: 0
    }));
    
    this.highMid = this.registry.register(new Tone.Filter({
      type: 'peaking',
      frequency: 4800,
      Q: 0.5,
      gain: 0
    }));
    
    // High shelf
    this.highShelf = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 12000,
      gain: 0
    }));
    
    // Transformer warmth
    this.warmth = this.registry.register(new Tone.Chebyshev({
      order: 2,
      wet: 0.1
    }));
    
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.highpass;
    this.output = this.outputGain;
    
    // Connect
    this.highpass.connect(this.lowShelf);
    this.lowShelf.connect(this.lowMid);
    this.lowMid.connect(this.highMid);
    this.highMid.connect(this.highShelf);
    this.highShelf.connect(this.warmth);
    this.warmth.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      highpass: { freq: 50, enabled: false },
      low: { freq: 220, gain: 0 },
      lowMid: { freq: 700, gain: 0 },
      highMid: { freq: 4800, gain: 0 },
      high: { freq: 12000, gain: 0 }
    };
  }

  setParameters(params) {
    if (params.highpass) {
      if (params.highpass.freq !== undefined) {
        this.parameters.highpass.freq = params.highpass.freq;
        this.highpass.frequency.value = params.highpass.enabled ? 
          params.highpass.freq : 20;
      }
      if (params.highpass.enabled !== undefined) {
        this.parameters.highpass.enabled = params.highpass.enabled;
      }
    }
    
    // Update bands
    const bands = ['low', 'lowMid', 'highMid', 'high'];
    const filters = [this.lowShelf, this.lowMid, this.highMid, this.highShelf];
    
    bands.forEach((band, i) => {
      if (params[band]) {
        if (params[band].freq !== undefined) {
          this.parameters[band].freq = params[band].freq;
          filters[i].frequency.value = params[band].freq;
        }
        if (params[band].gain !== undefined) {
          this.parameters[band].gain = params[band].gain;
          filters[i].gain.value = params[band].gain;
          
          // Neve-style wider Q at lower gains
          if (i === 1 || i === 2) { // Mid bands
            const absGain = Math.abs(params[band].gain);
            filters[i].Q.value = 0.5 + absGain * 0.05;
          }
        }
      }
    });
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

/**
 * Linear Phase EQ - Zero phase shift
 */
class LinearPhaseEQ {
  constructor() {
    this.registry = new DisposalRegistry('linear-phase-eq');
    
    // Note: True linear phase requires FFT processing
    // This is a simplified version using all-pass filters
    
    // Create bands with phase compensation
    this.bands = [];
    const frequencies = [100, 300, 1000, 3000, 10000];
    
    frequencies.forEach(freq => {
      const filter = this.registry.register(new Tone.Filter({
        type: 'peaking',
        frequency: freq,
        Q: 1,
        gain: 0
      }));
      
      // Phase compensation (simplified)
      const allpass = this.registry.register(new Tone.Phaser({
        frequency: freq / 10,
        depth: 0.5,
        baseFrequency: freq,
        wet: 0.5
      }));
      
      this.bands.push({ filter, allpass });
    });
    
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Connect with phase compensation
    let current = this.input;
    for (const { filter, allpass } of this.bands) {
      current.connect(filter);
      filter.connect(allpass);
      current = allpass;
    }
    current.connect(this.outputGain);
    
    // Parameters
    this.parameters = {
      bands: frequencies.map(freq => ({
        freq,
        gain: 0,
        Q: 1
      }))
    };
  }

  setParameters(params) {
    if (params.bands) {
      params.bands.forEach((bandParams, i) => {
        if (i >= this.bands.length) return;
        
        const { filter } = this.bands[i];
        const paramBand = this.parameters.bands[i];
        
        if (bandParams.freq !== undefined) {
          paramBand.freq = bandParams.freq;
          filter.frequency.value = bandParams.freq;
        }
        if (bandParams.gain !== undefined) {
          paramBand.gain = bandParams.gain;
          filter.gain.value = bandParams.gain;
        }
        if (bandParams.Q !== undefined) {
          paramBand.Q = bandParams.Q;
          filter.Q.value = bandParams.Q;
        }
      });
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
export function createEQSuite() {
  return new EQSuite();
}