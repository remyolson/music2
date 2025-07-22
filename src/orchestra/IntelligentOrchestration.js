import { DisposalRegistry } from '../utils/DisposalRegistry.js';
import { SCALES } from '../constants.js';

/**
 * IntelligentOrchestration - Automated orchestration from piano scores
 * Provides intelligent distribution of musical material across orchestra
 */
export class IntelligentOrchestration {
  constructor() {
    this.registry = new DisposalRegistry('intelligent-orchestration');
    
    // Instrument ranges (MIDI note numbers)
    this.instrumentRanges = this.defineInstrumentRanges();
    
    // Orchestration rules
    this.orchestrationRules = this.defineOrchestrationRules();
    
    // Doubling preferences
    this.doublingPreferences = this.defineDoublingPreferences();
    
    // Texture analysis
    this.textureAnalyzer = new TextureAnalyzer();
    this.registry.register(this.textureAnalyzer);
    
    // Voice leading engine
    this.voiceLeader = new OrchestralVoiceLeader();
    this.registry.register(this.voiceLeader);
  }

  /**
   * Define instrument ranges
   */
  defineInstrumentRanges() {
    return {
      // Strings
      violin1: { min: 55, max: 103, comfortable: { min: 60, max: 96 } },
      violin2: { min: 55, max: 103, comfortable: { min: 60, max: 93 } },
      viola: { min: 48, max: 91, comfortable: { min: 53, max: 84 } },
      cello: { min: 36, max: 76, comfortable: { min: 41, max: 72 } },
      bass: { min: 28, max: 60, comfortable: { min: 33, max: 55 } },
      
      // Woodwinds
      piccolo: { min: 74, max: 108, comfortable: { min: 79, max: 103 } },
      flute: { min: 60, max: 96, comfortable: { min: 65, max: 91 } },
      oboe: { min: 58, max: 87, comfortable: { min: 60, max: 84 } },
      englishHorn: { min: 52, max: 81, comfortable: { min: 55, max: 77 } },
      clarinet: { min: 50, max: 94, comfortable: { min: 55, max: 89 } },
      bassClarinet: { min: 38, max: 77, comfortable: { min: 43, max: 72 } },
      bassoon: { min: 34, max: 75, comfortable: { min: 39, max: 69 } },
      contrabassoon: { min: 22, max: 53, comfortable: { min: 27, max: 48 } },
      
      // Brass
      frenchHorn: { min: 41, max: 77, comfortable: { min: 46, max: 72 } },
      trumpet: { min: 55, max: 82, comfortable: { min: 60, max: 77 } },
      trombone: { min: 40, max: 72, comfortable: { min: 45, max: 67 } },
      bassTrombone: { min: 34, max: 67, comfortable: { min: 39, max: 62 } },
      tuba: { min: 28, max: 58, comfortable: { min: 33, max: 53 } },
      
      // Others
      harp: { min: 24, max: 103, comfortable: { min: 29, max: 98 } },
      piano: { min: 21, max: 108, comfortable: { min: 21, max: 108 } },
      timpani: { min: 38, max: 65, comfortable: { min: 41, max: 60 } }
    };
  }

  /**
   * Define orchestration rules
   */
  defineOrchestrationRules() {
    return {
      // Melody distribution
      melody: {
        primary: ['violin1', 'flute', 'oboe', 'clarinet', 'trumpet'],
        secondary: ['violin2', 'viola', 'frenchHorn', 'englishHorn'],
        reinforcement: ['piccolo', 'harp']
      },
      
      // Harmony distribution
      harmony: {
        high: ['violin2', 'viola', 'flute', 'clarinet'],
        mid: ['viola', 'cello', 'frenchHorn', 'trombone'],
        low: ['cello', 'bass', 'bassoon', 'tuba']
      },
      
      // Bass line
      bass: {
        primary: ['bass', 'cello', 'bassoon', 'tuba'],
        light: ['cello', 'bassoon'],
        heavy: ['bass', 'tuba', 'contrabassoon']
      },
      
      // Texture types
      textures: {
        homophonic: {
          melody: ['violin1', 'flute', 'oboe'],
          accompaniment: ['violin2', 'viola', 'harp'],
          bass: ['cello', 'bass']
        },
        polyphonic: {
          voice1: ['violin1', 'flute'],
          voice2: ['violin2', 'oboe'],
          voice3: ['viola', 'clarinet'],
          voice4: ['cello', 'bassoon']
        },
        tutti: {
          high: ['violin1', 'violin2', 'flute', 'oboe', 'trumpet'],
          mid: ['viola', 'clarinet', 'frenchHorn'],
          low: ['cello', 'bass', 'bassoon', 'trombone', 'tuba']
        }
      }
    };
  }

