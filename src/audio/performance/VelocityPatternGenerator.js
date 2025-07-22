import { state } from '../../state.js';

/**
 * VelocityPatternGenerator - Creates human-like velocity patterns
 * Simulates natural dynamics, accents, and expression
 */
export class VelocityPatternGenerator {
  constructor() {
    // Pattern settings
    this.baseVelocity = 0.7;
    this.variationAmount = 0.15;
    this.style = 'natural'; // 'natural', 'mechanical', 'expressive', 'dynamic'
    
    // Dynamic curves
    this.dynamicCurves = new Map();
    this.initializeDynamicCurves();
    
    // Accent patterns
    this.accentPatterns = new Map();
    this.initializeAccentPatterns();
    
    // Expression shapes
    this.expressionShapes = {
      crescendo: (position) => position,
      diminuendo: (position) => 1 - position,
      swell: (position) => Math.sin(position * Math.PI),
      wave: (position) => (Math.sin(position * Math.PI * 2) + 1) / 2,
      terraced: (position) => position > 0.5 ? 0.8 : 0.5
    };
    
    // Instrument-specific velocity profiles
    this.instrumentProfiles = new Map();
    this.initializeInstrumentProfiles();
    
    // Note relationship factors
    this.relationshipFactors = {
      melodicLeap: 0.1,      // Large intervals get accent
      stepwise: -0.05,       // Stepwise motion softer
      repeated: -0.1,        // Repeated notes decay
      resolution: -0.15,     // Resolutions softer
      leading: 0.05          // Leading tones slightly louder
    };
    
    // Phrase dynamics
    this.phraseDynamics = {
      archShape: true,       // Natural phrase arch
      breathPoints: true,    // Softer after breaths
      cadence: true,        // Softer at cadences
      climax: true          // Build to climax
    };
    
    // Random variation
    this.randomSeed = Date.now();
    this.randomIndex = 0;
    
    // Performance memory
    this.velocityHistory = [];
    this.historyLength = 16;
  }

  /**
   * Initialize dynamic curves
   */
  initializeDynamicCurves() {
    // Classical dynamics curve
    this.dynamicCurves.set('classical', {
      pp: 0.15,
      p: 0.35,
      mp: 0.5,
      mf: 0.65,
      f: 0.8,
      ff: 0.95,
      curve: 'exponential'
    });
    
    // Jazz dynamics (more compressed)
    this.dynamicCurves.set('jazz', {
      pp: 0.3,
      p: 0.45,
      mp: 0.6,
      mf: 0.7,
      f: 0.85,
      ff: 0.95,
      curve: 'linear'
    });
    
    // Pop/Rock dynamics (compressed)
    this.dynamicCurves.set('pop', {
      pp: 0.5,
      p: 0.6,
      mp: 0.7,
      mf: 0.75,
      f: 0.85,
      ff: 0.95,
      curve: 'logarithmic'
    });
  }

  /**
   * Initialize accent patterns
   */
  initializeAccentPatterns() {
    // 4/4 patterns
    this.accentPatterns.set('4/4-basic', [1, 0.7, 0.8, 0.7]);
    this.accentPatterns.set('4/4-rock', [1, 0.6, 0.9, 0.7]);
    this.accentPatterns.set('4/4-jazz', [0.8, 0.7, 0.9, 0.75]);
    this.accentPatterns.set('4/4-latin', [1, 0.7, 0.7, 0.9]);
    
    // 3/4 patterns
    this.accentPatterns.set('3/4-waltz', [1, 0.6, 0.7]);
    this.accentPatterns.set('3/4-jazz', [0.9, 0.7, 0.8]);
    
    // 6/8 patterns
    this.accentPatterns.set('6/8-basic', [1, 0.6, 0.7, 0.8, 0.6, 0.7]);
    this.accentPatterns.set('6/8-compound', [1, 0.5, 0.6, 0.9, 0.5, 0.6]);
    
    // Complex patterns
    this.accentPatterns.set('5/4', [1, 0.7, 0.8, 0.7, 0.8]);
    this.accentPatterns.set('7/8', [1, 0.7, 0.8, 0.7, 0.9, 0.7, 0.8]);
  }

