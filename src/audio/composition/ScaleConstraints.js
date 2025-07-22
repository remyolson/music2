import * as Tone from 'tone';
import { update as updateState } from '../../state.js';

/**
 * ScaleConstraints - Constrains notes to selected scales and modes
 * Provides scale quantization, chord filtering, and modal suggestions
 */
export class ScaleConstraints {
  constructor() {
    // Current scale settings
    this.currentScale = 'major';
    this.currentKey = 'C';
    this.currentMode = 'ionian';
    
    // Scale definitions (intervals from root)
    this.scales = new Map();
    this.initializeScales();
    
    // Constraint settings
    this.constraintMode = 'snap'; // 'snap', 'suggest', 'filter', 'off'
    this.allowChromaticism = false;
    this.allowBlueNotes = false;
    this.strictMode = false; // Enforce scale strictly vs allow passing tones
    
    // Quantization settings
    this.quantizationStrength = 1.0; // 0-1, how strongly to pull to scale
    this.quantizationWindow = 50; // cents window for quantization
    
    // Note suggestions
    this.suggestChordTones = true;
    this.suggestTensions = true;
    this.avoidNotes = new Set(); // Notes to avoid (e.g., avoid 4th over major chord)
    
    // Scale degree tracking
    this.scaleDegrees = [];
    this.chordScales = new Map(); // Chord-specific scales
    
    // Modal interchange
    this.allowModalInterchange = true;
    this.borrowedModes = ['aeolian', 'dorian', 'mixolydian'];
  }

