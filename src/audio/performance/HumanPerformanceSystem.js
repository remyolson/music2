import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { state } from '../../state.js';
import { timingHumanizer } from './TimingHumanizer.js';
import { velocityPatternGenerator } from './VelocityPatternGenerator.js';
import { microGroove } from './MicroGroove.js';
import { ensembleTimingSystem } from './EnsembleTimingSystem.js';

/**
 * HumanPerformanceSystem - Main system integrating all human performance aspects
 * Coordinates timing, velocity, groove, and ensemble performance
 */
export class HumanPerformanceSystem {
  constructor() {
    this.registry = new DisposalRegistry('human-performance');
    
    // System components
    this.timing = timingHumanizer;
    this.velocity = velocityPatternGenerator;
    this.groove = microGroove;
    this.ensemble = ensembleTimingSystem;
    
    // System settings
    this.enabled = true;
    this.performanceStyle = 'natural'; // 'natural', 'tight', 'loose', 'mechanical', 'expressive'
    this.skillLevel = 'professional'; // 'beginner', 'intermediate', 'advanced', 'professional', 'virtuoso'
    
    // Performance profiles
    this.performanceProfiles = new Map();
    this.initializeProfiles();
    
    // Current performance state
    this.performanceState = {
      tempo: 120,
      timeSignature: [4, 4],
      currentBeat: 0,
      currentMeasure: 0,
      isRushing: false,
      isDragging: false,
      dynamicTrend: 'stable',
      musicalContext: 'normal'
    };
    
    // Performance memory
    this.performanceMemory = {
      recentNotes: [],
      timingTendency: 0,
      velocityTendency: 0,
      grooveConsistency: 0.9
    };
    
    // Instrument configurations
    this.instrumentConfigs = new Map();
    
    // Performance metrics
    this.metrics = {
      timingAccuracy: 1.0,
      dynamicRange: 0.7,
      grooveStrength: 0.8,
      expressiveness: 0.75
    };
  }

  /**
   * Initialize performance profiles
   */
  initializeProfiles() {
    // Natural performance
    this.performanceProfiles.set('natural', {
      timing: {
        style: 'natural',
        amount: 0.02,
        rubato: { enabled: true, intensity: 0.1 }
      },
      velocity: {
        style: 'natural',
        variationAmount: 0.15,
        phraseDynamics: true
      },
      groove: {
        style: 'straight',
        intensity: 0.5,
        microAdjustments: true
      },
      ensemble: {
        tightness: 0.85,
        interaction: true
      }
    });
    
    // Tight performance
    this.performanceProfiles.set('tight', {
      timing: {
        style: 'tight',
        amount: 0.01,
        rubato: { enabled: false }
      },
      velocity: {
        style: 'mechanical',
        variationAmount: 0.08,
        phraseDynamics: false
      },
      groove: {
        style: 'straight',
        intensity: 0.2,
        microAdjustments: false
      },
      ensemble: {
        tightness: 0.95,
        interaction: false
      }
    });
    
    // Loose performance
    this.performanceProfiles.set('loose', {
      timing: {
        style: 'loose',
        amount: 0.04,
        rubato: { enabled: true, intensity: 0.2 }
      },
      velocity: {
        style: 'expressive',
        variationAmount: 0.25,
        phraseDynamics: true
      },
      groove: {
        style: 'jazz-swing',
        intensity: 0.8,
        microAdjustments: true
      },
      ensemble: {
        tightness: 0.7,
        interaction: true
      }
    });
    
    // Jazz performance
    this.performanceProfiles.set('jazz', {
      timing: {
        style: 'natural',
        amount: 0.025,
        swingAmount: 0.67,
        rubato: { enabled: true, intensity: 0.15 }
      },
      velocity: {
        style: 'dynamic',
        variationAmount: 0.2,
        accentPattern: '4/4-jazz'
      },
      groove: {
        style: 'jazz-swing',
        intensity: 0.7,
        behindBeat: 0.005
      },
      ensemble: {
        tightness: 0.8,
        interaction: true,
        style: 'jazz-combo'
      }
    });
    
    // Classical performance
    this.performanceProfiles.set('classical', {
      timing: {
        style: 'natural',
        amount: 0.015,
        rubato: { enabled: true, intensity: 0.2, curve: 'sine' }
      },
      velocity: {
        style: 'expressive',
        variationAmount: 0.2,
        dynamicCurve: 'classical'
      },
      groove: {
        style: 'straight',
        intensity: 0.1
      },
      ensemble: {
        tightness: 0.9,
        style: 'orchestra'
      }
    });
  }

