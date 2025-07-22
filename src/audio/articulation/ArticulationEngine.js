import * as Tone from 'tone';
import { state } from '../../state.js';
import { ARTICULATION_KEYSWITCHES } from '../../midi/MidiMappings.js';

/**
 * ArticulationEngine - Manages articulation switching and intelligent articulation detection
 * Provides key-switch support and pattern-based automatic articulation selection
 */
export class ArticulationEngine {
  constructor(instrumentType) {
    this.instrumentType = instrumentType;
    
    // Current articulation state
    this.currentArticulation = 'normal';
    this.previousArticulation = 'normal';
    this.articulationLocked = false;
    
    // Available articulations for this instrument
    this.availableArticulations = new Set();
    
    // Key-switch mappings
    this.keySwitches = {};
    this.keySwitchEnabled = true;
    this.keySwitchRange = { low: 24, high: 36 }; // C1 to C2
    
    // Auto-articulation settings
    this.autoArticulation = true;
    this.noteHistory = [];
    this.historySize = 8;
    
    // Articulation patterns for auto-detection
    this.patterns = new Map();
    this.setupDefaultPatterns();
    
    // Articulation transition rules
    this.transitionRules = new Map();
    this.setupTransitionRules();
    
    // Performance metrics for pattern detection
    this.metrics = {
      averageVelocity: 0,
      noteDensity: 0,
      intervalSpread: 0,
      rhythmicRegularity: 0
    };
  }

  /**
   * Initialize articulation engine with instrument configuration
   * @param {Object} config 
   */
  initialize(config) {
    const { articulations = [], keySwitches = {}, autoDetect = true } = config;
    
    // Set available articulations
    this.availableArticulations = new Set(articulations);
    
    // Set up key switches
    if (Object.keys(keySwitches).length > 0) {
      this.keySwitches = keySwitches;
    } else {
      // Use default key switches based on instrument type
      this.keySwitches = this.getDefaultKeySwitches();
    }
    
    // Configure auto-detection
    this.autoArticulation = autoDetect;
    
    // Set default articulation
    if (this.availableArticulations.size > 0) {
      this.currentArticulation = articulations[0];
    }
  }

  /**
   * Get default key switches for instrument type
   * @returns {Object}
   */
  getDefaultKeySwitches() {
    if (this.instrumentType.includes('violin') || 
        this.instrumentType.includes('viola') || 
        this.instrumentType.includes('cello') || 
        this.instrumentType.includes('bass')) {
      return ARTICULATION_KEYSWITCHES.strings || {};
    }
    
    if (this.instrumentType.includes('flute') || 
        this.instrumentType.includes('clarinet') || 
        this.instrumentType.includes('oboe') || 
        this.instrumentType.includes('bassoon')) {
      return ARTICULATION_KEYSWITCHES.winds || {};
    }
    
    if (this.instrumentType.includes('trumpet') || 
        this.instrumentType.includes('horn') || 
        this.instrumentType.includes('trombone') || 
        this.instrumentType.includes('tuba')) {
      return ARTICULATION_KEYSWITCHES.brass || {};
    }
    
    return {};
  }

