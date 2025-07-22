import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { state } from '../../state.js';

/**
 * TimingHumanizer - Adds human-like timing variations to performances
 * Simulates natural timing imperfections, swing, and groove
 */
export class TimingHumanizer {
  constructor() {
    this.registry = new DisposalRegistry('timing-humanizer');
    
    // Humanization settings
    this.enabled = true;
    this.amount = 0.02; // Default 20ms variation
    this.style = 'natural'; // 'natural', 'swing', 'groove', 'rubato'
    
    // Timing variation parameters
    this.timingDeviation = {
      natural: 0.02,     // ±20ms for natural human variation
      tight: 0.01,       // ±10ms for tight ensemble playing
      loose: 0.04,       // ±40ms for loose, expressive playing
      sloppy: 0.08,      // ±80ms for very loose timing
      robotic: 0         // No variation
    };
    
    // Swing parameters
    this.swingAmount = 0.0; // 0 = straight, 1 = full triplet swing
    this.swingSubdivision = '8n'; // Which notes to swing
    
    // Groove patterns
    this.groovePatterns = new Map();
    this.initializeGroovePatterns();
    
    // Rubato and expression
    this.rubato = {
      enabled: false,
      intensity: 0.1,
      phraseLength: 4, // bars
      curve: 'sine' // 'sine', 'exponential', 'linear'
    };
    
    // Micro-timing patterns
    this.microTiming = {
      rushFactor: 0,     // Positive = rush, negative = drag
      accentDelay: 0.01, // Slight delay on accented notes
      anticipation: 0.02 // How much to anticipate strong beats
    };
    
    // Instrument-specific timing
    this.instrumentProfiles = new Map();
    this.initializeInstrumentProfiles();
    
    // Ensemble timing relationships
    this.ensembleOffset = {
      lead: 0,
      rhythm: 0.005,    // Rhythm section slightly behind
      bass: 0.01,       // Bass slightly more behind
      drums: -0.005     // Drums slightly ahead
    };
    
    // Beat tracking
    this.currentBeat = 0;
    this.measurePosition = 0;
    this.tempo = 120;
    
    // Random seed for reproducible humanization
    this.seed = Date.now();
    this.randomIndex = 0;
  }

  /**
   * Initialize groove patterns
   */
  initializeGroovePatterns() {
    // Jazz swing
    this.groovePatterns.set('jazz-swing', {
      swingAmount: 0.67,
      beatDelays: [0, -0.01, 0.005, -0.005], // 1 e & a
      accentPattern: [1, 0.7, 0.8, 0.7],
      rushDrag: 0.02
    });
    
    // Funk groove
    this.groovePatterns.set('funk', {
      swingAmount: 0.1,
      beatDelays: [0, 0.01, -0.01, 0.005],
      accentPattern: [1, 0.6, 0.9, 0.7],
      rushDrag: -0.01 // Slight drag for pocket
    });
    
    // Latin clave
    this.groovePatterns.set('latin-clave', {
      swingAmount: 0,
      beatDelays: [0, -0.005, 0.01, -0.005],
      accentPattern: [1, 0.7, 0.7, 0.9],
      rushDrag: 0
    });
    
    // Shuffle
    this.groovePatterns.set('shuffle', {
      swingAmount: 0.75,
      beatDelays: [0, -0.02, 0, -0.01],
      accentPattern: [1, 0.5, 0.8, 0.6],
      rushDrag: 0
    });
    
    // Human drummer
    this.groovePatterns.set('drummer', {
      swingAmount: 0.15,
      beatDelays: [0, 0.008, -0.005, 0.003],
      accentPattern: [1, 0.7, 0.85, 0.75],
      rushDrag: 0.005 // Slight rush on fills
    });
  }

