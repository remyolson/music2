import * as Tone from 'tone';
import { update as updateState } from '../../state.js';

/**
 * PhraseManager - Manages musical phrases, breathing, and natural phrasing
 * Detects phrase boundaries and applies appropriate musical shaping
 */
export class PhraseManager {
  constructor() {
    // Phrase detection settings
    this.phraseMinLength = 2; // Minimum beats
    this.phraseMaxLength = 16; // Maximum beats
    this.phraseTypicalLength = 4; // Typical phrase length
    
    // Phrase analysis
    this.currentPhrase = null;
    this.phraseHistory = [];
    this.maxHistorySize = 32;
    
    // Breathing and rests
    this.breathingEnabled = true;
    this.breathDuration = 0.1; // seconds
    this.breathDepth = 0.3; // volume reduction
    
    // Musical shaping
    this.dynamicShaping = true;
    this.phraseArchTypes = ['arch', 'ascending', 'descending', 'plateau', 'wave'];
    
    // Instrument-specific settings
    this.instrumentBreathingRules = new Map();
    this.initializeBreathingRules();
    
    // Phrase templates
    this.phraseTemplates = new Map();
    this.initializePhraseTemplates();
  }

  /**
   * Initialize breathing rules for different instruments
   */
  initializeBreathingRules() {
    // Wind instruments - need regular breathing
    this.instrumentBreathingRules.set('wind', {
      maxContinuousBeats: 8,
      minBreathDuration: 0.15,
      breathFrequency: 'regular',
      staggerBreathing: true // For sections
    });
    
    // Brass instruments - need breathing but can play longer
    this.instrumentBreathingRules.set('brass', {
      maxContinuousBeats: 12,
      minBreathDuration: 0.2,
      breathFrequency: 'regular',
      staggerBreathing: true
    });
    
    // Strings - bow changes
    this.instrumentBreathingRules.set('strings', {
      maxContinuousBeats: 16,
      minBreathDuration: 0.05,
      breathFrequency: 'occasional',
      staggerBreathing: false,
      bowChanges: true
    });
    
    // Voice - natural breathing required
    this.instrumentBreathingRules.set('voice', {
      maxContinuousBeats: 6,
      minBreathDuration: 0.2,
      breathFrequency: 'natural',
      staggerBreathing: true,
      considerText: true
    });
    
    // Piano/keyboards - no breathing needed
    this.instrumentBreathingRules.set('keyboard', {
      maxContinuousBeats: Infinity,
      minBreathDuration: 0,
      breathFrequency: 'none',
      staggerBreathing: false
    });
  }

  /**
   * Initialize common phrase templates
   */
  initializePhraseTemplates() {
    // Question and answer
    this.phraseTemplates.set('question-answer', {
      structure: ['question', 'answer'],
      lengths: [4, 4],
      dynamics: ['mf', 'mp'],
      endings: ['open', 'closed']
    });
    
    // Period (antecedent-consequent)
    this.phraseTemplates.set('period', {
      structure: ['antecedent', 'consequent'],
      lengths: [4, 4],
      dynamics: ['mf', 'mf'],
      endings: ['half-cadence', 'full-cadence']
    });
    
    // Sentence
    this.phraseTemplates.set('sentence', {
      structure: ['presentation', 'presentation', 'continuation'],
      lengths: [2, 2, 4],
      dynamics: ['mf', 'mf', 'f'],
      endings: ['open', 'open', 'closed']
    });
    
    // Through-composed
    this.phraseTemplates.set('through-composed', {
      structure: ['a', 'b', 'c', 'd'],
      lengths: [2, 3, 2, 3],
      dynamics: ['p', 'mp', 'mf', 'f'],
      endings: ['open', 'open', 'open', 'closed']
    });
  }

