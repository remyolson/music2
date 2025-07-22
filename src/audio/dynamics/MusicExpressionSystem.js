import * as Tone from 'tone';
import { update as updateState, subscribe, getState } from '../../state.js';
import { midiInputHandler } from '../../midi/MidiInputHandler.js';
import { VelocityManager, VELOCITY_PRESETS } from './VelocityManager.js';
import { createArticulationEngine } from '../articulation/ArticulationEngine.js';
import { createExpressionController } from '../expression/ExpressionController.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * MusicExpressionSystem - Integrates velocity, articulation, and expression control
 * Provides a unified interface for advanced musical expression
 */
export class MusicExpressionSystem {
  constructor() {
    this.registry = new DisposalRegistry('music-expression');
    
    // System components
    this.velocityManagers = new Map();
    this.articulationEngines = new Map();
    this.expressionControllers = new Map();
    
    // Track configurations
    this.trackConfigs = new Map();
    
    // MIDI handling
    this.midiInitialized = false;
    this.midiCallbacks = new Map();
    
    // Global settings
    this.globalVelocityCurve = 'natural';
    this.midiLearnMode = false;
    this.midiLearnTarget = null;
  }

  /**
   * Initialize the expression system
   * @returns {Promise<void>}
   */
  async initialize() {
    // Initialize MIDI
    const midiSuccess = await midiInputHandler.initialize();
    if (midiSuccess) {
      this.setupMidiHandlers();
      this.midiInitialized = true;
    }
    
    // Subscribe to state changes
    subscribe((newState) => {
      if (newState.tracks) {
        this.updateTracks(newState.tracks);
      }
    });
  }

  /**
   * Set up MIDI event handlers
   */
  setupMidiHandlers() {
    // Note events
    const noteUnsubscribe = midiInputHandler.onNote((event) => {
      this.handleMidiNote(event);
    });
    this.midiCallbacks.set('note', noteUnsubscribe);
    
    // Controller events
    const controllerUnsubscribe = midiInputHandler.onController((event) => {
      this.handleMidiController(event);
    });
    this.midiCallbacks.set('controller', controllerUnsubscribe);
  }

  /**
   * Handle MIDI note event
   * @param {Object} event 
   */
  handleMidiNote(event) {
    const { type, note, velocity, channel } = event;
    
    // Get active track configuration
    const activeTrack = this.getActiveTrackForChannel(channel);
    if (!activeTrack) return;
    
    // Process through articulation engine
    const articulationEngine = this.articulationEngines.get(activeTrack.id);
    if (articulationEngine) {
      const articulation = articulationEngine.processNoteEvent({
        note: Tone.Frequency(note, 'midi').toNote(),
        velocity,
        duration: '8n', // Default duration
        time: '+0'
      });
      
      // Key switch detected, don't play note
      if (articulation === null) return;
    }
    
    // Route to appropriate track/instrument
    if (type === 'noteOn') {
      this.playNoteWithExpression(activeTrack, note, velocity);
    } else if (type === 'noteOff') {
      this.stopNoteWithExpression(activeTrack, note);
    }
  }

  /**
   * Handle MIDI controller event
   * @param {Object} event 
   */
  handleMidiController(event) {
    const { type, controller, value, channel } = event;
    
    // Handle MIDI learn mode
    if (this.midiLearnMode && this.midiLearnTarget) {
      this.completeMidiLearn(controller);
      return;
    }
    
    // Get active track configuration
    const activeTrack = this.getActiveTrackForChannel(channel);
    if (!activeTrack) return;
    
    // Route to expression controller
    const expressionController = this.expressionControllers.get(activeTrack.id);
    if (expressionController) {
      if (type === 'controller') {
        expressionController.processController(controller, value);
      } else if (type === 'pitchBend') {
        expressionController.processPitchBend(value);
      } else if (type === 'aftertouch') {
        expressionController.processAftertouch(value);
      }
    }
  }

