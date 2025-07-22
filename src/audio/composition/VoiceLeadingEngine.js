import * as Tone from 'tone';
import { update as updateState } from '../../state.js';

/**
 * VoiceLeadingEngine - Intelligent voice distribution and smooth voice leading
 * Analyzes chord progressions and distributes notes to minimize movement
 */
export class VoiceLeadingEngine {
  constructor() {
    // Voice ranges (MIDI note numbers)
    this.voiceRanges = {
      soprano: { min: 60, max: 81 },    // C4 to A5
      alto: { min: 53, max: 74 },       // F3 to D5
      tenor: { min: 48, max: 69 },      // C3 to A4
      bass: { min: 36, max: 60 }        // C2 to C4
    };
    
    // Current voice assignments
    this.currentVoices = {
      soprano: null,
      alto: null,
      tenor: null,
      bass: null
    };
    
    // Voice leading rules
    this.rules = {
      maxLeap: 12,                      // Maximum interval jump (octave)
      preferredLeap: 4,                 // Preferred maximum leap (major third)
      avoidParallelFifths: true,
      avoidParallelOctaves: true,
      avoidVoiceCrossing: true,
      avoidVoiceOverlap: true,
      resolveLeadingTone: true,
      resolveSeventh: true
    };
    
    // Chord analysis
    this.previousChord = null;
    this.currentKey = 'C';
    this.currentScale = 'major';
    
    // Voice leading history
    this.voiceHistory = [];
    this.maxHistorySize = 16;
  }

  /**
   * Process a chord and return optimal voice distribution
   * @param {Array} notes - Array of MIDI note numbers
   * @param {Object} options - Voice leading options
   * @returns {Object} Voice assignments
   */
  processChord(notes, options = {}) {
    const {
      forceRoot = false,
      doubleRoot = true,
      openVoicing = false,
      dropVoicing = 0,
      spread = 1.0
    } = options;
    
    // Sort notes from lowest to highest
    const sortedNotes = [...notes].sort((a, b) => a - b);
    
    // Analyze chord
    const chordAnalysis = this.analyzeChord(sortedNotes);
    
    // Get voice assignments
    let voices;
    if (this.hasCurrentVoicing()) {
      // Use voice leading from previous chord
      voices = this.calculateVoiceLeading(sortedNotes, chordAnalysis, options);
    } else {
      // Initial voicing
      voices = this.createInitialVoicing(sortedNotes, chordAnalysis, options);
    }
    
    // Apply voicing modifications
    if (openVoicing) {
      voices = this.applyOpenVoicing(voices);
    }
    
    if (dropVoicing > 0) {
      voices = this.applyDropVoicing(voices, dropVoicing);
    }
    
    if (spread !== 1.0) {
      voices = this.applySpread(voices, spread);
    }
    
    // Validate and adjust if needed
    voices = this.validateVoicing(voices, chordAnalysis);
    
    // Store for next chord
    this.updateVoiceHistory(voices);
    this.currentVoices = voices;
    this.previousChord = chordAnalysis;
    
    return voices;
  }

  /**
   * Analyze chord for type and function
   * @param {Array} notes 
   * @returns {Object} Chord analysis
   */
  analyzeChord(notes) {
    const root = notes[0];
    const intervals = notes.slice(1).map(note => (note - root) % 12);
    
    // Determine chord type
    let chordType = 'unknown';
    let quality = 'major';
    let extensions = [];
    
    // Check for common chord types
    if (this.matchesIntervals(intervals, [4, 7])) {
      chordType = 'triad';
      quality = 'major';
    } else if (this.matchesIntervals(intervals, [3, 7])) {
      chordType = 'triad';
      quality = 'minor';
    } else if (this.matchesIntervals(intervals, [3, 6])) {
      chordType = 'triad';
      quality = 'diminished';
    } else if (this.matchesIntervals(intervals, [4, 8])) {
      chordType = 'triad';
      quality = 'augmented';
    } else if (this.matchesIntervals(intervals, [4, 7, 11])) {
      chordType = 'seventh';
      quality = 'major7';
    } else if (this.matchesIntervals(intervals, [3, 7, 10])) {
      chordType = 'seventh';
      quality = 'minor7';
    } else if (this.matchesIntervals(intervals, [4, 7, 10])) {
      chordType = 'seventh';
      quality = 'dominant7';
    }
    
    // Check for extensions
    if (intervals.includes(2)) extensions.push('9');
    if (intervals.includes(5)) extensions.push('11');
    if (intervals.includes(9)) extensions.push('13');
    
    // Determine function in key
    const scalePosition = this.getScalePosition(root);
    const chordFunction = this.determineChordFunction(scalePosition, quality);
    
    return {
      root,
      notes,
      intervals,
      chordType,
      quality,
      extensions,
      scalePosition,
      chordFunction,
      needsResolution: this.needsResolution(quality, chordFunction)
    };
  }

