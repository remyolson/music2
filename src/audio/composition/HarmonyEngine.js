import * as Tone from 'tone';
import { state } from '../../state.js';
import { voiceLeadingEngine } from './VoiceLeadingEngine.js';

/**
 * HarmonyEngine - Advanced harmony analysis and generation
 * Handles extended chords, modal interchange, and harmonic progressions
 */
export class HarmonyEngine {
  constructor() {
    // Chord templates
    this.chordTemplates = new Map();
    this.initializeChordTemplates();
    
    // Scale definitions
    this.scales = new Map();
    this.initializeScales();
    
    // Current harmonic context
    this.currentKey = 'C';
    this.currentScale = 'major';
    this.currentMode = 'ionian';
    this.currentChord = null;
    
    // Progression tracking
    this.progressionHistory = [];
    this.maxHistorySize = 32;
    
    // Harmonic rhythm
    this.harmonicRhythm = 'moderate'; // slow, moderate, fast
    this.beatsPerChord = 4;
    
    // Advanced features
    this.allowChromaticism = true;
    this.allowModalInterchange = true;
    this.allowExtendedHarmony = true;
    this.tensionLevel = 0.5; // 0-1, affects dissonance tolerance
  }

  /**
   * Initialize chord templates
   */
  initializeChordTemplates() {
    // Basic triads
    this.chordTemplates.set('major', [0, 4, 7]);
    this.chordTemplates.set('minor', [0, 3, 7]);
    this.chordTemplates.set('diminished', [0, 3, 6]);
    this.chordTemplates.set('augmented', [0, 4, 8]);
    
    // Seventh chords
    this.chordTemplates.set('maj7', [0, 4, 7, 11]);
    this.chordTemplates.set('7', [0, 4, 7, 10]);
    this.chordTemplates.set('m7', [0, 3, 7, 10]);
    this.chordTemplates.set('m7b5', [0, 3, 6, 10]);
    this.chordTemplates.set('dim7', [0, 3, 6, 9]);
    this.chordTemplates.set('mMaj7', [0, 3, 7, 11]);
    this.chordTemplates.set('7#5', [0, 4, 8, 10]);
    
    // Extended chords
    this.chordTemplates.set('9', [0, 4, 7, 10, 14]);
    this.chordTemplates.set('maj9', [0, 4, 7, 11, 14]);
    this.chordTemplates.set('m9', [0, 3, 7, 10, 14]);
    this.chordTemplates.set('11', [0, 4, 7, 10, 14, 17]);
    this.chordTemplates.set('maj11', [0, 4, 7, 11, 14, 17]);
    this.chordTemplates.set('m11', [0, 3, 7, 10, 14, 17]);
    this.chordTemplates.set('13', [0, 4, 7, 10, 14, 17, 21]);
    this.chordTemplates.set('maj13', [0, 4, 7, 11, 14, 17, 21]);
    this.chordTemplates.set('m13', [0, 3, 7, 10, 14, 17, 21]);
    
    // Altered chords
    this.chordTemplates.set('7b5', [0, 4, 6, 10]);
    this.chordTemplates.set('7#9', [0, 4, 7, 10, 15]);
    this.chordTemplates.set('7b9', [0, 4, 7, 10, 13]);
    this.chordTemplates.set('7#11', [0, 4, 7, 10, 18]);
    this.chordTemplates.set('7b13', [0, 4, 7, 10, 20]);
    this.chordTemplates.set('7alt', [0, 4, 6, 10, 13, 15]); // 7b5b9#9
    
    // Sus chords
    this.chordTemplates.set('sus2', [0, 2, 7]);
    this.chordTemplates.set('sus4', [0, 5, 7]);
    this.chordTemplates.set('7sus4', [0, 5, 7, 10]);
    this.chordTemplates.set('9sus4', [0, 5, 7, 10, 14]);
    
    // Add chords
    this.chordTemplates.set('add9', [0, 4, 7, 14]);
    this.chordTemplates.set('madd9', [0, 3, 7, 14]);
    this.chordTemplates.set('add11', [0, 4, 7, 17]);
    this.chordTemplates.set('add13', [0, 4, 7, 21]);
    
    // Power chords
    this.chordTemplates.set('5', [0, 7]);
    
    // Jazz chords
    this.chordTemplates.set('6', [0, 4, 7, 9]);
    this.chordTemplates.set('m6', [0, 3, 7, 9]);
    this.chordTemplates.set('6/9', [0, 4, 7, 9, 14]);
    this.chordTemplates.set('m6/9', [0, 3, 7, 9, 14]);
  }

