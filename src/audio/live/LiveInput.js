/**
 * Live Input Management - Handles live audio input, effects, and recording
 */
import * as Tone from '../../../node_modules/tone/build/esm/index.js';
import { updateLiveInputState } from '../../state.js';
import { availableEffects } from '../effects/EffectFactory.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

// Live input state
let liveInput = null;
let liveInputEffectChain = [];
let liveInputMonitoringBus = null;
let liveInputRecorder = null;
let isLiveInputActive = false;
let liveInputLatency = 0;
const liveInputRegistry = new DisposalRegistry('liveInput');

/**
 * Start live audio input
 * @param {Object} config - Configuration options
 * @param {Function} getMasterBus - Function to get the master bus
 * @returns {Object} Success status and latency
 */
export async function startLiveInput(config = {}, getMasterBus) {
  if (isLiveInputActive) {
    console.warn('Live input already active');
    return;
  }

  try {
    // Start Tone.js context if not already started
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    // Create UserMedia source
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: config.echoCancellation ?? false,
        noiseSuppression: config.noiseSuppression ?? false,
        autoGainControl: config.autoGainControl ?? false,
        latency: 0
      }
    });

    // Create Tone.js UserMedia node
    liveInput = new Tone.UserMedia();
    liveInputRegistry.register(liveInput);
    await liveInput.open(stream);

    // Create monitoring bus for low-latency monitoring
    liveInputMonitoringBus = new Tone.Gain(1);
    liveInputRegistry.register(liveInputMonitoringBus);

    // Initialize effect chain
    updateLiveInputEffects(config.effects || []);

    // Connect routing
    if (liveInputEffectChain.length > 0) {
      liveInput.chain(...liveInputEffectChain, liveInputMonitoringBus);
    } else {
      liveInput.connect(liveInputMonitoringBus);
    }

    // Connect to both monitoring and main outputs
    if (config.monitor !== false) {
      liveInputMonitoringBus.connect(getMasterBus());
    }

    isLiveInputActive = true;

    // Measure latency
    await measureLiveInputLatency();

    // Update state
    updateLiveInputState({
      active: true,
      latency: liveInputLatency,
      effectCount: liveInputEffectChain.length
    });

    return {
      success: true,
      latency: liveInputLatency
    };
  } catch (error) {
    console.error('Failed to start live input:', error);
    throw error;
  }
}

/**
 * Stop live audio input
 */
export async function stopLiveInput() {
  if (!isLiveInputActive) {
    return;
  }

  try {
    // Smooth fade out to prevent pops
    if (liveInputMonitoringBus) {
      await liveInputMonitoringBus.gain.rampTo(0, 0.1);
    }

    // Disconnect and dispose
    if (liveInput) {
      liveInput.close();
    }

    // Stop any active recording
    if (liveInputRecorder) {
      await liveInputRecorder.stop();
    }

    // Dispose all registered components
    liveInputRegistry.dispose();
    
    // Reset references
    liveInput = null;
    liveInputEffectChain = [];
    liveInputMonitoringBus = null;
    liveInputRecorder = null;

    isLiveInputActive = false;

    // Update state
    updateLiveInputState({
      active: false,
      latency: 0,
      recording: false,
      effectCount: 0
    });
  } catch (error) {
    console.error('Error stopping live input:', error);
  }
}

/**
 * Update live input effects chain
 * @param {Array} effectsConfig - Array of effect configurations
 */
export function updateLiveInputEffects(effectsConfig) {
  if (!liveInput) {return;}

  // Disconnect existing chain
  liveInput.disconnect();
  liveInputEffectChain.forEach(effect => {
    effect.disconnect();
    effect.dispose();
  });
  liveInputEffectChain = [];

  // Create new effects chain
  effectsConfig.forEach(effectConfig => {
    if (availableEffects[effectConfig.type]) {
      const effect = availableEffects[effectConfig.type]();

      // Apply effect parameters
      if (effectConfig.params) {
        Object.entries(effectConfig.params).forEach(([key, value]) => {
          if (effect[key] !== undefined) {
            if (typeof effect[key] === 'object' && effect[key].value !== undefined) {
              effect[key].value = value;
            } else {
              effect[key] = value;
            }
          }
        });
      }

      // Set wet/dry mix
      if (effect.wet && effectConfig.mix !== undefined) {
        effect.wet.value = effectConfig.mix;
      }

      // Handle special effects like harmonizer
      if (effectConfig.type === 'harmonizer' && effectConfig.intervals) {
        effect.setIntervals(effectConfig.intervals);
      }

      liveInputEffectChain.push(effect);
      liveInputRegistry.register(effect);
    }
  });

  // Reconnect with new chain
  if (liveInputEffectChain.length > 0) {
    liveInput.chain(...liveInputEffectChain, liveInputMonitoringBus);
  } else {
    liveInput.connect(liveInputMonitoringBus);
  }

  // Update state
  updateLiveInputState({
    effectCount: liveInputEffectChain.length
  });
}

/**
 * Measure live input latency
 * @returns {number} Latency in milliseconds
 */
export async function measureLiveInputLatency() {
  if (!liveInput || !isLiveInputActive) {return;}

  try {
    // Create test signal
    const osc = new Tone.Oscillator(1000, 'sine');
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.001,
      sustain: 0,
      release: 0.001
    });

    // Connect test signal
    osc.connect(envelope);
    envelope.connect(Tone.Destination);

    // Measure round-trip time
    // const startTime = Tone.now();
    osc.start();
    envelope.triggerAttackRelease(0.001);

    // Estimate latency based on buffer size and sample rate
    const bufferSize = Tone.context.baseLatency * Tone.context.sampleRate;
    const outputLatency = Tone.context.outputLatency || 0;

    liveInputLatency = Math.round((bufferSize / Tone.context.sampleRate + outputLatency) * 1000);

    // Clean up
    osc.stop();
    osc.dispose();
    envelope.dispose();

    return liveInputLatency;
  } catch (error) {
    console.error('Error measuring latency:', error);
    return 0;
  }
}

/**
 * Start recording live input
 * @returns {boolean} Success status
 */
export async function startLiveInputRecording() {
  if (!isLiveInputActive || liveInputRecorder) {
    return null;
  }

  try {
    // Create recorder connected to the monitoring bus (post-effects)
    liveInputRecorder = new Tone.Recorder();
    liveInputRegistry.register(liveInputRecorder);
    liveInputMonitoringBus.connect(liveInputRecorder);

    // Start recording
    await liveInputRecorder.start();

    // Update state
    updateLiveInputState({
      recording: true
    });

    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return null;
  }
}

/**
 * Stop recording live input
 * @returns {Object} Audio buffer and duration
 */
export async function stopLiveInputRecording() {
  if (!liveInputRecorder) {
    return null;
  }

  try {
    // Stop recording and get the audio buffer
    const recording = await liveInputRecorder.stop();
    const audioBuffer = await Tone.context.decodeAudioData(await recording.arrayBuffer());

    // Convert to Tone.js ToneAudioBuffer
    const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);

    // Clean up recorder
    liveInputRecorder.dispose();
    liveInputRecorder = null;

    // Update state
    updateLiveInputState({
      recording: false
    });

    return {
      buffer: toneBuffer,
      duration: audioBuffer.duration
    };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return null;
  }
}

/**
 * Get live input status
 * @returns {Object} Status information
 */
export function getLiveInputStatus() {
  return {
    active: isLiveInputActive,
    latency: liveInputLatency,
    recording: liveInputRecorder !== null,
    effectCount: liveInputEffectChain.length
  };
}