  /**
   * Calculate optimal voice leading from current voicing
   * @param {Array} targetNotes 
   * @param {Object} chordAnalysis 
   * @param {Object} options 
   * @returns {Object} Voice assignments
   */
  calculateVoiceLeading(targetNotes, chordAnalysis, options) {
    const currentNotes = Object.values(this.currentVoices).filter(n => n !== null);
    
    // Generate all possible voice assignments
    const possibilities = this.generateVoiceAssignments(targetNotes, options);
    
    // Score each possibility
    const scored = possibilities.map(assignment => ({
      assignment,
      score: this.scoreVoiceLeading(assignment, chordAnalysis)
    }));
    
    // Sort by score (lower is better)
    scored.sort((a, b) => a.score - b.score);
    
    // Return best assignment
    return scored[0].assignment;
  }

  /**
   * Generate all possible voice assignments
   * @param {Array} notes 
   * @param {Object} options 
   * @returns {Array} Possible assignments
   */
  generateVoiceAssignments(notes, options) {
    const assignments = [];
    const voices = ['soprano', 'alto', 'tenor', 'bass'];
    
    // Handle different chord sizes
    if (notes.length === 3) {
      // Triad - need to double one note
      for (let i = 0; i < notes.length; i++) {
        const doubled = [...notes];
        doubled.splice(i, 0, notes[i]); // Double this note
        
        // Generate permutations
        this.permuteVoices(doubled, voices, assignments);
      }
    } else if (notes.length === 4) {
      // Four notes - direct assignment
      this.permuteVoices(notes, voices, assignments);
    } else if (notes.length < 3) {
      // Too few notes - double/triple as needed
      const expanded = this.expandNotes(notes, 4);
      this.permuteVoices(expanded, voices, assignments);
    } else {
      // Too many notes - select best 4
      const selected = this.selectBestNotes(notes, 4, options);
      this.permuteVoices(selected, voices, assignments);
    }
    
    return assignments;
  }

  /**
   * Score a voice leading based on smoothness and rules
   * @param {Object} assignment 
   * @param {Object} chordAnalysis 
   * @returns {number} Score (lower is better)
   */
  scoreVoiceLeading(assignment, chordAnalysis) {
    let score = 0;
    
    // Calculate total movement
    for (const voice in assignment) {
      const current = this.currentVoices[voice];
      const target = assignment[voice];
      
      if (current !== null && target !== null) {
        const movement = Math.abs(target - current);
        
        // Penalize large leaps
        if (movement > this.rules.maxLeap) {
          score += 100;
        } else if (movement > this.rules.preferredLeap) {
          score += movement * 2;
        } else {
          score += movement;
        }
        
        // Bonus for common tones
        if (movement === 0) {
          score -= 5;
        }
      }
    }
    
    // Check voice leading rules
    if (this.rules.avoidParallelFifths && this.hasParallelFifths(assignment)) {
      score += 50;
    }
    
    if (this.rules.avoidParallelOctaves && this.hasParallelOctaves(assignment)) {
      score += 50;
    }
    
    if (this.rules.avoidVoiceCrossing && this.hasVoiceCrossing(assignment)) {
      score += 30;
    }
    
    if (this.rules.avoidVoiceOverlap && this.hasVoiceOverlap(assignment)) {
      score += 20;
    }
    
    // Check resolution rules
    if (this.rules.resolveLeadingTone && !this.resolvesLeadingTone(assignment, chordAnalysis)) {
      score += 25;
    }
    
    if (this.rules.resolveSeventh && !this.resolvesSeventh(assignment, chordAnalysis)) {
      score += 25;
    }
    
    // Prefer assignments within comfortable ranges
    score += this.scoreRangeComfort(assignment);
    
    return score;
  }

