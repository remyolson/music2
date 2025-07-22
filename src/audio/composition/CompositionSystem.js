import { update as updateState } from '../../state.js';
import { voiceLeadingEngine } from './VoiceLeadingEngine.js';
import { harmonyEngine } from './HarmonyEngine.js';
import { phraseManager } from './PhraseManager.js';
import { chordRecognition } from './ChordRecognition.js';
import { scaleConstraints } from './ScaleConstraints.js';
import { musicExpressionSystem } from '../dynamics/MusicExpressionSystem.js';

/**
 * CompositionSystem - Unified interface for all composition tools
 * Integrates voice leading, harmony, phrasing, and scale constraints
 */
export class CompositionSystem {
  constructor() {
    // System components
    this.voiceLeading = voiceLeadingEngine;
    this.harmony = harmonyEngine;
    this.phrases = phraseManager;
    this.chordRecognition = chordRecognition;
    this.scales = scaleConstraints;
    
    // Current composition state
    this.currentKey = 'C';
    this.currentScale = 'major';
    this.currentTempo = 120;
    this.currentTimeSignature = [4, 4];
    
    // Composition mode
    this.mode = 'free'; // 'free', 'guided', 'strict'
    this.style = 'contemporary'; // 'classical', 'jazz', 'pop', 'contemporary'
    
    // Real-time composition assistance
    this.assistanceEnabled = true;
    this.suggestionCallbacks = new Set();
    
    // Initialize connections
    this.initializeConnections();
  }

  /**
   * Initialize connections between components
   */
  initializeConnections() {
    // Set up MIDI routing for chord recognition
    if (musicExpressionSystem && musicExpressionSystem.midiInitialized) {
      const unsubscribe = musicExpressionSystem.midiInputHandler.onNote((event) => {
        this.chordRecognition.processNote(event);
      });
      
      // Store unsubscribe for cleanup
      this.midiUnsubscribe = unsubscribe;
    }
    
    // Connect chord recognition to harmony engine
    this.chordRecognition.onChordChange((chord) => {
      this.handleChordChange(chord);
    });
    
    // Connect chord progression to voice leading
    this.chordRecognition.onProgressionDetected((progression) => {
      this.handleProgressionDetected(progression);
    });
  }

  /**
   * Set composition key and scale
   * @param {string} key 
   * @param {string} scale 
   */
  setKeyAndScale(key, scale = 'major') {
    this.currentKey = key;
    this.currentScale = scale;
    
    // Update all components
    this.harmony.setKey(key, scale);
    this.voiceLeading.setKey(key, scale);
    this.scales.setScale(key, scale);
    
    // Update state
    updateState({
      compositionKey: key,
      compositionScale: scale
    });
  }

  /**
   * Set composition style
   * @param {string} style 
   */
  setStyle(style) {
    this.style = style;
    
    // Configure components for style
    switch (style) {
      case 'classical':
        this.voiceLeading.rules.avoidParallelFifths = true;
        this.voiceLeading.rules.avoidParallelOctaves = true;
        this.harmony.tensionLevel = 0.3;
        this.scales.strictMode = true;
        break;
        
      case 'jazz':
        this.voiceLeading.rules.avoidParallelFifths = false;
        this.harmony.tensionLevel = 0.7;
        this.harmony.allowExtendedHarmony = true;
        this.scales.allowChromaticism = true;
        break;
        
      case 'pop':
        this.voiceLeading.rules.avoidVoiceCrossing = false;
        this.harmony.tensionLevel = 0.4;
        this.scales.strictMode = false;
        break;
        
      case 'contemporary':
        this.voiceLeading.rules = {
          ...this.voiceLeading.rules,
          avoidParallelFifths: false,
          avoidParallelOctaves: false
        };
        this.harmony.tensionLevel = 0.6;
        this.scales.allowChromaticism = true;
        break;
    }
  }

