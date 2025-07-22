import * as Tone from 'tone';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';

/**
 * SpatialPanner - Advanced 3D spatial positioning
 * Includes binaural processing, width control, and auto-panning
 */
export class SpatialPanner {
  constructor() {
    this.registry = new DisposalRegistry('spatial-panner');
    
    // Main panner
    this.panner3d = this.registry.register(new Tone.Panner3D({
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 10000,
      rolloffFactor: 1,
      coneInnerAngle: 360,
      coneOuterAngle: 0,
      coneOuterGain: 0
    }));
    
    // Stereo width control
    this.widener = this.registry.register(new Tone.StereoWidener({
      width: 1.0
    }));
    
    // Auto-panner
    this.autoPanner = this.registry.register(new Tone.AutoPanner({
      frequency: 0.5,
      depth: 0,
      wet: 0
    }));
    
    // Binaural processing
    this.binauralProcessor = new BinauralProcessor();
    this.registry.register(this.binauralProcessor);
    
    // Distance simulation
    this.distanceFilter = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 20000,
      rolloff: -12
    }));
    
    this.distanceReverb = this.registry.register(new Tone.Reverb({
      decay: 0.5,
      wet: 0
    }));
    
    // Height simulation
    this.heightFilter = this.registry.register(new Tone.Filter({
      type: 'highshelf',
      frequency: 5000,
      gain: 0
    }));
    
    // Room simulation
    this.earlyReflections = this.registry.register(new Tone.FeedbackDelay({
      delayTime: 0.02,
      feedback: 0.2,
      wet: 0
    }));
    
    // Output gain
    this.outputGain = this.registry.register(new Tone.Gain(1));
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.outputGain;
    
    // Processing modes
    this.mode = 'standard'; // 'standard', 'binaural', '3d'
    
    // Connect default path
    this.connectStandardMode();
    
    // Initialize reverb
    this.distanceReverb.generate();
    
    // Parameters
    this.parameters = {
      mode: 'standard',
      position: { x: 0, y: 0, z: 1 },
      width: 1.0,
      autoPan: false,
      autoPanRate: 0.5,
      autoPanDepth: 0.5,
      distance: 1,
      height: 0,
      roomSize: 0,
      orientation: 0
    };
  }

  /**
   * Connect for standard stereo mode
   */
  connectStandardMode() {
    this.input.disconnect();
    this.input.connect(this.widener);
    this.widener.connect(this.autoPanner);
    this.autoPanner.connect(this.outputGain);
  }

  /**
   * Connect for binaural mode
   */
  connectBinauralMode() {
    this.input.disconnect();
    this.input.connect(this.binauralProcessor.input);
    this.binauralProcessor.connect(this.outputGain);
  }

  /**
   * Connect for 3D mode
   */
  connect3DMode() {
    this.input.disconnect();
    this.input.connect(this.panner3d);
    this.panner3d.connect(this.distanceFilter);
    this.distanceFilter.connect(this.heightFilter);
    this.heightFilter.connect(this.distanceReverb);
    this.distanceReverb.connect(this.earlyReflections);
    this.earlyReflections.connect(this.outputGain);
  }

  /**
   * Set parameters
   * @param {Object} params 
   */
  setParameters(params) {
    if (params.mode !== undefined && params.mode !== this.parameters.mode) {
      this.parameters.mode = params.mode;
      this.mode = params.mode;
      
      switch (params.mode) {
        case 'standard':
          this.connectStandardMode();
          break;
        case 'binaural':
          this.connectBinauralMode();
          break;
        case '3d':
          this.connect3DMode();
          break;
      }
    }
    
    if (params.position !== undefined) {
      this.parameters.position = params.position;
      this.setPosition(params.position.x, params.position.y, params.position.z);
    }
    
    if (params.width !== undefined) {
      this.parameters.width = params.width;
      this.widener.width.value = params.width;
    }
    
    if (params.autoPan !== undefined) {
      this.parameters.autoPan = params.autoPan;
      this.autoPanner.wet.value = params.autoPan ? 1 : 0;
    }
    
    if (params.autoPanRate !== undefined) {
      this.parameters.autoPanRate = params.autoPanRate;
      this.autoPanner.frequency.value = params.autoPanRate;
    }
    
    if (params.autoPanDepth !== undefined) {
      this.parameters.autoPanDepth = params.autoPanDepth;
      this.autoPanner.depth.value = params.autoPanDepth;
    }
    
    if (params.distance !== undefined) {
      this.parameters.distance = params.distance;
      this.updateDistanceEffects(params.distance);
    }
    
    if (params.height !== undefined) {
      this.parameters.height = params.height;
      this.updateHeightEffects(params.height);
    }
    
    if (params.roomSize !== undefined) {
      this.parameters.roomSize = params.roomSize;
      this.updateRoomEffects(params.roomSize);
    }
    
    if (params.orientation !== undefined) {
      this.parameters.orientation = params.orientation;
      this.panner3d.orientationX.value = Math.cos(params.orientation);
      this.panner3d.orientationZ.value = Math.sin(params.orientation);
    }
  }

  /**
   * Set 3D position
   * @param {number} x - Left/right (-1 to 1)
   * @param {number} y - Up/down (-1 to 1)
   * @param {number} z - Front/back (0 to 10)
   */
  setPosition(x, y, z) {
    // Convert to 3D space
    const distance = Math.sqrt(x * x + y * y + z * z);
    
    // Update panner3d position
    this.panner3d.positionX.value = x * 2;
    this.panner3d.positionY.value = y * 2;
    this.panner3d.positionZ.value = z;
    
    // Update binaural processor
    this.binauralProcessor.setPosition(x, y, z);
    
    // Standard panning for non-3D modes
    if (this.mode === 'standard') {
      // Simple stereo panning
      const pan = Math.max(-1, Math.min(1, x));
      // Could add a standard Panner here if needed
    }
    
    // Update distance effects
    this.updateDistanceEffects(distance);
  }

  /**
   * Update distance-based effects
   * @param {number} distance 
   */
  updateDistanceEffects(distance) {
    // Attenuate high frequencies with distance
    const cutoff = 20000 / (1 + distance * 0.5);
    this.distanceFilter.frequency.rampTo(cutoff, 0.1);
    
    // Add reverb with distance
    const reverbAmount = Math.min(0.5, distance * 0.1);
    this.distanceReverb.wet.rampTo(reverbAmount, 0.1);
    
    // Volume attenuation
    const attenuation = 1 / (1 + distance * 0.1);
    this.outputGain.gain.rampTo(attenuation, 0.1);
  }

  /**
   * Update height-based effects
   * @param {number} height - -1 to 1
   */
  updateHeightEffects(height) {
    // Height affects high frequency content
    // Above: brighter, Below: duller
    const heightGain = height * 6; // ±6dB
    this.heightFilter.gain.rampTo(heightGain, 0.1);
    
    // Slight filtering for elevation
    if (height < 0) {
      // Below listener - more muffled
      this.heightFilter.frequency.rampTo(3000, 0.1);
    } else {
      this.heightFilter.frequency.rampTo(5000, 0.1);
    }
  }

  /**
   * Update room simulation
   * @param {number} roomSize - 0 to 1
   */
  updateRoomEffects(roomSize) {
    // Early reflections intensity
    this.earlyReflections.wet.rampTo(roomSize * 0.3, 0.1);
    
    // Reflection delay based on room size
    const delay = 0.01 + roomSize * 0.04;
    this.earlyReflections.delayTime.rampTo(delay, 0.1);
    
    // Feedback for room liveliness
    this.earlyReflections.feedback.rampTo(roomSize * 0.4, 0.1);
  }

  /**
   * Set listener position/orientation
   * @param {Object} listener 
   */
  setListenerPosition(listener) {
    if (listener.position) {
      Tone.Listener.positionX.value = listener.position.x;
      Tone.Listener.positionY.value = listener.position.y;
      Tone.Listener.positionZ.value = listener.position.z;
    }
    
    if (listener.forward) {
      Tone.Listener.forwardX.value = listener.forward.x;
      Tone.Listener.forwardY.value = listener.forward.y;
      Tone.Listener.forwardZ.value = listener.forward.z;
    }
    
    if (listener.up) {
      Tone.Listener.upX.value = listener.up.x;
      Tone.Listener.upY.value = listener.up.y;
      Tone.Listener.upZ.value = listener.up.z;
    }
  }

  /**
   * Create movement automation
   * @param {Object} movement 
   */
  createMovement(movement) {
    const {
      path = 'circle',
      speed = 1,
      radius = 1,
      height = 0
    } = movement;
    
    let angle = 0;
    
    const updatePosition = () => {
      angle += speed * 0.01;
      
      let x, y, z;
      
      switch (path) {
        case 'circle':
          x = Math.cos(angle) * radius;
          y = height;
          z = Math.sin(angle) * radius + 1;
          break;
          
        case 'figure8':
          x = Math.sin(angle) * radius;
          y = height;
          z = Math.sin(angle * 2) * radius * 0.5 + 1;
          break;
          
        case 'spiral':
          const t = angle * 0.1;
          x = Math.cos(angle) * radius * (1 - t);
          y = height + t;
          z = Math.sin(angle) * radius * (1 - t) + 1;
          break;
          
        case 'random':
          x = (Math.random() - 0.5) * radius * 2;
          y = height + (Math.random() - 0.5) * 0.5;
          z = Math.random() * radius + 0.5;
          break;
      }
      
      this.setPosition(x, y, z);
    };
    
    return setInterval(updatePosition, 50);
  }

  /**
   * Get current parameters
   * @returns {Object}
   */
  getParameters() {
    return JSON.parse(JSON.stringify(this.parameters));
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
 * Binaural Processor - HRTF-based 3D audio
 */
class BinauralProcessor {
  constructor() {
    this.registry = new DisposalRegistry('binaural-processor');
    
    // Interaural Time Difference (ITD)
    this.leftDelay = this.registry.register(new Tone.Delay({
      delayTime: 0,
      maxDelay: 0.001
    }));
    
    this.rightDelay = this.registry.register(new Tone.Delay({
      delayTime: 0,
      maxDelay: 0.001
    }));
    
    // Interaural Level Difference (ILD)
    this.leftGain = this.registry.register(new Tone.Gain(1));
    this.rightGain = this.registry.register(new Tone.Gain(1));
    
    // Head shadow filtering
    this.leftShadow = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 20000
    }));
    
    this.rightShadow = this.registry.register(new Tone.Filter({
      type: 'lowpass',
      frequency: 20000
    }));
    
    // Pinna filtering (outer ear)
    this.leftPinna = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 3000,
      Q: 2
    }));
    
    this.rightPinna = this.registry.register(new Tone.Filter({
      type: 'bandpass',
      frequency: 3000,
      Q: 2
    }));
    
    // Crossfeed for natural sound
    this.crossfeed = this.registry.register(new Tone.Gain(0.3));
    this.crossfeedDelay = this.registry.register(new Tone.Delay({
      delayTime: 0.0003,
      maxDelay: 0.001
    }));
    
    // Channel merger
    this.merger = this.registry.register(new Tone.Merge());
    
    // Input/output
    this.input = this.registry.register(new Tone.Gain(1));
    this.output = this.merger;
    
    // Connect binaural processing
    this.connectBinauralPath();
    
    // Current position
    this.position = { x: 0, y: 0, z: 1 };
  }

  /**
   * Connect binaural signal path
   */
  connectBinauralPath() {
    // Split to left and right
    this.input.connect(this.leftDelay);
    this.input.connect(this.rightDelay);
    
    // Left channel processing
    this.leftDelay.connect(this.leftShadow);
    this.leftShadow.connect(this.leftPinna);
    this.leftPinna.connect(this.leftGain);
    this.leftGain.connect(this.merger, 0, 0);
    
    // Right channel processing
    this.rightDelay.connect(this.rightShadow);
    this.rightShadow.connect(this.rightPinna);
    this.rightPinna.connect(this.rightGain);
    this.rightGain.connect(this.merger, 0, 1);
    
    // Crossfeed
    this.leftGain.connect(this.crossfeedDelay);
    this.crossfeedDelay.connect(this.crossfeed);
    this.crossfeed.connect(this.merger, 0, 1);
    
    this.rightGain.connect(this.crossfeedDelay);
    this.crossfeedDelay.connect(this.crossfeed);
    this.crossfeed.connect(this.merger, 0, 0);
  }

  /**
   * Set 3D position for binaural processing
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   */
  setPosition(x, y, z) {
    this.position = { x, y, z };
    
    // Calculate azimuth and elevation
    const distance = Math.sqrt(x * x + y * y + z * z);
    const azimuth = Math.atan2(x, z); // Angle in horizontal plane
    const elevation = Math.atan2(y, Math.sqrt(x * x + z * z)); // Angle in vertical plane
    
    // ITD calculation (max ~0.6ms for 90 degrees)
    const itd = 0.0006 * Math.sin(azimuth);
    
    if (azimuth > 0) {
      // Sound is to the right
      this.leftDelay.delayTime.value = Math.abs(itd);
      this.rightDelay.delayTime.value = 0;
    } else {
      // Sound is to the left
      this.leftDelay.delayTime.value = 0;
      this.rightDelay.delayTime.value = Math.abs(itd);
    }
    
    // ILD calculation (up to 20dB difference)
    const ild = 20 * Math.abs(Math.sin(azimuth));
    const leftAtten = azimuth > 0 ? -ild : 0;
    const rightAtten = azimuth < 0 ? -ild : 0;
    
    this.leftGain.gain.value = Math.pow(10, leftAtten / 20);
    this.rightGain.gain.value = Math.pow(10, rightAtten / 20);
    
    // Head shadow filtering
    const shadowFreq = 20000 - Math.abs(azimuth) * 10000;
    if (azimuth > 0) {
      this.leftShadow.frequency.value = shadowFreq;
      this.rightShadow.frequency.value = 20000;
    } else {
      this.leftShadow.frequency.value = 20000;
      this.rightShadow.frequency.value = shadowFreq;
    }
    
    // Elevation affects pinna filtering
    const pinnaFreq = 3000 + elevation * 2000;
    this.leftPinna.frequency.value = pinnaFreq;
    this.rightPinna.frequency.value = pinnaFreq;
    
    // Distance attenuation
    const attenuation = 1 / (1 + distance * 0.1);
    this.input.gain.value = attenuation;
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
 * Panning presets
 */
export const panningPresets = {
  mono: {
    mode: 'standard',
    width: 0,
    position: { x: 0, y: 0, z: 1 }
  },
  
  stereo: {
    mode: 'standard',
    width: 1,
    position: { x: 0, y: 0, z: 1 }
  },
  
  wide: {
    mode: 'standard',
    width: 1.5,
    position: { x: 0, y: 0, z: 1 }
  },
  
  binaural: {
    mode: 'binaural',
    position: { x: 0, y: 0, z: 1 }
  },
  
  rotating: {
    mode: '3d',
    autoPan: true,
    autoPanRate: 0.5,
    autoPanDepth: 1
  },
  
  concert: {
    mode: '3d',
    position: { x: 0, y: 0.5, z: 5 },
    roomSize: 0.8
  },
  
  intimate: {
    mode: 'binaural',
    position: { x: 0.3, y: 0, z: 0.5 },
    roomSize: 0.2
  }
};

// Factory function
export function createSpatialPanner() {
  return new SpatialPanner();
}