  /**
   * Initialize system
   */
  async initialize() {
    // Set default profile
    this.loadProfile('natural');
    
    // Initialize state tracking
    state.subscribe('tempo', (tempo) => {
      this.performanceState.tempo = tempo;
    });
    
    state.subscribe('timeSignature', (sig) => {
      this.performanceState.timeSignature = sig;
    });
    
    return true;
  }

  /**
   * Process a note with human performance
   * @param {Object} note 
   * @param {Object} options 
   * @returns {Object} Processed note
   */
  processNote(note, options = {}) {
    if (!this.enabled) return note;
    
    const {
      instrumentId = 'default',
      instrumentType = 'piano',
      trackId = null,
      context = {}
    } = options;
    
    // Get or create instrument config
    let instrumentConfig = this.instrumentConfigs.get(instrumentId);
    if (!instrumentConfig) {
      instrumentConfig = this.createInstrumentConfig(instrumentType);
      this.instrumentConfigs.set(instrumentId, instrumentConfig);
    }
    
    // Build complete context
    const fullContext = {
      ...context,
      ...this.performanceState,
      instrumentType,
      instrumentConfig,
      performanceMemory: this.performanceMemory,
      beatPosition: this.calculateBeatPosition(note.time),
      measurePosition: this.calculateMeasurePosition(note.time)
    };
    
    // Process velocity first (affects timing decisions)
    const velocityContext = {
      ...note,
      ...fullContext,
      previousNote: this.getPreviousNote(instrumentId),
      nextNote: context.nextNote,
      phrasePosition: context.phrasePosition || 0.5
    };
    
    note.velocity = this.velocity.generateVelocity(velocityContext);
    
    // Apply timing humanization
    note = this.timing.processNoteEvent(note, fullContext);
    
    // Apply micro-groove
    note = this.groove.applyGroove(note, {
      ...fullContext,
      velocity: note.velocity,
      tempo: this.performanceState.tempo
    });
    
    // Apply ensemble timing if in ensemble
    if (this.ensemble.activeInstruments.size > 0) {
      note = this.ensemble.processEnsembleEvent(note, instrumentId, fullContext);
    }
    
    // Update performance memory
    this.updatePerformanceMemory(note, instrumentId);
    
    // Apply final adjustments based on performance state
    note = this.applyPerformanceStateAdjustments(note, fullContext);
    
    return note;
  }

  /**
   * Process a sequence of notes
   * @param {Array} notes 
   * @param {Object} options 
   * @returns {Array} Processed notes
   */
  processSequence(notes, options = {}) {
    if (!this.enabled) return notes;
    
    // Analyze sequence
    const analysis = this.analyzeSequence(notes);
    
    // Generate velocities for the sequence
    const velocities = this.velocity.generateSequenceVelocities(notes, {
      ...options,
      smoothing: 0.3
    });
    
    // Apply velocities
    notes.forEach((note, i) => {
      note.velocity = velocities[i];
    });
    
    // Process timing as a sequence
    const timedNotes = this.timing.processSequence(notes, {
      ...options,
      ...analysis
    });
    
    // Apply groove to sequence
    const groovedNotes = this.groove.applyGrooveToSequence(timedNotes, {
      tempo: this.performanceState.tempo,
      timeSignature: this.performanceState.timeSignature
    });
    
    // Process each note for ensemble timing
    const processedNotes = groovedNotes.map((note, i) => {
      const context = {
        ...options,
        noteIndex: i,
        totalNotes: notes.length,
        sequenceAnalysis: analysis
      };
      
      return this.processNote(note, context);
    });
    
    return processedNotes;
  }

