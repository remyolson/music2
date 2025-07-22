import * as Tone from 'tone';
import { state } from '../../state.js';

/**
 * MicroGroove - Advanced micro-timing and groove generation
 * Creates subtle timing variations for different musical styles
 */
export class MicroGroove {
  constructor() {
    // Groove settings
    this.enabled = true;
    this.intensity = 0.5; // 0-1, overall groove intensity
    this.style = 'straight'; // Current groove style
    
    // Groove templates
    this.grooveTemplates = new Map();
    this.initializeGrooveTemplates();
    
    // Subdivision feel
    this.subdivisionFeel = {
      straight: 0,      // No swing
      shuffle: 0.67,    // Triplet feel
      dotted: 0.75,     // Dotted eighth feel
      swing: 0.6,       // Light swing
      heavySwing: 0.75  // Heavy swing
    };
    
    // Micro-timing adjustments (in seconds)
    this.microAdjustments = {
      snare: {
        backbeat: 0.008,      // Snare slightly behind
        ghostNotes: -0.003,   // Ghosts slightly ahead
        fills: -0.005         // Fills rush slightly
      },
      hihat: {
        open: 0.005,          // Open hats drag
        closed: -0.002,       // Closed hats push
        foot: 0.003           // Foot hat slightly late
      },
      kick: {
        downbeat: -0.002,     // Kick pushes beat
        syncopated: 0.004,    // Syncopation drags
        double: -0.003        // Double kicks rush
      },
      bass: {
        root: 0.005,          // Root notes drag slightly
        passing: -0.003,      // Passing notes push
        octave: 0.002         // Octave jumps drag
      },
      keys: {
        chord: 0.003,         // Chords slightly behind
        melody: -0.002,       // Melody slightly ahead
        comping: 0.005        // Comping behind beat
      }
    };
    
    // Genre-specific feels
    this.genreFeels = new Map();
    this.initializeGenreFeels();
    
    // Humanization patterns
    this.humanPatterns = {
      drummer: {
        consistency: 0.85,    // How consistent the pattern is
        flam: 0.015,         // Flam spread
        rushFills: true,     // Rush during fills
        dragBreakdown: true  // Drag during breakdowns
      },
      bassist: {
        pocketDepth: 0.008,  // How far behind to sit
        noteLength: 0.95,    // Slightly shorter notes
        slideTime: 0.02,     // Time for slides
        mutePrecision: 0.9   // Muting precision
      },
      guitarist: {
        strumSpread: 0.025,  // Strum timing spread
        upstrokeRush: -0.003,// Upstrokes slightly early
        chordChange: 0.01,   // Delay on chord changes
        palmMuteTight: 0.95  // Palm mute tightness
      }
    };
    
    // Pattern memory for consistency
    this.patternMemory = new Map();
    this.memoryLength = 16; // bars
    
    // Tempo-dependent adjustments
    this.tempoAdjustments = {
      slow: { factor: 1.2, threshold: 80 },      // More variation at slow tempos
      medium: { factor: 1.0, threshold: 120 },    // Normal variation
      fast: { factor: 0.7, threshold: 160 },      // Less variation at fast tempos
      veryFast: { factor: 0.5, threshold: 200 }   // Minimal variation when very fast
    };
  }

