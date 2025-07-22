import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * GateExpander - Professional noise gate and expander
 * With frequency-dependent triggering and look-ahead
 */
export class GateExpander {
  constructor() {
    this.registry = new DisposalRegistry('gate-expander');
    
    // Mode: 'gate' or 'expander'
    this.mode = 'gate';
    
    // Main gate
    this.gate = this.registry.register(new Tone.Gate({
      threshold: -40,
      attack: 0.001,
      release: 0.1,
      smoothing: 0.01
    }));
    
    // Expander (using compressor with inverted ratio)
    this.expander = this.registry.register(new Tone.Compressor({
      threshold: -40,
      ratio: 0.5, // Expansion ratio (inverse of compression)
      attack: 0.001,
      release: 0.1
    }));
    
    // Sidechain processing
    this.sidechainFilter = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 1000,
      Q: 1
    }));
    
    // Look-ahead delay
    this.lookAheadDelay = this.registry.register(new Tone.Delay({
      delayTime: 0.005,
      maxDelay: 0.1
    }));
    
    // Envelope follower for visual feedback
    this.envelope = this.registry.register(new Tone.Envelope({
      attack: 0.001,
      decay: 0,
      sustain: 1,
      release: 0.1
    }));
    
    // Range control (how much gating)
    this.rangeGain = this.registry.register(new Tone.Gain(0)); // 0 = full gate
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Dry/wet for parallel processing
    this.dryGain = this.registry.register(new Tone.Gain(0));
    this.wetGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Detector for advanced triggering
    this.detector = new AdvancedDetector();
    this.registry.register(this.detector);
    
    // Connect for gate mode by default
    this.connectGateMode();
    
    // Parameters
    this.parameters = {
      mode: 'gate',
      threshold: -40,
      range: -80,
      attack: 0.001,
      hold: 0.01,
      release: 0.1,
      lookAhead: 0.005,
      sidechainFilter: false,
      filterFreq: 1000,
      filterQ: 1,
      hysteresis: 3
    };
  }

  /**
   * Connect for gate mode
   */
  connectGateMode() {
    // Disconnect all
    this.input.disconnect();
    
    // Main path with look-ahead
    this.input.connect(this.lookAheadDelay);
    this.lookAheadDelay.connect(this.gate);
    
    // Sidechain path
    this.input.connect(this.detector.input);
    this.detector.connect(this.gate);
    
    // Gate output mixing
    this.gate.connect(this.wetGain);
    this.input.connect(this.rangeGain);
    this.rangeGain.connect(this.wetGain);
    
    // Dry path
    this.input.connect(this.dryGain);
    
    // Mix to output
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);
  }

  /**
   * Connect for expander mode
   */
  connectExpanderMode() {
    // Disconnect all
    this.input.disconnect();
    
    // Expander path
    this.input.connect(this.expander);
    this.expander.connect(this.wetGain);
    
    // Dry path
    this.input.connect(this.dryGain);
    
    // Mix to output
    this.dryGain.connect(this.outputGain);
    this.wetGain.connect(this.outputGain);
  }

  /**
   * Set parameters
   * @param {Object} params 
   */
  setParameters(params) {
    if (params.mode !== undefined && params.mode !== this.parameters.mode) {
      this.parameters.mode = params.mode;
      this.mode = params.mode;
      
      if (params.mode === 'gate') {
        this.connectGateMode();
      } else {
        this.connectExpanderMode();
      }
    }
    
    if (params.threshold !== undefined) {
      this.parameters.threshold = params.threshold;
      this.gate.threshold = params.threshold;
      this.expander.threshold.value = params.threshold;
      this.detector.setThreshold(params.threshold);
    }
    
    if (params.range !== undefined) {
      this.parameters.range = params.range;
      // Range controls how much signal passes when gate is closed
      const rangeLinear = Math.pow(10, params.range / 20);
      this.rangeGain.gain.value = rangeLinear;
    }
    
    if (params.attack !== undefined) {
      this.parameters.attack = params.attack;
      this.gate.attack = params.attack;
      this.expander.attack.value = params.attack;
      this.envelope.attack = params.attack;
    }
    
    if (params.hold !== undefined) {
      this.parameters.hold = params.hold;
      this.detector.setHold(params.hold);
    }
    
    if (params.release !== undefined) {
      this.parameters.release = params.release;
      this.gate.release = params.release;
      this.expander.release.value = params.release;
      this.envelope.release = params.release;
    }
    
    if (params.lookAhead !== undefined) {
      this.parameters.lookAhead = params.lookAhead;
      this.lookAheadDelay.delayTime.value = params.lookAhead;
    }
    
    if (params.sidechainFilter !== undefined) {
      this.parameters.sidechainFilter = params.sidechainFilter;
      this.detector.setFilterEnabled(params.sidechainFilter);
    }
    
    if (params.filterFreq !== undefined) {
      this.parameters.filterFreq = params.filterFreq;
      this.sidechainFilter.frequency.value = params.filterFreq;
      this.detector.setFilterFrequency(params.filterFreq);
    }
    
    if (params.filterQ !== undefined) {
      this.parameters.filterQ = params.filterQ;
      this.sidechainFilter.Q.value = params.filterQ;
      this.detector.setFilterQ(params.filterQ);
    }
    
    if (params.hysteresis !== undefined) {
      this.parameters.hysteresis = params.hysteresis;
      this.detector.setHysteresis(params.hysteresis);
    }
  }

  /**
   * Get current parameters
   * @returns {Object}
   */
  getParameters() {
    return { ...this.parameters };
  }

  /**
   * Get gate status
   * @returns {Object}
   */
  getStatus() {
    return {
      isOpen: this.detector.isOpen(),
      level: this.detector.getLevel(),
      reduction: this.mode === 'gate' ? 
        (this.detector.isOpen() ? 0 : this.parameters.range) : 
        this.expander.reduction.value
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
    this.registry.dispose();
  }
}