  /**
   * Create instrument configuration
   * @param {string} instrumentType 
   * @returns {Object}
   */
  createInstrumentConfig(instrumentType) {
    const config = {
      type: instrumentType,
      timingProfile: this.timing.instrumentProfiles.get(instrumentType) || {},
      velocityProfile: this.velocity.instrumentProfiles.get(instrumentType) || {},
      grooveSettings: {},
      noteHistory: [],
      performanceStats: {
        avgTiming: 0,
        avgVelocity: 0.7,
        consistency: 0.9
      }
    };
    
    // Register with ensemble if needed
    if (this.performanceProfiles.get(this.performanceStyle)?.ensemble?.interaction) {
      this.ensemble.registerInstrument(instrumentType, {
        type: instrumentType,
        skill: this.skillLevel
      });
    }
    
    return config;
  }

  /**
   * Load performance profile
   * @param {string} profileName 
   */
  loadProfile(profileName) {
    const profile = this.performanceProfiles.get(profileName);
    if (!profile) return;
    
    this.performanceStyle = profileName;
    
    // Configure timing
    if (profile.timing) {
      Object.assign(this.timing, profile.timing);
      if (profile.timing.rubato) {
        this.timing.setRubato(profile.timing.rubato.enabled, profile.timing.rubato);
      }
    }
    
    // Configure velocity
    if (profile.velocity) {
      Object.assign(this.velocity, profile.velocity);
    }
    
    // Configure groove
    if (profile.groove) {
      Object.assign(this.groove, profile.groove);
    }
    
    // Configure ensemble
    if (profile.ensemble) {
      this.ensemble.tightness = profile.ensemble.tightness;
      if (profile.ensemble.style) {
        this.ensemble.ensembleSize = profile.ensemble.style;
      }
    }
  }

  /**
   * Set skill level
   * @param {string} level 
   */
  setSkillLevel(level) {
    this.skillLevel = level;
    
    // Adjust parameters based on skill
    const skillMultipliers = {
      beginner: 2.0,
      intermediate: 1.5,
      advanced: 1.0,
      professional: 0.7,
      virtuoso: 0.5
    };
    
    const multiplier = skillMultipliers[level] || 1.0;
    
    // Adjust timing variation
    this.timing.amount *= multiplier;
    
    // Adjust velocity consistency
    this.velocity.variationAmount *= multiplier;
    
    // Adjust ensemble tightness
    this.ensemble.tightness = Math.max(0.5, Math.min(0.95, 1 - (multiplier - 1) * 0.2));
  }

  /**
   * Analyze sequence
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzeSequence(notes) {
    const analysis = {
      length: notes.length,
      duration: notes[notes.length - 1].time - notes[0].time,
      avgInterval: 0,
      isChordal: false,
      isArpeggio: false,
      isScale: false,
      phrases: [],
      dynamics: 'stable'
    };
    
    // Calculate average interval
    if (notes.length > 1) {
      const intervals = [];
      for (let i = 1; i < notes.length; i++) {
        intervals.push(notes[i].time - notes[i - 1].time);
      }
      analysis.avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    // Detect patterns
    const timeThreshold = 0.05; // 50ms for chord detection
    let chordCount = 0;
    
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].time - notes[i - 1].time < timeThreshold) {
        chordCount++;
      }
    }
    
    analysis.isChordal = chordCount > notes.length * 0.3;
    
    // Detect melodic patterns
    if (!analysis.isChordal && notes.length >= 3) {
      const pitches = notes.map(n => n.pitch || n.note || 60);
      const intervals = [];
      
      for (let i = 1; i < pitches.length; i++) {
        intervals.push(pitches[i] - pitches[i - 1]);
      }
      
      // Check for consistent intervals (arpeggio)
      const uniqueIntervals = new Set(intervals.map(Math.abs));
      if (uniqueIntervals.size <= 2) {
        analysis.isArpeggio = true;
      }
      
      // Check for stepwise motion (scale)
      const stepwise = intervals.filter(i => Math.abs(i) <= 2).length;
      if (stepwise / intervals.length > 0.8) {
        analysis.isScale = true;
      }
    }
    
    return analysis;
  }

  /**
   * Calculate beat position
   * @param {number} time 
   * @returns {number}
   */
  calculateBeatPosition(time) {
    const { tempo, timeSignature } = this.performanceState;
    const beatsPerSecond = tempo / 60;
    const beatLength = 1 / beatsPerSecond;
    const beatsPerMeasure = timeSignature[0];
    
    return (time / beatLength) % beatsPerMeasure;
  }