  /**
   * Initialize instrument-specific timing profiles
   */
  initializeInstrumentProfiles() {
    // Piano - generally good timing with slight variations
    this.instrumentProfiles.set('piano', {
      baseDeviation: 0.015,
      chordSpread: 0.01,     // Rolled chords
      melodyLead: 0.005,     // Melody slightly ahead
      dynamicTiming: true    // Louder = slightly earlier
    });
    
    // Guitar - more variation, especially strumming
    this.instrumentProfiles.set('guitar', {
      baseDeviation: 0.02,
      strumSpread: 0.03,     // Strum timing
      bendDelay: 0.02,       // String bends slightly late
      palmMuteRush: -0.01    // Palm mutes slightly early
    });
    
    // Strings - ensemble variation
    this.instrumentProfiles.set('strings', {
      baseDeviation: 0.025,
      bowingDelay: 0.01,     // Bow changes
      sectionSpread: 0.02,   // Section ensemble spread
      vibratoTiming: 0.005   // Vibrato onset variation
    });
    
    // Brass - attack variations
    this.instrumentProfiles.set('brass', {
      baseDeviation: 0.02,
      attackDelay: 0.015,    // Brass speaks slowly
      tongueVariation: 0.01,
      sectionTightness: 0.03 // Section spread
    });
    
    // Woodwinds - tighter timing
    this.instrumentProfiles.set('woodwinds', {
      baseDeviation: 0.01,
      breathingDelay: 0.02,  // After breath
      articulationSpeed: 0.005,
      registerChange: 0.01   // Register changes
    });
    
    // Drums - tightest but with groove
    this.instrumentProfiles.set('drums', {
      baseDeviation: 0.008,
      flam: 0.02,           // Flam timing
      ghostNotes: -0.005,   // Ghost notes slightly early
      fillRush: 0.01        // Fills slightly rushed
    });
    
    // Vocals - most expressive timing
    this.instrumentProfiles.set('vocals', {
      baseDeviation: 0.03,
      phraseRubato: 0.05,   // Phrase-based timing
      consonantLead: 0.02,  // Consonants early
      emotionFactor: 0.04   // Emotional variation
    });
  }

  /**
   * Process a note event with humanized timing
   * @param {Object} noteEvent 
   * @param {Object} context 
   * @returns {Object} Processed note event
   */
  processNoteEvent(noteEvent, context = {}) {
    if (!this.enabled) return noteEvent;
    
    const {
      instrumentType = 'piano',
      noteIndex = 0,
      totalNotes = 1,
      isChord = false,
      velocity = 0.8,
      beatPosition = 0,
      measurePosition = 0,
      isAccent = false,
      expression = {}
    } = context;
    
    // Start with original timing
    let timing = noteEvent.time;
    
    // Apply base humanization
    timing += this.applyBaseHumanization(velocity, isAccent);
    
    // Apply instrument-specific timing
    timing += this.applyInstrumentTiming(instrumentType, context);
    
    // Apply groove if set
    if (this.style === 'groove' || this.groovePatterns.has(this.style)) {
      timing += this.applyGroove(beatPosition, measurePosition);
    }
    
    // Apply swing
    if (this.swingAmount > 0) {
      timing += this.applySwing(beatPosition);
    }
    
    // Apply rubato
    if (this.rubato.enabled) {
      timing += this.applyRubato(measurePosition, expression);
    }
    
    // Apply chord spreading
    if (isChord && totalNotes > 1) {
      timing += this.applyChordSpreading(noteIndex, totalNotes, instrumentType);
    }
    
    // Apply micro-timing
    timing += this.applyMicroTiming(beatPosition, velocity, isAccent);
    
    // Apply ensemble offset
    timing += this.applyEnsembleOffset(instrumentType);
    
    return {
      ...noteEvent,
      time: Math.max(0, timing),
      humanizedTime: timing,
      timingDeviation: timing - noteEvent.time
    };
  }

  /**
   * Apply base humanization
   * @param {number} velocity 
   * @param {boolean} isAccent 
   * @returns {number} Timing offset
   */
  applyBaseHumanization(velocity, isAccent) {
    const baseAmount = this.timingDeviation[this.style] || this.amount;
    
    // Velocity affects timing (louder = slightly earlier)
    const velocityFactor = this.microTiming.rushFactor * (velocity - 0.5);
    
    // Accents have different timing
    const accentFactor = isAccent ? this.microTiming.accentDelay : 0;
    
    // Random variation
    const randomVariation = this.getSeededRandom() * baseAmount - (baseAmount / 2);
    
    return randomVariation + velocityFactor * 0.01 + accentFactor;
  }