  /**
   * Process a melody and generate harmony
   * @param {Array} melody - Array of note events
   * @param {Object} options 
   * @returns {Object} Harmonization result
   */
  harmonizeMelody(melody, options = {}) {
    const {
      voiceCount = 4,
      style = this.style,
      density = 'moderate'
    } = options;
    
    // Analyze phrases first
    const phrases = this.phrases.analyzePhrases(melody, {
      tempo: this.currentTempo,
      style
    });
    
    // Generate harmony for each phrase
    const harmonization = this.harmony.harmonizeMelody(melody, {
      style,
      density
    });
    
    // Apply voice leading
    const voicedHarmony = [];
    
    for (const harmonyEvent of harmonization) {
      const voices = this.voiceLeading.processChord(harmonyEvent.chord, {
        forceRoot: true,
        openVoicing: style === 'jazz'
      });
      
      voicedHarmony.push({
        ...harmonyEvent,
        voices: Object.values(voices).filter(v => v !== null)
      });
    }
    
    // Apply phrasing
    const phrasedResult = this.applyPhrasingToHarmony(voicedHarmony, phrases);
    
    return {
      harmony: phrasedResult,
      phrases,
      key: this.currentKey,
      scale: this.currentScale
    };
  }

  /**
   * Generate a chord progression
   * @param {Object} options 
   * @returns {Array} Chord progression
   */
  generateProgression(options = {}) {
    const {
      length = 8,
      style = this.style,
      startChord = 'I',
      endChord = 'I',
      complexity = 0.5
    } = options;
    
    // Generate basic progression
    const progression = this.harmony.generateProgression({
      length,
      style,
      startChord,
      endChord,
      complexity
    });
    
    // Apply voice leading
    const voicedProgression = [];
    
    for (const chord of progression) {
      const voices = this.voiceLeading.processChord(chord.notes, {
        forceRoot: true,
        spread: style === 'classical' ? 1.2 : 1.0
      });
      
      voicedProgression.push({
        ...chord,
        voices,
        voicedNotes: Object.values(voices).filter(v => v !== null)
      });
    }
    
    return voicedProgression;
  }

  /**
   * Get real-time composition suggestions
   * @param {Object} context 
   * @returns {Object} Suggestions
   */
  getSuggestions(context = {}) {
    const {
      currentNotes = [],
      previousChord = null,
      melodyNote = null,
      measurePosition = 0
    } = context;
    
    const suggestions = {
      nextChords: [],
      melodyNotes: [],
      bassNotes: [],
      voiceLeading: null
    };
    
    // Get chord suggestions
    if (previousChord) {
      suggestions.nextChords = this.harmony.suggestNextChord(previousChord, {
        style: this.style
      });
    } else {
      suggestions.nextChords = this.chordRecognition.getChordSuggestions();
    }
    
    // Get melody suggestions
    if (currentNotes.length > 0) {
      suggestions.melodyNotes = this.scales.getNoteSuggestions({
        currentChord: currentNotes,
        previousNotes: context.previousMelody || []
      });
    }
    
    // Get voice leading suggestions
    if (currentNotes.length >= 3) {
      const analysis = this.harmony.analyzeChord(currentNotes);
      if (analysis && suggestions.nextChords.length > 0) {
        suggestions.voiceLeading = this.voiceLeading.getSuggestions(
          currentNotes,
          suggestions.nextChords.map(c => c.notes)
        );
      }
    }
    
    // Get bass note suggestions
    if (suggestions.nextChords.length > 0) {
      suggestions.bassNotes = suggestions.nextChords.map(chord => ({
        note: chord.root,
        weight: chord.probability || 0.5,
        function: chord.function
      }));
    }
    
    return suggestions;
  }