  /**
   * Initialize instrument profiles
   */
  initializeInstrumentProfiles() {
    // Piano - wide dynamic range
    this.instrumentProfiles.set('piano', {
      range: [0.1, 0.95],
      sensitivity: 0.8,
      sustainFactor: 0.9,      // Notes decay naturally
      pedalEffect: 1.1,        // Pedal adds presence
      chordBalance: 0.85,      // Inner voices softer
      touchResponse: 'exponential'
    });
    
    // Strings - expressive dynamics
    this.instrumentProfiles.set('strings', {
      range: [0.2, 0.9],
      sensitivity: 0.7,
      bowPressure: 0.15,       // Affects tone
      vibratoDynamic: 0.1,     // Vibrato adds intensity
      harmonicSoftness: 0.5,   // Harmonics are soft
      touchResponse: 'linear'
    });
    
    // Brass - powerful but controlled
    this.instrumentProfiles.set('brass', {
      range: [0.4, 0.95],
      sensitivity: 0.6,
      attackEmphasis: 1.2,     // Strong attacks
      sustainControl: 0.8,     // Control in sustain
      muteDamping: 0.7,        // Mutes reduce volume
      touchResponse: 'logarithmic'
    });
    
    // Woodwinds - gentle dynamics
    this.instrumentProfiles.set('woodwinds', {
      range: [0.25, 0.85],
      sensitivity: 0.75,
      breathControl: 0.9,      // Breath affects dynamics
      registerBalance: 0.85,   // Upper register naturally louder
      articulationEffect: 0.8, // Tonguing affects volume
      touchResponse: 'linear'
    });
    
    // Guitar - compressed dynamics
    this.instrumentProfiles.set('guitar', {
      range: [0.3, 0.9],
      sensitivity: 0.65,
      pickAttack: 1.1,         // Pick adds attack
      fingerStyle: 0.85,       // Fingers softer
      palmMute: 0.6,          // Palm muting reduces
      touchResponse: 'compressed'
    });
    
    // Drums - accent-based
    this.instrumentProfiles.set('drums', {
      range: [0.4, 1.0],
      sensitivity: 0.5,
      ghostNote: 0.3,         // Ghost notes very soft
      accent: 1.3,            // Accents pop out
      rimshot: 1.2,           // Rimshots louder
      touchResponse: 'immediate'
    });
  }

  /**
   * Generate velocity for a note
   * @param {Object} noteContext 
   * @returns {number} Velocity value 0-1
   */
  generateVelocity(noteContext) {
    const {
      pitch,
      duration,
      time,
      instrumentType = 'piano',
      expression = {},
      previousNote = null,
      nextNote = null,
      beatPosition = 0,
      measurePosition = 0,
      phrasePosition = 0.5,
      isAccent = false,
      isGhost = false,
      dynamic = 'mf'
    } = noteContext;
    
    // Start with base velocity from dynamic marking
    let velocity = this.getDynamicVelocity(dynamic, instrumentType);
    
    // Apply instrument profile
    velocity = this.applyInstrumentProfile(velocity, instrumentType, noteContext);
    
    // Apply accent pattern
    velocity *= this.applyAccentPattern(beatPosition, measurePosition);
    
    // Apply note relationships
    velocity += this.applyNoteRelationships(noteContext);
    
    // Apply phrase dynamics
    velocity = this.applyPhraseDynamics(velocity, phrasePosition, noteContext);
    
    // Apply expression
    velocity = this.applyExpression(velocity, expression, time);
    
    // Apply random variation
    velocity += this.applyRandomVariation();
    
    // Special cases
    if (isAccent) velocity *= 1.2;
    if (isGhost) velocity *= 0.3;
    
    // Clamp to valid range
    velocity = Math.max(0.05, Math.min(1.0, velocity));
    
    // Update history
    this.updateVelocityHistory(velocity);
    
    return velocity;
  }

  /**
   * Get velocity from dynamic marking
   * @param {string} dynamic 
   * @param {string} instrumentType 
   * @returns {number}
   */
  getDynamicVelocity(dynamic, instrumentType) {
    const styleMap = {
      'classical': 'classical',
      'jazz': 'jazz',
      'pop': 'pop',
      'rock': 'pop'
    };
    
    const curve = this.dynamicCurves.get(styleMap[this.style] || 'classical');
    return curve[dynamic] || curve.mf;
  }

