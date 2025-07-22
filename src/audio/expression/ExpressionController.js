import * as Tone from 'tone';
import { update as updateState } from '../../state.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { getMappingForInstrument, scaleControllerValue, MIDI_CC } from '../../midi/MidiMappings.js';

/**
 * ExpressionController - Manages real-time expression control for instruments
 * Maps MIDI controllers to instrument parameters with smoothing and scaling
 */
export class ExpressionController {
  constructor(instrumentType) {
    this.instrumentType = instrumentType;
    this.registry = new DisposalRegistry(`expression-${instrumentType}`);
    
    // Controller mappings
    this.mappings = getMappingForInstrument(instrumentType);
    this.customMappings = new Map();
    
    // Parameter targets
    this.targets = new Map();
    this.smoothing = new Map();
    
    // Expression state
    this.expressionValues = new Map();
    this.lastUpdateTime = Date.now();
    
    // Smoothing settings
    this.smoothingTime = 0.05; // 50ms default
    this.updateRate = 60; // Hz
    
    // Expression curves
    this.curves = new Map();
    
    // LFO modulators
    this.modulators = new Map();
    
    // Recording/playback
    this.isRecording = false;
    this.recordedAutomation = [];
    this.playbackStartTime = null;
  }

  /**
   * Initialize expression controller with instrument
   * @param {Object} instrument - Tone.js instrument instance
   * @param {Object} config - Configuration options
   */
  initialize(instrument, config = {}) {
    this.instrument = instrument;
    
    const {
      smoothing = 0.05,
      updateRate = 60,
      defaultMappings = true,
      customMappings = {}
    } = config;
    
    this.smoothingTime = smoothing;
    this.updateRate = updateRate;
    
    // Set up default mappings if enabled
    if (defaultMappings) {
      this.setupDefaultTargets();
    }
    
    // Add custom mappings
    for (const [cc, param] of Object.entries(customMappings)) {
      this.addMapping(parseInt(cc), param);
    }
    
    // Start update loop
    this.startUpdateLoop();
  }

  /**
   * Set up default parameter targets based on instrument type
   */
  setupDefaultTargets() {
    // Common targets
    this.addTarget('volume', {
      param: this.instrument.volume,
      min: -60,
      max: 0,
      scale: 'logarithmic'
    });
    
    // Instrument-specific targets
    if (this.instrumentType.includes('piano')) {
      this.setupPianoTargets();
    } else if (this.instrumentType.includes('violin') || 
               this.instrumentType.includes('viola') || 
               this.instrumentType.includes('cello') || 
               this.instrumentType.includes('bass')) {
      this.setupStringTargets();
    } else if (this.instrumentType.includes('flute') || 
               this.instrumentType.includes('clarinet') || 
               this.instrumentType.includes('oboe') || 
               this.instrumentType.includes('bassoon')) {
      this.setupWindTargets();
    } else if (this.instrumentType.includes('trumpet') || 
               this.instrumentType.includes('horn') || 
               this.instrumentType.includes('trombone') || 
               this.instrumentType.includes('tuba')) {
      this.setupBrassTargets();
    } else {
      this.setupSynthTargets();
    }
  }