  /**
   * Initialize scale definitions
   */
  initializeScales() {
    // Major modes
    this.scales.set('major', [0, 2, 4, 5, 7, 9, 11]);
    this.scales.set('ionian', [0, 2, 4, 5, 7, 9, 11]);
    this.scales.set('dorian', [0, 2, 3, 5, 7, 9, 10]);
    this.scales.set('phrygian', [0, 1, 3, 5, 7, 8, 10]);
    this.scales.set('lydian', [0, 2, 4, 6, 7, 9, 11]);
    this.scales.set('mixolydian', [0, 2, 4, 5, 7, 9, 10]);
    this.scales.set('aeolian', [0, 2, 3, 5, 7, 8, 10]);
    this.scales.set('locrian', [0, 1, 3, 5, 6, 8, 10]);
    
    // Minor scales
    this.scales.set('natural_minor', [0, 2, 3, 5, 7, 8, 10]);
    this.scales.set('harmonic_minor', [0, 2, 3, 5, 7, 8, 11]);
    this.scales.set('melodic_minor', [0, 2, 3, 5, 7, 9, 11]);
    
    // Pentatonic scales
    this.scales.set('major_pentatonic', [0, 2, 4, 7, 9]);
    this.scales.set('minor_pentatonic', [0, 3, 5, 7, 10]);
    this.scales.set('blues', [0, 3, 5, 6, 7, 10]);
    
    // Symmetric scales
    this.scales.set('whole_tone', [0, 2, 4, 6, 8, 10]);
    this.scales.set('diminished', [0, 2, 3, 5, 6, 8, 9, 11]);
    this.scales.set('augmented', [0, 3, 4, 7, 8, 11]);
    
    // Jazz scales
    this.scales.set('bebop_major', [0, 2, 4, 5, 7, 8, 9, 11]);
    this.scales.set('bebop_dominant', [0, 2, 4, 5, 7, 9, 10, 11]);
    this.scales.set('bebop_minor', [0, 2, 3, 4, 5, 7, 9, 10]);
    this.scales.set('altered', [0, 1, 3, 4, 6, 8, 10]);
    
    // Exotic scales
    this.scales.set('hungarian_minor', [0, 2, 3, 6, 7, 8, 11]);
    this.scales.set('double_harmonic', [0, 1, 4, 5, 7, 8, 11]);
    this.scales.set('phrygian_dominant', [0, 1, 4, 5, 7, 8, 10]);
    this.scales.set('arabic', [0, 1, 4, 5, 7, 8, 11]);
    this.scales.set('japanese', [0, 1, 5, 7, 8]);
    this.scales.set('indian_raga', [0, 1, 4, 6, 7, 8, 11]);
    
    // Chromatic scale
    this.scales.set('chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  }

  /**
   * Set current scale and key
   * @param {string} key 
   * @param {string} scale 
   */
  setScale(key, scale = 'major') {
    this.currentKey = key;
    this.currentScale = scale;
    
    // Determine mode if scale is modal
    const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
    if (modes.includes(scale)) {
      this.currentMode = scale;
      this.currentScale = 'major'; // Base scale
    }
    
    // Update scale degrees
    this.updateScaleDegrees();
    
    // Notify state
    updateState({
      currentKey: key,
      currentScale: scale,
      scaleNotes: this.getScaleNotes()
    });
  }

  /**
   * Update scale degrees for current key/scale
   */
  updateScaleDegrees() {
    const keyRoot = Tone.Frequency(this.currentKey).toMidi() % 12;
    const scaleIntervals = this.scales.get(this.currentScale) || this.scales.get('major');
    
    this.scaleDegrees = scaleIntervals.map(interval => (keyRoot + interval) % 12);
  }

  /**
   * Get scale notes in current key
   * @param {number} octave - Optional octave (default 4)
   * @returns {Array} MIDI note numbers
   */
  getScaleNotes(octave = 4) {
    const keyRoot = Tone.Frequency(this.currentKey + octave).toMidi();
    const scaleIntervals = this.scales.get(this.currentScale) || this.scales.get('major');
    
    return scaleIntervals.map(interval => keyRoot + interval);
  }

  /**
   * Constrain a note to the current scale
   * @param {number} note - MIDI note number
   * @param {Object} options 
   * @returns {number} Constrained note
   */
  constrainNote(note, options = {}) {
    const {
      preferDirection = 0, // -1 down, 0 nearest, 1 up
      allowChromatic = this.allowChromaticism,
      chord = null
    } = options;
    
    // Check constraint mode
    if (this.constraintMode === 'off' || allowChromatic) {
      return note;
    }
    
    // Get scale notes in note's octave
    const octave = Math.floor(note / 12);
    const scaleNotes = this.getScaleNotes(octave);
    
    // Find nearest scale note
    const constrained = this.findNearestScaleNote(note, scaleNotes, preferDirection);
    
    // Apply quantization strength
    if (this.constraintMode === 'snap') {
      return constrained;
    } else if (this.constraintMode === 'suggest') {
      // Return weighted average based on strength
      const diff = constrained - note;
      return note + (diff * this.quantizationStrength);
    }
    
    return constrained;
  }

  /**
   * Find nearest scale note
   * @param {number} note 
   * @param {Array} scaleNotes 
   * @param {number} preferDirection 
   * @returns {number}
   */
  findNearestScaleNote(note, scaleNotes, preferDirection = 0) {
    let nearest = scaleNotes[0];
    let minDistance = Math.abs(note - nearest);
    
    for (const scaleNote of scaleNotes) {
      const distance = Math.abs(note - scaleNote);
      
      if (distance < minDistance) {
        nearest = scaleNote;
        minDistance = distance;
      } else if (distance === minDistance) {
        // Equal distance - use preference
        if (preferDirection > 0 && scaleNote > note) {
          nearest = scaleNote;
        } else if (preferDirection < 0 && scaleNote < note) {
          nearest = scaleNote;
        }
      }
    }
    
    // Check next octave if needed
    if (preferDirection > 0 && nearest <= note) {
      const nextOctaveNote = nearest + 12;
      if (Math.abs(nextOctaveNote - note) < 6) {
        nearest = nextOctaveNote;
      }
    } else if (preferDirection < 0 && nearest >= note) {
      const prevOctaveNote = nearest - 12;
      if (Math.abs(prevOctaveNote - note) < 6) {
        nearest = prevOctaveNote;
      }
    }
    
    return nearest;
  }

  /**
   * Constrain a chord to the scale
   * @param {Array} notes - MIDI note numbers
   * @param {Object} options 
   * @returns {Array} Constrained chord
   */
  constrainChord(notes, options = {}) {
    const {
      preserveQuality = true,
      allowSubstitutions = true
    } = options;
    
    if (this.constraintMode === 'off') {
      return notes;
    }
    
    // First try to constrain each note
    let constrained = notes.map(note => this.constrainNote(note));
    
    if (preserveQuality) {
      // Check if chord quality changed
      const originalQuality = this.analyzeChordQuality(notes);
      const constrainedQuality = this.analyzeChordQuality(constrained);
      
      if (originalQuality !== constrainedQuality && allowSubstitutions) {
        // Find substitute chord that fits scale
        constrained = this.findSubstituteChord(notes);
      }
    }
    
    return constrained;
  }

  /**
   * Analyze basic chord quality
   * @param {Array} notes 
   * @returns {string}
   */
  analyzeChordQuality(notes) {
    if (notes.length < 3) return 'interval';
    
    const sorted = [...notes].sort((a, b) => a - b);
    const root = sorted[0];
    const intervals = sorted.slice(1).map(n => (n - root) % 12);
    
    // Simple quality detection
    if (intervals.includes(4) && intervals.includes(7)) return 'major';
    if (intervals.includes(3) && intervals.includes(7)) return 'minor';
    if (intervals.includes(3) && intervals.includes(6)) return 'diminished';
    if (intervals.includes(4) && intervals.includes(8)) return 'augmented';
    
    return 'other';
  }

  /**
   * Find substitute chord that fits scale
   * @param {Array} originalNotes 
   * @returns {Array}
   */
  findSubstituteChord(originalNotes) {
    const root = originalNotes[0];
    const quality = this.analyzeChordQuality(originalNotes);
    
    // Get available chord types at this scale degree
    const scaleDegree = this.getScaleDegree(root);
    const availableChords = this.getChordsAtScaleDegree(scaleDegree);
    
    // Find closest matching chord
    for (const chordType of availableChords) {
      if (this.isCompatibleQuality(quality, chordType)) {
        return this.buildChordFromScale(root, chordType);
      }
    }
    
    // Default to triad from scale
    return this.buildChordFromScale(root, 'triad');
  }

  /**
   * Get scale degree of note
   * @param {number} note 
   * @returns {number} 1-7
   */
  getScaleDegree(note) {
    const keyRoot = Tone.Frequency(this.currentKey).toMidi() % 12;
    const pitchClass = note % 12;
    const interval = (pitchClass - keyRoot + 12) % 12;
    
    const scaleIntervals = this.scales.get(this.currentScale) || this.scales.get('major');
    const degree = scaleIntervals.indexOf(interval);
    
    return degree >= 0 ? degree + 1 : 1;
  }

  /**
   * Get available chords at scale degree
   * @param {number} degree 
   * @returns {Array}
   */
  getChordsAtScaleDegree(degree) {
    // Chord qualities typically available at each degree (major scale)
    const degreeChords = {
      1: ['major', 'maj7', 'maj9', '6', '6/9'],
      2: ['minor', 'm7', 'm9', 'm11'],
      3: ['minor', 'm7'],
      4: ['major', 'maj7', 'maj7#11'],
      5: ['major', '7', '9', '13', 'sus4'],
      6: ['minor', 'm7', 'm9'],
      7: ['diminished', 'm7b5']
    };
    
    return degreeChords[degree] || ['major', 'minor'];
  }

  /**
   * Check if qualities are compatible
   * @param {string} original 
   * @param {string} substitute 
   * @returns {boolean}
   */
  isCompatibleQuality(original, substitute) {
    const compatibility = {
      'major': ['major', 'maj7', '6', 'sus4'],
      'minor': ['minor', 'm7', 'm9', 'sus2'],
      'diminished': ['diminished', 'm7b5'],
      'augmented': ['augmented', 'maj7#5']
    };
    
    return compatibility[original]?.includes(substitute) || false;
  }

  /**
   * Build chord from scale degrees
   * @param {number} root 
   * @param {string} chordType 
   * @returns {Array}
   */
  buildChordFromScale(root, chordType = 'triad') {
    const scaleNotes = this.getScaleNotes(Math.floor(root / 12));
    const rootIndex = scaleNotes.indexOf(root);
    
    if (rootIndex === -1) {
      // Root not in scale, return original
      return [root];
    }
    
    const chord = [root];
    
    // Build chord using scale degrees
    switch (chordType) {
      case 'triad':
      case 'major':
      case 'minor':
        chord.push(scaleNotes[(rootIndex + 2) % scaleNotes.length]);
        chord.push(scaleNotes[(rootIndex + 4) % scaleNotes.length]);
        break;
        
      case 'maj7':
      case 'm7':
      case '7':
        chord.push(scaleNotes[(rootIndex + 2) % scaleNotes.length]);
        chord.push(scaleNotes[(rootIndex + 4) % scaleNotes.length]);
        chord.push(scaleNotes[(rootIndex + 6) % scaleNotes.length]);
        break;
        
      case 'sus4':
        chord.push(scaleNotes[(rootIndex + 3) % scaleNotes.length]);
        chord.push(scaleNotes[(rootIndex + 4) % scaleNotes.length]);
        break;
        
      case 'sus2':
        chord.push(scaleNotes[(rootIndex + 1) % scaleNotes.length]);
        chord.push(scaleNotes[(rootIndex + 4) % scaleNotes.length]);
        break;
    }
    
    return chord;
  }

  /**
   * Get note suggestions for current context
   * @param {Object} context - { currentChord, previousNotes, direction }
   * @returns {Array} Suggested notes with weights
   */
  getNoteSuggestions(context = {}) {
    const {
      currentChord = null,
      previousNotes = [],
      direction = 0,
      octaveRange = [48, 72] // C3 to C5
    } = context;
    
    const suggestions = [];
    
    // Get scale notes in range
    const startOctave = Math.floor(octaveRange[0] / 12);
    const endOctave = Math.floor(octaveRange[1] / 12);
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      const scaleNotes = this.getScaleNotes(octave);
      
      for (const note of scaleNotes) {
        if (note >= octaveRange[0] && note <= octaveRange[1]) {
          const weight = this.calculateNoteWeight(note, context);
          suggestions.push({ note, weight });
        }
      }
    }
    
    // Add chromatic passing tones if allowed
    if (this.allowChromaticism) {
      this.addChromaticSuggestions(suggestions, context);
    }
    
    // Add blue notes if allowed
    if (this.allowBlueNotes) {
      this.addBlueNoteSuggestions(suggestions, context);
    }
    
    // Sort by weight
    suggestions.sort((a, b) => b.weight - a.weight);
    
    return suggestions;
  }

  /**
   * Calculate weight for a note suggestion
   * @param {number} note 
   * @param {Object} context 
   * @returns {number} 0-1
   */
  calculateNoteWeight(note, context) {
    let weight = 0.5; // Base weight for scale notes
    
    // Chord tone bonus
    if (context.currentChord && this.isChordTone(note, context.currentChord)) {
      weight += 0.3;
    }
    
    // Smooth voice leading bonus
    if (context.previousNotes.length > 0) {
      const lastNote = context.previousNotes[context.previousNotes.length - 1];
      const interval = Math.abs(note - lastNote);
      
      if (interval <= 2) {
        weight += 0.2; // Stepwise motion
      } else if (interval <= 4) {
        weight += 0.1; // Small leap
      } else if (interval > 7) {
        weight -= 0.1; // Large leap penalty
      }
    }
    
    // Direction preference
    if (context.direction !== 0 && context.previousNotes.length > 0) {
      const lastNote = context.previousNotes[context.previousNotes.length - 1];
      if ((context.direction > 0 && note > lastNote) ||
          (context.direction < 0 && note < lastNote)) {
        weight += 0.1;
      }
    }
    
    // Avoid notes penalty
    if (this.avoidNotes.has(note % 12)) {
      weight -= 0.3;
    }
    
    // Important scale degrees
    const scaleDegree = this.getScaleDegree(note);
    if ([1, 5].includes(scaleDegree)) {
      weight += 0.1; // Root and fifth
    } else if ([3, 7].includes(scaleDegree)) {
      weight += 0.05; // Third and seventh
    }
    
    return Math.max(0, Math.min(1, weight));
  }

  /**
   * Check if note is chord tone
   * @param {number} note 
   * @param {Array} chord 
   * @returns {boolean}
   */
  isChordTone(note, chord) {
    const pitchClass = note % 12;
    return chord.some(chordNote => chordNote % 12 === pitchClass);
  }

  /**
   * Add chromatic passing tone suggestions
   * @param {Array} suggestions 
   * @param {Object} context 
   */
  addChromaticSuggestions(suggestions, context) {
    if (context.previousNotes.length === 0) return;
    
    const lastNote = context.previousNotes[context.previousNotes.length - 1];
    
    // Find scale notes around last note
    const scaleNotes = suggestions.map(s => s.note);
    const nextScaleNote = scaleNotes.find(n => n > lastNote);
    const prevScaleNote = [...scaleNotes].reverse().find(n => n < lastNote);
    
    // Add chromatic passing tones
    if (nextScaleNote && nextScaleNote - lastNote === 2) {
      suggestions.push({
        note: lastNote + 1,
        weight: 0.3 // Lower weight for chromatic notes
      });
    }
    
    if (prevScaleNote && lastNote - prevScaleNote === 2) {
      suggestions.push({
        note: lastNote - 1,
        weight: 0.3
      });
    }
  }

  /**
   * Add blue note suggestions
   * @param {Array} suggestions 
   * @param {Object} context 
   */
  addBlueNoteSuggestions(suggestions, context) {
    const keyRoot = Tone.Frequency(this.currentKey).toMidi() % 12;
    
    // Common blue notes
    const blueNotes = [
      (keyRoot + 3) % 12,  // b3
      (keyRoot + 6) % 12,  // b5
      (keyRoot + 10) % 12  // b7
    ];
    
    // Add blue notes in appropriate octaves
    const octaveRange = context.octaveRange || [48, 72];
    const startOctave = Math.floor(octaveRange[0] / 12);
    const endOctave = Math.floor(octaveRange[1] / 12);
    
    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (const blueNote of blueNotes) {
        const note = octave * 12 + blueNote;
        if (note >= octaveRange[0] && note <= octaveRange[1]) {
          // Check if not already in suggestions
          if (!suggestions.some(s => s.note === note)) {
            suggestions.push({
              note,
              weight: 0.4 // Medium weight for blue notes
            });
          }
        }
      }
    }
  }