  /**
   * Analyze notes and detect phrases
   * @param {Array} notes - Array of note events
   * @param {Object} options 
   * @returns {Array} Detected phrases
   */
  analyzePhrases(notes, options = {}) {
    const {
      instrumentType = 'general',
      tempo = 120,
      timeSignature = [4, 4],
      style = 'classical'
    } = options;
    
    const phrases = [];
    let currentPhrase = this.createNewPhrase();
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const nextNote = notes[i + 1];
      
      // Add note to current phrase
      currentPhrase.notes.push(note);
      
      // Check for phrase boundary
      if (this.isPhraseEnd(note, nextNote, currentPhrase, options)) {
        // Finalize current phrase
        this.finalizePhrase(currentPhrase, options);
        phrases.push(currentPhrase);
        
        // Start new phrase
        currentPhrase = this.createNewPhrase();
        currentPhrase.startTime = nextNote ? nextNote.time : null;
      }
    }
    
    // Add final phrase if it has notes
    if (currentPhrase.notes.length > 0) {
      this.finalizePhrase(currentPhrase, options);
      phrases.push(currentPhrase);
    }
    
    // Post-process phrases
    this.postProcessPhrases(phrases, options);
    
    return phrases;
  }

  /**
   * Check if current position is a phrase end
   * @param {Object} currentNote 
   * @param {Object} nextNote 
   * @param {Object} phrase 
   * @param {Object} options 
   * @returns {boolean}
   */
  isPhraseEnd(currentNote, nextNote, phrase, options) {
    // No next note - definitely end
    if (!nextNote) return true;
    
    // Check for explicit rest
    const gap = nextNote.time - (currentNote.time + currentNote.duration);
    if (gap > 0.5) return true; // Significant rest
    
    // Check phrase length
    const phraseLength = currentNote.time + currentNote.duration - phrase.startTime;
    if (phraseLength >= this.phraseTypicalLength) {
      // Look for musical reasons to end phrase
      
      // Large leap
      if (Math.abs(nextNote.pitch - currentNote.pitch) > 7) {
        return true;
      }
      
      // Rhythmic pattern completion
      if (this.isRhythmicCadence(phrase.notes)) {
        return true;
      }
      
      // Melodic cadence
      if (this.isMelodicCadence(phrase.notes)) {
        return true;
      }
    }
    
    // Maximum phrase length exceeded
    if (phraseLength >= this.phraseMaxLength) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a new phrase object
   * @returns {Object}
   */
  createNewPhrase() {
    return {
      id: `phrase_${Date.now()}`,
      startTime: 0,
      endTime: 0,
      duration: 0,
      notes: [],
      type: null,
      arch: null,
      dynamics: [],
      breathingPoints: [],
      isComplete: false
    };
  }

  /**
   * Finalize phrase analysis
   * @param {Object} phrase 
   * @param {Object} options 
   */
  finalizePhrase(phrase, options) {
    // Calculate duration
    if (phrase.notes.length > 0) {
      phrase.startTime = phrase.notes[0].time;
      const lastNote = phrase.notes[phrase.notes.length - 1];
      phrase.endTime = lastNote.time + lastNote.duration;
      phrase.duration = phrase.endTime - phrase.startTime;
    }
    
    // Analyze phrase type
    phrase.type = this.analyzePhraseType(phrase);
    
    // Analyze melodic arch
    phrase.arch = this.analyzeMelodicArch(phrase);
    
    // Plan dynamics
    phrase.dynamics = this.planPhraseDynamics(phrase, options);
    
    // Plan breathing points
    phrase.breathingPoints = this.planBreathingPoints(phrase, options);
    
    phrase.isComplete = true;
  }

  /**
   * Analyze phrase type
   * @param {Object} phrase 
   * @returns {string}
   */
  analyzePhraseType(phrase) {
    const notes = phrase.notes;
    if (notes.length < 2) return 'fragment';
    
    // Check intervals
    const intervals = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i].pitch - notes[i - 1].pitch);
    }
    
    // Analyze contour
    const ascending = intervals.filter(i => i > 0).length;
    const descending = intervals.filter(i => i < 0).length;
    const repeated = intervals.filter(i => i === 0).length;
    
    // Check ending
    const lastInterval = intervals[intervals.length - 1];
    const isOpenEnding = Math.abs(lastInterval) > 2;
    
    // Determine type
    if (ascending > descending * 2) {
      return 'ascending';
    } else if (descending > ascending * 2) {
      return 'descending';
    } else if (repeated > intervals.length / 2) {
      return 'static';
    } else if (isOpenEnding) {
      return 'question';
    } else {
      return 'balanced';
    }
  }

  /**
   * Analyze melodic arch of phrase
   * @param {Object} phrase 
   * @returns {string}
   */
  analyzeMelodicArch(phrase) {
    const notes = phrase.notes;
    if (notes.length < 3) return 'flat';
    
    // Find highest and lowest points
    let highest = notes[0];
    let lowest = notes[0];
    let highestIndex = 0;
    let lowestIndex = 0;
    
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].pitch > highest.pitch) {
        highest = notes[i];
        highestIndex = i;
      }
      if (notes[i].pitch < lowest.pitch) {
        lowest = notes[i];
        lowestIndex = i;
      }
    }
    
    // Determine arch type based on peak position
    const relativePosition = highestIndex / notes.length;
    
    if (relativePosition < 0.3) {
      return 'front-loaded';
    } else if (relativePosition > 0.7) {
      return 'back-loaded';
    } else if (Math.abs(relativePosition - 0.5) < 0.2) {
      return 'arch';
    } else {
      return 'irregular';
    }
  }

  /**
   * Plan dynamics for phrase
   * @param {Object} phrase 
   * @param {Object} options 
   * @returns {Array}
   */
  planPhraseDynamics(phrase, options) {
    const dynamics = [];
    const archType = phrase.arch;
    const notes = phrase.notes;
    
    // Base dynamic level
    let baseDynamic = 0.7; // mf
    
    // Apply arch-based shaping
    for (let i = 0; i < notes.length; i++) {
      const position = i / notes.length;
      let dynamic = baseDynamic;
      
      switch (archType) {
        case 'arch':
          // Peak in middle
          dynamic = baseDynamic + 0.2 * Math.sin(position * Math.PI);
          break;
          
        case 'ascending':
          // Gradual crescendo
          dynamic = baseDynamic + 0.3 * position;
          break;
          
        case 'descending':
          // Gradual diminuendo
          dynamic = baseDynamic + 0.3 * (1 - position);
          break;
          
        case 'front-loaded':
          // Quick peak then decay
          dynamic = baseDynamic + 0.3 * Math.exp(-position * 3);
          break;
          
        case 'back-loaded':
          // Build to climax
          dynamic = baseDynamic + 0.3 * Math.pow(position, 2);
          break;
          
        default:
          // Subtle variation
          dynamic = baseDynamic + 0.1 * Math.sin(position * Math.PI * 2);
      }
      
      // Add micro-dynamics for expression
      dynamic += (Math.random() - 0.5) * 0.05;
      
      dynamics.push({
        time: notes[i].time,
        value: Math.max(0.1, Math.min(1.0, dynamic))
      });
    }
    
    return dynamics;
  }

  /**
   * Plan breathing points for phrase
   * @param {Object} phrase 
   * @param {Object} options 
   * @returns {Array}
   */
  planBreathingPoints(phrase, options) {
    const breathingPoints = [];
    const instrumentType = options.instrumentType || 'general';
    
    // Get breathing rules for instrument
    const rules = this.getBreathingRules(instrumentType);
    if (rules.breathFrequency === 'none') {
      return breathingPoints;
    }
    
    // Analyze phrase for natural breathing spots
    const notes = phrase.notes;
    let continuousBeats = 0;
    
    for (let i = 0; i < notes.length - 1; i++) {
      const currentNote = notes[i];
      const nextNote = notes[i + 1];
      
      continuousBeats += currentNote.duration;
      
      // Check if breathing needed
      let needsBreath = false;
      
      // Forced breathing after max continuous playing
      if (continuousBeats >= rules.maxContinuousBeats) {
        needsBreath = true;
      }
      
      // Natural breathing points
      const gap = nextNote.time - (currentNote.time + currentNote.duration);
      if (gap > 0.1) {
        // There's already a rest
        needsBreath = true;
      }
      
      // Musical breathing points
      if (this.isMusicalBreathingPoint(currentNote, nextNote, i, notes)) {
        needsBreath = true;
      }
      
      if (needsBreath) {
        breathingPoints.push({
          time: currentNote.time + currentNote.duration,
          duration: Math.max(rules.minBreathDuration, gap),
          type: gap > 0.1 ? 'rest' : 'breath',
          instrument: instrumentType
        });
        
        continuousBeats = 0;
      }
    }
    
    return breathingPoints;
  }

  /**
   * Get breathing rules for instrument type
   * @param {string} instrumentType 
   * @returns {Object}
   */
  getBreathingRules(instrumentType) {
    // Check specific instrument
    if (this.instrumentBreathingRules.has(instrumentType)) {
      return this.instrumentBreathingRules.get(instrumentType);
    }
    
    // Check instrument family
    if (instrumentType.includes('flute') || instrumentType.includes('clarinet') || 
        instrumentType.includes('oboe') || instrumentType.includes('bassoon') ||
        instrumentType.includes('saxophone')) {
      return this.instrumentBreathingRules.get('wind');
    }
    
    if (instrumentType.includes('trumpet') || instrumentType.includes('horn') || 
        instrumentType.includes('trombone') || instrumentType.includes('tuba')) {
      return this.instrumentBreathingRules.get('brass');
    }
    
    if (instrumentType.includes('violin') || instrumentType.includes('viola') || 
        instrumentType.includes('cello') || instrumentType.includes('bass')) {
      return this.instrumentBreathingRules.get('strings');
    }
    
    if (instrumentType.includes('piano') || instrumentType.includes('organ') || 
        instrumentType.includes('synth')) {
      return this.instrumentBreathingRules.get('keyboard');
    }
    
    // Default rules
    return {
      maxContinuousBeats: 8,
      minBreathDuration: 0.1,
      breathFrequency: 'occasional',
      staggerBreathing: false
    };
  }

  /**
   * Check if position is a musical breathing point
   * @param {Object} currentNote 
   * @param {Object} nextNote 
   * @param {number} index 
   * @param {Array} notes 
   * @returns {boolean}
   */
  isMusicalBreathingPoint(currentNote, nextNote, index, notes) {
    // After a long note
    if (currentNote.duration > 2) return true;
    
    // Before a large leap
    if (Math.abs(nextNote.pitch - currentNote.pitch) > 7) return true;
    
    // At phrase sub-boundaries (every 2 bars typically)
    if ((currentNote.time + currentNote.duration) % 8 === 0) return true;
    
    // After a cadential pattern
    if (index >= 2) {
      const prev = notes[index - 1];
      const prevPrev = notes[index - 2];
      
      // Simple cadence detection
      if (this.isCadentialMotion(prevPrev.pitch, prev.pitch, currentNote.pitch)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for cadential motion
   * @param {number} pitch1 
   * @param {number} pitch2 
   * @param {number} pitch3 
   * @returns {boolean}
   */
  isCadentialMotion(pitch1, pitch2, pitch3) {
    // Descending stepwise motion
    if (pitch1 - pitch2 === 2 && pitch2 - pitch3 === 1) return true;
    
    // V-I motion
    if (pitch2 - pitch3 === 7 || pitch2 - pitch3 === -5) return true;
    
    // Leading tone resolution
    if (pitch2 - pitch3 === -1 && Math.abs(pitch1 - pitch2) > 2) return true;
    
    return false;
  }

  /**
   * Post-process phrases for final adjustments
   * @param {Array} phrases 
   * @param {Object} options 
   */
  postProcessPhrases(phrases, options) {
    // Link related phrases
    for (let i = 0; i < phrases.length - 1; i++) {
      const current = phrases[i];
      const next = phrases[i + 1];
      
      // Check for question-answer relationship
      if (current.type === 'question' && next.type === 'balanced') {
        current.relationship = 'question';
        next.relationship = 'answer';
        current.relatedPhraseId = next.id;
        next.relatedPhraseId = current.id;
      }
      
      // Check for parallel phrases
      if (this.arePhrasesParallel(current, next)) {
        current.relationship = 'parallel1';
        next.relationship = 'parallel2';
      }
    }
    
    // Apply style-specific adjustments
    this.applyStyleAdjustments(phrases, options.style);
  }

  /**
   * Check if phrases are parallel
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {boolean}
   */
  arePhrasesParallel(phrase1, phrase2) {
    if (phrase1.notes.length !== phrase2.notes.length) return false;
    
    // Check if intervals are similar
    const intervals1 = this.getPhraseIntervals(phrase1);
    const intervals2 = this.getPhraseIntervals(phrase2);
    
    let matches = 0;
    for (let i = 0; i < Math.min(intervals1.length, intervals2.length); i++) {
      if (Math.abs(intervals1[i] - intervals2[i]) <= 2) {
        matches++;
      }
    }
    
    return matches / intervals1.length > 0.7;
  }

  /**
   * Get intervals for phrase
   * @param {Object} phrase 
   * @returns {Array}
   */
  getPhraseIntervals(phrase) {
    const intervals = [];
    for (let i = 1; i < phrase.notes.length; i++) {
      intervals.push(phrase.notes[i].pitch - phrase.notes[i - 1].pitch);
    }
    return intervals;
  }

  /**
   * Apply style-specific adjustments
   * @param {Array} phrases 
   * @param {string} style 
   */
  applyStyleAdjustments(phrases, style) {
    switch (style) {
      case 'classical':
        // Clear phrase boundaries
        phrases.forEach(phrase => {
          if (phrase.breathingPoints.length > 0) {
            phrase.breathingPoints[phrase.breathingPoints.length - 1].duration *= 1.2;
          }
        });
        break;
        
      case 'romantic':
        // More rubato and expression
        phrases.forEach(phrase => {
          phrase.dynamics = this.addRubato(phrase.dynamics);
        });
        break;
        
      case 'jazz':
        // Syncopated breathing
        phrases.forEach(phrase => {
          phrase.breathingPoints = this.jazzifyBreathing(phrase.breathingPoints);
        });
        break;
        
      case 'contemporary':
        // Irregular phrases allowed
        // No adjustment needed
        break;
    }
  }

  /**
   * Add rubato to dynamics
   * @param {Array} dynamics 
   * @returns {Array}
   */
  addRubato(dynamics) {
    return dynamics.map((d, i) => ({
      ...d,
      tempo: 1.0 + 0.1 * Math.sin(i / dynamics.length * Math.PI * 2)
    }));
  }

  /**
   * Adjust breathing for jazz style
   * @param {Array} breathingPoints 
   * @returns {Array}
   */
  jazzifyBreathing(breathingPoints) {
    return breathingPoints.map(bp => ({
      ...bp,
      duration: bp.duration * 0.8,
      syncopated: Math.random() > 0.5
    }));
  }

  /**
   * Apply phrasing to performance
   * @param {Array} notes 
   * @param {Array} phrases 
   * @returns {Array} Modified notes
   */
  applyPhrasingToPerformance(notes, phrases) {
    const modifiedNotes = [...notes];
    
    for (const phrase of phrases) {
      // Apply dynamics
      for (const dynamic of phrase.dynamics) {
        const noteIndex = modifiedNotes.findIndex(n => n.time === dynamic.time);
        if (noteIndex >= 0) {
          modifiedNotes[noteIndex].velocity = dynamic.value;
        }
      }
      
      // Apply breathing
      for (const breath of phrase.breathingPoints) {
        const noteIndex = modifiedNotes.findIndex(n => 
          n.time + n.duration === breath.time
        );
        
        if (noteIndex >= 0) {
          // Shorten note for breath
          modifiedNotes[noteIndex].duration -= breath.duration;
          
          // Add breath mark
          modifiedNotes[noteIndex].breath = true;
        }
      }
    }
    
    return modifiedNotes;
  }

  /**
   * Get phrase at specific time
   * @param {number} time 
   * @param {Array} phrases 
   * @returns {Object|null}
   */
  getPhraseAtTime(time, phrases) {
    for (const phrase of phrases) {
      if (time >= phrase.startTime && time <= phrase.endTime) {
        return phrase;
      }
    }
    return null;
  }

  /**
   * Check for rhythmic cadence
   * @param {Array} notes 
   * @returns {boolean}
   */
  isRhythmicCadence(notes) {
    if (notes.length < 3) return false;
    
    const lastNote = notes[notes.length - 1];
    const secondLast = notes[notes.length - 2];
    
    // Long note at end
    if (lastNote.duration > secondLast.duration * 2) return true;
    
    // Rhythmic pattern completion (e.g., short-short-long)
    if (notes.length >= 3) {
      const thirdLast = notes[notes.length - 3];
      if (thirdLast.duration < lastNote.duration && 
          secondLast.duration < lastNote.duration) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for melodic cadence
   * @param {Array} notes 
   * @returns {boolean}
   */
  isMelodicCadence(notes) {
    if (notes.length < 2) return false;
    
    const lastInterval = notes[notes.length - 1].pitch - notes[notes.length - 2].pitch;
    
    // Common cadential intervals
    if (Math.abs(lastInterval) === 1 || // Step
        Math.abs(lastInterval) === 5 || // Fourth
        Math.abs(lastInterval) === 7) { // Fifth
      return true;
    }
    
    return false;
  }

  /**
   * Generate phrase structure template
   * @param {string} type 
   * @param {number} length 
   * @returns {Object}
   */
  generatePhraseTemplate(type, length = 8) {
    const template = this.phraseTemplates.get(type);
    if (!template) return null;
    
    // Scale to requested length
    const scaleFactor = length / template.lengths.reduce((a, b) => a + b, 0);
    
    return {
      ...template,
      lengths: template.lengths.map(l => Math.round(l * scaleFactor)),
      totalLength: length
    };
  }

  /**
   * Suggest phrase continuation
   * @param {Object} currentPhrase 
   * @param {Object} options 
   * @returns {Object}
   */
  suggestPhraseContinuation(currentPhrase, options = {}) {
    const suggestions = {
      dynamicDirection: null,
      targetPitch: null,
      rhythmicPattern: null,
      phraseEnding: null
    };
    
    // Analyze current phrase progress
    const progress = currentPhrase.notes.length / this.phraseTypicalLength;
    
    // Dynamic suggestions
    if (progress < 0.5) {
      suggestions.dynamicDirection = 'crescendo';
    } else if (progress > 0.8) {
      suggestions.dynamicDirection = 'diminuendo';
    }
    
    // Melodic suggestions based on arch
    switch (currentPhrase.arch) {
      case 'ascending':
        suggestions.targetPitch = 'higher';
        break;
      case 'arch':
        suggestions.targetPitch = progress < 0.5 ? 'higher' : 'lower';
        break;
      case 'descending':
        suggestions.targetPitch = 'lower';
        break;
    }
    
    // Ending suggestions
    if (progress > 0.7) {
      suggestions.phraseEnding = currentPhrase.type === 'question' ? 'open' : 'closed';
      suggestions.rhythmicPattern = 'longer-values';
    }
    
    return suggestions;
  }

  /**
   * Analyze phrase relationships in full piece
   * @param {Array} phrases 
   * @returns {Object}
   */
  analyzePhraseStructure(phrases) {
    const structure = {
      totalPhrases: phrases.length,
      averageLength: 0,
      form: [],
      relationships: []
    };
    
    // Calculate average length
    const totalLength = phrases.reduce((sum, p) => sum + p.duration, 0);
    structure.averageLength = totalLength / phrases.length;
    
    // Detect form (ABA, ABAB, etc.)
    const phraseGroups = this.groupSimilarPhrases(phrases);
    structure.form = this.detectMusicalForm(phraseGroups);
    
    // Find relationships
    for (let i = 0; i < phrases.length - 1; i++) {
      for (let j = i + 1; j < phrases.length; j++) {
        const relationship = this.analyzePhraseRelationship(phrases[i], phrases[j]);
        if (relationship.type !== 'unrelated') {
          structure.relationships.push({
            phrase1: i,
            phrase2: j,
            ...relationship
          });
        }
      }
    }
    
    return structure;
  }

  /**
   * Group similar phrases
   * @param {Array} phrases 
   * @returns {Array}
   */
  groupSimilarPhrases(phrases) {
    const groups = [];
    const assigned = new Set();
    
    for (let i = 0; i < phrases.length; i++) {
      if (assigned.has(i)) continue;
      
      const group = [i];
      assigned.add(i);
      
      for (let j = i + 1; j < phrases.length; j++) {
        if (assigned.has(j)) continue;
        
        if (this.arePhrasesParallel(phrases[i], phrases[j])) {
          group.push(j);
          assigned.add(j);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * Detect musical form from phrase groups
   * @param {Array} groups 
   * @returns {string}
   */
  detectMusicalForm(groups) {
    // Assign letters to groups
    const labels = [];
    const groupLabels = new Map();
    let currentLabel = 'A';
    
    for (const group of groups) {
      if (!groupLabels.has(group[0])) {
        groupLabels.set(group[0], currentLabel);
        currentLabel = String.fromCharCode(currentLabel.charCodeAt(0) + 1);
      }
      
      for (const phraseIndex of group) {
        labels[phraseIndex] = groupLabels.get(group[0]);
      }
    }
    
    return labels.join('');
  }

  /**
   * Analyze relationship between two phrases
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {Object}
   */
  analyzePhraseRelationship(phrase1, phrase2) {
    const relationship = {
      type: 'unrelated',
      similarity: 0,
      transformation: null
    };
    
    // Check for exact repetition
    if (this.arePhrasesIdentical(phrase1, phrase2)) {
      relationship.type = 'repetition';
      relationship.similarity = 1.0;
      return relationship;
    }
    
    // Check for transposition
    const transposition = this.checkTransposition(phrase1, phrase2);
    if (transposition !== null) {
      relationship.type = 'transposition';
      relationship.similarity = 0.9;
      relationship.transformation = `T${transposition}`;
      return relationship;
    }
    
    // Check for inversion
    if (this.checkInversion(phrase1, phrase2)) {
      relationship.type = 'inversion';
      relationship.similarity = 0.7;
      relationship.transformation = 'I';
      return relationship;
    }
    
    // Check for sequence
    if (this.checkSequence(phrase1, phrase2)) {
      relationship.type = 'sequence';
      relationship.similarity = 0.8;
      return relationship;
    }
    
    // Calculate general similarity
    relationship.similarity = this.calculatePhraseSimilarity(phrase1, phrase2);
    if (relationship.similarity > 0.6) {
      relationship.type = 'variation';
    }
    
    return relationship;
  }

  /**
   * Check if phrases are identical
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {boolean}
   */
  arePhrasesIdentical(phrase1, phrase2) {
    if (phrase1.notes.length !== phrase2.notes.length) return false;
    
    for (let i = 0; i < phrase1.notes.length; i++) {
      const note1 = phrase1.notes[i];
      const note2 = phrase2.notes[i];
      
      if (note1.pitch !== note2.pitch || 
          Math.abs(note1.duration - note2.duration) > 0.01) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check for transposition
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {number|null} Transposition interval or null
   */
  checkTransposition(phrase1, phrase2) {
    if (phrase1.notes.length !== phrase2.notes.length) return null;
    
    const interval = phrase2.notes[0].pitch - phrase1.notes[0].pitch;
    
    for (let i = 1; i < phrase1.notes.length; i++) {
      const expectedPitch = phrase1.notes[i].pitch + interval;
      if (phrase2.notes[i].pitch !== expectedPitch) {
        return null;
      }
    }
    
    return interval;
  }

  /**
   * Check for inversion
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {boolean}
   */
  checkInversion(phrase1, phrase2) {
    if (phrase1.notes.length !== phrase2.notes.length) return false;
    
    const intervals1 = this.getPhraseIntervals(phrase1);
    const intervals2 = this.getPhraseIntervals(phrase2);
    
    for (let i = 0; i < intervals1.length; i++) {
      if (intervals1[i] !== -intervals2[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check for sequence
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {boolean}
   */
  checkSequence(phrase1, phrase2) {
    // Check if phrase2 is a sequential repetition of phrase1's pattern
    const pattern1 = this.extractRhythmicPattern(phrase1);
    const pattern2 = this.extractRhythmicPattern(phrase2);
    
    return this.patternsMatch(pattern1, pattern2);
  }

  /**
   * Extract rhythmic pattern
   * @param {Object} phrase 
   * @returns {Array}
   */
  extractRhythmicPattern(phrase) {
    return phrase.notes.map(n => n.duration);
  }

  /**
   * Check if patterns match
   * @param {Array} pattern1 
   * @param {Array} pattern2 
   * @returns {boolean}
   */
  patternsMatch(pattern1, pattern2) {
    if (pattern1.length !== pattern2.length) return false;
    
    for (let i = 0; i < pattern1.length; i++) {
      if (Math.abs(pattern1[i] - pattern2[i]) > 0.01) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate phrase similarity
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {number} 0-1
   */
  calculatePhraseSimilarity(phrase1, phrase2) {
    let similarity = 0;
    let factors = 0;
    
    // Rhythm similarity
    const rhythmSim = this.calculateRhythmSimilarity(phrase1, phrase2);
    similarity += rhythmSim * 0.3;
    factors += 0.3;
    
    // Contour similarity
    const contourSim = this.calculateContourSimilarity(phrase1, phrase2);
    similarity += contourSim * 0.3;
    factors += 0.3;
    
    // Length similarity
    const lengthRatio = Math.min(phrase1.duration, phrase2.duration) / 
                       Math.max(phrase1.duration, phrase2.duration);
    similarity += lengthRatio * 0.2;
    factors += 0.2;
    
    // Type similarity
    if (phrase1.type === phrase2.type) {
      similarity += 0.2;
    }
    factors += 0.2;
    
    return similarity / factors;
  }

  /**
   * Calculate rhythm similarity
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {number} 0-1
   */
  calculateRhythmSimilarity(phrase1, phrase2) {
    const pattern1 = this.extractRhythmicPattern(phrase1);
    const pattern2 = this.extractRhythmicPattern(phrase2);
    
    const minLen = Math.min(pattern1.length, pattern2.length);
    const maxLen = Math.max(pattern1.length, pattern2.length);
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (Math.abs(pattern1[i] - pattern2[i]) < 0.1) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }

  /**
   * Calculate contour similarity
   * @param {Object} phrase1 
   * @param {Object} phrase2 
   * @returns {number} 0-1
   */
  calculateContourSimilarity(phrase1, phrase2) {
    const contour1 = this.getPhraseIntervals(phrase1).map(i => Math.sign(i));
    const contour2 = this.getPhraseIntervals(phrase2).map(i => Math.sign(i));
    
    const minLen = Math.min(contour1.length, contour2.length);
    const maxLen = Math.max(contour1.length, contour2.length);
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (contour1[i] === contour2[i]) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }
}

// Create singleton instance
export const phraseManager = new PhraseManager();