  /**
   * Calculate measure position
   * @param {number} time 
   * @returns {number}
   */
  calculateMeasurePosition(time) {
    const { tempo, timeSignature } = this.performanceState;
    const beatsPerSecond = tempo / 60;
    const beatsPerMeasure = timeSignature[0];
    const measuresPerSecond = beatsPerSecond / beatsPerMeasure;
    
    return (time * measuresPerSecond) % 4; // Position in 4-bar phrase
  }

  /**
   * Get previous note for instrument
   * @param {string} instrumentId 
   * @returns {Object|null}
   */
  getPreviousNote(instrumentId) {
    const config = this.instrumentConfigs.get(instrumentId);
    if (!config || config.noteHistory.length === 0) return null;
    
    return config.noteHistory[config.noteHistory.length - 1];
  }

  /**
   * Update performance memory
   * @param {Object} note 
   * @param {string} instrumentId 
   */
  updatePerformanceMemory(note, instrumentId) {
    // Update global memory
    this.performanceMemory.recentNotes.push({
      time: note.time,
      velocity: note.velocity,
      timingDeviation: note.timingDeviation || 0
    });
    
    // Keep memory size limited
    if (this.performanceMemory.recentNotes.length > 32) {
      this.performanceMemory.recentNotes.shift();
    }
    
    // Update timing tendency
    const recentTimings = this.performanceMemory.recentNotes
      .slice(-8)
      .map(n => n.timingDeviation);
    
    if (recentTimings.length > 0) {
      this.performanceMemory.timingTendency = 
        recentTimings.reduce((a, b) => a + b, 0) / recentTimings.length;
    }
    
    // Update instrument-specific memory
    const config = this.instrumentConfigs.get(instrumentId);
    if (config) {
      config.noteHistory.push(note);
      if (config.noteHistory.length > 16) {
        config.noteHistory.shift();
      }
      
      // Update performance stats
      this.updateInstrumentStats(config);
    }
  }

  /**
   * Update instrument statistics
   * @param {Object} config 
   */
  updateInstrumentStats(config) {
    if (config.noteHistory.length < 2) return;
    
    const recent = config.noteHistory.slice(-8);
    
    // Average timing
    const timings = recent.map(n => n.timingDeviation || 0);
    config.performanceStats.avgTiming = 
      timings.reduce((a, b) => a + b, 0) / timings.length;
    
    // Average velocity
    const velocities = recent.map(n => n.velocity || 0.7);
    config.performanceStats.avgVelocity = 
      velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    // Consistency (inverse of variance)
    const variance = this.calculateVariance(timings);
    config.performanceStats.consistency = Math.max(0, 1 - variance * 10);
  }

  /**
   * Apply performance state adjustments
   * @param {Object} note 
   * @param {Object} context 
   * @returns {Object}
   */
  applyPerformanceStateAdjustments(note, context) {
    // Rushing/dragging tendencies
    if (this.performanceState.isRushing) {
      note.time -= 0.005;
    } else if (this.performanceState.isDragging) {
      note.time += 0.005;
    }
    
    // Dynamic trends
    switch (this.performanceState.dynamicTrend) {
      case 'crescendo':
        note.velocity *= 1.05;
        break;
      case 'diminuendo':
        note.velocity *= 0.95;
        break;
    }
    
    // Musical context adjustments
    switch (this.performanceState.musicalContext) {
      case 'climax':
        note.velocity *= 1.1;
        note.time -= 0.002; // Slight rush at climax
        break;
      case 'ending':
        note.velocity *= 0.9;
        note.time += 0.005; // Ritardando
        break;
      case 'transition':
        // More variation in transitions
        note.time += (Math.random() - 0.5) * 0.01;
        break;
    }
    
    return note;
  }