  /**
   * Initialize scale definitions
   */
  initializeScales() {
    // Major modes
    this.scales.set('ionian', [0, 2, 4, 5, 7, 9, 11]); // Major
    this.scales.set('dorian', [0, 2, 3, 5, 7, 9, 10]);
    this.scales.set('phrygian', [0, 1, 3, 5, 7, 8, 10]);
    this.scales.set('lydian', [0, 2, 4, 6, 7, 9, 11]);
    this.scales.set('mixolydian', [0, 2, 4, 5, 7, 9, 10]);
    this.scales.set('aeolian', [0, 2, 3, 5, 7, 8, 10]); // Natural minor
    this.scales.set('locrian', [0, 1, 3, 5, 6, 8, 10]);
    
    // Other scales
    this.scales.set('harmonic_minor', [0, 2, 3, 5, 7, 8, 11]);
    this.scales.set('melodic_minor', [0, 2, 3, 5, 7, 9, 11]);
    this.scales.set('whole_tone', [0, 2, 4, 6, 8, 10]);
    this.scales.set('diminished', [0, 2, 3, 5, 6, 8, 9, 11]);
    this.scales.set('chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    
    // Pentatonic
    this.scales.set('major_pentatonic', [0, 2, 4, 7, 9]);
    this.scales.set('minor_pentatonic', [0, 3, 5, 7, 10]);
    this.scales.set('blues', [0, 3, 5, 6, 7, 10]);
    
    // Exotic scales
    this.scales.set('hungarian_minor', [0, 2, 3, 6, 7, 8, 11]);
    this.scales.set('arabic', [0, 1, 4, 5, 7, 8, 11]);
    this.scales.set('japanese', [0, 1, 5, 7, 8]);
    this.scales.set('bebop_major', [0, 2, 4, 5, 7, 8, 9, 11]);
    this.scales.set('bebop_dominant', [0, 2, 4, 5, 7, 9, 10, 11]);
  }

  /**
   * Analyze a chord and return detailed information
   * @param {Array} notes - MIDI note numbers
   * @returns {Object} Chord analysis
   */
  analyzeChord(notes) {
    if (!notes || notes.length === 0) return null;
    
    // Sort notes
    const sortedNotes = [...notes].sort((a, b) => a - b);
    const root = sortedNotes[0];
    
    // Get intervals from root
    const intervals = sortedNotes.map(note => (note - root) % 12);
    const uniqueIntervals = [...new Set(intervals)].sort((a, b) => a - b);
    
    // Identify chord type
    const chordType = this.identifyChordType(uniqueIntervals);
    
    // Find possible inversions
    const inversions = this.findInversions(sortedNotes);
    
    // Determine function in current key
    const function_ = this.determineChordFunction(root, chordType);
    
    // Check for modal interchange
    const isModalInterchange = this.checkModalInterchange(root, chordType);
    
    // Calculate tension
    const tension = this.calculateChordTension(intervals);
    
    // Get chord symbol
    const symbol = this.getChordSymbol(root, chordType, inversions[0]);
    
    return {
      notes: sortedNotes,
      root,
      intervals: uniqueIntervals,
      chordType,
      symbol,
      inversions,
      function: function_,
      isModalInterchange,
      tension,
      voicing: this.analyzeVoicing(sortedNotes),
      extensions: this.findExtensions(uniqueIntervals),
      alterations: this.findAlterations(uniqueIntervals)
    };
  }

  /**
   * Identify chord type from intervals
   * @param {Array} intervals 
   * @returns {string}
   */
  identifyChordType(intervals) {
    // Check against templates
    for (const [type, template] of this.chordTemplates) {
      if (this.matchesTemplate(intervals, template)) {
        return type;
      }
    }
    
    // Try to identify partial matches
    if (intervals.includes(4) && intervals.includes(7)) {
      return 'major';
    } else if (intervals.includes(3) && intervals.includes(7)) {
      return 'minor';
    }
    
    return 'unknown';
  }

  /**
   * Check if intervals match a template
   * @param {Array} intervals 
   * @param {Array} template 
   * @returns {boolean}
   */
  matchesTemplate(intervals, template) {
    if (intervals.length !== template.length) return false;
    return template.every(interval => intervals.includes(interval));
  }

  /**
   * Find possible inversions
   * @param {Array} notes 
   * @returns {Array}
   */
  findInversions(notes) {
    const inversions = [];
    const pitchClasses = notes.map(n => n % 12);
    
    for (let i = 0; i < notes.length; i++) {
      const root = notes[i];
      const intervals = notes.map(n => (n - root) % 12).sort((a, b) => a - b);
      const chordType = this.identifyChordType(intervals);
      
      if (chordType !== 'unknown') {
        inversions.push({
          root,
          bassNote: notes[0],
          inversion: i,
          type: chordType
        });
      }
    }
    
    return inversions;
  }

  /**
   * Generate a chord from symbol
   * @param {string} symbol - Chord symbol (e.g., "Cmaj7", "Dm9")
   * @returns {Array} MIDI note numbers
   */
  generateChord(symbol) {
    const parsed = this.parseChordSymbol(symbol);
    if (!parsed) return null;
    
    const { root, type, bass } = parsed;
    const template = this.chordTemplates.get(type);
    if (!template) return null;
    
    // Generate notes from template
    let notes = template.map(interval => root + interval);
    
    // Handle slash chords
    if (bass !== null && bass !== root) {
      // Remove any existing bass notes below the new bass
      notes = notes.filter(n => n >= bass);
      // Add the bass note
      notes.unshift(bass);
    }
    
    // Voice the chord appropriately
    notes = this.voiceChord(notes, parsed);
    
    return notes;
  }

  /**
   * Parse chord symbol
   * @param {string} symbol 
   * @returns {Object}
   */
  parseChordSymbol(symbol) {
    // Regular expression for chord parsing
    const regex = /^([A-G][#b]?)(.*)(?:\/([A-G][#b]?))?$/;
    const match = symbol.match(regex);
    
    if (!match) return null;
    
    const [, rootStr, typeStr, bassStr] = match;
    
    // Convert root to MIDI
    const root = this.noteNameToMidi(rootStr);
    
    // Determine chord type
    let type = 'major'; // default
    if (typeStr) {
      // Map common symbols to our templates
      const typeMap = {
        'm': 'minor',
        'min': 'minor',
        'maj7': 'maj7',
        'M7': 'maj7',
        '7': '7',
        'm7': 'm7',
        'dim': 'diminished',
        '°': 'diminished',
        'aug': 'augmented',
        '+': 'augmented',
        'sus': 'sus4',
        // Add more mappings as needed
      };
      
      type = typeMap[typeStr] || typeStr.toLowerCase();
    }
    
    // Handle bass note for slash chords
    const bass = bassStr ? this.noteNameToMidi(bassStr) : null;
    
    return { root, type, bass };
  }

  /**
   * Convert note name to MIDI number
   * @param {string} noteName 
   * @returns {number}
   */
  noteNameToMidi(noteName) {
    const noteMap = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    let note = noteMap[noteName[0]];
    if (noteName.includes('#')) note += 1;
    if (noteName.includes('b')) note -= 1;
    
    // Default to middle octave
    return 60 + note;
  }

  /**
   * Voice a chord appropriately
   * @param {Array} notes 
   * @param {Object} parsed 
   * @returns {Array}
   */
  voiceChord(notes, parsed) {
    // Basic voicing - spread notes across octaves
    const voiced = [];
    
    // Keep bass note
    voiced.push(notes[0]);
    
    // Voice remaining notes in appropriate octaves
    for (let i = 1; i < notes.length; i++) {
      let note = notes[i];
      
      // Move to appropriate octave
      while (note <= voiced[voiced.length - 1]) {
        note += 12;
      }
      
      // Avoid too wide spacing
      if (note - voiced[voiced.length - 1] > 12) {
        note -= 12;
      }
      
      voiced.push(note);
    }
    
    return voiced;
  }

  /**
   * Generate chord progression
   * @param {Object} options 
   * @returns {Array}
   */
  generateProgression(options = {}) {
    const {
      length = 8,
      style = 'pop',
      startChord = 'I',
      endChord = 'I',
      complexity = 0.5
    } = options;
    
    const progression = [];
    
    // Get progression templates for style
    const templates = this.getProgressionTemplates(style);
    
    // Start with the specified chord
    let currentFunction = startChord;
    progression.push(this.functionToChord(currentFunction));
    
    // Generate middle chords
    for (let i = 1; i < length - 1; i++) {
      const nextOptions = this.getNextChordOptions(currentFunction, style);
      
      // Weight options by probability
      const weights = nextOptions.map(opt => opt.probability);
      const selected = this.weightedRandom(nextOptions, weights);
      
      currentFunction = selected.function;
      progression.push(this.functionToChord(currentFunction));
      
      // Add complexity with substitutions
      if (Math.random() < complexity) {
        const substitution = this.getSubstitution(currentFunction);
        if (substitution) {
          progression[progression.length - 1] = this.functionToChord(substitution);
        }
      }
    }
    
    // End with specified chord
    progression.push(this.functionToChord(endChord));
    
    return progression;
  }

  /**
   * Get progression templates for style
   * @param {string} style 
   * @returns {Array}
   */
  getProgressionTemplates(style) {
    const templates = {
      pop: [
        ['I', 'V', 'vi', 'IV'],
        ['I', 'vi', 'IV', 'V'],
        ['vi', 'IV', 'I', 'V'],
        ['I', 'IV', 'V', 'I']
      ],
      jazz: [
        ['IIM7', 'V7', 'IM7', 'IM7'],
        ['IM7', 'VI7', 'IIm7', 'V7'],
        ['IIIm7', 'VI7', 'IIm7', 'V7'],
        ['IM7', 'I7', 'IVM7', 'IVm7']
      ],
      blues: [
        ['I7', 'I7', 'I7', 'I7'],
        ['IV7', 'IV7', 'I7', 'I7'],
        ['V7', 'IV7', 'I7', 'V7']
      ],
      classical: [
        ['I', 'IV', 'V', 'I'],
        ['I', 'ii', 'V', 'I'],
        ['I', 'vi', 'ii', 'V'],
        ['I', 'IV', 'ii', 'V']
      ]
    };
    
    return templates[style] || templates.pop;
  }

  /**
   * Get next chord options based on current
   * @param {string} currentFunction 
   * @param {string} style 
   * @returns {Array}
   */
  getNextChordOptions(currentFunction, style) {
    // Common progressions
    const transitions = {
      'I': [
        { function: 'IV', probability: 0.3 },
        { function: 'V', probability: 0.25 },
        { function: 'vi', probability: 0.2 },
        { function: 'ii', probability: 0.15 },
        { function: 'iii', probability: 0.1 }
      ],
      'ii': [
        { function: 'V', probability: 0.7 },
        { function: 'vii°', probability: 0.2 },
        { function: 'IV', probability: 0.1 }
      ],
      'iii': [
        { function: 'vi', probability: 0.5 },
        { function: 'IV', probability: 0.3 },
        { function: 'ii', probability: 0.2 }
      ],
      'IV': [
        { function: 'V', probability: 0.4 },
        { function: 'I', probability: 0.3 },
        { function: 'ii', probability: 0.2 },
        { function: 'vi', probability: 0.1 }
      ],
      'V': [
        { function: 'I', probability: 0.7 },
        { function: 'vi', probability: 0.2 },
        { function: 'IV', probability: 0.1 }
      ],
      'vi': [
        { function: 'ii', probability: 0.4 },
        { function: 'IV', probability: 0.3 },
        { function: 'V', probability: 0.2 },
        { function: 'I', probability: 0.1 }
      ],
      'vii°': [
        { function: 'I', probability: 0.8 },
        { function: 'vi', probability: 0.2 }
      ]
    };
    
    return transitions[currentFunction] || [{ function: 'I', probability: 1.0 }];
  }

  /**
   * Convert function to chord in current key
   * @param {string} functionSymbol 
   * @returns {Object}
   */
  functionToChord(functionSymbol) {
    const keyRoot = Tone.Frequency(this.currentKey).toMidi();
    const scale = this.scales.get(this.currentScale) || this.scales.get('major');
    
    // Parse function symbol (e.g., "IIM7", "V7", "bVII")
    const parsed = this.parseFunctionSymbol(functionSymbol);
    const { degree, quality, alteration } = parsed;
    
    // Get scale degree
    let scaleIndex = degree - 1;
    if (scaleIndex < 0 || scaleIndex >= scale.length) {
      scaleIndex = 0;
    }
    
    // Calculate root
    let root = keyRoot + scale[scaleIndex];
    if (alteration === 'b') root -= 1;
    if (alteration === '#') root += 1;
    
    // Generate chord
    const template = this.chordTemplates.get(quality) || this.chordTemplates.get('major');
    const notes = template.map(interval => root + interval);
    
    return {
      function: functionSymbol,
      root,
      notes,
      quality,
      symbol: this.getChordSymbol(root, quality)
    };
  }

  /**
   * Parse function symbol
   * @param {string} symbol 
   * @returns {Object}
   */
  parseFunctionSymbol(symbol) {
    const regex = /^([b#]?)([IVvi]+)(.*)$/;
    const match = symbol.match(regex);
    
    if (!match) {
      return { degree: 1, quality: 'major', alteration: null };
    }
    
    const [, alteration, roman, qualityStr] = match;
    
    // Convert roman to degree
    const romanToDegree = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
      'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7
    };
    
    const degree = romanToDegree[roman] || 1;
    
    // Determine quality
    let quality = 'major';
    if (roman === roman.toLowerCase()) {
      quality = 'minor';
    }
    
    // Override with explicit quality
    if (qualityStr) {
      const qualityMap = {
        '7': '7',
        'M7': 'maj7',
        'm7': 'm7',
        '°': 'diminished',
        '°7': 'dim7',
        'ø7': 'm7b5'
      };
      quality = qualityMap[qualityStr] || quality;
    }
    
    return { degree, quality, alteration };
  }

  /**
   * Get chord substitution
   * @param {string} function_ 
   * @returns {string|null}
   */
  getSubstitution(function_) {
    const substitutions = {
      'I': ['iii', 'vi'],
      'ii': ['IV'],
      'IV': ['ii', 'bVII'],
      'V': ['bII7', 'vii°'],
      'vi': ['I', 'IV']
    };
    
    const options = substitutions[function_];
    if (!options) return null;
    
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Suggest next chord based on current harmony
   * @param {Array} currentNotes 
   * @param {Object} options 
   * @returns {Array}
   */
  suggestNextChord(currentNotes, options = {}) {
    const {
      style = 'pop',
      tension = this.tensionLevel,
      preferredFunction = null
    } = options;
    
    // Analyze current chord
    const analysis = this.analyzeChord(currentNotes);
    if (!analysis) return null;
    
    // Get possible next chords
    const nextOptions = this.getNextChordOptions(analysis.function, style);
    
    // Generate suggestions
    const suggestions = [];
    
    for (const option of nextOptions) {
      const chord = this.functionToChord(option.function);
      
      // Apply voice leading
      const voicedChord = voiceLeadingEngine.processChord(chord.notes, {
        forceRoot: true
      });
      
      // Calculate smoothness
      const movement = this.calculateMovement(currentNotes, chord.notes);
      
      suggestions.push({
        ...chord,
        voicedNotes: Object.values(voicedChord).filter(n => n !== null),
        probability: option.probability,
        movement,
        tension: this.calculateChordTension(chord.notes)
      });
    }
    
    // Sort by combination of probability and smoothness
    suggestions.sort((a, b) => {
      const scoreA = a.probability * 0.6 + (1 - a.movement / 24) * 0.4;
      const scoreB = b.probability * 0.6 + (1 - b.movement / 24) * 0.4;
      return scoreB - scoreA;
    });
    
    return suggestions;
  }

  /**
   * Harmonize a melody
   * @param {Array} melody - Array of {note, duration, time}
   * @param {Object} options 
   * @returns {Array}
   */
  harmonizeMelody(melody, options = {}) {
    const {
      style = 'pop',
      density = 'moderate', // sparse, moderate, dense
      complexity = 0.5
    } = options;
    
    const harmonization = [];
    
    // Group melody notes by harmonic rhythm
    const groups = this.groupMelodyByHarmony(melody, density);
    
    // Harmonize each group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const melodyNotes = group.notes.map(n => n.note);
      
      // Find chord that contains these melody notes
      const chord = this.findBestChord(melodyNotes, {
        previousChord: i > 0 ? harmonization[i - 1] : null,
        style,
        complexity
      });
      
      harmonization.push({
        time: group.time,
        duration: group.duration,
        chord: chord.notes,
        symbol: chord.symbol,
        function: chord.function
      });
    }
    
    return harmonization;
  }

  /**
   * Group melody notes by harmonic rhythm
   * @param {Array} melody 
   * @param {string} density 
   * @returns {Array}
   */
  groupMelodyByHarmony(melody, density) {
    const groups = [];
    const beatsPerGroup = {
      sparse: 4,
      moderate: 2,
      dense: 1
    }[density] || 2;
    
    let currentGroup = {
      time: 0,
      duration: 0,
      notes: []
    };
    
    for (const note of melody) {
      if (note.time >= currentGroup.time + beatsPerGroup) {
        // Start new group
        if (currentGroup.notes.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          time: note.time,
          duration: beatsPerGroup,
          notes: [note]
        };
      } else {
        // Add to current group
        currentGroup.notes.push(note);
      }
    }
    
    // Add last group
    if (currentGroup.notes.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Find best chord for melody notes
   * @param {Array} melodyNotes 
   * @param {Object} options 
   * @returns {Object}
   */
  findBestChord(melodyNotes, options) {
    const candidates = [];
    
    // Try each scale degree
    const scale = this.scales.get(this.currentScale);
    const keyRoot = Tone.Frequency(this.currentKey).toMidi();
    
    for (let degree = 0; degree < scale.length; degree++) {
      const chordRoot = keyRoot + scale[degree];
      
      // Try different chord qualities
      const qualities = ['major', 'minor', '7', 'maj7', 'm7'];
      
      for (const quality of qualities) {
        const template = this.chordTemplates.get(quality);
        if (!template) continue;
        
        const chordNotes = template.map(i => chordRoot + i);
        
        // Check if melody notes fit in chord
        const fitness = this.calculateMelodyFitness(melodyNotes, chordNotes);
        
        if (fitness > 0) {
          candidates.push({
            root: chordRoot,
            notes: chordNotes,
            quality,
            symbol: this.getChordSymbol(chordRoot, quality),
            function: this.getScaleFunction(degree),
            fitness
          });
        }
      }
    }
    
    // Sort by fitness
    candidates.sort((a, b) => b.fitness - a.fitness);
    
    // Return best candidate
    return candidates[0] || this.functionToChord('I');
  }

  /**
   * Calculate how well melody fits chord
   * @param {Array} melodyNotes 
   * @param {Array} chordNotes 
   * @returns {number}
   */
  calculateMelodyFitness(melodyNotes, chordNotes) {
    let fitness = 0;
    const chordPitchClasses = chordNotes.map(n => n % 12);
    
    for (const melodyNote of melodyNotes) {
      const pitchClass = melodyNote % 12;
      
      if (chordPitchClasses.includes(pitchClass)) {
        fitness += 1.0; // Chord tone
      } else {
        // Check if it's a valid extension
        const interval = (pitchClass - chordNotes[0] % 12 + 12) % 12;
        if ([2, 9, 11].includes(interval)) {
          fitness += 0.5; // Common extension
        } else {
          fitness -= 0.5; // Non-chord tone
        }
      }
    }
    
    return fitness / melodyNotes.length;
  }

  /**
   * Modal interchange - borrow chords from parallel modes
   * @param {string} targetMode 
   * @returns {Array}
   */
  getModalInterchangeChords(targetMode = 'aeolian') {
    const borrowed = [];
    const keyRoot = Tone.Frequency(this.currentKey).toMidi();
    const targetScale = this.scales.get(targetMode);
    
    if (!targetScale) return borrowed;
    
    // Generate chords from target mode
    for (let i = 0; i < targetScale.length; i++) {
      const root = keyRoot + targetScale[i];
      
      // Determine quality based on mode
      const quality = this.getChordQualityForScaleDegree(i, targetMode);
      
      borrowed.push({
        function: `${targetMode[0].toUpperCase()}${i + 1}`,
        root,
        notes: this.chordTemplates.get(quality).map(interval => root + interval),
        quality,
        symbol: this.getChordSymbol(root, quality),
        sourceMode: targetMode
      });
    }
    
    return borrowed;
  }

  /**
   * Get chord quality for scale degree in mode
   * @param {number} degree 
   * @param {string} mode 
   * @returns {string}
   */
  getChordQualityForScaleDegree(degree, mode) {
    // Simplified - could be more sophisticated
    const qualities = {
      'major': ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
      'minor': ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
      'dorian': ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major']
    };
    
    const pattern = qualities[mode] || qualities.major;
    return pattern[degree % pattern.length];
  }

  /**
   * Reharmonize a chord progression
   * @param {Array} progression 
   * @param {Object} options 
   * @returns {Array}
   */
  reharmonize(progression, options = {}) {
    const {
      level = 0.5, // 0-1, how much to change
      style = 'jazz',
      maintainBassLine = false
    } = options;
    
    const reharmonized = [];
    
    for (let i = 0; i < progression.length; i++) {
      const chord = progression[i];
      
      if (Math.random() > level) {
        // Keep original
        reharmonized.push(chord);
      } else {
        // Reharmonize
        const alternatives = this.getReharmonizationOptions(chord, {
          previous: i > 0 ? reharmonized[i - 1] : null,
          next: i < progression.length - 1 ? progression[i + 1] : null,
          style
        });
        
        if (alternatives.length > 0) {
          let selected = alternatives[0];
          
          if (maintainBassLine) {
            // Keep same bass note
            selected = this.adjustBassNote(selected, chord.notes[0]);
          }
          
          reharmonized.push(selected);
        } else {
          reharmonized.push(chord);
        }
      }
    }
    
    return reharmonized;
  }

  /**
   * Get reharmonization options
   * @param {Object} chord 
   * @param {Object} context 
   * @returns {Array}
   */
  getReharmonizationOptions(chord, context) {
    const options = [];
    
    // Tritone substitution
    if (chord.quality === '7') {
      const tritoneRoot = (chord.root + 6) % 12;
      options.push(this.functionToChord(`bII7`));
    }
    
    // Related ii-V
    if (chord.function === 'I') {
      options.push(this.functionToChord('ii'));
      options.push(this.functionToChord('V'));
    }
    
    // Modal interchange
    const borrowed = this.getModalInterchangeChords();
    options.push(...borrowed.slice(0, 3));
    
    // Extended/altered versions
    if (chord.quality === 'major') {
      options.push({ ...chord, quality: 'maj7', notes: this.generateChord(`${chord.symbol}maj7`) });
      options.push({ ...chord, quality: 'maj9', notes: this.generateChord(`${chord.symbol}maj9`) });
    }
    
    return options;
  }

  /**
   * Calculate chord tension
   * @param {Array} notes 
   * @returns {number} 0-1
   */
  calculateChordTension(notes) {
    let tension = 0;
    const intervals = [];
    
    // Calculate all intervals
    for (let i = 0; i < notes.length - 1; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        intervals.push((notes[j] - notes[i]) % 12);
      }
    }
    
    // Score dissonant intervals
    const dissonantIntervals = {
      1: 0.8,  // Minor second
      2: 0.3,  // Major second
      6: 0.6,  // Tritone
      10: 0.4, // Minor seventh
      11: 0.5  // Major seventh
    };
    
    for (const interval of intervals) {
      tension += dissonantIntervals[interval] || 0;
    }
    
    // Normalize
    return Math.min(1, tension / intervals.length);
  }

  /**
   * Utility methods
   */
  
  checkModalInterchange(root, chordType) {
    // Check if chord exists in current scale
    const scale = this.scales.get(this.currentScale);
    const keyRoot = Tone.Frequency(this.currentKey).toMidi();
    const rootPitchClass = (root - keyRoot + 12) % 12;
    
    return !scale.includes(rootPitchClass);
  }

  analyzeVoicing(notes) {
    const intervals = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i] - notes[i - 1]);
    }
    
    const spread = notes[notes.length - 1] - notes[0];
    const density = notes.length / (spread / 12);
    
    return {
      intervals,
      spread,
      density,
      type: this.classifyVoicing(intervals, spread)
    };
  }

  classifyVoicing(intervals, spread) {
    if (spread < 12) return 'close';
    if (spread > 24) return 'open';
    if (intervals.some(i => i > 7)) return 'drop';
    return 'mixed';
  }

  findExtensions(intervals) {
    const extensions = [];
    if (intervals.includes(14) || intervals.includes(2)) extensions.push('9');
    if (intervals.includes(17) || intervals.includes(5)) extensions.push('11');
    if (intervals.includes(21) || intervals.includes(9)) extensions.push('13');
    return extensions;
  }

  findAlterations(intervals) {
    const alterations = [];
    if (intervals.includes(6)) alterations.push('b5');
    if (intervals.includes(8)) alterations.push('#5');
    if (intervals.includes(13)) alterations.push('b9');
    if (intervals.includes(15)) alterations.push('#9');
    if (intervals.includes(18)) alterations.push('#11');
    if (intervals.includes(20)) alterations.push('b13');
    return alterations;
  }

  getChordSymbol(root, type, inversion = null) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootName = noteNames[root % 12];
    
    let symbol = rootName;
    
    // Add quality
    const qualitySymbols = {
      'major': '',
      'minor': 'm',
      'diminished': '°',
      'augmented': '+',
      'maj7': 'maj7',
      '7': '7',
      'm7': 'm7',
      'dim7': '°7',
      'm7b5': 'ø7'
    };
    
    symbol += qualitySymbols[type] || type;
    
    // Add inversion notation if needed
    if (inversion && inversion.bassNote !== inversion.root) {
      const bassName = noteNames[inversion.bassNote % 12];
      symbol += `/${bassName}`;
    }
    
    return symbol;
  }

  calculateMovement(notes1, notes2) {
    let total = 0;
    const len = Math.min(notes1.length, notes2.length);
    
    for (let i = 0; i < len; i++) {
      total += Math.abs(notes2[i] - notes1[i]);
    }
    
    return total;
  }

  weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  getScaleFunction(degree) {
    const functions = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    return functions[degree] || 'I';
  }

  adjustBassNote(chord, targetBass) {
    const adjusted = { ...chord };
    adjusted.notes = [targetBass, ...chord.notes.slice(1)];
    return adjusted;
  }

  /**
   * Set current key and scale
   * @param {string} key 
   * @param {string} scale 
   */
  setKey(key, scale = 'major') {
    this.currentKey = key;
    this.currentScale = scale;
    
    // Update voice leading engine
    voiceLeadingEngine.setKey(key, scale);
  }

  /**
   * Get current harmonic context
   * @returns {Object}
   */
  getContext() {
    return {
      key: this.currentKey,
      scale: this.currentScale,
      mode: this.currentMode,
      currentChord: this.currentChord,
      tensionLevel: this.tensionLevel,
      history: this.progressionHistory.slice(-8)
    };
  }
}

// Create singleton instance
export const harmonyEngine = new HarmonyEngine();