  /**
   * Define doubling preferences
   */
  defineDoublingPreferences() {
    return {
      octaves: {
        melody: [
          ['violin1', 'flute'], // Flute doubles violin an octave higher
          ['violin1', 'piccolo'], // Piccolo two octaves higher
          ['cello', 'bass'], // Bass doubles cello an octave lower
          ['bassoon', 'contrabassoon']
        ],
        bass: [
          ['cello', 'bass'],
          ['bassoon', 'contrabassoon'],
          ['trombone', 'tuba']
        ]
      },
      unison: {
        forte: [
          ['violin1', 'violin2', 'viola'], // String unison
          ['trumpet', 'trombone'], // Brass unison
          ['oboe', 'clarinet'] // Woodwind blend
        ],
        piano: [
          ['flute', 'violin1'], // Delicate unison
          ['clarinet', 'viola'], // Warm blend
          ['oboe', 'violin2'] // Expressive blend
        ]
      },
      color: {
        bright: ['piccolo', 'glockenspiel', 'harp'],
        warm: ['clarinet', 'frenchHorn', 'viola'],
        dark: ['bassoon', 'cello', 'bass', 'contrabassoon']
      }
    };
  }

  /**
   * Orchestrate a piano score
   * @param {Object} pianoScore 
   * @param {Object} options 
   * @returns {Object} Orchestrated score
   */
  orchestrate(pianoScore, options = {}) {
    const {
      style = 'classical',
      density = 'medium',
      color = 'balanced',
      dynamics = 'mf'
    } = options;
    
    // Analyze the piano score
    const analysis = this.analyzeScore(pianoScore);
    
    // Determine orchestration strategy
    const strategy = this.determineStrategy(analysis, style);
    
    // Distribute voices
    const orchestration = this.distributeVoices(analysis, strategy, {
      density,
      color,
      dynamics
    });
    
    // Optimize voice leading
    this.optimizeVoiceLeading(orchestration);
    
    // Add orchestral effects
    this.addOrchestralEffects(orchestration, style);
    
    // Validate ranges
    this.validateRanges(orchestration);
    
    return orchestration;
  }

  /**
   * Analyze piano score
   * @param {Object} pianoScore 
   * @returns {Object}
   */
  analyzeScore(pianoScore) {
    const analysis = {
      texture: this.textureAnalyzer.analyze(pianoScore),
      melody: this.extractMelody(pianoScore),
      harmony: this.extractHarmony(pianoScore),
      bass: this.extractBass(pianoScore),
      dynamics: this.analyzeDynamics(pianoScore),
      tempo: pianoScore.tempo || 120,
      key: this.detectKey(pianoScore),
      form: this.analyzeForm(pianoScore)
    };
    
    return analysis;
  }

  /**
   * Extract melody from piano score
   * @param {Object} pianoScore 
   * @returns {Array}
   */
  extractMelody(pianoScore) {
    const notes = pianoScore.notes || [];
    const melody = [];
    
    // Find highest active note at each time
    const timeMap = new Map();
    
    notes.forEach(note => {
      const time = note.time;
      if (!timeMap.has(time)) {
        timeMap.set(time, []);
      }
      timeMap.get(time).push(note);
    });
    
    // Extract top voice
    timeMap.forEach((notesAtTime, time) => {
      const topNote = notesAtTime.reduce((highest, note) => 
        note.midi > highest.midi ? note : highest
      );
      melody.push(topNote);
    });
    
    return melody;
  }