  /**
   * Get chord scale for specific chord
   * @param {string} chordSymbol 
   * @returns {string} Recommended scale
   */
  getChordScale(chordSymbol) {
    // Parse chord type
    const chordType = this.parseChordType(chordSymbol);
    
    // Chord-scale relationships
    const chordScales = {
      'maj7': 'ionian',
      'maj7#11': 'lydian',
      '7': 'mixolydian',
      '7#11': 'lydian_dominant',
      '7alt': 'altered',
      'm7': 'dorian',
      'm7b5': 'locrian',
      'dim7': 'diminished',
      'm(maj7)': 'melodic_minor',
      'sus4': 'mixolydian'
    };
    
    return chordScales[chordType] || this.currentScale;
  }

  /**
   * Parse chord type from symbol
   * @param {string} symbol 
   * @returns {string}
   */
  parseChordType(symbol) {
    // Remove root note
    const typeMatch = symbol.match(/[A-G][#b]?(.+)/);
    return typeMatch ? typeMatch[1] : 'major';
  }

  /**
   * Set avoid notes for current context
   * @param {Array} notes - Pitch classes to avoid
   */
  setAvoidNotes(notes) {
    this.avoidNotes = new Set(notes);
  }

  /**
   * Get scale tones that work over a chord
   * @param {Array} chord 
   * @returns {Array}
   */
  getScaleTonesForChord(chord) {
    const chordPitchClasses = chord.map(n => n % 12);
    const scaleTones = [];
    
    for (const scaleDegree of this.scaleDegrees) {
      let weight = 0.5; // Base weight
      
      if (chordPitchClasses.includes(scaleDegree)) {
        weight = 1.0; // Chord tone
      } else {
        // Check if it's a good tension
        const tensions = this.getChordTensions(chord[0], scaleDegree);
        if (tensions.includes('9') || tensions.includes('11') || tensions.includes('13')) {
          weight = 0.7;
        } else if (tensions.includes('b9') || tensions.includes('#11')) {
          weight = 0.3; // Altered tensions
        }
      }
      
      scaleTones.push({ pitchClass: scaleDegree, weight });
    }
    
    return scaleTones;
  }

  /**
   * Get chord tensions
   * @param {number} root 
   * @param {number} note 
   * @returns {Array}
   */
  getChordTensions(root, note) {
    const interval = (note - root % 12 + 12) % 12;
    const tensions = [];
    
    switch (interval) {
      case 1: tensions.push('b9'); break;
      case 2: tensions.push('9'); break;
      case 3: tensions.push('#9'); break;
      case 5: tensions.push('11'); break;
      case 6: tensions.push('#11'); break;
      case 9: tensions.push('13'); break;
      case 10: tensions.push('b13'); break;
    }
    
    return tensions;
  }

  /**
   * Validate if a melody fits the scale
   * @param {Array} notes 
   * @returns {Object} Validation result
   */
  validateMelody(notes) {
    const result = {
      isValid: true,
      outOfScaleNotes: [],
      suggestions: []
    };
    
    for (const note of notes) {
      const pitchClass = note % 12;
      
      if (!this.scaleDegrees.includes(pitchClass)) {
        result.outOfScaleNotes.push(note);
        
        // Check if it's an acceptable chromatic note
        const isAcceptable = this.isAcceptableChromaticNote(note, notes);
        
        if (!isAcceptable && this.strictMode) {
          result.isValid = false;
        }
        
        // Add suggestion
        const constrained = this.constrainNote(note);
        result.suggestions.push({
          original: note,
          suggested: constrained,
          reason: isAcceptable ? 'chromatic_passing' : 'out_of_scale'
        });
      }
    }
    
    return result;
  }

  /**
   * Check if chromatic note is acceptable
   * @param {number} note 
   * @param {Array} melody 
   * @returns {boolean}
   */
  isAcceptableChromaticNote(note, melody) {
    const index = melody.indexOf(note);
    if (index === -1) return false;
    
    // Check if it's a passing tone
    if (index > 0 && index < melody.length - 1) {
      const prev = melody[index - 1];
      const next = melody[index + 1];
      
      // Chromatic passing tone
      if (Math.abs(next - prev) === 2 && Math.abs(note - prev) === 1) {
        return true;
      }
    }
    
    // Check if it's a chromatic approach note
    if (index < melody.length - 1) {
      const next = melody[index + 1];
      if (Math.abs(next - note) === 1 && this.scaleDegrees.includes(next % 12)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate scale exercise
   * @param {Object} options 
   * @returns {Array} Exercise notes
   */
  generateScaleExercise(options = {}) {
    const {
      pattern = 'ascending',
      octaves = 1,
      startOctave = 4,
      rhythm = 'eighth'
    } = options;
    
    const exercise = [];
    const scaleNotes = this.getScaleNotes(startOctave);
    
    switch (pattern) {
      case 'ascending':
        for (let oct = 0; oct < octaves; oct++) {
          for (const note of scaleNotes) {
            exercise.push({
              note: note + (oct * 12),
              duration: rhythm,
              time: exercise.length * 0.5
            });
          }
        }
        break;
        
      case 'descending':
        for (let oct = octaves - 1; oct >= 0; oct--) {
          for (let i = scaleNotes.length - 1; i >= 0; i--) {
            exercise.push({
              note: scaleNotes[i] + (oct * 12),
              duration: rhythm,
              time: exercise.length * 0.5
            });
          }
        }
        break;
        
      case 'thirds':
        for (let i = 0; i < scaleNotes.length - 2; i++) {
          exercise.push({
            note: scaleNotes[i],
            duration: rhythm,
            time: exercise.length * 0.5
          });
          exercise.push({
            note: scaleNotes[i + 2],
            duration: rhythm,
            time: exercise.length * 0.5
          });
        }
        break;
        
      case 'triads':
        for (let i = 0; i < scaleNotes.length - 4; i++) {
          exercise.push(...[
            { note: scaleNotes[i], duration: rhythm, time: exercise.length * 0.5 },
            { note: scaleNotes[i + 2], duration: rhythm, time: exercise.length * 0.5 },
            { note: scaleNotes[i + 4], duration: rhythm, time: exercise.length * 0.5 }
          ]);
        }
        break;
    }
    
    return exercise;
  }

  /**
   * Get parallel modes for modal interchange
   * @returns {Array}
   */
  getParallelModes() {
    const modes = [];
    const keyRoot = Tone.Frequency(this.currentKey).toMidi() % 12;
    
    for (const modeName of this.borrowedModes) {
      const modeIntervals = this.scales.get(modeName);
      if (modeIntervals) {
        modes.push({
          name: modeName,
          notes: modeIntervals.map(i => (keyRoot + i) % 12),
          chords: this.getModeChordsChords(modeName)
        });
      }
    }
    
    return modes;
  }

  /**
   * Get common chords for a mode
   * @param {string} mode 
   * @returns {Array}
   */
  getModeChordsChords(mode) {
    const modeChords = {
      'ionian': ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
      'dorian': ['i', 'ii', 'bIII', 'IV', 'v', 'vi°', 'bVII'],
      'phrygian': ['i', 'bII', 'bIII', 'iv', 'v°', 'bVI', 'bvii'],
      'lydian': ['I', 'II', 'iii', '#iv°', 'V', 'vi', 'vii'],
      'mixolydian': ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'bVII'],
      'aeolian': ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII'],
      'locrian': ['i°', 'bII', 'biii', 'iv', 'bV', 'bVI', 'bvii']
    };
    
    return modeChords[mode] || [];
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.setScale('C', 'major');
    this.constraintMode = 'snap';
    this.allowChromaticism = false;
    this.allowBlueNotes = false;
    this.strictMode = false;
    this.avoidNotes.clear();
  }
}

// Create singleton instance
export const scaleConstraints = new ScaleConstraints();