  /**
   * Apply instrument-specific velocity profile
   * @param {number} velocity 
   * @param {string} instrumentType 
   * @param {Object} context 
   * @returns {number}
   */
  applyInstrumentProfile(velocity, instrumentType, context) {
    const profile = this.instrumentProfiles.get(instrumentType);
    if (!profile) return velocity;
    
    // Apply range constraints
    const [minVel, maxVel] = profile.range;
    velocity = minVel + velocity * (maxVel - minVel);
    
    // Apply sensitivity
    velocity = this.applySensitivityCurve(velocity, profile.sensitivity, profile.touchResponse);
    
    // Instrument-specific adjustments
    switch (instrumentType) {
      case 'piano':
        if (context.isPedaled) velocity *= profile.pedalEffect;
        if (context.isInnerVoice) velocity *= profile.chordBalance;
        break;
        
      case 'strings':
        if (context.isHarmonic) velocity *= profile.harmonicSoftness;
        if (context.hasVibrato) velocity *= (1 + profile.vibratoDynamic);
        break;
        
      case 'brass':
        if (context.isMuted) velocity *= profile.muteDamping;
        if (context.isAttack) velocity *= profile.attackEmphasis;
        break;
        
      case 'guitar':
        if (context.isPalmMuted) velocity *= profile.palmMute;
        if (context.isPicked) velocity *= profile.pickAttack;
        else velocity *= profile.fingerStyle;
        break;
        
      case 'drums':
        if (context.isGhost) velocity = profile.ghostNote;
        if (context.isAccent) velocity *= profile.accent;
        if (context.isRimshot) velocity *= profile.rimshot;
        break;
    }
    
    return velocity;
  }

  /**
   * Apply sensitivity curve
   * @param {number} velocity 
   * @param {number} sensitivity 
   * @param {string} curveType 
   * @returns {number}
   */
  applySensitivityCurve(velocity, sensitivity, curveType) {
    switch (curveType) {
      case 'linear':
        return velocity;
        
      case 'exponential':
        return Math.pow(velocity, 1 / sensitivity);
        
      case 'logarithmic':
        return Math.log(1 + velocity * sensitivity) / Math.log(1 + sensitivity);
        
      case 'compressed':
        // Soft compression curve
        return velocity * 0.7 + 0.3;
        
      case 'immediate':
        // Step response
        return velocity > 0.5 ? 0.8 : 0.5;
        
      default:
        return velocity;
    }
  }

  /**
   * Apply accent pattern
   * @param {number} beatPosition 
   * @param {number} measurePosition 
   * @returns {number} Multiplier
   */
  applyAccentPattern(beatPosition, measurePosition) {
    // Determine time signature (default 4/4)
    const timeSignature = '4/4'; // Could be passed in context
    
    const pattern = this.accentPatterns.get(`${timeSignature}-${this.style}`) || 
                   this.accentPatterns.get(`${timeSignature}-basic`);
    
    if (!pattern) return 1;
    
    // Get beat within measure
    const beatIndex = Math.floor(beatPosition) % pattern.length;
    
    // Interpolate between beats for smooth transitions
    const beatFraction = beatPosition % 1;
    const currentAccent = pattern[beatIndex];
    const nextAccent = pattern[(beatIndex + 1) % pattern.length];
    
    return currentAccent + (nextAccent - currentAccent) * beatFraction;
  }

  /**
   * Apply note relationship factors
   * @param {Object} context 
   * @returns {number} Velocity adjustment
   */
  applyNoteRelationships(context) {
    let adjustment = 0;
    const { pitch, previousNote, nextNote } = context;
    
    if (previousNote) {
      const interval = Math.abs(pitch - previousNote.pitch);
      
      // Melodic leap
      if (interval > 7) {
        adjustment += this.relationshipFactors.melodicLeap;
      }
      // Stepwise motion
      else if (interval <= 2) {
        adjustment += this.relationshipFactors.stepwise;
      }
      
      // Repeated notes
      if (interval === 0) {
        adjustment += this.relationshipFactors.repeated;
        
        // Further reduction for multiple repetitions
        const repetitions = this.countRecentRepetitions(pitch);
        adjustment -= repetitions * 0.02;
      }
    }
    
    // Leading tone resolution
    if (nextNote) {
      const interval = nextNote.pitch - pitch;
      if (interval === 1) {
        // Half step up - leading tone
        adjustment += this.relationshipFactors.leading;
      } else if (Math.abs(interval) === 1) {
        // Half step resolution
        adjustment += this.relationshipFactors.resolution;
      }
    }
    
    return adjustment;
  }