  /**
   * Extract harmony from piano score
   * @param {Object} pianoScore 
   * @returns {Array}
   */
  extractHarmony(pianoScore) {
    const notes = pianoScore.notes || [];
    const harmony = [];
    
    // Group notes by time
    const timeMap = new Map();
    notes.forEach(note => {
      const time = note.time;
      if (!timeMap.has(time)) {
        timeMap.set(time, []);
      }
      timeMap.get(time).push(note);
    });
    
    // Extract inner voices
    timeMap.forEach((notesAtTime, time) => {
      if (notesAtTime.length > 2) {
        // Sort by pitch
        const sorted = notesAtTime.sort((a, b) => a.midi - b.midi);
        // Take inner voices
        const innerVoices = sorted.slice(1, -1);
        harmony.push({
          time,
          notes: innerVoices
        });
      }
    });
    
    return harmony;
  }

  /**
   * Extract bass line
   * @param {Object} pianoScore 
   * @returns {Array}
   */
  extractBass(pianoScore) {
    const notes = pianoScore.notes || [];
    const bass = [];
    
    // Find lowest note at each time
    const timeMap = new Map();
    notes.forEach(note => {
      const time = note.time;
      if (!timeMap.has(time)) {
        timeMap.set(time, note);
      } else {
        const current = timeMap.get(time);
        if (note.midi < current.midi) {
          timeMap.set(time, note);
        }
      }
    });
    
    timeMap.forEach(note => bass.push(note));
    
    return bass;
  }

  /**
   * Determine orchestration strategy
   * @param {Object} analysis 
   * @param {string} style 
   * @returns {Object}
   */
  determineStrategy(analysis, style) {
    const strategy = {
      instrumentation: [],
      doublings: [],
      voiceDistribution: {},
      effects: []
    };
    
    // Choose instrumentation based on style
    switch (style) {
      case 'classical':
        strategy.instrumentation = this.getClassicalInstrumentation(analysis);
        break;
      case 'romantic':
        strategy.instrumentation = this.getRomanticInstrumentation(analysis);
        break;
      case 'modern':
        strategy.instrumentation = this.getModernInstrumentation(analysis);
        break;
      case 'minimalist':
        strategy.instrumentation = this.getMinimalistInstrumentation(analysis);
        break;
    }
    
    // Determine doublings based on dynamics
    if (analysis.dynamics.average > 0.7) {
      strategy.doublings = this.doublingPreferences.octaves.melody;
    } else if (analysis.dynamics.average < 0.3) {
      strategy.doublings = this.doublingPreferences.unison.piano;
    }
    
    // Voice distribution based on texture
    strategy.voiceDistribution = this.orchestrationRules.textures[analysis.texture.type] || 
                                 this.orchestrationRules.textures.homophonic;
    
    return strategy;
  }

  /**
   * Get classical instrumentation
   * @param {Object} analysis 
   * @returns {Array}
   */
  getClassicalInstrumentation(analysis) {
    const instruments = ['violin1', 'violin2', 'viola', 'cello', 'bass'];
    
    if (analysis.texture.density > 0.6) {
      instruments.push('flute', 'oboe', 'clarinet', 'bassoon');
      instruments.push('frenchHorn', 'trumpet');
    }
    
    return instruments;
  }

  /**
   * Get romantic instrumentation
   * @param {Object} analysis 
   * @returns {Array}
   */
  getRomanticInstrumentation(analysis) {
    return [
      'violin1', 'violin2', 'viola', 'cello', 'bass',
      'flute', 'oboe', 'clarinet', 'bassoon',
      'frenchHorn', 'trumpet', 'trombone', 'tuba',
      'harp', 'timpani'
    ];
  }

  /**
   * Get modern instrumentation
   * @param {Object} analysis 
   * @returns {Array}
   */
  getModernInstrumentation(analysis) {
    const instruments = this.getRomanticInstrumentation(analysis);
    instruments.push('piccolo', 'englishHorn', 'bassClarinet', 'contrabassoon');
    return instruments;
  }

  /**
   * Get minimalist instrumentation
   * @param {Object} analysis 
   * @returns {Array}
   */
  getMinimalistInstrumentation(analysis) {
    return ['violin1', 'violin2', 'viola', 'cello', 'piano'];
  }

