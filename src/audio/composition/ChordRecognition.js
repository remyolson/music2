import * as Tone from 'tone';
import { state } from '../../state.js';
import { harmonyEngine } from './HarmonyEngine.js';

/**
 * ChordRecognition - Real-time chord detection and analysis from MIDI input
 * Identifies chords, inversions, and harmonic progressions
 */
export class ChordRecognition {
  constructor() {
    // Current chord detection state
    this.activeNotes = new Map(); // noteNumber -> { time, velocity }
    this.currentChord = null;
    this.previousChord = null;
    
    // Chord detection settings
    this.detectionDelay = 50; // ms to wait for chord completion
    this.chordThreshold = 3; // minimum notes for chord detection
    this.octaveEquivalence = true; // treat notes in different octaves as same pitch class
    
    // Detection timer
    this.detectionTimer = null;
    
    // Chord history
    this.chordHistory = [];
    this.maxHistorySize = 64;
    
    // Progression tracking
    this.currentProgression = [];
    this.progressionStartTime = null;
    
    // Analysis settings
    this.analyzeInversions = true;
    this.analyzeVoicings = true;
    this.detectBrokenChords = true;
    this.arpeggioWindow = 500; // ms window for broken chord detection
    
    // Root note detection
    this.rootDetectionMethod = 'bass'; // 'bass', 'stack', 'context'
    
    // Real-time callbacks
    this.chordChangeCallbacks = new Set();
    this.progressionCallbacks = new Set();
  }

  /**
   * Process incoming MIDI note
   * @param {Object} noteEvent - { type: 'noteOn'|'noteOff', note, velocity, time }
   */
  processNote(noteEvent) {
    const { type, note, velocity, time } = noteEvent;
    
    if (type === 'noteOn') {
      this.addNote(note, velocity, time);
    } else if (type === 'noteOff') {
      this.removeNote(note);
    }
    
    // Reset detection timer
    if (this.detectionTimer) {
      clearTimeout(this.detectionTimer);
    }
    
    // Set new detection timer
    this.detectionTimer = setTimeout(() => {
      this.detectChord();
    }, this.detectionDelay);
  }

  /**
   * Add note to active set
   * @param {number} note - MIDI note number
   * @param {number} velocity 
   * @param {number} time 
   */
  addNote(note, velocity, time) {
    this.activeNotes.set(note, { 
      velocity, 
      time: time || Date.now(),
      pitchClass: note % 12
    });
    
    // Check for broken chord pattern
    if (this.detectBrokenChords) {
      this.checkBrokenChord();
    }
  }

  /**
   * Remove note from active set
   * @param {number} note 
   */
  removeNote(note) {
    this.activeNotes.delete(note);
  }

  /**
   * Detect chord from active notes
   */
  detectChord() {
    const notes = Array.from(this.activeNotes.keys()).sort((a, b) => a - b);
    
    if (notes.length < 2) {
      // Not enough notes for a chord
      if (this.currentChord) {
        this.endCurrentChord();
      }
      return;
    }
    
    // Analyze the chord
    const analysis = this.analyzeNotes(notes);
    
    if (analysis) {
      // Check if this is a new chord or continuation
      if (!this.currentChord || !this.isSameChord(this.currentChord, analysis)) {
        this.setCurrentChord(analysis);
      } else {
        // Update current chord (might have added notes)
        this.updateCurrentChord(analysis);
      }
    }
  }

  /**
   * Analyze notes and identify chord
   * @param {Array} notes - MIDI note numbers
   * @returns {Object|null} Chord analysis
   */
  analyzeNotes(notes) {
    if (notes.length < 2) return null;
    
    // Get pitch classes
    const pitchClasses = [...new Set(notes.map(n => n % 12))].sort((a, b) => a - b);
    
    // Try different root interpretations
    const interpretations = [];
    
    // Method 1: Bass note as root
    if (this.rootDetectionMethod === 'bass' || this.rootDetectionMethod === 'context') {
      const bassInterpretation = this.interpretWithRoot(notes[0], notes);
      if (bassInterpretation) {
        interpretations.push(bassInterpretation);
      }
    }
    
    // Method 2: Try each note as potential root
    if (this.rootDetectionMethod === 'stack' || this.rootDetectionMethod === 'context') {
      for (const note of notes) {
        const interpretation = this.interpretWithRoot(note, notes);
        if (interpretation && interpretation.confidence > 0.5) {
          interpretations.push(interpretation);
        }
      }
    }
    
    // Select best interpretation
    if (interpretations.length === 0) {
      return this.createUnknownChord(notes);
    }
    
    // Sort by confidence
    interpretations.sort((a, b) => b.confidence - a.confidence);
    
    // Consider context if available
    if (this.rootDetectionMethod === 'context' && this.previousChord) {
      return this.selectBestWithContext(interpretations);
    }
    
    return interpretations[0];
  }

