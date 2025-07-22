/**
 * Master Bus Management - Handles global audio routing and effects
 */
import * as Tone from '../../../node_modules/tone/build/esm/index.js';
import { MASTER_BUS_CONFIG } from '../constants/index.js';
import { availableEffects } from '../effects/EffectFactory.js';
import { audioHealthMonitor } from '../../audioHealthMonitor.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

// Master bus state
let masterBus = null;
let masterEffectChain = [];
let masterLimiter = null;
let masterCompressor = null;
let masterHighpass = null;
const masterRegistry = new DisposalRegistry('masterBus');

/**
 * Initialize master bus with processing chain
 * @returns {Tone.Gain} The master bus
 */
function initializeMasterBus() {
  if (!masterBus) {
    masterBus = new Tone.Gain(MASTER_BUS_CONFIG.gain);
    masterRegistry.register(masterBus);

    // Create a compressor for dynamic control
    if (!masterCompressor) {
      masterCompressor = new Tone.Compressor({
        threshold: -12,
        ratio: 4,
        attack: 0.003,
        release: 0.25
      });
      masterRegistry.register(masterCompressor);
    }

    // Create a highpass filter for DC blocking (20Hz cutoff)
    if (!masterHighpass) {
      masterHighpass = new Tone.Filter({
        type: 'highpass',
        frequency: 20,
        rolloff: -24
      });
      masterRegistry.register(masterHighpass);
    }

    // Create a limiter to prevent clipping
    if (!masterLimiter) {
      masterLimiter = new Tone.Limiter(MASTER_BUS_CONFIG.limiterThreshold);
      masterRegistry.register(masterLimiter);
    }

    // Connect master bus through processing chain to destination
    if (masterEffectChain.length > 0) {
      masterBus.chain(...masterEffectChain, masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    } else {
      masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    }

    // Initialize and start health monitoring
    audioHealthMonitor.initialize();
    audioHealthMonitor.startMonitoring();
  }
  return masterBus;
}

/**
 * Get master bus (creates it if it doesn't exist)
 * @returns {Tone.Gain} The master bus
 */
export function getMasterBus() {
  return initializeMasterBus();
}

/**
 * Apply master effect preset
 * @param {Object} presetData - Effect preset configuration
 */
export function applyMasterEffectPreset(presetData) {
  // Initialize master bus if needed
  initializeMasterBus();

  // Clean up old effects
  masterEffectChain.forEach(effect => {
    effect.disconnect();
    effect.dispose();
  });
  masterEffectChain = [];
  
  // Clear effect registrations (they've been disposed)
  // Note: We don't dispose the whole registry as it contains the master bus components

  // If no preset data or effects, just connect through processing chain
  if (!presetData || !presetData.effects || presetData.effects.length === 0) {
    masterBus.disconnect();
    masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    return;
  }

  // Create new effects chain
  presetData.effects.forEach(effectConfig => {
    const effectType = effectConfig.type;
    const params = effectConfig.params || {};

    if (availableEffects[effectType]) {
      const effect = availableEffects[effectType]();

      // Apply parameters
      if (effectType === 'harmonizer') {
        // Special handling for harmonizer
        if (params.intervals && effect.setIntervals) {
          effect.setIntervals(params.intervals);
        }
        if (params.mix !== undefined && effect.setMix) {
          effect.setMix(params.mix);
        }
      } else if (effectType === 'freezeReverb') {
        // Special handling for freezeReverb parameters
        if (params.decay && effect.children && effect.children[0]) {
          effect.children[0].roomSize.value = Math.min(params.decay / 100, 0.99);
        }
        if (params.wet !== undefined) {
          effect.wet.value = params.wet;
        }
      } else if (effect.set) {
        // For standard Tone.js effects
        try {
          effect.set(params);
        } catch {
          // Fallback to manual parameter setting
          Object.keys(params).forEach(param => {
            if (effect[param] && effect[param].value !== undefined) {
              effect[param].value = params[param];
            }
          });
        }
      } else {
        // Manual parameter setting
        Object.keys(params).forEach(param => {
          if (effect[param] && effect[param].value !== undefined) {
            effect[param].value = params[param];
          }
        });
      }

      masterEffectChain.push(effect);
      masterRegistry.register(effect);
    }
  });

  // Reconnect with new effect chain through processing chain
  masterBus.disconnect();
  if (masterEffectChain.length > 0) {
    masterBus.chain(...masterEffectChain, masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
  } else {
    masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
  }
}

/**
 * Get master effect chain
 * @returns {Array} The current master effect chain
 */
export function getMasterEffectChain() {
  return masterEffectChain;
}

/**
 * Dispose master bus and all effects
 */
export function disposeMasterBus() {
  // Dispose all registered components
  masterRegistry.dispose();
  
  // Reset references
  masterBus = null;
  masterEffectChain = [];
  masterCompressor = null;
  masterHighpass = null;
  masterLimiter = null;
}