/**
 * Advanced detector for gate triggering
 */
class AdvancedDetector {
  constructor() {
    this.registry = new DisposalRegistry('advanced-detector');
    
    // Input gain
    this.input = this.registry.register(new Tone.Gain(1));
    
    // Sidechain filter
    this.filter = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 1000,
      Q: 1
    }));
    
    // Envelope follower
    this.follower = this.registry.register(new Tone.Follower({
      attack: 0.001,
      release: 0.1
    }));
    
    // Level meter
    this.meter = this.registry.register(new Tone.Meter());
    
    // Threshold detection
    this.threshold = -40;
    this.hysteresis = 3;
    this.holdTime = 0.01;
    this.isOpen = false;
    this.lastOpenTime = 0;
    
    // Filter enabled
    this.filterEnabled = false;
    
    // Output (control signal)
    this.output = this.registry.register(new Tone.Signal(0));
    
    // Connect
    this.connectSignalPath();
    
    // Start detection loop
    this.startDetection();
  }

  /**
   * Connect signal path
   */
  connectSignalPath() {
    this.input.disconnect();
    
    if (this.filterEnabled) {
      this.input.connect(this.filter);
      this.filter.connect(this.follower);
    } else {
      this.input.connect(this.follower);
    }
    
    this.follower.connect(this.meter);
  }

  /**
   * Start detection loop
   */
  startDetection() {
    setInterval(() => {
      const level = this.meter.getValue();
      const levelDb = 20 * Math.log10(Math.max(0.00001, level));
      
      // Hysteresis logic
      if (!this.isOpen) {
        // Gate is closed, check if should open
        if (levelDb > this.threshold) {
          this.isOpen = true;
          this.lastOpenTime = Tone.now();
          this.output.value = 1;
        }
      } else {
        // Gate is open, check if should close
        const closeThreshold = this.threshold - this.hysteresis;
        const timeSinceOpen = Tone.now() - this.lastOpenTime;
        
        if (levelDb < closeThreshold && timeSinceOpen > this.holdTime) {
          this.isOpen = false;
          this.output.value = 0;
        }
      }
    }, 1); // 1ms update rate
  }

  /**
   * Set threshold
   * @param {number} threshold in dB
   */
  setThreshold(threshold) {
    this.threshold = threshold;
  }

  /**
   * Set hysteresis
   * @param {number} hysteresis in dB
   */
  setHysteresis(hysteresis) {
    this.hysteresis = hysteresis;
  }

  /**
   * Set hold time
   * @param {number} hold in seconds
   */
  setHold(hold) {
    this.holdTime = hold;
  }

  /**
   * Enable/disable filter
   * @param {boolean} enabled 
   */
  setFilterEnabled(enabled) {
    this.filterEnabled = enabled;
    this.connectSignalPath();
  }

  /**
   * Set filter frequency
   * @param {number} freq 
   */
  setFilterFrequency(freq) {
    this.filter.frequency.value = freq;
  }

  /**
   * Set filter Q
   * @param {number} q 
   */
  setFilterQ(q) {
    this.filter.Q.value = q;
  }

  /**
   * Get current level
   * @returns {number} in dB
   */
  getLevel() {
    const level = this.meter.getValue();
    return 20 * Math.log10(Math.max(0.00001, level));
  }

  /**
   * Check if gate is open
   * @returns {boolean}
   */
  isOpen() {
    return this.isOpen;
  }

  /**
   * Connect control output
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.output.connect(destination);
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Noise Gate presets
 */
export const gatePresets = {
  drums: {
    threshold: -30,
    range: -60,
    attack: 0.0005,
    hold: 0.005,
    release: 0.05,
    lookAhead: 0.002,
    sidechainFilter: true,
    filterFreq: 100,
    filterQ: 0.5
  },
  
  vocals: {
    threshold: -40,
    range: -80,
    attack: 0.002,
    hold: 0.01,
    release: 0.2,
    lookAhead: 0.005,
    sidechainFilter: false
  },
  
  guitar: {
    threshold: -35,
    range: -70,
    attack: 0.001,
    hold: 0.02,
    release: 0.15,
    lookAhead: 0.003,
    sidechainFilter: true,
    filterFreq: 200,
    filterQ: 0.7
  },
  
  bass: {
    threshold: -25,
    range: -50,
    attack: 0.002,
    hold: 0.01,
    release: 0.1,
    lookAhead: 0.002,
    sidechainFilter: true,
    filterFreq: 80,
    filterQ: 1
  }
};

/**
 * Expander presets
 */
export const expanderPresets = {
  gentle: {
    mode: 'expander',
    threshold: -30,
    ratio: 0.7,
    attack: 0.005,
    release: 0.2
  },
  
  moderate: {
    mode: 'expander',
    threshold: -35,
    ratio: 0.5,
    attack: 0.002,
    release: 0.15
  },
  
  aggressive: {
    mode: 'expander',
    threshold: -40,
    ratio: 0.3,
    attack: 0.001,
    release: 0.1
  }
};

// Factory function
export function createGateExpander() {
  return new GateExpander();
}