  /**
   * Check for parallel fifths
   * @param {Object} assignment 
   * @returns {boolean}
   */
  hasParallelFifths(assignment) {
    const voices = ['soprano', 'alto', 'tenor', 'bass'];
    
    for (let i = 0; i < voices.length - 1; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const voice1 = voices[i];
        const voice2 = voices[j];
        
        const current1 = this.currentVoices[voice1];
        const current2 = this.currentVoices[voice2];
        const new1 = assignment[voice1];
        const new2 = assignment[voice2];
        
        if (current1 && current2 && new1 && new2) {
          const currentInterval = (current2 - current1) % 12;
          const newInterval = (new2 - new1) % 12;
          
          // Perfect fifth = 7 semitones
          if (currentInterval === 7 && newInterval === 7) {
            // Check if both voices move in same direction
            if ((new1 - current1) * (new2 - current2) > 0) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check for parallel octaves
   * @param {Object} assignment 
   * @returns {boolean}
   */
  hasParallelOctaves(assignment) {
    const voices = ['soprano', 'alto', 'tenor', 'bass'];
    
    for (let i = 0; i < voices.length - 1; i++) {
      for (let j = i + 1; j < voices.length; j++) {
        const voice1 = voices[i];
        const voice2 = voices[j];
        
        const current1 = this.currentVoices[voice1];
        const current2 = this.currentVoices[voice2];
        const new1 = assignment[voice1];
        const new2 = assignment[voice2];
        
        if (current1 && current2 && new1 && new2) {
          const currentInterval = Math.abs(current2 - current1) % 12;
          const newInterval = Math.abs(new2 - new1) % 12;
          
          // Octave = 0 semitones (mod 12)
          if (currentInterval === 0 && newInterval === 0) {
            // Check if both voices move in same direction
            if ((new1 - current1) * (new2 - current2) > 0) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check for voice crossing
   * @param {Object} assignment 
   * @returns {boolean}
   */
  hasVoiceCrossing(assignment) {
    return assignment.soprano < assignment.alto ||
           assignment.alto < assignment.tenor ||
           assignment.tenor < assignment.bass;
  }

  /**
   * Check for voice overlap with previous chord
   * @param {Object} assignment 
   * @returns {boolean}
   */
  hasVoiceOverlap(assignment) {
    if (!this.hasCurrentVoicing()) return false;
    
    return (this.currentVoices.soprano && assignment.alto > this.currentVoices.soprano) ||
           (this.currentVoices.alto && assignment.tenor > this.currentVoices.alto) ||
           (this.currentVoices.tenor && assignment.bass > this.currentVoices.tenor);
  }

  /**
   * Create initial voicing for first chord
   * @param {Array} notes 
   * @param {Object} chordAnalysis 
   * @param {Object} options 
   * @returns {Object}
   */
  createInitialVoicing(notes, chordAnalysis, options) {
    const voices = {
      soprano: null,
      alto: null,
      tenor: null,
      bass: null
    };
    
    // Assign bass note (usually root)
    voices.bass = options.forceRoot ? chordAnalysis.root : notes[0];
    
    // Distribute remaining notes
    if (notes.length === 3) {
      // Triad - double the root
      voices.tenor = notes[0] + 12; // Root up an octave
      voices.alto = notes[1] + 12;
      voices.soprano = notes[2] + 12;
    } else if (notes.length === 4) {
      // Seventh chord
      voices.tenor = notes[1];
      voices.alto = notes[2];
      voices.soprano = notes[3];
    } else {
      // Adapt as needed
      const upperNotes = notes.slice(1).map(n => {
        // Move to appropriate octave
        while (n < 48) n += 12;
        while (n > 72) n -= 12;
        return n;
      });
      
      upperNotes.sort((a, b) => a - b);
      
      if (upperNotes[0]) voices.tenor = upperNotes[0];
      if (upperNotes[1]) voices.alto = upperNotes[1];
      if (upperNotes[2]) voices.soprano = upperNotes[2];
    }
    
    // Adjust to fit ranges
    for (const voice in voices) {
      if (voices[voice] !== null) {
        const range = this.voiceRanges[voice];
        while (voices[voice] < range.min) voices[voice] += 12;
        while (voices[voice] > range.max) voices[voice] -= 12;
      }
    }
    
    return voices;
  }

  /**
   * Apply open voicing (wider intervals)
   * @param {Object} voices 
   * @returns {Object}
   */
  applyOpenVoicing(voices) {
    const openVoices = { ...voices };
    
    // Move alto down an octave if possible
    if (openVoices.alto && openVoices.alto - 12 >= this.voiceRanges.alto.min) {
      openVoices.alto -= 12;
    }
    
    // Spread tenor and alto
    if (openVoices.tenor && openVoices.alto && 
        openVoices.alto - openVoices.tenor < 7) {
      if (openVoices.tenor - 3 >= this.voiceRanges.tenor.min) {
        openVoices.tenor -= 3;
      }
    }
    
    return openVoices;
  }

  /**
   * Apply drop voicing (drop 2, drop 3, etc.)
   * @param {Object} voices 
   * @param {number} drop 
   * @returns {Object}
   */
  applyDropVoicing(voices, drop) {
    const dropVoices = { ...voices };
    const voiceArray = ['soprano', 'alto', 'tenor', 'bass'];
    
    // Get notes in order
    const notes = voiceArray
      .map(v => dropVoices[v])
      .filter(n => n !== null)
      .sort((a, b) => b - a); // High to low
    
    if (drop === 2 && notes.length >= 2) {
      // Drop the second highest note down an octave
      const secondHighest = notes[1];
      const droppedNote = secondHighest - 12;
      
      // Find which voice has this note and reassign
      for (const voice of voiceArray) {
        if (dropVoices[voice] === secondHighest) {
          const range = this.voiceRanges[voice];
          if (droppedNote >= range.min) {
            dropVoices[voice] = droppedNote;
          }
          break;
        }
      }
    }
    
    return dropVoices;
  }

  /**
   * Apply spread factor to voicing
   * @param {Object} voices 
   * @param {number} spread 
   * @returns {Object}
   */
  applySpread(voices, spread) {
    const spreadVoices = { ...voices };
    const center = (voices.soprano + voices.bass) / 2;
    
    for (const voice in spreadVoices) {
      if (spreadVoices[voice] !== null) {
        const distance = spreadVoices[voice] - center;
        const newNote = center + (distance * spread);
        const range = this.voiceRanges[voice];
        
        // Keep within range
        if (newNote >= range.min && newNote <= range.max) {
          spreadVoices[voice] = Math.round(newNote);
        }
      }
    }
    
    return spreadVoices;
  }

  /**
   * Validate and adjust voicing if needed
   * @param {Object} voices 
   * @param {Object} chordAnalysis 
   * @returns {Object}
   */
  validateVoicing(voices, chordAnalysis) {
    const validated = { ...voices };
    
    // Ensure all required chord tones are present
    const presentNotes = Object.values(validated)
      .filter(n => n !== null)
      .map(n => n % 12);
    
    const requiredIntervals = chordAnalysis.intervals;
    for (const interval of requiredIntervals) {
      if (!presentNotes.includes((chordAnalysis.root + interval) % 12)) {
        // Try to add missing note
        console.warn(`Missing chord tone with interval ${interval}`);
      }
    }
    
    return validated;
  }

  /**
   * Score range comfort for voices
   * @param {Object} assignment 
   * @returns {number}
   */
  scoreRangeComfort(assignment) {
    let score = 0;
    
    for (const voice in assignment) {
      const note = assignment[voice];
      if (note === null) continue;
      
      const range = this.voiceRanges[voice];
      const middle = (range.min + range.max) / 2;
      const comfort = range.max - range.min;
      
      // Prefer middle of range
      const distance = Math.abs(note - middle);
      score += (distance / comfort) * 10;
    }
    
    return score;
  }

  /**
   * Generate voice permutations
   * @param {Array} notes 
   * @param {Array} voices 
   * @param {Array} results 
   */
  permuteVoices(notes, voices, results) {
    // Simple assignment for now - can be made more sophisticated
    if (notes.length === 4) {
      results.push({
        bass: notes[0],
        tenor: notes[1],
        alto: notes[2],
        soprano: notes[3]
      });
      
      // Add some variations
      results.push({
        bass: notes[0],
        tenor: notes[2],
        alto: notes[1],
        soprano: notes[3]
      });
    }
  }

  /**
   * Check if we have a current voicing
   * @returns {boolean}
   */
  hasCurrentVoicing() {
    return Object.values(this.currentVoices).some(v => v !== null);
  }

  /**
   * Update voice history
   * @param {Object} voices 
   */
  updateVoiceHistory(voices) {
    this.voiceHistory.push({
      voices: { ...voices },
      timestamp: Date.now()
    });
    
    if (this.voiceHistory.length > this.maxHistorySize) {
      this.voiceHistory.shift();
    }
  }

  /**
   * Helper methods
   */
  matchesIntervals(intervals, pattern) {
    if (intervals.length !== pattern.length) return false;
    return pattern.every(interval => intervals.includes(interval));
  }

  getScalePosition(note) {
    const scaleNotes = this.getScaleNotes(this.currentKey, this.currentScale);
    const noteClass = note % 12;
    return scaleNotes.indexOf(noteClass) + 1; // 1-based
  }

  getScaleNotes(key, scale) {
    const keyNote = Tone.Frequency(key).toMidi() % 12;
    const intervals = scale === 'major' ? 
      [0, 2, 4, 5, 7, 9, 11] : // Major scale
      [0, 2, 3, 5, 7, 8, 10];  // Natural minor
    
    return intervals.map(i => (keyNote + i) % 12);
  }

  determineChordFunction(position, quality) {
    // Simplified - could be much more sophisticated
    const functions = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    return position > 0 ? functions[position - 1] : 'N/A';
  }

  needsResolution(quality, chordFunction) {
    return quality.includes('7') || 
           quality === 'diminished' ||
           chordFunction === 'V' ||
           chordFunction === 'vii°';
  }

  resolvesLeadingTone(assignment, chordAnalysis) {
    // Check if leading tone resolves to tonic
    // Simplified implementation
    return true;
  }

  resolvesSeventh(assignment, chordAnalysis) {
    // Check if seventh resolves down by step
    // Simplified implementation
    return true;
  }

  expandNotes(notes, targetCount) {
    const expanded = [...notes];
    while (expanded.length < targetCount) {
      expanded.push(notes[0] + 12); // Add octave
    }
    return expanded;
  }

  selectBestNotes(notes, count, options) {
    // Select most important notes
    // For now, just take first ones
    return notes.slice(0, count);
  }

  /**
   * Set current key and scale
   * @param {string} key 
   * @param {string} scale 
   */
  setKey(key, scale = 'major') {
    this.currentKey = key;
    this.currentScale = scale;
  }

  /**
   * Reset voice leading
   */
  reset() {
    this.currentVoices = {
      soprano: null,
      alto: null,
      tenor: null,
      bass: null
    };
    this.previousChord = null;
    this.voiceHistory = [];
  }

  /**
   * Get voice leading suggestions for next chord
   * @param {Array} currentChord 
   * @param {Array} possibleChords 
   * @returns {Array} Suggestions
   */
  getSuggestions(currentChord, possibleChords) {
    const suggestions = [];
    
    // Process current chord first
    this.processChord(currentChord);
    
    // Try each possible next chord
    for (const chord of possibleChords) {
      const voices = this.processChord(chord);
      const movement = this.calculateTotalMovement(voices);
      
      suggestions.push({
        chord,
        voices,
        movement,
        smoothness: 100 - movement // Higher is smoother
      });
    }
    
    // Sort by smoothness
    suggestions.sort((a, b) => b.smoothness - a.smoothness);
    
    // Reset to current state
    this.processChord(currentChord);
    
    return suggestions;
  }

  /**
   * Calculate total movement between current and target voices
   * @param {Object} targetVoices 
   * @returns {number}
   */
  calculateTotalMovement(targetVoices) {
    let total = 0;
    
    for (const voice in this.currentVoices) {
      const current = this.currentVoices[voice];
      const target = targetVoices[voice];
      
      if (current !== null && target !== null) {
        total += Math.abs(target - current);
      }
    }
    
    return total;
  }
}

// Create singleton instance
export const voiceLeadingEngine = new VoiceLeadingEngine();