  /**
   * Distribute voices across instruments
   * @param {Object} analysis 
   * @param {Object} strategy 
   * @param {Object} options 
   * @returns {Object}
   */
  distributeVoices(analysis, strategy, options) {
    const orchestration = {
      instruments: {},
      timeline: []
    };
    
    // Initialize instruments
    strategy.instrumentation.forEach(instrument => {
      orchestration.instruments[instrument] = {
        notes: [],
        dynamics: [],
        articulations: []
      };
    });
    
    // Distribute melody
    if (analysis.melody.length > 0) {
      this.distributeMelody(analysis.melody, orchestration, strategy, options);
    }
    
    // Distribute harmony
    if (analysis.harmony.length > 0) {
      this.distributeHarmony(analysis.harmony, orchestration, strategy, options);
    }
    
    // Distribute bass
    if (analysis.bass.length > 0) {
      this.distributeBass(analysis.bass, orchestration, strategy, options);
    }
    
    // Apply doublings
    this.applyDoublings(orchestration, strategy.doublings);
    
    return orchestration;
  }

  /**
   * Distribute melody across instruments
   * @param {Array} melody 
   * @param {Object} orchestration 
   * @param {Object} strategy 
   * @param {Object} options 
   */
  distributeMelody(melody, orchestration, strategy, options) {
    const melodyInstruments = strategy.voiceDistribution.melody || 
                              this.orchestrationRules.melody.primary;
    
    // Choose primary melody instrument based on range
    const primaryInstrument = this.chooseBestInstrument(melody, melodyInstruments);
    
    // Assign melody to primary instrument
    melody.forEach(note => {
      if (this.isInRange(note.midi, primaryInstrument)) {
        orchestration.instruments[primaryInstrument].notes.push({
          ...note,
          function: 'melody'
        });
      }
    });
    
    // Add color doublings if needed
    if (options.color === 'bright') {
      const colorInstrument = this.doublingPreferences.color.bright[0];
      if (orchestration.instruments[colorInstrument]) {
        this.addColorDoubling(melody, orchestration, colorInstrument, 12); // Octave higher
      }
    }
  }