  /**
   * Apply phrase dynamics
   * @param {number} velocity 
   * @param {number} phrasePosition 
   * @param {Object} context 
   * @returns {number}
   */
  applyPhraseDynamics(velocity, phrasePosition, context) {
    if (!this.phraseDynamics.archShape) return velocity;
    
    // Natural phrase arch
    const archMultiplier = 0.8 + 0.2 * Math.sin(phrasePosition * Math.PI);
    velocity *= archMultiplier;
    
    // Breath points
    if (this.phraseDynamics.breathPoints && context.afterBreath) {
      velocity *= 0.85; // Softer after breath
    }
    
    // Cadence
    if (this.phraseDynamics.cadence && context.isCadence) {
      velocity *= 0.9; // Soften at cadences
    }
    
    // Climax
    if (this.phraseDynamics.climax && context.isClimax) {
      velocity *= 1.15; // Emphasize climax
    }
    
    return velocity;
  }

  /**
   * Apply expression shapes
   * @param {number} velocity 
   * @param {Object} expression 
   * @param {number} time 
   * @returns {number}
   */
  applyExpression(velocity, expression, time) {
    if (!expression || Object.keys(expression).length === 0) return velocity;
    
    // Apply dynamic changes
    if (expression.crescendo) {
      const position = expression.position || 0.5;
      velocity *= this.expressionShapes.crescendo(position);
    }
    
    if (expression.diminuendo) {
      const position = expression.position || 0.5;
      velocity *= this.expressionShapes.diminuendo(position);
    }
    
    if (expression.swell) {
      const position = expression.position || 0.5;
      velocity *= this.expressionShapes.swell(position);
    }
    
    // Apply sudden dynamic changes
    if (expression.sforzando) {
      velocity *= 1.4;
    }
    
    if (expression.subito) {
      velocity *= expression.subito; // Sudden change factor
    }
    
    return velocity;
  }

  /**
   * Apply random variation
   * @returns {number}
   */
  applyRandomVariation() {
    const variation = (this.getSeededRandom() - 0.5) * this.variationAmount;
    
    // Smooth variation using history
    if (this.velocityHistory.length > 0) {
      const recentAvg = this.velocityHistory.slice(-4).reduce((a, b) => a + b, 0) / 4;
      return variation * 0.7; // Reduce variation to maintain continuity
    }
    
    return variation;
  }

  /**
   * Count recent repetitions of a pitch
   * @param {number} pitch 
   * @returns {number}
   */
  countRecentRepetitions(pitch) {
    let count = 0;
    for (let i = this.velocityHistory.length - 1; i >= 0 && i > this.velocityHistory.length - 8; i--) {
      if (this.velocityHistory[i].pitch === pitch) count++;
      else break;
    }
    return count;
  }

