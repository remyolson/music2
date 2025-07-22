import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { CompressorSuite } from '../effects/professional/CompressorSuite.js';
import { EQSuite } from '../effects/professional/EQSuite.js';

/**
 * BusProcessor - Multi-bus mixing system
 * Provides multiple mix buses with individual processing
 */
export class BusProcessor {
  constructor() {
    this.registry = new DisposalRegistry('bus-processor');
    
    // Available buses
    this.buses = new Map();
    
    // Master bus
    this.masterBus = this.createBus('master', {
      type: 'master',
      processing: ['eq', 'compressor', 'limiter', 'analyzer']
    });
    
    // Initialize standard buses
    this.initializeStandardBuses();
    
    // Bus sends matrix
    this.sends = new Map();
    
    // Global solo/mute state
    this.soloActive = false;
    this.soloedBuses = new Set();
    
    // Output
    this.output = this.masterBus.output;
  }

  /**
   * Initialize standard mix buses
   */
  initializeStandardBuses() {
    // Drum bus
    this.createBus('drums', {
      type: 'group',
      processing: ['eq', 'compressor', 'transient'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Bass bus
    this.createBus('bass', {
      type: 'group',
      processing: ['eq', 'compressor'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Strings bus
    this.createBus('strings', {
      type: 'group',
      processing: ['eq', 'compressor', 'reverb'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Brass bus
    this.createBus('brass', {
      type: 'group',
      processing: ['eq', 'compressor', 'saturation'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Woodwinds bus
    this.createBus('woodwinds', {
      type: 'group',
      processing: ['eq', 'compressor', 'chorus'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Keys bus
    this.createBus('keys', {
      type: 'group',
      processing: ['eq', 'compressor', 'phaser'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Vocals bus
    this.createBus('vocals', {
      type: 'group',
      processing: ['eq', 'compressor', 'deesser', 'reverb'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Effects return buses
    this.createBus('reverb', {
      type: 'aux',
      processing: ['eq'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    this.createBus('delay', {
      type: 'aux',
      processing: ['eq'],
      sends: [{ bus: 'master', level: 0 }]
    });
    
    // Parallel compression bus
    this.createBus('parallel', {
      type: 'aux',
      processing: ['compressor'],
      sends: [{ bus: 'master', level: -6 }]
    });
  }

  /**
   * Create a new bus
   * @param {string} name 
   * @param {Object} config 
   * @returns {Object} The created bus
   */
  createBus(name, config = {}) {
    if (this.buses.has(name)) {
      console.warn(`Bus '${name}' already exists`);
      return this.buses.get(name);
    }
    
    const bus = new MixBus(name, config);
    this.registry.register(bus);
    this.buses.set(name, bus);
    
    // Set up sends
    if (config.sends) {
      config.sends.forEach(send => {
        this.connectSend(name, send.bus, send.level);
      });
    }
    
    return bus;
  }

  /**
   * Remove a bus
   * @param {string} name 
   */
  removeBus(name) {
    if (name === 'master') {
      console.warn('Cannot remove master bus');
      return;
    }
    
    const bus = this.buses.get(name);
    if (!bus) return;
    
    // Disconnect all sends
    this.disconnectAllSends(name);
    
    // Remove and dispose
    this.buses.delete(name);
    bus.dispose();
  }

  /**
   * Connect a send from one bus to another
   * @param {string} fromBus 
   * @param {string} toBus 
   * @param {number} level in dB
   */
  connectSend(fromBus, toBus, level = 0) {
    const from = this.buses.get(fromBus);
    const to = this.buses.get(toBus);
    
    if (!from || !to) {
      console.warn(`Cannot connect send: ${fromBus} -> ${toBus}`);
      return;
    }
    
    // Create send if not exists
    const sendKey = `${fromBus}->${toBus}`;
    if (!this.sends.has(sendKey)) {
      const send = this.registry.register(new Tone.Gain());
      this.sends.set(sendKey, send);
      from.output.connect(send);
      send.connect(to.input);
    }
    
    // Set level
    const send = this.sends.get(sendKey);
    send.gain.value = Math.pow(10, level / 20);
  }

  /**
   * Disconnect a send
   * @param {string} fromBus 
   * @param {string} toBus 
   */
  disconnectSend(fromBus, toBus) {
    const sendKey = `${fromBus}->${toBus}`;
    const send = this.sends.get(sendKey);
    
    if (send) {
      send.disconnect();
      this.sends.delete(sendKey);
    }
  }

  /**
   * Disconnect all sends from a bus
   * @param {string} busName 
   */
  disconnectAllSends(busName) {
    const keysToRemove = [];
    
    this.sends.forEach((send, key) => {
      if (key.startsWith(`${busName}->`) || key.endsWith(`->${busName}`)) {
        send.disconnect();
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.sends.delete(key));
  }

  /**
   * Route audio to a bus
   * @param {Tone.ToneAudioNode} source 
   * @param {string} busName 
   * @param {Object} options
   */
  routeToBus(source, busName, options = {}) {
    const bus = this.buses.get(busName);
    if (!bus) {
      console.warn(`Bus '${busName}' not found`);
      return;
    }
    
    const {
      gain = 0,
      pan = 0,
      sends = []
    } = options;
    
    // Create channel strip
    const channel = this.registry.register(new ChannelStrip());
    
    // Set parameters
    channel.setGain(gain);
    channel.setPan(pan);
    
    // Connect
    source.connect(channel.input);
    channel.connect(bus.input);
    
    // Set up sends
    sends.forEach(send => {
      channel.createSend(send.bus, send.level);
    });
    
    return channel;
  }

  /**
   * Solo a bus
   * @param {string} busName 
   * @param {boolean} solo
   */
  setBusSolo(busName, solo) {
    const bus = this.buses.get(busName);
    if (!bus) return;
    
    if (solo) {
      this.soloedBuses.add(busName);
      this.soloActive = true;
    } else {
      this.soloedBuses.delete(busName);
      this.soloActive = this.soloedBuses.size > 0;
    }
    
    // Update all bus mutes based on solo state
    this.updateSoloState();
  }

  /**
   * Update solo state for all buses
   */
  updateSoloState() {
    this.buses.forEach((bus, name) => {
      if (this.soloActive) {
        // Mute if not soloed
        bus.setMute(!this.soloedBuses.has(name));
      } else {
        // Restore original mute state
        bus.setMute(bus.userMuted);
      }
    });
  }

  /**
   * Mute a bus
   * @param {string} busName 
   * @param {boolean} mute
   */
  setBusMute(busName, mute) {
    const bus = this.buses.get(busName);
    if (!bus) return;
    
    bus.userMuted = mute;
    
    // Apply mute unless overridden by solo
    if (!this.soloActive || this.soloedBuses.has(busName)) {
      bus.setMute(mute);
    }
  }

  /**
   * Set bus volume
   * @param {string} busName 
   * @param {number} level in dB
   */
  setBusLevel(busName, level) {
    const bus = this.buses.get(busName);
    if (!bus) return;
    
    bus.setLevel(level);
  }

  /**
   * Get bus parameters
   * @param {string} busName 
   * @returns {Object}
   */
  getBusParameters(busName) {
    const bus = this.buses.get(busName);
    if (!bus) return null;
    
    return bus.getParameters();
  }

  /**
   * Set bus processing parameters
   * @param {string} busName 
   * @param {string} processorType 
   * @param {Object} params
   */
  setBusProcessing(busName, processorType, params) {
    const bus = this.buses.get(busName);
    if (!bus) return;
    
    bus.setProcessorParameters(processorType, params);
  }

  /**
   * Get metering data for a bus
   * @param {string} busName 
   * @returns {Object}
   */
  getBusMetering(busName) {
    const bus = this.buses.get(busName);
    if (!bus) return null;
    
    return bus.getMetering();
  }

  /**
   * Get all bus names
   * @returns {Array}
   */
  getBusNames() {
    return Array.from(this.buses.keys());
  }

  /**
   * Create a snapshot of all bus settings
   * @returns {Object}
   */
  createSnapshot() {
    const snapshot = {
      buses: {},
      sends: {}
    };
    
    // Bus settings
    this.buses.forEach((bus, name) => {
      snapshot.buses[name] = bus.getParameters();
    });
    
    // Send levels
    this.sends.forEach((send, key) => {
      snapshot.sends[key] = 20 * Math.log10(send.gain.value);
    });
    
    return snapshot;
  }

  /**
   * Recall a snapshot
   * @param {Object} snapshot 
   */
  recallSnapshot(snapshot) {
    // Bus settings
    Object.entries(snapshot.buses).forEach(([name, params]) => {
      const bus = this.buses.get(name);
      if (bus) {
        bus.setParameters(params);
      }
    });
    
    // Send levels
    Object.entries(snapshot.sends).forEach(([key, level]) => {
      const send = this.sends.get(key);
      if (send) {
        send.gain.value = Math.pow(10, level / 20);
      }
    });
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
    this.buses.forEach(bus => bus.dispose());
    this.buses.clear();
    this.sends.clear();
    this.registry.dispose();
  }
}

/**
 * Individual mix bus with processing
 */
class MixBus {
  constructor(name, config = {}) {
    this.registry = new DisposalRegistry(`bus-${name}`);
    this.name = name;
    this.type = config.type || 'group';
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Level control
    this.fader = this.registry.register(new Tone.Gain(1));
    
    // Mute control
    this.muteGain = this.registry.register(new Tone.Gain(1));
    this.userMuted = false;
    
    // Processing chain
    this.processors = new Map();
    this.processingOrder = config.processing || [];
    
    // Metering
    this.inputMeter = this.registry.register(new Tone.Meter());
    this.outputMeter = this.registry.register(new Tone.Meter());
    
    // Initialize processors
    this.initializeProcessors();
    
    // Connect signal chain
    this.connectSignalChain();
    
    // Parameters
    this.parameters = {
      level: 0,
      mute: false,
      processing: {}
    };
  }

  /**
   * Initialize processors based on config
   */
  initializeProcessors() {
    this.processingOrder.forEach(type => {
      let processor;
      
      switch (type) {
        case 'eq':
          processor = new EQSuite();
          break;
          
        case 'compressor':
          processor = new CompressorSuite();
          break;
          
        case 'limiter':
          processor = new Limiter();
          break;
          
        case 'transient':
          processor = new TransientShaper();
          break;
          
        case 'saturation':
          processor = new Saturator();
          break;
          
        case 'reverb':
          processor = new BusReverb();
          break;
          
        case 'delay':
          processor = new BusDelay();
          break;
          
        case 'chorus':
          processor = new BusChorus();
          break;
          
        case 'phaser':
          processor = new BusPhaser();
          break;
          
        case 'deesser':
          processor = new DeEsser();
          break;
          
        case 'analyzer':
          processor = new SpectrumAnalyzer();
          break;
      }
      
      if (processor) {
        this.registry.register(processor);
        this.processors.set(type, processor);
      }
    });
  }

  /**
   * Connect signal chain
   */
  connectSignalChain() {
    // Input metering
    this.input.connect(this.inputMeter);
    
    // Connect processors in order
    let current = this.input;
    
    this.processingOrder.forEach(type => {
      const processor = this.processors.get(type);
      if (processor) {
        current.connect(processor.input);
        current = processor;
      }
    });
    
    // Connect to fader
    current.connect(this.fader);
    this.fader.connect(this.muteGain);
    this.muteGain.connect(this.output);
    
    // Output metering
    this.output.connect(this.outputMeter);
  }

  /**
   * Set bus level
   * @param {number} level in dB
   */
  setLevel(level) {
    this.parameters.level = level;
    this.fader.gain.rampTo(Math.pow(10, level / 20), 0.05);
  }

  /**
   * Set mute state
   * @param {boolean} mute 
   */
  setMute(mute) {
    this.parameters.mute = mute;
    this.muteGain.gain.rampTo(mute ? 0 : 1, 0.01);
  }

  /**
   * Set processor parameters
   * @param {string} processorType 
   * @param {Object} params 
   */
  setProcessorParameters(processorType, params) {
    const processor = this.processors.get(processorType);
    if (!processor) return;
    
    processor.setParameters(params);
    
    if (!this.parameters.processing[processorType]) {
      this.parameters.processing[processorType] = {};
    }
    Object.assign(this.parameters.processing[processorType], params);
  }

  /**
   * Get current parameters
   * @returns {Object}
   */
  getParameters() {
    const params = {
      ...this.parameters,
      processing: {}
    };
    
    // Get processor parameters
    this.processors.forEach((processor, type) => {
      if (processor.getParameters) {
        params.processing[type] = processor.getParameters();
      }
    });
    
    return params;
  }

  /**
   * Set all parameters
   * @param {Object} params 
   */
  setParameters(params) {
    if (params.level !== undefined) {
      this.setLevel(params.level);
    }
    
    if (params.mute !== undefined) {
      this.setMute(params.mute);
    }
    
    if (params.processing) {
      Object.entries(params.processing).forEach(([type, procParams]) => {
        this.setProcessorParameters(type, procParams);
      });
    }
  }

  /**
   * Get metering data
   * @returns {Object}
   */
  getMetering() {
    return {
      input: this.inputMeter.getValue(),
      output: this.outputMeter.getValue(),
      reduction: this.getGainReduction()
    };
  }

  /**
   * Get gain reduction from compressor
   * @returns {number}
   */
  getGainReduction() {
    const compressor = this.processors.get('compressor');
    if (compressor && compressor.getMeters) {
      const meters = compressor.getMeters();
      return meters.gainReduction || 0;
    }
    return 0;
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
 * Channel strip for bus routing
 */
class ChannelStrip {
  constructor() {
    this.registry = new DisposalRegistry('channel-strip');
    
    // Input gain
    this.inputGain = this.registry.register(new Tone.Gain(1));
    
    // Pan
    this.panner = this.registry.register(new Tone.Panner(0));
    
    // Sends
    this.sends = new Map();
    
    // Output
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Connect
    this.input = this.inputGain;
    this.inputGain.connect(this.panner);
    this.panner.connect(this.output);
  }

  /**
   * Set gain
   * @param {number} gain in dB
   */
  setGain(gain) {
    this.inputGain.gain.value = Math.pow(10, gain / 20);
  }

  /**
   * Set pan
   * @param {number} pan -1 to 1
   */
  setPan(pan) {
    this.panner.pan.value = pan;
  }

  /**
   * Create a send
   * @param {MixBus} bus 
   * @param {number} level in dB
   */
  createSend(bus, level = -Infinity) {
    const send = this.registry.register(new Tone.Gain());
    this.sends.set(bus.name, send);
    
    this.panner.connect(send);
    send.connect(bus.input);
    
    send.gain.value = Math.pow(10, level / 20);
    
    return send;
  }

  /**
   * Set send level
   * @param {string} busName 
   * @param {number} level in dB
   */
  setSendLevel(busName, level) {
    const send = this.sends.get(busName);
    if (send) {
      send.gain.value = Math.pow(10, level / 20);
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
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Simple limiter for master bus
 */
class Limiter {
  constructor() {
    this.registry = new DisposalRegistry('limiter');
    
    this.limiter = this.registry.register(new Tone.Limiter(-0.3));
    
    this.input = this.limiter;
    this.output = this.limiter;
  }

  setParameters(params) {
    if (params.threshold !== undefined) {
      this.limiter.threshold.value = params.threshold;
    }
  }

  getParameters() {
    return {
      threshold: this.limiter.threshold.value
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Transient shaper for drums
 */
class TransientShaper {
  constructor() {
    this.registry = new DisposalRegistry('transient-shaper');
    
    // Attack enhancement
    this.attackEnvelope = this.registry.register(new Tone.Envelope({
      attack: 0.001,
      decay: 0.01,
      sustain: 0,
      release: 0.01
    }));
    
    this.attackGain = this.registry.register(new Tone.Gain(0));
    
    // Sustain control
    this.sustainCompressor = this.registry.register(new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.01,
      release: 0.1
    }));
    
    // Mix
    this.dryGain = this.registry.register(new Tone.Gain(1));
    this.wetGain = this.registry.register(new Tone.Gain(0));
    this.output = this.registry.register(new Tone.Gain(1));
    
    // Input
    this.input = this.registry.register(new Tone.Gain(1));
    
    // Connect
    this.input.connect(this.dryGain);
    this.input.connect(this.attackEnvelope);
    this.attackEnvelope.connect(this.attackGain.gain);
    this.input.connect(this.attackGain);
    this.attackGain.connect(this.wetGain);
    
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);
    
    this.parameters = {
      attack: 0,
      sustain: 0
    };
  }

  setParameters(params) {
    if (params.attack !== undefined) {
      this.parameters.attack = params.attack;
      this.wetGain.gain.value = params.attack;
    }
    
    if (params.sustain !== undefined) {
      this.parameters.sustain = params.sustain;
      this.sustainCompressor.ratio.value = 1 + Math.abs(params.sustain) * 9;
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Saturation processor
 */
class Saturator {
  constructor() {
    this.registry = new DisposalRegistry('saturator');
    
    this.distortion = this.registry.register(new Tone.Distortion({
      distortion: 0.1,
      wet: 0.5
    }));
    
    this.warmth = this.registry.register(new Tone.Chebyshev({
      order: 2,
      wet: 0.2
    }));
    
    this.toneControl = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 3000,
      gain: 0
    }));
    
    // Input/output
    this.input = this.distortion;
    this.output = this.toneControl;
    
    // Connect
    this.distortion.connect(this.warmth);
    this.warmth.connect(this.toneControl);
    
    this.parameters = {
      drive: 0.1,
      warmth: 0.2,
      tone: 0
    };
  }

  setParameters(params) {
    if (params.drive !== undefined) {
      this.parameters.drive = params.drive;
      this.distortion.distortion = params.drive;
    }
    
    if (params.warmth !== undefined) {
      this.parameters.warmth = params.warmth;
      this.warmth.wet.value = params.warmth;
    }
    
    if (params.tone !== undefined) {
      this.parameters.tone = params.tone;
      this.toneControl.gain.value = params.tone * 6;
    }
  }

  getParameters() {
    return { ...this.parameters };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Simple bus reverb
 */
class BusReverb {
  constructor() {
    this.registry = new DisposalRegistry('bus-reverb');
    
    this.reverb = this.registry.register(new Tone.Reverb({
      decay: 1.5,
      preDelay: 0.01
    }));
    
    this.input = this.reverb;
    this.output = this.reverb;
    
    this.reverb.generate();
  }

  setParameters(params) {
    if (params.decay !== undefined) {
      this.reverb.decay = params.decay;
    }
    if (params.wet !== undefined) {
      this.reverb.wet.value = params.wet;
    }
  }

  getParameters() {
    return {
      decay: this.reverb.decay,
      wet: this.reverb.wet.value
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Simple bus delay
 */
class BusDelay {
  constructor() {
    this.registry = new DisposalRegistry('bus-delay');
    
    this.delay = this.registry.register(new Tone.FeedbackDelay({
      delayTime: 0.25,
      feedback: 0.3,
      wet: 0.5
    }));
    
    this.input = this.delay;
    this.output = this.delay;
  }

  setParameters(params) {
    if (params.time !== undefined) {
      this.delay.delayTime.value = params.time;
    }
    if (params.feedback !== undefined) {
      this.delay.feedback.value = params.feedback;
    }
    if (params.wet !== undefined) {
      this.delay.wet.value = params.wet;
    }
  }

  getParameters() {
    return {
      time: this.delay.delayTime.value,
      feedback: this.delay.feedback.value,
      wet: this.delay.wet.value
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Simple bus chorus
 */
class BusChorus {
  constructor() {
    this.registry = new DisposalRegistry('bus-chorus');
    
    this.chorus = this.registry.register(new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.5
    }));
    
    this.input = this.chorus;
    this.output = this.chorus;
  }

  setParameters(params) {
    if (params.rate !== undefined) {
      this.chorus.frequency.value = params.rate;
    }
    if (params.depth !== undefined) {
      this.chorus.depth = params.depth;
    }
    if (params.wet !== undefined) {
      this.chorus.wet.value = params.wet;
    }
  }

  getParameters() {
    return {
      rate: this.chorus.frequency.value,
      depth: this.chorus.depth,
      wet: this.chorus.wet.value
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Simple bus phaser
 */
class BusPhaser {
  constructor() {
    this.registry = new DisposalRegistry('bus-phaser');
    
    this.phaser = this.registry.register(new Tone.Phaser({
      frequency: 0.5,
      depth: 10,
      baseFrequency: 1000,
      wet: 0.5
    }));
    
    this.input = this.phaser;
    this.output = this.phaser;
  }

  setParameters(params) {
    if (params.rate !== undefined) {
      this.phaser.frequency.value = params.rate;
    }
    if (params.depth !== undefined) {
      this.phaser.depth.value = params.depth;
    }
    if (params.wet !== undefined) {
      this.phaser.wet.value = params.wet;
    }
  }

  getParameters() {
    return {
      rate: this.phaser.frequency.value,
      depth: this.phaser.depth.value,
      wet: this.phaser.wet.value
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * De-esser for vocals
 */
class DeEsser {
  constructor() {
    this.registry = new DisposalRegistry('de-esser');
    
    // Detection filter
    this.detector = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 7000,
      Q: 5
    }));
    
    // Envelope follower
    this.follower = this.registry.register(new Tone.Follower(0.005, 0.01));
    
    // Reduction filter
    this.reductionFilter = this.registry.register(new Tone.Filter({
      type: 'peaking',
      frequency: 7000,
      Q: 5,
      gain: 0
    }));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.reductionFilter;
    
    // Connect
    this.input.connect(this.detector);
    this.detector.connect(this.follower);
    this.input.connect(this.reductionFilter);
    
    // Control logic
    this.threshold = -30;
    this.reduction = -6;
    
    this.startDetection();
  }

  startDetection() {
    setInterval(() => {
      const level = this.follower.getValue();
      const levelDb = 20 * Math.log10(Math.max(0.00001, level));
      
      if (levelDb > this.threshold) {
        const amount = (levelDb - this.threshold) / 10;
        this.reductionFilter.gain.value = this.reduction * Math.min(1, amount);
      } else {
        this.reductionFilter.gain.value = 0;
      }
    }, 5);
  }

  setParameters(params) {
    if (params.threshold !== undefined) {
      this.threshold = params.threshold;
    }
    if (params.frequency !== undefined) {
      this.detector.frequency.value = params.frequency;
      this.reductionFilter.frequency.value = params.frequency;
    }
    if (params.reduction !== undefined) {
      this.reduction = params.reduction;
    }
  }

  getParameters() {
    return {
      threshold: this.threshold,
      frequency: this.detector.frequency.value,
      reduction: this.reduction
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Spectrum analyzer
 */
class SpectrumAnalyzer {
  constructor() {
    this.registry = new DisposalRegistry('spectrum-analyzer');
    
    this.fft = this.registry.register(new Tone.FFT(2048));
    
    this.input = this.fft;
    this.output = this.fft;
  }

  setParameters(params) {
    if (params.size !== undefined) {
      this.fft.size = params.size;
    }
  }

  getParameters() {
    return {
      size: this.fft.size
    };
  }

  getSpectrum() {
    return this.fft.getValue();
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createBusProcessor() {
  return new BusProcessor();
}