  /**
   * Initialize groove templates
   */
  initializeGrooveTemplates() {
    // Straight 8ths (no swing)
    this.grooveTemplates.set('straight', {
      subdivisions: [0, 0, 0, 0], // No timing adjustments
      velocities: [1, 0.7, 0.8, 0.7],
      consistency: 1.0
    });
    
    // Jazz swing
    this.grooveTemplates.set('jazz-swing', {
      subdivisions: [0, 0.04, 0, 0.04], // Delay 2nd and 4th 16ths
      velocities: [0.9, 0.6, 0.8, 0.65],
      consistency: 0.9
    });
    
    // Funk pocket
    this.grooveTemplates.set('funk', {
      subdivisions: [0, -0.002, 0.003, -0.001],
      velocities: [1, 0.6, 0.9, 0.7],
      consistency: 0.95,
      ghostNotes: true
    });
    
    // Reggae feel
    this.grooveTemplates.set('reggae', {
      subdivisions: [0.002, 0, -0.003, 0.001],
      velocities: [0.7, 0.9, 0.6, 0.8],
      consistency: 0.9,
      emphasis: 'offbeat'
    });
    
    // Hip-hop groove
    this.grooveTemplates.set('hip-hop', {
      subdivisions: [0, 0.006, -0.002, 0.004],
      velocities: [1, 0.5, 0.8, 0.6],
      consistency: 0.85,
      layback: 0.01
    });
    
    // Latin clave
    this.grooveTemplates.set('latin-clave', {
      subdivisions: [0, -0.002, 0.001, -0.001],
      velocities: [1, 0.7, 0.7, 0.9],
      consistency: 0.95,
      clavePattern: [1, 0, 0, 1, 0, 0, 1, 0]
    });
    
    // Shuffle
    this.grooveTemplates.set('shuffle', {
      subdivisions: [0, 0.05, 0, 0.05], // Heavy swing
      velocities: [1, 0.5, 0.8, 0.6],
      consistency: 0.9
    });
    
    // Bossa nova
    this.grooveTemplates.set('bossa', {
      subdivisions: [0, 0.002, -0.001, 0.001],
      velocities: [0.8, 0.6, 0.7, 0.65],
      consistency: 0.95,
      smooth: true
    });
  }

  /**
   * Initialize genre-specific feels
   */
  initializeGenreFeels() {
    // Jazz feel
    this.genreFeels.set('jazz', {
      swing: 0.67,
      behindBeat: 0.005,
      dynamics: 'varied',
      articulation: 'legato',
      interaction: 'conversational'
    });
    
    // Rock feel
    this.genreFeels.set('rock', {
      swing: 0,
      behindBeat: 0,
      dynamics: 'consistent',
      articulation: 'punchy',
      interaction: 'locked'
    });
    
    // R&B feel
    this.genreFeels.set('rnb', {
      swing: 0.15,
      behindBeat: 0.008,
      dynamics: 'smooth',
      articulation: 'rounded',
      interaction: 'pocket'
    });
    
    // Classical feel
    this.genreFeels.set('classical', {
      swing: 0,
      behindBeat: 0,
      dynamics: 'expressive',
      articulation: 'precise',
      interaction: 'ensemble'
    });
    
    // Electronic feel
    this.genreFeels.set('electronic', {
      swing: 0,
      behindBeat: 0,
      dynamics: 'quantized',
      articulation: 'sharp',
      interaction: 'grid'
    });
  }

  /**
   * Apply micro-groove to a note
   * @param {Object} note 
   * @param {Object} context 
   * @returns {Object} Note with groove applied
   */
  applyGroove(note, context = {}) {
    if (!this.enabled) return note;
    
    const {
      instrumentType = 'keys',
      noteType = 'chord',
      beatPosition = 0,
      subdivisionPosition = 0,
      barPosition = 0,
      tempo = 120,
      velocity = note.velocity || 0.7,
      genre = 'jazz',
      isGhost = false,
      isAccent = false
    } = context;
    
    // Start with original timing
    let timing = note.time;
    let adjustedVelocity = velocity;
    
    // Apply groove template
    const template = this.grooveTemplates.get(this.style);
    if (template) {
      timing += this.applyGrooveTemplate(template, subdivisionPosition, tempo);
      adjustedVelocity *= template.velocities[subdivisionPosition % 4];
    }
    
    // Apply micro-timing for instrument/note type
    timing += this.applyMicroTiming(instrumentType, noteType, context);
    
    // Apply genre feel
    timing += this.applyGenreFeel(genre, beatPosition);
    
    // Apply human patterns
    timing += this.applyHumanPattern(instrumentType, context);
    
    // Apply tempo adjustments
    timing = this.adjustForTempo(timing, tempo, note.time);
    
    // Special cases
    if (isGhost) {
      timing += this.microAdjustments.snare.ghostNotes;
      adjustedVelocity *= 0.3;
    }
    
    if (isAccent) {
      timing += 0.002; // Slight accent delay
      adjustedVelocity *= 1.2;
    }
    
    // Apply intensity scaling
    const timingAdjustment = (timing - note.time) * this.intensity;
    
    return {
      ...note,
      time: note.time + timingAdjustment,
      velocity: adjustedVelocity,
      grooveApplied: true,
      microTiming: timingAdjustment
    };
  }