  /**
   * Update velocity history
   * @param {number} velocity 
   */
  updateVelocityHistory(velocity) {
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.historyLength) {
      this.velocityHistory.shift();
    }
  }

  /**
   * Generate velocity pattern for a sequence
   * @param {Array} notes 
   * @param {Object} options 
   * @returns {Array}
   */
  generateSequenceVelocities(notes, options = {}) {
    const velocities = [];
    
    // Analyze sequence for phrasing
    const analysis = this.analyzeSequence(notes);
    
    // Generate velocities
    for (let i = 0; i < notes.length; i++) {
      const context = {
        ...notes[i],
        ...options,
        previousNote: i > 0 ? notes[i - 1] : null,
        nextNote: i < notes.length - 1 ? notes[i + 1] : null,
        phrasePosition: this.calculatePhrasePosition(i, notes.length, analysis),
        isAccent: analysis.accents.includes(i),
        isClimax: i === analysis.climaxIndex,
        isCadence: analysis.cadencePoints.includes(i),
        beatPosition: this.calculateBeatPosition(notes[i].time)
      };
      
      velocities.push(this.generateVelocity(context));
    }
    
    // Apply smoothing
    return this.smoothVelocities(velocities, options.smoothing || 0.3);
  }

  /**
   * Analyze sequence for musical features
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzeSequence(notes) {
    const analysis = {
      accents: [],
      climaxIndex: -1,
      cadencePoints: [],
      phrases: []
    };
    
    // Find melodic peak (climax)
    let maxPitch = -Infinity;
    notes.forEach((note, i) => {
      if (note.pitch > maxPitch) {
        maxPitch = note.pitch;
        analysis.climaxIndex = i;
      }
    });
    
    // Detect natural accents
    for (let i = 0; i < notes.length; i++) {
      // Downbeats
      if (notes[i].time % 1 < 0.05) {
        analysis.accents.push(i);
      }
      
      // After large leaps
      if (i > 0 && Math.abs(notes[i].pitch - notes[i - 1].pitch) > 7) {
        analysis.accents.push(i);
      }
      
      // Long notes
      if (notes[i].duration > 1) {
        analysis.accents.push(i);
      }
    }
    
    // Detect cadence points (simple detection)
    for (let i = 1; i < notes.length - 1; i++) {
      // Descending stepwise motion to long note
      if (notes[i].pitch < notes[i - 1].pitch && 
          notes[i + 1].duration > notes[i].duration * 1.5) {
        analysis.cadencePoints.push(i + 1);
      }
    }
    
    return analysis;
  }

  /**
   * Calculate phrase position
   * @param {number} index 
   * @param {number} total 
   * @param {Object} analysis 
   * @returns {number} 0-1
   */
  calculatePhrasePosition(index, total, analysis) {
    // Simple linear position
    // Could be enhanced with actual phrase detection
    return index / total;
  }

  /**
   * Calculate beat position
   * @param {number} time 
   * @returns {number}
   */
  calculateBeatPosition(time) {
    // Assumes 120 BPM, 4/4 time
    const beatsPerSecond = 2;
    return (time * beatsPerSecond) % 4;
  }

  /**
   * Smooth velocity values
   * @param {Array} velocities 
   * @param {number} amount 
   * @returns {Array}
   */
  smoothVelocities(velocities, amount) {
    if (amount === 0) return velocities;
    
    const smoothed = [...velocities];
    const window = 3; // Smoothing window
    
    for (let i = 1; i < smoothed.length - 1; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - window); j <= Math.min(smoothed.length - 1, i + window); j++) {
        sum += velocities[j];
        count++;
      }
      
      const avg = sum / count;
      smoothed[i] = velocities[i] * (1 - amount) + avg * amount;
    }
    
    return smoothed;
  }

  /**
   * Get seeded random
   * @returns {number}
   */
  getSeededRandom() {
    this.randomIndex++;
    const x = Math.sin(this.randomSeed + this.randomIndex) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Create velocity curve preset
   * @param {string} type 
   * @param {number} length 
   * @returns {Array}
   */
  createVelocityCurve(type, length) {
    const curve = [];
    
    for (let i = 0; i < length; i++) {
      const position = i / (length - 1);
      let velocity = this.baseVelocity;
      
      switch (type) {
        case 'crescendo':
          velocity = 0.4 + 0.5 * position;
          break;
          
        case 'diminuendo':
          velocity = 0.9 - 0.5 * position;
          break;
          
        case 'swell':
          velocity = 0.4 + 0.5 * Math.sin(position * Math.PI);
          break;
          
        case 'wave':
          velocity = 0.6 + 0.3 * Math.sin(position * Math.PI * 2);
          break;
          
        case 'accent-pattern':
          const beat = (i % 4);
          velocity = beat === 0 ? 0.8 : 0.6;
          break;
      }
      
      curve.push(velocity);
    }
    
    return curve;
  }

  /**
   * Reset generator
   */
  reset() {
    this.velocityHistory = [];
    this.randomIndex = 0;
    this.randomSeed = Date.now();
  }
}

// Create singleton instance
export const velocityPatternGenerator = new VelocityPatternGenerator();