  /**
   * Apply instrument-specific timing
   * @param {string} instrumentType 
   * @param {Object} context 
   * @returns {number} Timing offset
   */
  applyInstrumentTiming(instrumentType, context) {
    const profile = this.instrumentProfiles.get(instrumentType);
    if (!profile) return 0;
    
    let offset = 0;
    
    // Base instrument deviation
    offset += (this.getSeededRandom() - 0.5) * profile.baseDeviation;
    
    // Instrument-specific factors
    switch (instrumentType) {
      case 'piano':
        if (context.isMelody && profile.melodyLead) {
          offset -= profile.melodyLead;
        }
        if (context.velocity > 0.8 && profile.dynamicTiming) {
          offset -= 0.005; // Forte slightly early
        }
        break;
        
      case 'guitar':
        if (context.isStrum) {
          offset += (this.getSeededRandom() - 0.5) * profile.strumSpread;
        }
        if (context.isBend) {
          offset += profile.bendDelay;
        }
        break;
        
      case 'strings':
        if (context.bowChange) {
          offset += profile.bowingDelay;
        }
        if (context.isSection) {
          offset += (this.getSeededRandom() - 0.5) * profile.sectionSpread;
        }
        break;
        
      case 'brass':
        offset += profile.attackDelay; // Brass always speaks late
        if (context.isTongued) {
          offset += (this.getSeededRandom() - 0.5) * profile.tongueVariation;
        }
        break;
        
      case 'drums':
        if (context.isFlam) {
          offset += profile.flam;
        }
        if (context.isGhost) {
          offset += profile.ghostNotes;
        }
        if (context.isFill) {
          offset -= profile.fillRush; // Fills rush
        }
        break;
    }
    
    return offset;
  }

  /**
   * Apply groove pattern
   * @param {number} beatPosition 
   * @param {number} measurePosition 
   * @returns {number} Timing offset
   */
  applyGroove(beatPosition, measurePosition) {
    const groove = this.groovePatterns.get(this.style);
    if (!groove) return 0;
    
    // Get subdivision position (16th notes)
    const subdivPosition = Math.floor((beatPosition % 1) * 4);
    
    // Apply beat delays
    const beatDelay = groove.beatDelays[subdivPosition] || 0;
    
    // Apply rush/drag pattern
    const rushDrag = groove.rushDrag * Math.sin(measurePosition * Math.PI * 2);
    
    return beatDelay + rushDrag;
  }

  /**
   * Apply swing timing
   * @param {number} beatPosition 
   * @returns {number} Timing offset
   */
  applySwing(beatPosition) {
    // Determine if this is an off-beat eighth note
    const eighthPosition = (beatPosition * 2) % 1;
    
    if (eighthPosition > 0.4 && eighthPosition < 0.6) {
      // This is an off-beat eighth - apply swing
      const swingDelay = this.swingAmount * 0.08; // Max 80ms swing
      return swingDelay;
    }
    
    return 0;
  }

  /**
   * Apply rubato timing
   * @param {number} measurePosition 
   * @param {Object} expression 
   * @returns {number} Timing offset
   */
  applyRubato(measurePosition, expression) {
    if (!this.rubato.enabled) return 0;
    
    const phrasePosition = (measurePosition % this.rubato.phraseLength) / this.rubato.phraseLength;
    let rubatoCurve = 0;
    
    switch (this.rubato.curve) {
      case 'sine':
        // Speed up in middle, slow at ends
        rubatoCurve = Math.sin(phrasePosition * Math.PI) * this.rubato.intensity;
        break;
        
      case 'exponential':
        // Accelerando
        rubatoCurve = (Math.exp(phrasePosition) - 1) / (Math.E - 1) * this.rubato.intensity;
        break;
        
      case 'linear':
        // Simple linear change
        rubatoCurve = (phrasePosition - 0.5) * this.rubato.intensity;
        break;
    }
    
    // Expression can modify rubato
    if (expression.rubato !== undefined) {
      rubatoCurve *= expression.rubato;
    }
    
    return -rubatoCurve * 0.1; // Negative = earlier when "rushing"
  }

  /**
   * Apply chord spreading (rolling)
   * @param {number} noteIndex 
   * @param {number} totalNotes 
   * @param {string} instrumentType 
   * @returns {number} Timing offset
   */
  applyChordSpreading(noteIndex, totalNotes, instrumentType) {
    const profile = this.instrumentProfiles.get(instrumentType);
    const spreadAmount = profile?.chordSpread || 0.01;
    
    // Calculate position in chord (0 = bottom, 1 = top)
    const position = noteIndex / (totalNotes - 1);
    
    // Different spreading patterns
    let spread = 0;
    
    switch (instrumentType) {
      case 'piano':
        // Traditional bottom-to-top roll
        spread = position * spreadAmount;
        break;
        
      case 'guitar':
        // Strum pattern (can be up or down)
        spread = this.getSeededRandom() > 0.5 ? 
          position * spreadAmount : 
          (1 - position) * spreadAmount;
        break;
        
      case 'strings':
        // Slight desynchronization
        spread = (this.getSeededRandom() - 0.5) * spreadAmount;
        break;
        
      default:
        spread = position * spreadAmount * 0.5;
    }
    
    return spread;
  }