  /**
   * Set up default articulation patterns
   */
  setupDefaultPatterns() {
    // Staccato pattern: short notes with gaps
    this.patterns.set('staccato', {
      test: (notes) => {
        if (notes.length < 2) return false;
        const avgDuration = notes.reduce((sum, n) => sum + n.duration, 0) / notes.length;
        const avgGap = this.calculateAverageGap(notes);
        return avgDuration < 0.2 && avgGap > avgDuration * 2;
      },
      priority: 2
    });
    
    // Legato pattern: overlapping or closely connected notes
    this.patterns.set('legato', {
      test: (notes) => {
        if (notes.length < 2) return false;
        const gaps = this.calculateGaps(notes);
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        return avgGap < 0.05 && this.hasSmallIntervals(notes);
      },
      priority: 2
    });
    
    // Tremolo pattern: rapid repetition of same note
    this.patterns.set('tremolo', {
      test: (notes) => {
        if (notes.length < 4) return false;
        const sameNote = notes.every(n => n.pitch === notes[0].pitch);
        const rapidNotes = this.calculateNoteDensity(notes) > 8;
        return sameNote && rapidNotes;
      },
      priority: 3
    });
    
    // Pizzicato pattern: detected by velocity and note spacing
    this.patterns.set('pizzicato', {
      test: (notes) => {
        if (notes.length < 2) return false;
        const avgVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;
        const hasPluck = avgVelocity > 0.7 && this.hasSharpAttacks(notes);
        return hasPluck;
      },
      priority: 1
    });
    
    // Glissando pattern: continuous pitch slide
    this.patterns.set('glissando', {
      test: (notes) => {
        if (notes.length < 3) return false;
        return this.hasConsistentPitchDirection(notes) && this.hasSmallGaps(notes);
      },
      priority: 3
    });
  }

  /**
   * Set up articulation transition rules
   */
  setupTransitionRules() {
    // String transitions
    this.transitionRules.set('arco->pizzicato', { time: 0.1, fade: false });
    this.transitionRules.set('pizzicato->arco', { time: 0.2, fade: true });
    this.transitionRules.set('normal->tremolo', { time: 0.05, fade: true });
    this.transitionRules.set('tremolo->normal', { time: 0.1, fade: true });
    
    // Wind transitions
    this.transitionRules.set('normal->flutter', { time: 0.05, fade: true });
    this.transitionRules.set('flutter->normal', { time: 0.1, fade: true });
    
    // General transitions
    this.transitionRules.set('staccato->legato', { time: 0.15, fade: true });
    this.transitionRules.set('legato->staccato', { time: 0.1, fade: false });
  }

  /**
   * Process a note event and determine articulation
   * @param {Object} noteEvent 
   * @returns {string} Selected articulation
   */
  processNoteEvent(noteEvent) {
    const { note, velocity, duration, time } = noteEvent;
    
    // Add to history
    this.noteHistory.push({
      pitch: Tone.Frequency(note).toMidi(),
      velocity,
      duration: Tone.Time(duration).toSeconds(),
      time: Tone.Time(time).toSeconds(),
      timestamp: Date.now()
    });
    
    // Trim history
    if (this.noteHistory.length > this.historySize) {
      this.noteHistory.shift();
    }
    
    // Update metrics
    this.updateMetrics();
    
    // Check for key switch
    if (this.keySwitchEnabled && this.isKeySwitch(note)) {
      const articulation = this.keySwitches[Tone.Frequency(note).toMidi()];
      if (articulation && this.availableArticulations.has(articulation)) {
        this.setArticulation(articulation, true);
        return null; // Don't play key switch notes
      }
    }
    
    // Auto-detect articulation if enabled and not locked
    if (this.autoArticulation && !this.articulationLocked) {
      const detected = this.detectArticulation();
      if (detected && detected !== this.currentArticulation) {
        this.setArticulation(detected, false);
      }
    }
    
    return this.currentArticulation;
  }

  /**
   * Check if a note is in key switch range
   * @param {string} note 
   * @returns {boolean}
   */
  isKeySwitch(note) {
    const midi = Tone.Frequency(note).toMidi();
    return midi >= this.keySwitchRange.low && midi <= this.keySwitchRange.high;
  }

  /**
   * Detect articulation based on note patterns
   * @returns {string|null} Detected articulation
   */
  detectArticulation() {
    if (this.noteHistory.length < 2) return null;
    
    // Get recent notes for analysis
    const recentNotes = this.noteHistory.slice(-6);
    
    // Test each pattern
    const matches = [];
    
    for (const [articulation, pattern] of this.patterns) {
      if (this.availableArticulations.has(articulation) && pattern.test(recentNotes)) {
        matches.push({ articulation, priority: pattern.priority });
      }
    }
    
    // Return highest priority match
    if (matches.length > 0) {
      matches.sort((a, b) => b.priority - a.priority);
      return matches[0].articulation;
    }
    
    // Default based on metrics
    return this.getDefaultArticulation();
  }