  /**
   * Interpret chord with given root
   * @param {number} root 
   * @param {Array} notes 
   * @returns {Object|null}
   */
  interpretWithRoot(root, notes) {
    const intervals = notes.map(n => (n - root) % 12).sort((a, b) => a - b);
    const uniqueIntervals = [...new Set(intervals)];
    
    // Try to match chord templates
    const chordType = harmonyEngine.identifyChordType(uniqueIntervals);
    
    if (chordType === 'unknown') {
      // Try to identify partial chord
      const partial = this.identifyPartialChord(uniqueIntervals);
      if (partial) {
        return this.createChordAnalysis(root, notes, partial.type, partial.confidence * 0.8);
      }
      return null;
    }
    
    // Calculate confidence based on how well it matches
    const confidence = this.calculateConfidence(uniqueIntervals, chordType);
    
    return this.createChordAnalysis(root, notes, chordType, confidence);
  }

  /**
   * Create chord analysis object
   * @param {number} root 
   * @param {Array} notes 
   * @param {string} chordType 
   * @param {number} confidence 
   * @returns {Object}
   */
  createChordAnalysis(root, notes, chordType, confidence) {
    const symbol = harmonyEngine.getChordSymbol(root, chordType);
    const bassNote = notes[0];
    const inversion = this.determineInversion(root, bassNote, chordType);
    
    return {
      root,
      notes: [...notes],
      chordType,
      symbol,
      confidence,
      inversion,
      bassNote,
      timestamp: Date.now(),
      voicing: this.analyzeVoicing(notes),
      tensions: this.identifyTensions(root, notes, chordType),
      function: this.estimateHarmonicFunction(root, chordType)
    };
  }

  /**
   * Identify partial chord (missing notes)
   * @param {Array} intervals 
   * @returns {Object|null}
   */
  identifyPartialChord(intervals) {
    // Check for power chord (root + fifth)
    if (intervals.includes(0) && intervals.includes(7) && intervals.length === 2) {
      return { type: '5', confidence: 0.9 };
    }
    
    // Check for shell voicing (root + third + seventh)
    if (intervals.includes(0)) {
      if (intervals.includes(4) && intervals.includes(10)) {
        return { type: '7', confidence: 0.85 };
      }
      if (intervals.includes(3) && intervals.includes(10)) {
        return { type: 'm7', confidence: 0.85 };
      }
      if (intervals.includes(4) && intervals.includes(11)) {
        return { type: 'maj7', confidence: 0.85 };
      }
    }
    
    // Check for rootless voicing
    if (!intervals.includes(0)) {
      // Common rootless voicings
      if (this.matchesRootlessVoicing(intervals)) {
        return { type: 'rootless', confidence: 0.7 };
      }
    }
    
    return null;
  }