  /**
   * Apply micro-timing adjustments
   * @param {number} beatPosition 
   * @param {number} velocity 
   * @param {boolean} isAccent 
   * @returns {number} Timing offset
   */
  applyMicroTiming(beatPosition, velocity, isAccent) {
    let offset = 0;
    
    // Strong beat anticipation
    const isStrongBeat = beatPosition % 1 < 0.1;
    if (isStrongBeat && this.microTiming.anticipation > 0) {
      offset -= this.microTiming.anticipation * velocity;
    }
    
    // Rush/drag based on dynamics
    if (this.microTiming.rushFactor !== 0) {
      const dynamicRush = this.microTiming.rushFactor * (velocity - 0.5) * 0.01;
      offset += dynamicRush;
    }
    
    // Accent delay
    if (isAccent && this.microTiming.accentDelay > 0) {
      offset += this.microTiming.accentDelay;
    }
    
    return offset;
  }

  /**
   * Apply ensemble offset based on instrument role
   * @param {string} instrumentType 
   * @returns {number} Timing offset
   */
  applyEnsembleOffset(instrumentType) {
    // Map instrument types to ensemble roles
    const roleMap = {
      'piano': 'lead',
      'guitar': 'rhythm',
      'bass': 'bass',
      'drums': 'drums',
      'strings': 'rhythm',
      'brass': 'rhythm',
      'woodwinds': 'lead',
      'vocals': 'lead'
    };
    
    const role = roleMap[instrumentType] || 'rhythm';
    return this.ensembleOffset[role] || 0;
  }

  /**
   * Set timing style
   * @param {string} style 
   */
  setStyle(style) {
    this.style = style;
    
    // Update parameters based on style
    switch (style) {
      case 'tight':
        this.amount = this.timingDeviation.tight;
        this.swingAmount = 0;
        break;
        
      case 'loose':
        this.amount = this.timingDeviation.loose;
        break;
        
      case 'jazz':
        this.style = 'jazz-swing';
        this.amount = this.timingDeviation.natural;
        break;
        
      case 'classical':
        this.amount = this.timingDeviation.tight;
        this.rubato.enabled = true;
        this.rubato.intensity = 0.15;
        break;
        
      case 'rock':
        this.amount = this.timingDeviation.natural;
        this.microTiming.rushFactor = 0.1;
        break;
    }
  }

  /**
   * Set swing amount
   * @param {number} amount - 0 to 1
   */
  setSwing(amount) {
    this.swingAmount = Math.max(0, Math.min(1, amount));
  }

  /**
   * Enable/disable rubato
   * @param {boolean} enabled 
   * @param {Object} settings 
   */
  setRubato(enabled, settings = {}) {
    this.rubato.enabled = enabled;
    if (settings.intensity !== undefined) {
      this.rubato.intensity = settings.intensity;
    }
    if (settings.phraseLength !== undefined) {
      this.rubato.phraseLength = settings.phraseLength;
    }
    if (settings.curve !== undefined) {
      this.rubato.curve = settings.curve;
    }
  }

  /**
   * Process a sequence of notes
   * @param {Array} notes 
   * @param {Object} context 
   * @returns {Array} Humanized notes
   */
  processSequence(notes, context = {}) {
    const processedNotes = [];
    
    // Analyze sequence for patterns
    const analysis = this.analyzeSequence(notes);
    
    // Process each note
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      
      // Determine context for this note
      const noteContext = {
        ...context,
        noteIndex: i,
        totalNotes: notes.length,
        isChord: analysis.chords.includes(i),
        isAccent: analysis.accents.includes(i),
        beatPosition: this.calculateBeatPosition(note.time),
        measurePosition: this.calculateMeasurePosition(note.time),
        velocity: note.velocity || 0.7
      };
      
      // Check for specific patterns
      if (analysis.isArpeggio && i > 0) {
        noteContext.arpeggio = true;
        noteContext.arpeggioIndex = i;
      }
      
      if (analysis.isScale) {
        noteContext.scale = true;
        noteContext.scaleDirection = analysis.scaleDirection;
      }
      
      const processed = this.processNoteEvent(note, noteContext);
      processedNotes.push(processed);
    }
    