  /**
   * Get default articulation based on current metrics
   * @returns {string}
   */
  getDefaultArticulation() {
    // High velocity and note density suggests marcato or forte playing
    if (this.metrics.averageVelocity > 0.8 && this.metrics.noteDensity > 4) {
      if (this.availableArticulations.has('marcato')) return 'marcato';
      if (this.availableArticulations.has('forte')) return 'forte';
    }
    
    // Low velocity suggests soft playing
    if (this.metrics.averageVelocity < 0.3) {
      if (this.availableArticulations.has('dolce')) return 'dolce';
      if (this.availableArticulations.has('piano')) return 'piano';
    }
    
    // Regular rhythm suggests normal playing
    if (this.metrics.rhythmicRegularity > 0.8) {
      if (this.availableArticulations.has('normal')) return 'normal';
      if (this.availableArticulations.has('arco')) return 'arco';
    }
    
    return this.currentArticulation;
  }

  /**
   * Set articulation with optional lock
   * @param {string} articulation 
   * @param {boolean} lock 
   */
  setArticulation(articulation, lock = false) {
    if (!this.availableArticulations.has(articulation)) {
      console.warn(`Articulation '${articulation}' not available for ${this.instrumentType}`);
      return;
    }
    
    this.previousArticulation = this.currentArticulation;
    this.currentArticulation = articulation;
    this.articulationLocked = lock;
    
    // Get transition rule
    const transitionKey = `${this.previousArticulation}->${articulation}`;
    const transition = this.transitionRules.get(transitionKey) || { time: 0.1, fade: false };
    
    // Notify state
    state.setState({
      [`${this.instrumentType}_articulation`]: articulation,
      [`${this.instrumentType}_articulationTransition`]: transition
    });
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    if (this.noteHistory.length < 2) return;
    
    const notes = this.noteHistory.slice(-8);
    
    // Average velocity
    this.metrics.averageVelocity = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;
    
    // Note density (notes per second)
    const timeSpan = notes[notes.length - 1].time - notes[0].time;
    this.metrics.noteDensity = timeSpan > 0 ? notes.length / timeSpan : 0;
    
    // Interval spread
    const intervals = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(Math.abs(notes[i].pitch - notes[i - 1].pitch));
    }
    this.metrics.intervalSpread = intervals.length > 0 ? 
      intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    
    // Rhythmic regularity
    const gaps = this.calculateGaps(notes);
    if (gaps.length > 1) {
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
      this.metrics.rhythmicRegularity = 1 / (1 + variance);
    }
  }

  /**
   * Calculate gaps between notes
   * @param {Array} notes 
   * @returns {Array}
   */
  calculateGaps(notes) {
    const gaps = [];
    for (let i = 1; i < notes.length; i++) {
      const gap = notes[i].time - (notes[i - 1].time + notes[i - 1].duration);
      gaps.push(Math.max(0, gap));
    }
    return gaps;
  }

  /**
   * Calculate average gap between notes
   * @param {Array} notes 
   * @returns {number}
   */
  calculateAverageGap(notes) {
    const gaps = this.calculateGaps(notes);
    return gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  }

  /**
   * Calculate note density
   * @param {Array} notes 
   * @returns {number}
   */
  calculateNoteDensity(notes) {
    if (notes.length < 2) return 0;
    const timeSpan = notes[notes.length - 1].time - notes[0].time;
    return timeSpan > 0 ? notes.length / timeSpan : 0;
  }

  /**
   * Check if notes have small intervals
   * @param {Array} notes 
   * @returns {boolean}
   */
  hasSmallIntervals(notes) {
    for (let i = 1; i < notes.length; i++) {
      if (Math.abs(notes[i].pitch - notes[i - 1].pitch) > 4) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if notes have small gaps
   * @param {Array} notes 
   * @returns {boolean}
   */
  hasSmallGaps(notes) {
    const gaps = this.calculateGaps(notes);
    return gaps.every(gap => gap < 0.1);
  }

  /**
   * Check if notes have sharp attacks
   * @param {Array} notes 
   * @returns {boolean}
   */
  hasSharpAttacks(notes) {
    return notes.every(n => n.velocity > 0.6 && n.duration < 0.2);
  }

  /**
   * Check if notes have consistent pitch direction
   * @param {Array} notes 
   * @returns {boolean}
   */
  hasConsistentPitchDirection(notes) {
    if (notes.length < 3) return false;
    
    const ascending = notes[1].pitch > notes[0].pitch;
    for (let i = 2; i < notes.length; i++) {
      const currentAscending = notes[i].pitch > notes[i - 1].pitch;
      if (currentAscending !== ascending) return false;
    }
    
    return true;
  }

  /**
   * Get current articulation info
   * @returns {Object}
   */
  getArticulationInfo() {
    return {
      current: this.currentArticulation,
      previous: this.previousArticulation,
      available: Array.from(this.availableArticulations),
      locked: this.articulationLocked,
      autoDetect: this.autoArticulation,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Enable/disable auto articulation
   * @param {boolean} enabled 
   */
  setAutoArticulation(enabled) {
    this.autoArticulation = enabled;
    if (!enabled) {
      this.articulationLocked = false;
    }
  }

  /**
   * Clear articulation lock
   */
  unlock() {
    this.articulationLocked = false;
  }

  /**
   * Reset to default state
   */
  reset() {
    this.currentArticulation = 'normal';
    this.previousArticulation = 'normal';
    this.articulationLocked = false;
    this.noteHistory = [];
    this.metrics = {
      averageVelocity: 0,
      noteDensity: 0,
      intervalSpread: 0,
      rhythmicRegularity: 0
    };
  }
}

/**
 * Create articulation engine for instrument type
 * @param {string} instrumentType 
 * @param {Object} config 
 * @returns {ArticulationEngine}
 */
export function createArticulationEngine(instrumentType, config = {}) {
  const engine = new ArticulationEngine(instrumentType);
  
  // Get default articulations for instrument type
  const defaultArticulations = getDefaultArticulations(instrumentType);
  
  // Merge with provided config
  const finalConfig = {
    articulations: config.articulations || defaultArticulations,
    keySwitches: config.keySwitches || {},
    autoDetect: config.autoDetect !== undefined ? config.autoDetect : true
  };
  
  engine.initialize(finalConfig);
  return engine;
}

/**
 * Get default articulations for instrument type
 * @param {string} instrumentType 
 * @returns {Array}
 */
function getDefaultArticulations(instrumentType) {
  if (instrumentType.includes('violin') || instrumentType.includes('viola') || 
      instrumentType.includes('cello') || instrumentType.includes('bass')) {
    return ['arco', 'pizzicato', 'tremolo', 'staccato', 'legato', 'spiccato', 'col_legno'];
  }
  
  if (instrumentType.includes('flute') || instrumentType.includes('clarinet') || 
      instrumentType.includes('oboe') || instrumentType.includes('bassoon')) {
    return ['normal', 'staccato', 'legato', 'flutter', 'multiphonic'];
  }
  
  if (instrumentType.includes('trumpet') || instrumentType.includes('horn') || 
      instrumentType.includes('trombone') || instrumentType.includes('tuba')) {
    return ['normal', 'staccato', 'legato', 'muted', 'flutter', 'glissando'];
  }
  
  if (instrumentType.includes('piano')) {
    return ['normal', 'staccato', 'legato', 'pedal', 'una_corda'];
  }
  
  return ['normal', 'staccato', 'legato'];
}