  /**
   * Analyze a composition
   * @param {Object} composition 
   * @returns {Object} Analysis
   */
  analyzeComposition(composition) {
    const analysis = {
      key: null,
      form: null,
      phraseStructure: null,
      harmonicRhythm: null,
      complexity: 0,
      style: null
    };
    
    // Extract chords and melody
    const chords = this.extractChords(composition);
    const melody = this.extractMelody(composition);
    
    // Analyze key
    analysis.key = this.harmony.detectKey(chords);
    
    // Analyze phrases
    const phrases = this.phrases.analyzePhrases(melody);
    analysis.phraseStructure = this.phrases.analyzePhraseStructure(phrases);
    
    // Analyze form
    analysis.form = analysis.phraseStructure.form;
    
    // Analyze harmonic rhythm
    analysis.harmonicRhythm = this.analyzeHarmonicRhythm(chords);
    
    // Calculate complexity
    analysis.complexity = this.calculateComplexity(chords, melody, phrases);
    
    // Determine style
    analysis.style = this.determineStyle(analysis);
    
    return analysis;
  }

  /**
   * Apply scale constraints to notes
   * @param {Array} notes 
   * @param {Object} options 
   * @returns {Array} Constrained notes
   */
  constrainToScale(notes, options = {}) {
    if (Array.isArray(notes)) {
      // Constrain chord
      return this.scales.constrainChord(notes, options);
    } else {
      // Constrain single note
      return this.scales.constrainNote(notes, options);
    }
  }

  /**
   * Reharmonize a progression
   * @param {Array} progression 
   * @param {Object} options 
   * @returns {Array} Reharmonized progression
   */
  reharmonize(progression, options = {}) {
    const reharmonized = this.harmony.reharmonize(progression, {
      level: options.level || 0.5,
      style: this.style,
      maintainBassLine: options.keepBass || false
    });
    
    // Apply voice leading to new harmony
    return reharmonized.map(chord => {
      const voices = this.voiceLeading.processChord(chord.notes);
      return {
        ...chord,
        voices,
        voicedNotes: Object.values(voices).filter(v => v !== null)
      };
    });
  }

  /**
   * Handle chord change from recognition
   * @param {Object} chord 
   */
  handleChordChange(chord) {
    if (!this.assistanceEnabled) return;
    
    // Get suggestions based on new chord
    const suggestions = this.getSuggestions({
      currentNotes: chord.notes,
      previousChord: this.chordRecognition.previousChord
    });
    
    // Notify suggestion callbacks
    this.notifySuggestions({
      type: 'chord_change',
      chord,
      suggestions
    });
  }

  /**
   * Handle progression detection
   * @param {Object} progression 
   */
  handleProgressionDetected(progression) {
    // Analyze progression in context
    const analysis = {
      key: progression.key,
      type: progression.type,
      nextLikely: this.harmony.getNextChordOptions(
        progression.chords[progression.chords.length - 1].function,
        this.style
      )
    };
    
    // Update current key if detected
    if (progression.key && progression.key !== this.currentKey) {
      this.setKeyAndScale(progression.key, this.currentScale);
    }
    
    // Notify
    updateState({
      detectedProgression: progression,
      progressionAnalysis: analysis
    });
  }

  /**
   * Apply phrasing to harmony
   * @param {Array} harmony 
   * @param {Array} phrases 
   * @returns {Array}
   */
  applyPhrasingToHarmony(harmony, phrases) {
    const phrasedHarmony = [...harmony];
    
    for (const phrase of phrases) {
      // Apply dynamics
      for (const dynamic of phrase.dynamics) {
        const index = phrasedHarmony.findIndex(h => h.time === dynamic.time);
        if (index >= 0) {
          phrasedHarmony[index].velocity = dynamic.value;
        }
      }
      
      // Apply breathing
      for (const breath of phrase.breathingPoints) {
        const index = phrasedHarmony.findIndex(h => 
          h.time <= breath.time && h.time + h.duration > breath.time
        );
        
        if (index >= 0) {
          // Shorten chord for breath
          phrasedHarmony[index].duration -= breath.duration;
        }
      }
    }
    
    return phrasedHarmony;
  }