  /**
   * Apply groove template timing
   * @param {Object} template 
   * @param {number} subdivisionPosition 
   * @param {number} tempo 
   * @returns {number} Timing adjustment
   */
  applyGrooveTemplate(template, subdivisionPosition, tempo) {
    const subIndex = Math.floor(subdivisionPosition * 4) % 4;
    let adjustment = template.subdivisions[subIndex];
    
    // Add slight randomness based on consistency
    if (template.consistency < 1) {
      const randomness = (Math.random() - 0.5) * 0.005 * (1 - template.consistency);
      adjustment += randomness;
    }
    
    // Scale with tempo
    const tempoFactor = this.getTempoFactor(tempo);
    
    return adjustment * tempoFactor;
  }

  /**
   * Apply instrument-specific micro-timing
   * @param {string} instrumentType 
   * @param {string} noteType 
   * @param {Object} context 
   * @returns {number} Timing adjustment
   */
  applyMicroTiming(instrumentType, noteType, context) {
    const timings = this.microAdjustments[instrumentType];
    if (!timings) return 0;
    
    // Get specific timing for note type
    let adjustment = timings[noteType] || 0;
    
    // Additional context-based adjustments
    switch (instrumentType) {
      case 'drums':
        if (context.isFill) adjustment = this.microAdjustments.snare.fills;
        if (context.isFlam) adjustment += 0.01; // Flam spread
        break;
        
      case 'bass':
        if (context.isSlide) adjustment += 0.005;
        if (context.isOctave) adjustment = this.microAdjustments.bass.octave;
        break;
        
      case 'guitar':
        if (context.isUpstroke) adjustment = this.humanPatterns.guitarist.upstrokeRush;
        if (context.isChordChange) adjustment += this.humanPatterns.guitarist.chordChange;
        break;
    }
    
    return adjustment;
  }

  /**
   * Apply genre-specific feel
   * @param {string} genre 
   * @param {number} beatPosition 
   * @returns {number} Timing adjustment
   */
  applyGenreFeel(genre, beatPosition) {
    const feel = this.genreFeels.get(genre);
    if (!feel) return 0;
    
    let adjustment = 0;
    
    // Behind-the-beat feel
    if (feel.behindBeat) {
      adjustment += feel.behindBeat;
      
      // Less behind on downbeats
      if (beatPosition % 1 < 0.1) {
        adjustment *= 0.5;
      }
    }
    
    // Swing feel
    if (feel.swing && this.isSwingPosition(beatPosition)) {
      adjustment += feel.swing * 0.03; // Convert swing amount to timing
    }
    
    return adjustment;
  }

  /**
   * Apply human performance patterns
   * @param {string} instrumentType 
   * @param {Object} context 
   * @returns {number} Timing adjustment
   */
  applyHumanPattern(instrumentType, context) {
    const patterns = this.humanPatterns[instrumentType];
    if (!patterns) return 0;
    
    let adjustment = 0;
    
    switch (instrumentType) {
      case 'drums':
        // Fills rush
        if (context.isFill && patterns.rushFills) {
          adjustment -= 0.005 * (1 - patterns.consistency);
        }
        // Breakdown drags
        if (context.isBreakdown && patterns.dragBreakdown) {
          adjustment += 0.008 * (1 - patterns.consistency);
        }
        break;
        
      case 'bass':
        // Pocket sitting
        adjustment += patterns.pocketDepth;
        
        // Slides take time
        if (context.isSlide) {
          adjustment += patterns.slideTime;
        }
        break;
        
      case 'guitar':
        // Strum spread
        if (context.isStrum) {
          const notePosition = context.noteIndex / context.totalNotes;
          adjustment += notePosition * patterns.strumSpread;
        }
        break;
    }
    
    // Add pattern-based consistency
    adjustment *= patterns.consistency || 1;
    
    return adjustment;
  }

  /**
   * Adjust for tempo
   * @param {number} timing 
   * @param {number} tempo 
   * @param {number} originalTime 
   * @returns {number} Adjusted timing
   */
  adjustForTempo(timing, tempo, originalTime) {
    let factor = 1;
    
    // Find appropriate tempo adjustment
    if (tempo >= this.tempoAdjustments.veryFast.threshold) {
      factor = this.tempoAdjustments.veryFast.factor;
    } else if (tempo >= this.tempoAdjustments.fast.threshold) {
      factor = this.tempoAdjustments.fast.factor;
    } else if (tempo >= this.tempoAdjustments.medium.threshold) {
      factor = this.tempoAdjustments.medium.factor;
    } else {
      factor = this.tempoAdjustments.slow.factor;
    }
    
    // Scale the adjustment
    const adjustment = timing - originalTime;
    return originalTime + (adjustment * factor);
  }