  /**
   * Set up piano-specific targets
   */
  setupPianoTargets() {
    if (this.instrument.setResonance) {
      this.addTarget('resonance', {
        param: (value) => this.instrument.setResonance(value),
        min: 0,
        max: 0.3,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setHammerHardness) {
      this.addTarget('hammerHardness', {
        param: (value) => this.instrument.setHammerHardness(value),
        min: 0.1,
        max: 1,
        scale: 'linear'
      });
    }
    
    // Pedal targets (binary)
    this.addTarget('sustainPedal', {
      param: (value) => this.instrument.setPedalState('sustain', value > 0.5),
      binary: true
    });
    
    this.addTarget('softPedal', {
      param: (value) => this.instrument.setPedalState('soft', value > 0.5),
      binary: true
    });
    
    this.addTarget('sostenutoPedal', {
      param: (value) => this.instrument.setPedalState('sostenuto', value > 0.5),
      binary: true
    });
  }

  /**
   * Set up string-specific targets
   */
  setupStringTargets() {
    if (this.instrument.vibratoLFO) {
      this.addTarget('vibratoDepth', {
        param: this.instrument.vibratoLFO.depth,
        min: 0,
        max: 0.5,
        scale: 'linear'
      });
      
      this.addTarget('vibratoRate', {
        param: this.instrument.vibratoLFO.frequency,
        min: 0.5,
        max: 10,
        scale: 'exponential'
      });
    }
    
    if (this.instrument.setBowPressure) {
      this.addTarget('bowPressure', {
        param: (value) => this.instrument.setBowPressure(value),
        min: 0,
        max: 1,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setBowSpeed) {
      this.addTarget('bowSpeed', {
        param: (value) => this.instrument.setBowSpeed(value),
        min: 0,
        max: 1,
        scale: 'linear'
      });
    }
    
    if (this.instrument.filter) {
      this.addTarget('brightness', {
        param: this.instrument.filter.frequency,
        min: 200,
        max: 8000,
        scale: 'logarithmic'
      });
    }
  }

  /**
   * Set up wind-specific targets
   */
  setupWindTargets() {
    if (this.instrument.setBreathPressure) {
      this.addTarget('breathPressure', {
        param: (value) => this.instrument.setBreathPressure(value),
        min: 0,
        max: 1,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setAirPressure) {
      this.addTarget('airPressure', {
        param: (value) => this.instrument.setAirPressure(value),
        min: 0,
        max: 1.5,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setEmbouchure) {
      this.addTarget('embouchure', {
        param: (value) => this.instrument.setEmbouchure(value),
        min: 0.5,
        max: 1.5,
        scale: 'linear'
      });
    }
    
    if (this.instrument.vibratoLFO) {
      this.addTarget('vibratoDepth', {
        param: this.instrument.vibratoLFO.depth,
        min: 0,
        max: 0.3,
        scale: 'linear'
      });
      
      this.addTarget('vibratoRate', {
        param: this.instrument.vibratoLFO.frequency,
        min: 2,
        max: 8,
        scale: 'linear'
      });
    }
  }

  /**
   * Set up brass-specific targets
   */
  setupBrassTargets() {
    if (this.instrument.setLipTension) {
      this.addTarget('lipTension', {
        param: (value) => this.instrument.setLipTension(value),
        min: 0.5,
        max: 2,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setAirPressure) {
      this.addTarget('airPressure', {
        param: (value) => this.instrument.setAirPressure(value),
        min: 0,
        max: 2,
        scale: 'linear'
      });
    }
    
    if (this.instrument.setBrightness) {
      this.addTarget('brightness', {
        param: (value) => this.instrument.setBrightness(value),
        min: 0.5,
        max: 2,
        scale: 'linear'
      });
    }
    
    // Mute control (discrete values)
    if (this.instrument.setMute) {
      this.addTarget('mute', {
        param: (value) => {
          const mutes = ['open', 'straight', 'cup', 'harmon', 'bucket'];
          const index = Math.floor(value * mutes.length);
          this.instrument.setMute(mutes[Math.min(index, mutes.length - 1)]);
        },
        discrete: true
      });
    }
  }

  /**
   * Set up synth-specific targets
   */
  setupSynthTargets() {
    if (this.instrument.voice && this.instrument.voice.oscillator) {
      this.addTarget('detune', {
        param: this.instrument.voice.oscillator.detune,
        min: -100,
        max: 100,
        scale: 'linear'
      });
    }
    
    if (this.instrument.voice && this.instrument.voice.filter) {
      this.addTarget('filterCutoff', {
        param: this.instrument.voice.filter.frequency,
        min: 50,
        max: 8000,
        scale: 'logarithmic'
      });
      
      this.addTarget('filterResonance', {
        param: this.instrument.voice.filter.Q,
        min: 0.1,
        max: 20,
        scale: 'exponential'
      });
    }
    
    if (this.instrument.voice && this.instrument.voice.envelope) {
      this.addTarget('envelopeAttack', {
        param: this.instrument.voice.envelope.attack,
        min: 0.001,
        max: 2,
        scale: 'exponential'
      });
      
      this.addTarget('envelopeDecay', {
        param: this.instrument.voice.envelope.decay,
        min: 0.01,
        max: 2,
        scale: 'exponential'
      });
      
      this.addTarget('envelopeRelease', {
        param: this.instrument.voice.envelope.release,
        min: 0.01,
        max: 5,
        scale: 'exponential'
      });
    }
  }

  /**
   * Add a parameter target
   * @param {string} name 
   * @param {Object} config 
   */
  addTarget(name, config) {
    this.targets.set(name, config);
    
    // Initialize smoothing if not binary
    if (!config.binary && !config.discrete) {
      const signal = this.registry.register(new Tone.Signal(0));
      this.smoothing.set(name, signal);
      
      // Connect to parameter if it's an AudioParam
      if (config.param && config.param.value !== undefined) {
        signal.connect(config.param);
      }
    }
  }

  /**
   * Add a custom controller mapping
   * @param {number} cc - MIDI CC number
   * @param {string} parameter - Parameter name
   */
  addMapping(cc, parameter) {
    this.customMappings.set(cc, parameter);
  }

  /**
   * Process a controller value
   * @param {number} cc - Controller number
   * @param {number} value - Normalized value (0-1)
   */
  processController(cc, value) {
    // Check custom mappings first
    let parameter = this.customMappings.get(cc);
    
    // Then check default mappings
    if (!parameter) {
      parameter = this.mappings[cc];
    }
    
    if (!parameter) return;
    
    // Store raw value
    this.expressionValues.set(parameter, value);
    
    // Record if enabled
    if (this.isRecording) {
      this.recordAutomation(parameter, value);
    }
    
    // Apply to target
    this.applyExpression(parameter, value);
  }

  /**
   * Apply expression value to parameter
   * @param {string} parameter 
   * @param {number} value 
   */
  applyExpression(parameter, value) {
    const target = this.targets.get(parameter);
    if (!target) return;
    
    // Apply curve if defined
    const curve = this.curves.get(parameter);
    if (curve) {
      value = curve(value);
    }
    
    // Scale value
    if (target.min !== undefined && target.max !== undefined) {
      const scaled = scaleControllerValue(parameter, value);
      value = target.min + (target.max - target.min) * ((scaled - target.min) / (target.max - target.min));
    }
    
    // Apply based on target type
    if (target.binary) {
      // Binary parameter (on/off)
      if (typeof target.param === 'function') {
        target.param(value);
      }
    } else if (target.discrete) {
      // Discrete parameter
      if (typeof target.param === 'function') {
        target.param(value);
      }
    } else {
      // Continuous parameter with smoothing
      const smoothing = this.smoothing.get(parameter);
      if (smoothing) {
        smoothing.linearRampTo(value, this.smoothingTime);
      } else if (typeof target.param === 'function') {
        target.param(value);
      } else if (target.param && target.param.value !== undefined) {
        target.param.linearRampTo(value, this.smoothingTime);
      }
    }
  }

  /**
   * Process pitch bend
   * @param {number} value - Normalized pitch bend (-1 to 1)
   */
  processPitchBend(value) {
    if (!this.instrument) return;
    
    // Default pitch bend range is +/- 2 semitones
    const semitones = value * 2;
    
    if (this.instrument.detune) {
      this.instrument.detune.value = semitones * 100; // Convert to cents
    }
    
    // Record if enabled
    if (this.isRecording) {
      this.recordAutomation('pitchBend', value);
    }
  }

  /**
   * Process aftertouch
   * @param {number} value - Normalized aftertouch (0-1)
   */
  processAftertouch(value) {
    // Map aftertouch to vibrato depth by default
    if (this.targets.has('vibratoDepth')) {
      this.applyExpression('vibratoDepth', value * 0.5);
    }
    
    // Also map to brightness if available
    if (this.targets.has('brightness')) {
      this.applyExpression('brightness', 0.7 + value * 0.3);
    }
    
    // Record if enabled
    if (this.isRecording) {
      this.recordAutomation('aftertouch', value);
    }
  }

  /**
   * Add an LFO modulator
   * @param {string} parameter 
   * @param {Object} config 
   */
  addModulator(parameter, config = {}) {
    const {
      frequency = 5,
      depth = 0.1,
      type = 'sine',
      phase = 0
    } = config;
    
    const lfo = this.registry.register(new Tone.LFO({
      frequency,
      amplitude: depth,
      type,
      phase
    }));
    
    const target = this.targets.get(parameter);
    if (target) {
      if (target.param && target.param.value !== undefined) {
        lfo.connect(target.param);
      }
      
      lfo.start();
      this.modulators.set(parameter, lfo);
    }
  }

  /**
   * Remove a modulator
   * @param {string} parameter 
   */
  removeModulator(parameter) {
    const lfo = this.modulators.get(parameter);
    if (lfo) {
      lfo.stop();
      lfo.disconnect();
      this.modulators.delete(parameter);
    }
  }

  /**
   * Set expression curve for a parameter
   * @param {string} parameter 
   * @param {Function} curve 
   */
  setExpressionCurve(parameter, curve) {
    this.curves.set(parameter, curve);
  }

  /**
   * Start recording automation
   */
  startRecording() {
    this.isRecording = true;
    this.recordedAutomation = [];
    this.recordingStartTime = Date.now();
  }

  /**
   * Stop recording automation
   * @returns {Array} Recorded automation
   */
  stopRecording() {
    this.isRecording = false;
    const automation = [...this.recordedAutomation];
    this.recordedAutomation = [];
    return automation;
  }

  /**
   * Record automation point
   * @param {string} parameter 
   * @param {number} value 
   */
  recordAutomation(parameter, value) {
    const time = (Date.now() - this.recordingStartTime) / 1000;
    this.recordedAutomation.push({ time, parameter, value });
  }

  /**
   * Play back recorded automation
   * @param {Array} automation 
   * @param {string} startTime 
   */
  playbackAutomation(automation, startTime = '+0') {
    this.playbackStartTime = Tone.Time(startTime).toSeconds();
    
    for (const point of automation) {
      Tone.Transport.scheduleOnce(() => {
        this.applyExpression(point.parameter, point.value);
      }, this.playbackStartTime + point.time);
    }
  }

  /**
   * Start update loop for smooth parameter changes
   */
  startUpdateLoop() {
    const updateInterval = 1000 / this.updateRate;
    
    this.updateTimer = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;
      
      // Update any time-based modulation
      this.updateModulation(deltaTime);
    }, updateInterval);
  }

  /**
   * Update time-based modulation
   * @param {number} deltaTime 
   */
  updateModulation(deltaTime) {
    // Override in subclasses for custom modulation
  }

  /**
   * Get current expression state
   * @returns {Object}
   */
  getExpressionState() {
    const state = {};
    
    for (const [param, value] of this.expressionValues) {
      state[param] = value;
    }
    
    return state;
  }

  /**
   * Set smoothing time
   * @param {number} time - Time in seconds
   */
  setSmoothingTime(time) {
    this.smoothingTime = Math.max(0.001, time);
  }

  /**
   * Clean up and dispose
   */
  dispose() {
    // Stop update loop
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    // Stop all modulators
    for (const lfo of this.modulators.values()) {
      lfo.stop();
    }
    
    // Clear maps
    this.targets.clear();
    this.smoothing.clear();
    this.expressionValues.clear();
    this.modulators.clear();
    this.curves.clear();
    
    // Dispose registry
    this.registry.dispose();
  }
}

/**
 * Create expression controller for instrument
 * @param {string} instrumentType 
 * @param {Object} instrument 
 * @param {Object} config 
 * @returns {ExpressionController}
 */
export function createExpressionController(instrumentType, instrument, config = {}) {
  const controller = new ExpressionController(instrumentType);
  controller.initialize(instrument, config);
  return controller;
}