    // Apply sequence-level adjustments
    return this.applySequenceAdjustments(processedNotes, analysis);
  }

  /**
   * Analyze a sequence of notes
   * @param {Array} notes 
   * @returns {Object} Analysis
   */
  analyzeSequence(notes) {
    const analysis = {
      chords: [],
      accents: [],
      isArpeggio: false,
      isScale: false,
      scaleDirection: 0,
      phrases: []
    };
    
    // Detect chords (notes very close in time)
    for (let i = 0; i < notes.length - 1; i++) {
      if (Math.abs(notes[i].time - notes[i + 1].time) < 0.01) {
        analysis.chords.push(i);
        analysis.chords.push(i + 1);
      }
    }
    
    // Detect accents (higher velocity)
    const avgVelocity = notes.reduce((sum, n) => sum + (n.velocity || 0.7), 0) / notes.length;
    for (let i = 0; i < notes.length; i++) {
      if ((notes[i].velocity || 0.7) > avgVelocity * 1.2) {
        analysis.accents.push(i);
      }
    }
    
    // Detect arpeggios and scales
    if (notes.length >= 3) {
      const intervals = [];
      for (let i = 1; i < notes.length; i++) {
        intervals.push(notes[i].pitch - notes[i - 1].pitch);
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
        analysis.scaleDirection = intervals.reduce((a, b) => a + b, 0) > 0 ? 1 : -1;
      }
    }
    
    return analysis;
  }

  /**
   * Apply sequence-level timing adjustments
   * @param {Array} notes 
   * @param {Object} analysis 
   * @returns {Array}
   */
  applySequenceAdjustments(notes, analysis) {
    // Apply accelerando/ritardando to scales
    if (analysis.isScale) {
      const scaleFactor = 0.002; // 2ms per note
      for (let i = 0; i < notes.length; i++) {
        const position = i / notes.length;
        
        if (analysis.scaleDirection > 0) {
          // Ascending - slight accelerando
          notes[i].time -= position * scaleFactor * notes.length;
        } else {
          // Descending - slight ritardando
          notes[i].time += position * scaleFactor * notes.length;
        }
      }
    }
    
    // Ensure chord notes stay together
    const chordGroups = new Map();
    for (const chordIndex of analysis.chords) {
      const time = notes[chordIndex].time;
      if (!chordGroups.has(time)) {
        chordGroups.set(time, []);
      }
      chordGroups.get(time).push(chordIndex);
    }
    
    // Keep chord timing relationships
    for (const [baseTime, indices] of chordGroups) {
      const timings = indices.map(i => notes[i].time);
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      
      // Preserve relative timing within chord
      for (let i = 0; i < indices.length; i++) {
        const relativeTime = timings[i] - baseTime;
        notes[indices[i]].time = avgTime + relativeTime;
      }
    }
    
    return notes;
  }

  /**
   * Calculate beat position
   * @param {number} time 
   * @returns {number}
   */
  calculateBeatPosition(time) {
    const secondsPerBeat = 60 / this.tempo;
    return (time / secondsPerBeat) % 4; // Assuming 4/4
  }

  /**
   * Calculate measure position
   * @param {number} time 
   * @returns {number}
   */
  calculateMeasurePosition(time) {
    const secondsPerBeat = 60 / this.tempo;
    const secondsPerMeasure = secondsPerBeat * 4; // Assuming 4/4
    return (time / secondsPerMeasure) % 4; // 4 bar phrases
  }

  /**
   * Get seeded random number
   * @returns {number} 0-1
   */
  getSeededRandom() {
    // Simple seeded random
    this.randomIndex++;
    const x = Math.sin(this.seed + this.randomIndex) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Reset timing state
   */
  reset() {
    this.currentBeat = 0;
    this.measurePosition = 0;
    this.randomIndex = 0;
    this.seed = Date.now();
  }

  /**
   * Get timing analysis for debugging
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzeTimingDeviations(notes) {
    const deviations = notes.map(n => n.timingDeviation || 0);
    
    return {
      min: Math.min(...deviations),
      max: Math.max(...deviations),
      average: deviations.reduce((a, b) => a + b, 0) / deviations.length,
      standardDeviation: this.calculateStandardDeviation(deviations),
      histogram: this.createHistogram(deviations)
    };
  }

  /**
   * Calculate standard deviation
   * @param {Array} values 
   * @returns {number}
   */
  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Create timing histogram
   * @param {Array} deviations 
   * @returns {Object}
   */
  createHistogram(deviations) {
    const bins = {};
    const binSize = 0.005; // 5ms bins
    
    for (const dev of deviations) {
      const bin = Math.round(dev / binSize) * binSize;
      bins[bin] = (bins[bin] || 0) + 1;
    }
    
    return bins;
  }

  /**
   * Clean up
   */
  dispose() {
    this.registry.dispose();
    this.groovePatterns.clear();
    this.instrumentProfiles.clear();
  }
}

// Create singleton instance
export const timingHumanizer = new TimingHumanizer();