  /**
   * Choose best instrument for a passage
   * @param {Array} notes 
   * @param {Array} candidates 
   * @returns {string}
   */
  chooseBestInstrument(notes, candidates) {
    let bestInstrument = candidates[0];
    let bestScore = -Infinity;
    
    candidates.forEach(instrument => {
      const range = this.instrumentRanges[instrument];
      if (!range) return;
      
      let score = 0;
      notes.forEach(note => {
        if (note.midi >= range.comfortable.min && note.midi <= range.comfortable.max) {
          score += 2; // In comfortable range
        } else if (note.midi >= range.min && note.midi <= range.max) {
          score += 1; // In playable range
        } else {
          score -= 5; // Out of range
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestInstrument = instrument;
      }
    });
    
    return bestInstrument;
  }

  /**
   * Check if note is in instrument range
   * @param {number} midi 
   * @param {string} instrument 
   * @returns {boolean}
   */
  isInRange(midi, instrument) {
    const range = this.instrumentRanges[instrument];
    if (!range) return false;
    return midi >= range.min && midi <= range.max;
  }

  /**
   * Distribute harmony across instruments
   * @param {Array} harmony 
   * @param {Object} orchestration 
   * @param {Object} strategy 
   * @param {Object} options 
   */
  distributeHarmony(harmony, orchestration, strategy, options) {
    harmony.forEach(chord => {
      const { time, notes } = chord;
      
      // Sort notes by pitch
      const sorted = notes.sort((a, b) => a.midi - b.midi);
      
      // Distribute to appropriate instruments
      sorted.forEach((note, index) => {
        let targetInstruments;
        
        if (note.midi > 72) {
          targetInstruments = strategy.voiceDistribution.harmony?.high || 
                              this.orchestrationRules.harmony.high;
        } else if (note.midi > 48) {
          targetInstruments = strategy.voiceDistribution.harmony?.mid || 
                              this.orchestrationRules.harmony.mid;
        } else {
          targetInstruments = strategy.voiceDistribution.harmony?.low || 
                              this.orchestrationRules.harmony.low;
        }
        
        // Find available instrument
        const instrument = targetInstruments[index % targetInstruments.length];
        if (orchestration.instruments[instrument] && this.isInRange(note.midi, instrument)) {
          orchestration.instruments[instrument].notes.push({
            ...note,
            function: 'harmony'
          });
        }
      });
    });
  }

  /**
   * Distribute bass line
   * @param {Array} bass 
   * @param {Object} orchestration 
   * @param {Object} strategy 
   * @param {Object} options 
   */
  distributeBass(bass, orchestration, strategy, options) {
    const bassInstruments = options.dynamics === 'ff' ? 
      this.orchestrationRules.bass.heavy : 
      this.orchestrationRules.bass.light;
    
    // Primary bass instrument
    const primaryBass = this.chooseBestInstrument(bass, bassInstruments);
    
    bass.forEach(note => {
      if (this.isInRange(note.midi, primaryBass)) {
        orchestration.instruments[primaryBass].notes.push({
          ...note,
          function: 'bass'
        });
      }
    });
    
    // Add octave doubling for weight
    if (options.density === 'thick') {
      const octaveBass = this.orchestrationRules.bass.primary.find(
        inst => inst !== primaryBass && orchestration.instruments[inst]
      );
      
      if (octaveBass) {
        bass.forEach(note => {
          const octaveNote = { ...note, midi: note.midi - 12 };
          if (this.isInRange(octaveNote.midi, octaveBass)) {
            orchestration.instruments[octaveBass].notes.push({
              ...octaveNote,
              function: 'bass_doubling'
            });
          }
        });
      }
    }
  }

  /**
   * Apply doublings
   * @param {Object} orchestration 
   * @param {Array} doublings 
   */
  applyDoublings(orchestration, doublings) {
    doublings.forEach(doubling => {
      const [source, target] = doubling;
      
      if (!orchestration.instruments[source] || !orchestration.instruments[target]) {
        return;
      }
      
      // Copy notes with octave transposition
      orchestration.instruments[source].notes.forEach(note => {
        const doubledNote = {
          ...note,
          midi: note.midi + 12, // Octave higher
          function: note.function + '_doubling'
        };
        
        if (this.isInRange(doubledNote.midi, target)) {
          orchestration.instruments[target].notes.push(doubledNote);
        }
      });
    });
  }

  /**
   * Add color doubling
   * @param {Array} melody 
   * @param {Object} orchestration 
   * @param {string} instrument 
   * @param {number} interval 
   */
  addColorDoubling(melody, orchestration, instrument, interval) {
    melody.forEach(note => {
      const colorNote = {
        ...note,
        midi: note.midi + interval,
        velocity: note.velocity * 0.7, // Softer
        function: 'color_doubling'
      };
      
      if (this.isInRange(colorNote.midi, instrument)) {
        orchestration.instruments[instrument].notes.push(colorNote);
      }
    });
  }

  /**
   * Optimize voice leading
   * @param {Object} orchestration 
   */
  optimizeVoiceLeading(orchestration) {
    Object.entries(orchestration.instruments).forEach(([instrument, part]) => {
      if (part.notes.length > 1) {
        part.notes = this.voiceLeader.optimizeVoice(part.notes, instrument);
      }
    });
  }

  /**
   * Add orchestral effects
   * @param {Object} orchestration 
   * @param {string} style 
   */
  addOrchestralEffects(orchestration, style) {
    // Add tremolo for dramatic passages
    this.addTremolo(orchestration);
    
    // Add pizzicato for rhythmic sections
    this.addPizzicato(orchestration);
    
    // Add mutes for color
    this.addMutes(orchestration);
    
    // Add glissandi for expression
    this.addGlissandi(orchestration);
    
    // Style-specific effects
    switch (style) {
      case 'romantic':
        this.addRomanticEffects(orchestration);
        break;
      case 'modern':
        this.addModernEffects(orchestration);
        break;
    }
  }

  /**
   * Add tremolo effects
   * @param {Object} orchestration 
   */
  addTremolo(orchestration) {
    // Find sustained notes in strings
    ['violin1', 'violin2', 'viola', 'cello'].forEach(instrument => {
      const part = orchestration.instruments[instrument];
      if (!part) return;
      
      part.notes.forEach(note => {
        if (note.duration > 2 && note.velocity > 0.7) {
          part.articulations.push({
            type: 'tremolo',
            time: note.time,
            duration: note.duration
          });
        }
      });
    });
  }

  /**
   * Add pizzicato effects
   * @param {Object} orchestration 
   */
  addPizzicato(orchestration) {
    // Add pizzicato for short, rhythmic notes
    ['violin1', 'violin2', 'viola', 'cello', 'bass'].forEach(instrument => {
      const part = orchestration.instruments[instrument];
      if (!part) return;
      
      // Find rhythmic patterns
      let consecutiveShort = 0;
      part.notes.forEach((note, index) => {
        if (note.duration < 0.25) {
          consecutiveShort++;
          if (consecutiveShort > 3) {
            // Mark this section for pizzicato
            for (let i = index - 3; i <= index; i++) {
              part.articulations.push({
                type: 'pizzicato',
                time: part.notes[i].time
              });
            }
          }
        } else {
          consecutiveShort = 0;
        }
      });
    });
  }

  /**
   * Add mutes
   * @param {Object} orchestration 
   */
  addMutes(orchestration) {
    // Add mutes for soft passages in brass
    ['trumpet', 'trombone', 'frenchHorn'].forEach(instrument => {
      const part = orchestration.instruments[instrument];
      if (!part) return;
      
      part.notes.forEach(note => {
        if (note.velocity < 0.4) {
          part.articulations.push({
            type: 'mute',
            subtype: 'straight',
            time: note.time
          });
        }
      });
    });
  }

  /**
   * Add glissandi
   * @param {Object} orchestration 
   */
  addGlissandi(orchestration) {
    // Add glissandi for large intervals
    Object.entries(orchestration.instruments).forEach(([instrument, part]) => {
      if (!part.notes || part.notes.length < 2) return;
      
      for (let i = 1; i < part.notes.length; i++) {
        const prev = part.notes[i - 1];
        const curr = part.notes[i];
        const interval = Math.abs(curr.midi - prev.midi);
        
        // Large interval and close in time
        if (interval > 7 && curr.time - prev.time < 0.5) {
          part.articulations.push({
            type: 'glissando',
            from: prev,
            to: curr,
            time: prev.time,
            duration: curr.time - prev.time
          });
        }
      }
    });
  }

  /**
   * Add romantic-style effects
   * @param {Object} orchestration 
   */
  addRomanticEffects(orchestration) {
    // Add rubato markings
    orchestration.performance = {
      rubato: true,
      expressiveVibrato: true,
      dynamicSwells: true
    };
  }

  /**
   * Add modern effects
   * @param {Object} orchestration 
   */
  addModernEffects(orchestration) {
    // Add extended techniques
    Object.values(orchestration.instruments).forEach(part => {
      part.articulations.push({
        type: 'extended',
        techniques: ['sul ponticello', 'col legno', 'flutter tongue']
      });
    });
  }

  /**
   * Validate ranges
   * @param {Object} orchestration 
   */
  validateRanges(orchestration) {
    const warnings = [];
    
    Object.entries(orchestration.instruments).forEach(([instrument, part]) => {
      const range = this.instrumentRanges[instrument];
      if (!range) return;
      
      part.notes.forEach(note => {
        if (note.midi < range.min || note.midi > range.max) {
          warnings.push({
            instrument,
            note: note.midi,
            issue: 'out_of_range',
            suggestion: this.suggestAlternative(note, instrument)
          });
        } else if (note.midi < range.comfortable.min || note.midi > range.comfortable.max) {
          warnings.push({
            instrument,
            note: note.midi,
            issue: 'extreme_range',
            suggestion: 'Consider doubling or alternative instrument'
          });
        }
      });
    });
    
    orchestration.warnings = warnings;
  }

  /**
   * Suggest alternative for out-of-range note
   * @param {Object} note 
   * @param {string} instrument 
   * @returns {string}
   */
  suggestAlternative(note, instrument) {
    // Find instrument with similar timbre that can play this note
    const family = this.getInstrumentFamily(instrument);
    const alternatives = [];
    
    Object.entries(this.instrumentRanges).forEach(([name, range]) => {
      if (name !== instrument && 
          this.getInstrumentFamily(name) === family &&
          note.midi >= range.comfortable.min && 
          note.midi <= range.comfortable.max) {
        alternatives.push(name);
      }
    });
    
    if (alternatives.length > 0) {
      return `Transfer to ${alternatives[0]}`;
    }
    
    return 'Transpose to playable octave';
  }

  /**
   * Get instrument family
   * @param {string} instrument 
   * @returns {string}
   */
  getInstrumentFamily(instrument) {
    if (['violin1', 'violin2', 'viola', 'cello', 'bass'].includes(instrument)) {
      return 'strings';
    }
    if (['flute', 'piccolo', 'oboe', 'clarinet', 'bassoon'].includes(instrument)) {
      return 'woodwinds';
    }
    if (['trumpet', 'frenchHorn', 'trombone', 'tuba'].includes(instrument)) {
      return 'brass';
    }
    return 'other';
  }

  /**
   * Analyze dynamics
   * @param {Object} pianoScore 
   * @returns {Object}
   */
  analyzeDynamics(pianoScore) {
    const notes = pianoScore.notes || [];
    if (notes.length === 0) return { average: 0.5, range: [0, 1] };
    
    const velocities = notes.map(n => n.velocity || 0.5);
    const average = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const min = Math.min(...velocities);
    const max = Math.max(...velocities);
    
    return { average, range: [min, max] };
  }

  /**
   * Detect key
   * @param {Object} pianoScore 
   * @returns {string}
   */
  detectKey(pianoScore) {
    // Simple key detection based on note frequency
    const notes = pianoScore.notes || [];
    const pitchClasses = new Array(12).fill(0);
    
    notes.forEach(note => {
      const pc = note.midi % 12;
      pitchClasses[pc] += note.duration || 1;
    });
    
    // Find most likely key
    // This is simplified - real implementation would use more sophisticated analysis
    const maxIndex = pitchClasses.indexOf(Math.max(...pitchClasses));
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    return keys[maxIndex];
  }

  /**
   * Analyze form
   * @param {Object} pianoScore 
   * @returns {Object}
   */
  analyzeForm(pianoScore) {
    // Simple form analysis
    return {
      type: 'unknown',
      sections: []
    };
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Texture analyzer
 */
class TextureAnalyzer {
  constructor() {
    this.registry = new DisposalRegistry('texture-analyzer');
  }

  /**
   * Analyze texture
   * @param {Object} score 
   * @returns {Object}
   */
  analyze(score) {
    const notes = score.notes || [];
    
    // Count simultaneous notes
    const timeMap = new Map();
    notes.forEach(note => {
      const time = Math.round(note.time * 100) / 100; // Quantize
      if (!timeMap.has(time)) {
        timeMap.set(time, 0);
      }
      timeMap.set(time, timeMap.get(time) + 1);
    });
    
    // Calculate average density
    const densities = Array.from(timeMap.values());
    const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
    
    // Determine texture type
    let type = 'homophonic';
    if (avgDensity < 2) {
      type = 'monophonic';
    } else if (avgDensity > 4) {
      type = 'polyphonic';
    }
    
    return {
      type,
      density: avgDensity / 8, // Normalize to 0-1
      variation: this.calculateVariation(densities)
    };
  }

  /**
   * Calculate variation
   * @param {Array} densities 
   * @returns {number}
   */
  calculateVariation(densities) {
    if (densities.length < 2) return 0;
    
    const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
    const variance = densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / densities.length;
    
    return Math.sqrt(variance) / mean;
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Orchestral voice leader
 */
class OrchestralVoiceLeader {
  constructor() {
    this.registry = new DisposalRegistry('orchestral-voice-leader');
  }

  /**
   * Optimize voice leading
   * @param {Array} notes 
   * @param {string} instrument 
   * @returns {Array}
   */
  optimizeVoice(notes, instrument) {
    // Sort by time
    const sorted = notes.sort((a, b) => a.time - b.time);
    
    // Apply voice leading rules
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const interval = Math.abs(curr.midi - prev.midi);
      
      // Avoid large leaps when possible
      if (interval > 12) {
        // Try to find closer octave
        const octaveUp = curr.midi + 12;
        const octaveDown = curr.midi - 12;
        
        const upInterval = Math.abs(octaveUp - prev.midi);
        const downInterval = Math.abs(octaveDown - prev.midi);
        
        if (downInterval < interval && this.isInRange(octaveDown, instrument)) {
          curr.midi = octaveDown;
        } else if (upInterval < interval && this.isInRange(octaveUp, instrument)) {
          curr.midi = octaveUp;
        }
      }
    }
    
    return sorted;
  }

  /**
   * Check if note is in range
   * @param {number} midi 
   * @param {string} instrument 
   * @returns {boolean}
   */
  isInRange(midi, instrument) {
    // This would reference the main ranges
    return true; // Simplified
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createIntelligentOrchestration() {
  return new IntelligentOrchestration();
}