  /**
   * Extract chords from composition
   * @param {Object} composition 
   * @returns {Array}
   */
  extractChords(composition) {
    // Implementation depends on composition format
    // This is a placeholder
    return composition.chords || [];
  }

  /**
   * Extract melody from composition
   * @param {Object} composition 
   * @returns {Array}
   */
  extractMelody(composition) {
    // Implementation depends on composition format
    // This is a placeholder
    return composition.melody || [];
  }

  /**
   * Analyze harmonic rhythm
   * @param {Array} chords 
   * @returns {Object}
   */
  analyzeHarmonicRhythm(chords) {
    if (chords.length < 2) return { rate: 'static', changes: 0 };
    
    const changes = [];
    for (let i = 1; i < chords.length; i++) {
      if (chords[i].root !== chords[i-1].root || 
          chords[i].type !== chords[i-1].type) {
        changes.push(chords[i].time - chords[i-1].time);
      }
    }
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    
    return {
      rate: avgChange < 1 ? 'fast' : avgChange < 2 ? 'moderate' : 'slow',
      changes: changes.length,
      averageChange: avgChange
    };
  }

  /**
   * Calculate composition complexity
   * @param {Array} chords 
   * @param {Array} melody 
   * @param {Array} phrases 
   * @returns {number} 0-1
   */
  calculateComplexity(chords, melody, phrases) {
    let complexity = 0;
    
    // Harmonic complexity
    const uniqueChords = new Set(chords.map(c => c.type));
    complexity += Math.min(uniqueChords.size / 10, 0.3);
    
    // Melodic complexity
    const intervals = [];
    for (let i = 1; i < melody.length; i++) {
      intervals.push(Math.abs(melody[i].pitch - melody[i-1].pitch));
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    complexity += Math.min(avgInterval / 12, 0.3);
    
    // Rhythmic complexity
    const uniqueRhythms = new Set(melody.map(n => n.duration));
    complexity += Math.min(uniqueRhythms.size / 5, 0.2);
    
    // Phrase complexity
    const avgPhraseLength = phrases.reduce((sum, p) => sum + p.duration, 0) / phrases.length;
    complexity += avgPhraseLength > 8 ? 0.2 : 0.1;
    
    return Math.min(complexity, 1);
  }

  /**
   * Determine style from analysis
   * @param {Object} analysis 
   * @returns {string}
   */
  determineStyle(analysis) {
    // Simplified style detection
    if (analysis.complexity < 0.3 && analysis.harmonicRhythm.rate === 'slow') {
      return 'pop';
    } else if (analysis.complexity > 0.7) {
      return 'jazz';
    } else if (analysis.form && analysis.form.includes('ABAB')) {
      return 'classical';
    }
    
    return 'contemporary';
  }

  /**
   * Register suggestion callback
   * @param {Function} callback 
   * @returns {Function} Unsubscribe
   */
  onSuggestions(callback) {
    this.suggestionCallbacks.add(callback);
    return () => this.suggestionCallbacks.delete(callback);
  }

  /**
   * Notify suggestion callbacks
   * @param {Object} data 
   */
  notifySuggestions(data) {
    this.suggestionCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in suggestion callback:', error);
      }
    });
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      key: this.currentKey,
      scale: this.currentScale,
      tempo: this.currentTempo,
      timeSignature: this.currentTimeSignature,
      style: this.style,
      mode: this.mode,
      chordRecognition: this.chordRecognition.getState(),
      currentSuggestions: this.getSuggestions()
    };
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.midiUnsubscribe) {
      this.midiUnsubscribe();
    }
    
    this.suggestionCallbacks.clear();
    this.chordRecognition.reset();
    this.voiceLeading.reset();
  }
}

// Create singleton instance
export const compositionSystem = new CompositionSystem();