  /**
   * Calculate variance
   * @param {Array} values 
   * @returns {number}
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Set performance state
   * @param {Object} state 
   */
  setPerformanceState(state) {
    Object.assign(this.performanceState, state);
  }

  /**
   * Get performance metrics
   * @returns {Object}
   */
  getMetrics() {
    // Update metrics based on recent performance
    if (this.performanceMemory.recentNotes.length > 0) {
      // Timing accuracy (inverse of average deviation)
      const avgDeviation = Math.abs(this.performanceMemory.timingTendency);
      this.metrics.timingAccuracy = Math.max(0, 1 - avgDeviation * 50);
      
      // Dynamic range
      const velocities = this.performanceMemory.recentNotes.map(n => n.velocity);
      const minVel = Math.min(...velocities);
      const maxVel = Math.max(...velocities);
      this.metrics.dynamicRange = maxVel - minVel;
      
      // Groove strength (consistency of timing patterns)
      this.metrics.grooveStrength = this.performanceMemory.grooveConsistency;
      
      // Expressiveness (combination of dynamics and timing variation)
      this.metrics.expressiveness = 
        (this.metrics.dynamicRange + (1 - this.metrics.timingAccuracy)) / 2;
    }
    
    return { ...this.metrics };
  }

  /**
   * Create performance analysis
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzePerformance(notes) {
    const timingAnalysis = this.timing.analyzeTimingDeviations(notes);
    const grooveAnalysis = this.groove.analyzeGroove(notes);
    const ensembleAnalysis = this.ensemble.analyzeEnsembleCohesion(notes);
    
    return {
      timing: timingAnalysis,
      groove: grooveAnalysis,
      ensemble: ensembleAnalysis,
      overall: {
        humanness: this.calculateHumanness(timingAnalysis, grooveAnalysis),
        expressiveness: this.metrics.expressiveness,
        consistency: (timingAnalysis.standardDeviation < 0.02) ? 'tight' : 'loose',
        style: this.detectPerformanceStyle(timingAnalysis, grooveAnalysis)
      }
    };
  }

  /**
   * Calculate humanness score
   * @param {Object} timingAnalysis 
   * @param {Object} grooveAnalysis 
   * @returns {number}
   */
  calculateHumanness(timingAnalysis, grooveAnalysis) {
    // Perfect timing is not human
    const timingHumanness = 1 - Math.abs(0.015 - timingAnalysis.standardDeviation) * 20;
    
    // Some groove variation is human
    const grooveHumanness = grooveAnalysis.consistency < 0.95 ? 0.9 : 0.7;
    
    return (timingHumanness + grooveHumanness) / 2;
  }

  /**
   * Detect performance style from analysis
   * @param {Object} timingAnalysis 
   * @param {Object} grooveAnalysis 
   * @returns {string}
   */
  detectPerformanceStyle(timingAnalysis, grooveAnalysis) {
    if (timingAnalysis.standardDeviation < 0.005) return 'mechanical';
    if (grooveAnalysis.swingAmount > 0.5) return 'jazz';
    if (grooveAnalysis.feel === 'laid-back') return 'relaxed';
    if (timingAnalysis.standardDeviation > 0.03) return 'expressive';
    
    return 'natural';
  }

  /**
   * Reset system
   */
  reset() {
    this.timing.reset();
    this.velocity.reset();
    this.groove.reset();
    this.ensemble.reset();
    
    this.instrumentConfigs.clear();
    this.performanceMemory = {
      recentNotes: [],
      timingTendency: 0,
      velocityTendency: 0,
      grooveConsistency: 0.9
    };
    
    this.performanceState = {
      tempo: 120,
      timeSignature: [4, 4],
      currentBeat: 0,
      currentMeasure: 0,
      isRushing: false,
      isDragging: false,
      dynamicTrend: 'stable',
      musicalContext: 'normal'
    };
  }

  /**
   * Clean up
   */
  dispose() {
    this.registry.dispose();
    this.reset();
  }
}

// Create singleton instance
export const humanPerformanceSystem = new HumanPerformanceSystem();