  /**
   * Check if beat position should swing
   * @param {number} beatPosition 
   * @returns {boolean}
   */
  isSwingPosition(beatPosition) {
    const sixteenthPosition = (beatPosition * 4) % 1;
    return sixteenthPosition > 0.4 && sixteenthPosition < 0.6;
  }

  /**
   * Get tempo scaling factor
   * @param {number} tempo 
   * @returns {number}
   */
  getTempoFactor(tempo) {
    // Less variation at higher tempos
    return Math.max(0.3, Math.min(1, 120 / tempo));
  }

  /**
   * Apply groove to a sequence
   * @param {Array} notes 
   * @param {Object} options 
   * @returns {Array} Grooved sequence
   */
  applyGrooveToSequence(notes, options = {}) {
    const groovedNotes = [];
    const { tempo = 120, timeSignature = [4, 4] } = options;
    
    // Group notes by their timing for chord detection
    const noteGroups = this.groupNotesByTiming(notes);
    
    // Process each note
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const group = noteGroups.get(note.time);
      
      const context = {
        ...options,
        beatPosition: this.calculateBeatPosition(note.time, tempo),
        subdivisionPosition: this.calculateSubdivisionPosition(note.time, tempo),
        barPosition: this.calculateBarPosition(note.time, tempo, timeSignature),
        isChord: group && group.length > 1,
        noteIndex: group ? group.indexOf(note) : 0,
        totalNotes: group ? group.length : 1,
        tempo
      };
      
      groovedNotes.push(this.applyGroove(note, context));
    }
    