  /**
   * Check if intervals match common rootless voicing
   * @param {Array} intervals 
   * @returns {boolean}
   */
  matchesRootlessVoicing(intervals) {
    // Common jazz rootless voicings
    const rootlessPatterns = [
      [3, 7, 10],    // m7 without root
      [4, 7, 11],    // maj7 without root
      [4, 7, 10],    // 7 without root
      [3, 6, 10],    // m7b5 without root
      [3, 7, 10, 14] // m9 without root
    ];
    
    for (const pattern of rootlessPatterns) {
      if (this.intervalsMatch(intervals, pattern)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if intervals match pattern
   * @param {Array} intervals 
   * @param {Array} pattern 
   * @returns {boolean}
   */
  intervalsMatch(intervals, pattern) {
    if (intervals.length !== pattern.length) return false;
    return pattern.every(interval => intervals.includes(interval));
  }

  /**
   * Calculate confidence score
   * @param {Array} intervals 
   * @param {string} chordType 
   * @returns {number} 0-1
   */
  calculateConfidence(intervals, chordType) {
    const template = harmonyEngine.chordTemplates.get(chordType);
    if (!template) return 0.5;
    
    let matches = 0;
    let extras = 0;
    
    // Count matching intervals
    for (const interval of template) {
      if (intervals.includes(interval)) {
        matches++;
      }
    }
    
    // Count extra notes
    for (const interval of intervals) {
      if (!template.includes(interval) && interval !== 0) {
        extras++;
      }
    }
    
    // Calculate confidence
    const matchRatio = matches / template.length;
    const extraPenalty = extras * 0.1;
    
    return Math.max(0, Math.min(1, matchRatio - extraPenalty));
  }

  /**
   * Determine chord inversion
   * @param {number} root 
   * @param {number} bassNote 
   * @param {string} chordType 
   * @returns {number}
   */
  determineInversion(root, bassNote, chordType) {
    const bassInterval = (bassNote - root + 12) % 12;
    
    if (bassInterval === 0) return 0; // Root position
    
    const template = harmonyEngine.chordTemplates.get(chordType);
    if (!template) return 0;
    
    // Find which chord tone is in bass
    const inversionIndex = template.indexOf(bassInterval);
    return inversionIndex > 0 ? inversionIndex : 0;
  }

  /**
   * Analyze voicing characteristics
   * @param {Array} notes 
   * @returns {Object}
   */
  analyzeVoicing(notes) {
    const voicing = {
      type: 'unknown',
      spread: 0,
      density: 0,
      openness: 0
    };
    
    if (notes.length < 2) return voicing;
    
    // Calculate spread
    voicing.spread = notes[notes.length - 1] - notes[0];
    
    // Calculate density
    voicing.density = notes.length / (voicing.spread / 12);
    
    // Determine voicing type
    if (voicing.spread < 12) {
      voicing.type = 'close';
      voicing.openness = 0.2;
    } else if (voicing.spread > 24) {
      voicing.type = 'open';
      voicing.openness = 0.8;
    } else {
      // Check for specific voicing types
      const intervals = [];
      for (let i = 1; i < notes.length; i++) {
        intervals.push(notes[i] - notes[i - 1]);
      }
      
      if (intervals.some(i => i > 12)) {
        voicing.type = 'drop';
        voicing.openness = 0.6;
      } else {
        voicing.type = 'mixed';
        voicing.openness = 0.5;
      }
    }
    
    return voicing;
  }

  /**
   * Identify chord tensions/extensions
   * @param {number} root 
   * @param {Array} notes 
   * @param {string} chordType 
   * @returns {Array}
   */
  identifyTensions(root, notes, chordType) {
    const tensions = [];
    const template = harmonyEngine.chordTemplates.get(chordType) || [];
    
    for (const note of notes) {
      const interval = (note - root) % 12;
      
      // Skip chord tones
      if (template.includes(interval) || interval === 0) continue;
      
      // Identify tension
      switch (interval) {
        case 1:
          tensions.push('b9');
          break;
        case 2:
          tensions.push('9');
          break;
        case 3:
          if (!template.includes(4)) tensions.push('#9');
          break;
        case 5:
          tensions.push('11');
          break;
        case 6:
          tensions.push('#11');
          break;
        case 9:
          tensions.push('13');
          break;
        case 10:
          if (!template.includes(10)) tensions.push('b13');
          break;
      }
    }
    
    return tensions;
  }

  /**
   * Estimate harmonic function
   * @param {number} root 
   * @param {string} chordType 
   * @returns {string}
   */
  estimateHarmonicFunction(root) {
    // This is simplified - would need key context for accurate analysis
    const pitchClass = root % 12;
    const functions = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
    
    // Assume C major for now (would need actual key)
    const keyRoot = 0; // C
    const degree = (pitchClass - keyRoot + 12) % 12;
    
    return functions[degree] || 'I';
  }

  /**
   * Check for broken chord pattern
   */
  checkBrokenChord() {
    const now = Date.now();
    const recentNotes = [];
    
    // Collect notes within arpeggio window
    for (const [note, data] of this.activeNotes) {
      if (now - data.time < this.arpeggioWindow) {
        recentNotes.push(note);
      }
    }
    
    // Need at least 3 notes for broken chord
    if (recentNotes.length >= 3) {
      // Check if they form a recognizable chord when combined
      const analysis = this.analyzeNotes(recentNotes);
      if (analysis && analysis.confidence > 0.7) {
        // Treat as broken chord
        this.handleBrokenChord(analysis);
      }
    }
  }

  /**
   * Handle detected broken chord
   * @param {Object} analysis 
   */
  handleBrokenChord(analysis) {
    analysis.isBroken = true;
    analysis.type = 'arpeggio';
    
    // Update current chord
    if (!this.currentChord || !this.isSameChord(this.currentChord, analysis)) {
      this.setCurrentChord(analysis);
    }
  }

  /**
   * Check if two chords are the same
   * @param {Object} chord1 
   * @param {Object} chord2 
   * @returns {boolean}
   */
  isSameChord(chord1, chord2) {
    return chord1.root === chord2.root && 
           chord1.chordType === chord2.chordType;
  }

  /**
   * Set new current chord
   * @param {Object} analysis 
   */
  setCurrentChord(analysis) {
    // End previous chord
    if (this.currentChord) {
      this.endCurrentChord();
    }
    
    // Set new chord
    this.currentChord = analysis;
    this.currentChord.startTime = Date.now();
    
    // Add to progression
    this.currentProgression.push(analysis);
    
    // Notify callbacks
    this.notifyChordChange(analysis);
    
    // Update state
    state.setState({
      currentChord: analysis.symbol,
      chordRoot: analysis.root,
      chordType: analysis.chordType,
      chordInversion: analysis.inversion
    });
  }

  /**
   * Update current chord with new analysis
   * @param {Object} analysis 
   */
  updateCurrentChord(analysis) {
    // Update note list and voicing
    this.currentChord.notes = analysis.notes;
    this.currentChord.voicing = analysis.voicing;
    this.currentChord.tensions = analysis.tensions;
    
    // Keep original timing
    analysis.startTime = this.currentChord.startTime;
  }

  /**
   * End current chord
   */
  endCurrentChord() {
    if (!this.currentChord) return;
    
    this.currentChord.endTime = Date.now();
    this.currentChord.duration = this.currentChord.endTime - this.currentChord.startTime;
    
    // Add to history
    this.addToHistory(this.currentChord);
    
    // Update previous chord
    this.previousChord = this.currentChord;
    this.currentChord = null;
  }

  /**
   * Add chord to history
   * @param {Object} chord 
   */
  addToHistory(chord) {
    this.chordHistory.push(chord);
    
    // Trim history
    if (this.chordHistory.length > this.maxHistorySize) {
      this.chordHistory.shift();
    }
    
    // Analyze progression if we have enough chords
    if (this.currentProgression.length >= 4) {
      this.analyzeProgression();
    }
  }

  /**
   * Create unknown chord analysis
   * @param {Array} notes 
   * @returns {Object}
   */
  createUnknownChord(notes) {
    return {
      root: notes[0],
      notes: [...notes],
      chordType: 'unknown',
      symbol: 'N.C.',
      confidence: 0.3,
      inversion: 0,
      bassNote: notes[0],
      timestamp: Date.now(),
      voicing: this.analyzeVoicing(notes),
      tensions: [],
      function: '?'
    };
  }

  /**
   * Select best interpretation considering context
   * @param {Array} interpretations 
   * @returns {Object}
   */
  selectBestWithContext(interpretations) {
    // Consider voice leading from previous chord
    for (const interpretation of interpretations) {
      const voiceLeadingScore = this.scoreVoiceLeading(this.previousChord, interpretation);
      interpretation.contextScore = interpretation.confidence * 0.7 + voiceLeadingScore * 0.3;
    }
    
    // Sort by context score
    interpretations.sort((a, b) => b.contextScore - a.contextScore);
    
    return interpretations[0];
  }

  /**
   * Score voice leading between chords
   * @param {Object} chord1 
   * @param {Object} chord2 
   * @returns {number} 0-1
   */
  scoreVoiceLeading(chord1, chord2) {
    if (!chord1 || !chord2) return 0.5;
    
    // Calculate total movement
    let totalMovement = 0;
    const notes1 = chord1.notes.sort((a, b) => a - b);
    const notes2 = chord2.notes.sort((a, b) => a - b);
    
    const minLength = Math.min(notes1.length, notes2.length);
    
    for (let i = 0; i < minLength; i++) {
      totalMovement += Math.abs(notes2[i] - notes1[i]);
    }
    
    // Convert to score (less movement = higher score)
    const avgMovement = totalMovement / minLength;
    return Math.max(0, 1 - avgMovement / 12);
  }

  /**
   * Analyze chord progression
   */
  analyzeProgression() {
    if (this.currentProgression.length < 2) return;
    
    const progression = {
      chords: this.currentProgression.map(c => ({
        symbol: c.symbol,
        function: c.function,
        root: c.root,
        type: c.chordType
      })),
      key: this.detectKey(this.currentProgression),
      type: this.identifyProgressionType(this.currentProgression),
      startTime: this.progressionStartTime || this.currentProgression[0].startTime,
      endTime: Date.now()
    };
    
    // Notify callbacks
    this.notifyProgressionDetected(progression);
    
    // Update state
    state.setState({
      currentProgression: progression.chords.map(c => c.symbol).join(' - '),
      detectedKey: progression.key,
      progressionType: progression.type
    });
  }

  /**
   * Detect key from chord progression
   * @param {Array} chords 
   * @returns {string}
   */
  detectKey(chords) {
    // Simplified key detection - count pitch classes
    const pitchClassCount = new Array(12).fill(0);
    
    for (const chord of chords) {
      for (const note of chord.notes) {
        pitchClassCount[note % 12]++;
      }
    }
    
    // Find most likely key
    const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    let bestKey = 'C';
    let bestScore = 0;
    
    for (let i = 0; i < 12; i++) {
      const score = this.scoreKeyLikelihood(pitchClassCount, i);
      if (score > bestScore) {
        bestScore = score;
        bestKey = keys[i];
      }
    }
    
    return bestKey;
  }

  /**
   * Score likelihood of key
   * @param {Array} pitchClassCount 
   * @param {number} keyRoot 
   * @returns {number}
   */
  scoreKeyLikelihood(pitchClassCount, keyRoot) {
    // Major scale degrees (more weight to important notes)
    const weights = [2, 0.1, 1, 0.1, 1.5, 1, 0.1, 2, 0.1, 1, 0.1, 0.5];
    let score = 0;
    
    for (let i = 0; i < 12; i++) {
      const degree = (i - keyRoot + 12) % 12;
      score += pitchClassCount[i] * weights[degree];
    }
    
    return score;
  }

  /**
   * Identify progression type
   * @param {Array} chords 
   * @returns {string}
   */
  identifyProgressionType(chords) {
    const functions = chords.map(c => c.function).join('-');
    
    // Common progressions
    const progressionPatterns = {
      'I-V-vi-IV': 'pop',
      'I-vi-IV-V': '50s',
      'ii-V-I': 'jazz_cadence',
      'I-IV-V-I': 'blues',
      'I-bVII-IV-I': 'mixolydian',
      'vi-IV-I-V': 'pop_variant',
      'I-V-I': 'authentic_cadence',
      'I-IV-I': 'plagal_cadence'
    };
    
    // Check for exact match
    for (const [pattern, type] of Object.entries(progressionPatterns)) {
      if (functions.includes(pattern)) {
        return type;
      }
    }
    
    // Check for partial matches
    if (functions.includes('ii-V')) return 'ii_v_movement';
    if (functions.includes('V-I')) return 'dominant_resolution';
    if (functions.includes('IV-I')) return 'subdominant_resolution';
    
    return 'custom';
  }

  /**
   * Register chord change callback
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  onChordChange(callback) {
    this.chordChangeCallbacks.add(callback);
    return () => this.chordChangeCallbacks.delete(callback);
  }

  /**
   * Register progression detected callback
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  onProgressionDetected(callback) {
    this.progressionCallbacks.add(callback);
    return () => this.progressionCallbacks.delete(callback);
  }

  /**
   * Notify chord change
   * @param {Object} chord 
   */
  notifyChordChange(chord) {
    this.chordChangeCallbacks.forEach(callback => {
      try {
        callback(chord);
      } catch (error) {
        console.error('Error in chord change callback:', error);
      }
    });
  }

  /**
   * Notify progression detected
   * @param {Object} progression 
   */
  notifyProgressionDetected(progression) {
    this.progressionCallbacks.forEach(callback => {
      try {
        callback(progression);
      } catch (error) {
        console.error('Error in progression callback:', error);
      }
    });
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      currentChord: this.currentChord,
      activeNotes: Array.from(this.activeNotes.keys()),
      recentChords: this.chordHistory.slice(-8),
      currentProgression: this.currentProgression
    };
  }

  /**
   * Reset detection state
   */
  reset() {
    this.activeNotes.clear();
    this.currentChord = null;
    this.previousChord = null;
    this.currentProgression = [];
    this.progressionStartTime = Date.now();
    
    if (this.detectionTimer) {
      clearTimeout(this.detectionTimer);
      this.detectionTimer = null;
    }
  }

  /**
   * Get chord suggestions based on current context
   * @returns {Array}
   */
  getChordSuggestions() {
    if (!this.previousChord) {
      // No context - suggest common starting chords
      return [
        { symbol: 'C', function: 'I', likelihood: 0.9 },
        { symbol: 'Am', function: 'vi', likelihood: 0.7 },
        { symbol: 'F', function: 'IV', likelihood: 0.6 }
      ];
    }
    
    // Use harmony engine to get suggestions
    const suggestions = harmonyEngine.suggestNextChord(
      this.previousChord.notes,
      { style: 'jazz' }
    );
    
    return suggestions.slice(0, 5).map(s => ({
      symbol: s.symbol,
      function: s.function,
      likelihood: s.probability
    }));
  }
}

// Create singleton instance
export const chordRecognition = new ChordRecognition();