  /**
   * Create expression components for a track
   * @param {Object} track 
   * @param {Object} instrument 
   * @returns {Object} Expression components
   */
  async createExpressionComponents(track, instrument) {
    const components = {};
    
    // Create velocity manager
    const velocityManager = new VelocityManager(track.instrument);
    const velocityPreset = VELOCITY_PRESETS[this.getInstrumentFamily(track.instrument)] || 
                          VELOCITY_PRESETS.synth;
    
    await velocityManager.initialize({
      ...velocityPreset,
      instrumentType: track.instrument
    });
    
    velocityManager.connect(instrument);
    components.velocityManager = velocityManager;
    
    // Create articulation engine
    const articulationEngine = createArticulationEngine(track.instrument, {
      autoDetect: true
    });
    components.articulationEngine = articulationEngine;
    
    // Create expression controller
    const expressionController = createExpressionController(
      track.instrument,
      instrument,
      {
        smoothing: 0.05,
        updateRate: 60,
        defaultMappings: true
      }
    );
    components.expressionController = expressionController;
    
    return components;
  }

  /**
   * Register a track with expression capabilities
   * @param {string} trackId 
   * @param {Object} track 
   * @param {Object} instrument 
   */
  async registerTrack(trackId, track, instrument) {
    // Create expression components
    const components = await this.createExpressionComponents(track, instrument);
    
    // Store components
    this.velocityManagers.set(trackId, components.velocityManager);
    this.articulationEngines.set(trackId, components.articulationEngine);
    this.expressionControllers.set(trackId, components.expressionController);
    
    // Store track configuration
    this.trackConfigs.set(trackId, {
      id: trackId,
      name: track.name,
      instrument: track.instrument,
      channel: track.midiChannel || 0,
      active: true,
      components
    });
  }

  /**
   * Unregister a track
   * @param {string} trackId 
   */
  unregisterTrack(trackId) {
    // Dispose components
    const velocityManager = this.velocityManagers.get(trackId);
    if (velocityManager) {
      velocityManager.dispose();
      this.velocityManagers.delete(trackId);
    }
    
    const articulationEngine = this.articulationEngines.get(trackId);
    if (articulationEngine) {
      this.articulationEngines.delete(trackId);
    }
    
    const expressionController = this.expressionControllers.get(trackId);
    if (expressionController) {
      expressionController.dispose();
      this.expressionControllers.delete(trackId);
    }
    
    // Remove configuration
    this.trackConfigs.delete(trackId);
  }

  /**
   * Play a note with expression
   * @param {Object} track 
   * @param {number} midiNote 
   * @param {number} velocity 
   */
  playNoteWithExpression(track, midiNote, velocity) {
    const note = Tone.Frequency(midiNote, 'midi').toNote();
    const velocityManager = this.velocityManagers.get(track.id);
    
    if (velocityManager) {
      // Use velocity manager for multi-layer playback
      const activeSources = velocityManager.playNote(note, velocity);
      
      // Store active sources for note off
      const noteKey = `${track.id}-${midiNote}`;
      updateState({ [`activeNote_${noteKey}`]: activeSources });
    } else {
      // Fallback to direct instrument playback
      const instrument = track.components?.instrument;
      if (instrument && instrument.triggerAttack) {
        instrument.triggerAttack(note, '+0', velocity);
      }
    }
  }

  /**
   * Stop a note with expression
   * @param {Object} track 
   * @param {number} midiNote 
   */
  stopNoteWithExpression(track, midiNote) {
    const noteKey = `${track.id}-${midiNote}`;
    const activeSources = getState()[`activeNote_${noteKey}`];
    
    if (activeSources) {
      const velocityManager = this.velocityManagers.get(track.id);
      if (velocityManager) {
        velocityManager.stopNote(activeSources);
      }
      
      // Clear from state
      updateState({ [`activeNote_${noteKey}`]: null });
    } else {
      // Fallback to direct instrument release
      const note = Tone.Frequency(midiNote, 'midi').toNote();
      const instrument = track.components?.instrument;
      if (instrument && instrument.triggerRelease) {
        instrument.triggerRelease(note);
      }
    }
  }