    // Maintain pattern consistency
    return this.ensurePatternConsistency(groovedNotes);
  }

  /**
   * Group notes by timing
   * @param {Array} notes 
   * @returns {Map}
   */
  groupNotesByTiming(notes) {
    const groups = new Map();
    
    for (const note of notes) {
      const time = Math.round(note.time * 1000) / 1000; // Round to ms
      if (!groups.has(time)) {
        groups.set(time, []);
      }
      groups.get(time).push(note);
    }
    
    return groups;
  }

  /**
   * Calculate beat position
   * @param {number} time 
   * @param {number} tempo 
   * @returns {number}
   */
  calculateBeatPosition(time, tempo) {
    const beatsPerSecond = tempo / 60;
    return (time * beatsPerSecond) % 4;
  }

  /**
   * Calculate subdivision position
   * @param {number} time 
   * @param {number} tempo 
   * @returns {number}
   */
  calculateSubdivisionPosition(time, tempo) {
    const beatsPerSecond = tempo / 60;
    const beatPosition = time * beatsPerSecond;
    return (beatPosition * 4) % 1; // 16th note position
  }

  /**
   * Calculate bar position
   * @param {number} time 
   * @param {number} tempo 
   * @param {Array} timeSignature 
   * @returns {number}
   */
  calculateBarPosition(time, tempo, timeSignature) {
    const beatsPerSecond = tempo / 60;
    const beatsPerBar = timeSignature[0];
    const bars = (time * beatsPerSecond) / beatsPerBar;
    return bars % 4; // Position within 4-bar phrase
  }

  /**
   * Ensure pattern consistency
   * @param {Array} notes 
   * @returns {Array}
   */
  ensurePatternConsistency(notes) {
    // Group by similar timing patterns
    const patterns = this.detectTimingPatterns(notes);
    
    // Apply consistency to repeated patterns
    for (const pattern of patterns) {
      const avgTiming = pattern.timings.reduce((a, b) => a + b, 0) / pattern.timings.length;
      
      // Adjust similar patterns to be more consistent
      for (const index of pattern.indices) {
        const note = notes[index];
        const currentAdjustment = note.microTiming || 0;
        const targetAdjustment = avgTiming;
        
        // Blend towards average
        note.microTiming = currentAdjustment * 0.7 + targetAdjustment * 0.3;
        note.time = note.time - currentAdjustment + note.microTiming;
      }
    }
    
    return notes;
  }

  /**
   * Detect timing patterns
   * @param {Array} notes 
   * @returns {Array}
   */
  detectTimingPatterns(notes) {
    // Simple pattern detection based on beat position
    const patterns = new Map();
    
    for (let i = 0; i < notes.length; i++) {
      const beatPos = Math.round(this.calculateBeatPosition(notes[i].time, 120) * 4) / 4;
      
      if (!patterns.has(beatPos)) {
        patterns.set(beatPos, {
          indices: [],
          timings: []
        });
      }
      
      patterns.get(beatPos).indices.push(i);
      patterns.get(beatPos).timings.push(notes[i].microTiming || 0);
    }
    
    return Array.from(patterns.values());
  }

  /**
   * Create groove preset
   * @param {Object} settings 
   * @returns {Object}
   */
  createGroovePreset(settings) {
    return {
      name: settings.name,
      style: settings.style || this.style,
      intensity: settings.intensity || this.intensity,
      swing: settings.swing || 0,
      behindBeat: settings.behindBeat || 0,
      microAdjustments: { ...this.microAdjustments, ...settings.microAdjustments },
      custom: settings.custom || {}
    };
  }

  /**
   * Load groove preset
   * @param {Object} preset 
   */
  loadGroovePreset(preset) {
    this.style = preset.style;
    this.intensity = preset.intensity;
    
    if (preset.microAdjustments) {
      Object.assign(this.microAdjustments, preset.microAdjustments);
    }
    
    if (preset.custom) {
      // Apply custom settings
      Object.assign(this, preset.custom);
    }
  }

  /**
   * Get groove analysis
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzeGroove(notes) {
    const timingDeviations = notes.map(n => n.microTiming || 0);
    const velocities = notes.map(n => n.velocity || 0.7);
    
    return {
      averageTiming: timingDeviations.reduce((a, b) => a + b, 0) / timingDeviations.length,
      timingVariance: this.calculateVariance(timingDeviations),
      swingAmount: this.detectSwingAmount(notes),
      velocityPattern: this.detectVelocityPattern(velocities),
      consistency: this.calculateConsistency(timingDeviations),
      feel: this.detectGrooveFeel(notes)
    };
  }

  /**
   * Calculate variance
   * @param {Array} values 
   * @returns {number}
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Detect swing amount
   * @param {Array} notes 
   * @returns {number}
   */
  detectSwingAmount(notes) {
    // Analyze timing of off-beat notes
    let swingSum = 0;
    let swingCount = 0;
    
    for (const note of notes) {
      const beatPos = this.calculateBeatPosition(note.time, 120);
      if (this.isSwingPosition(beatPos) && note.microTiming) {
        swingSum += note.microTiming;
        swingCount++;
      }
    }
    
    return swingCount > 0 ? swingSum / swingCount / 0.03 : 0; // Normalize to 0-1
  }

  /**
   * Detect velocity pattern
   * @param {Array} velocities 
   * @returns {string}
   */
  detectVelocityPattern(velocities) {
    // Simple pattern detection
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = this.calculateVariance(velocities);
    
    if (variance < 0.05) return 'consistent';
    if (variance < 0.15) return 'moderate';
    return 'dynamic';
  }

  /**
   * Calculate timing consistency
   * @param {Array} timings 
   * @returns {number}
   */
  calculateConsistency(timings) {
    if (timings.length < 2) return 1;
    
    const variance = this.calculateVariance(timings);
    return Math.max(0, 1 - variance * 10); // Scale variance to 0-1
  }

  /**
   * Detect groove feel
   * @param {Array} notes 
   * @returns {string}
   */
  detectGrooveFeel(notes) {
    const analysis = {
      swing: this.detectSwingAmount(notes),
      behindBeat: notes.reduce((sum, n) => sum + (n.microTiming || 0), 0) / notes.length,
      consistency: this.calculateConsistency(notes.map(n => n.microTiming || 0))
    };
    
    if (analysis.swing > 0.5) return 'swung';
    if (analysis.behindBeat > 0.005) return 'laid-back';
    if (analysis.behindBeat < -0.005) return 'pushing';
    if (analysis.consistency > 0.9) return 'tight';
    
    return 'natural';
  }

  /**
   * Reset groove state
   */
  reset() {
    this.patternMemory.clear();
  }
}

// Create singleton instance
export const microGroove = new MicroGroove();