  /**
   * Get active track for MIDI channel
   * @param {number} channel 
   * @returns {Object|null}
   */
  getActiveTrackForChannel(channel) {
    // Channel 0 is omni mode - return first active track
    if (channel === 0) {
      for (const config of this.trackConfigs.values()) {
        if (config.active) return config;
      }
    }
    
    // Find track with matching channel
    for (const config of this.trackConfigs.values()) {
      if (config.channel === channel && config.active) {
        return config;
      }
    }
    
    return null;
  }

  /**
   * Get instrument family from type
   * @param {string} instrumentType 
   * @returns {string}
   */
  getInstrumentFamily(instrumentType) {
    if (instrumentType.includes('piano')) return 'piano';
    if (instrumentType.includes('violin') || instrumentType.includes('viola') || 
        instrumentType.includes('cello') || instrumentType.includes('bass')) return 'strings';
    if (instrumentType.includes('trumpet') || instrumentType.includes('horn') || 
        instrumentType.includes('trombone') || instrumentType.includes('tuba')) return 'brass';
    if (instrumentType.includes('flute') || instrumentType.includes('clarinet') || 
        instrumentType.includes('oboe') || instrumentType.includes('bassoon')) return 'winds';
    return 'synth';
  }

  /**
   * Update tracks from state
   * @param {Array} tracks 
   */
  updateTracks(tracks) {
    // Update track configurations
    for (const track of tracks) {
      const config = this.trackConfigs.get(track.id);
      if (config) {
        config.active = !track.muted;
        config.channel = track.midiChannel || 0;
      }
    }
  }

  /**
   * Start MIDI learn mode
   * @param {string} trackId 
   * @param {string} parameter 
   */
  startMidiLearn(trackId, parameter) {
    this.midiLearnMode = true;
    this.midiLearnTarget = { trackId, parameter };
    
    updateState({
      midiLearnMode: true,
      midiLearnTarget: `${trackId}:${parameter}`
    });
  }

  /**
   * Complete MIDI learn
   * @param {number} controller 
   */
  completeMidiLearn(controller) {
    if (!this.midiLearnTarget) return;
    
    const { trackId, parameter } = this.midiLearnTarget;
    const expressionController = this.expressionControllers.get(trackId);
    
    if (expressionController) {
      expressionController.addMapping(controller, parameter);
    }
    
    // Clear learn mode
    this.midiLearnMode = false;
    this.midiLearnTarget = null;
    
    updateState({
      midiLearnMode: false,
      midiLearnTarget: null,
      midiLearnComplete: `CC${controller} → ${parameter}`
    });
  }

  /**
   * Set global velocity curve
   * @param {string} curve 
   */
  setGlobalVelocityCurve(curve) {
    this.globalVelocityCurve = curve;
    
    // Apply to all velocity managers
    for (const manager of this.velocityManagers.values()) {
      manager.setVelocityCurve(curve);
    }
  }

  /**
   * Get expression info for a track
   * @param {string} trackId 
   * @returns {Object}
   */
  getTrackExpressionInfo(trackId) {
    const velocityManager = this.velocityManagers.get(trackId);
    const articulationEngine = this.articulationEngines.get(trackId);
    const expressionController = this.expressionControllers.get(trackId);
    
    return {
      velocity: velocityManager ? velocityManager.getLayerInfo() : null,
      articulation: articulationEngine ? articulationEngine.getArticulationInfo() : null,
      expression: expressionController ? expressionController.getExpressionState() : null
    };
  }

  /**
   * Clean up and dispose
   */
  dispose() {
    // Unsubscribe MIDI callbacks
    for (const unsubscribe of this.midiCallbacks.values()) {
      unsubscribe();
    }
    this.midiCallbacks.clear();
    
    // Dispose all tracks
    for (const trackId of this.trackConfigs.keys()) {
      this.unregisterTrack(trackId);
    }
    
    // Dispose MIDI handler
    if (this.midiInitialized) {
      midiInputHandler.dispose();
    }
    
    // Dispose registry
    this.registry.dispose();
  }
}

// Create singleton instance
export const musicExpressionSystem = new MusicExpressionSystem();