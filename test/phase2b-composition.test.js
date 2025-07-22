import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceLeadingEngine } from '../src/audio/composition/VoiceLeadingEngine.js';
import { HarmonyEngine } from '../src/audio/composition/HarmonyEngine.js';
import { PhraseManager } from '../src/audio/composition/PhraseManager.js';
import { ChordRecognition } from '../src/audio/composition/ChordRecognition.js';
import { ScaleConstraints } from '../src/audio/composition/ScaleConstraints.js';

// Mock Tone.js
vi.mock('tone', () => ({
  Frequency: vi.fn((note) => ({
    toMidi: () => {
      if (typeof note === 'number') return note;
      const noteMap = { 'C': 60, 'D': 62, 'E': 64, 'F': 65, 'G': 67, 'A': 69, 'B': 71 };
      const baseNote = noteMap[note[0]] || 60;
      return baseNote;
    },
    toNote: () => 'C4'
  })),
  Time: vi.fn((time) => ({
    toSeconds: () => parseFloat(time) || 0
  }))
}));

// Mock state
vi.mock('../src/state.js', () => ({
  state: {
    setState: vi.fn(),
    getState: vi.fn(() => ({})),
    subscribe: vi.fn()
  }
}));

describe('Phase 2B: Advanced Composition Tools', () => {
  describe('Voice Leading Engine', () => {
    let voiceLeading;
    
    beforeEach(() => {
      voiceLeading = new VoiceLeadingEngine();
    });
    
    it('should create initial voicing for chord', () => {
      const chord = [60, 64, 67]; // C major
      const voices = voiceLeading.processChord(chord);
      
      expect(voices).toHaveProperty('soprano');
      expect(voices).toHaveProperty('alto');
      expect(voices).toHaveProperty('tenor');
      expect(voices).toHaveProperty('bass');
      
      // Bass should have the root
      expect(voices.bass).toBe(60);
      
      // Voices should be in order
      expect(voices.bass).toBeLessThanOrEqual(voices.tenor);
      expect(voices.tenor).toBeLessThanOrEqual(voices.alto);
      expect(voices.alto).toBeLessThanOrEqual(voices.soprano);
    });
    
    it('should apply smooth voice leading between chords', () => {
      // C major to G major
      const chord1 = [60, 64, 67]; // C E G
      const chord2 = [67, 71, 74]; // G B D
      
      // Process first chord
      voiceLeading.processChord(chord1);
      
      // Process second chord
      const voices = voiceLeading.processChord(chord2);
      
      // Calculate total movement
      const movement = voiceLeading.calculateTotalMovement(voices);
      
      // Should have minimal movement
      expect(movement).toBeLessThan(24); // Less than 2 octaves total
    });
    
    it('should avoid parallel fifths and octaves', () => {
      voiceLeading.rules.avoidParallelFifths = true;
      voiceLeading.rules.avoidParallelOctaves = true;
      
      // Set up a situation that could create parallels
      voiceLeading.currentVoices = {
        soprano: 72, // C5
        alto: 67,    // G4
        tenor: 60,   // C4
        bass: 48     // C3
      };
      
      // Move to D major (could create parallel fifths)
      const chord = [50, 66, 69]; // D F# A
      const voices = voiceLeading.processChord(chord);
      
      // Check for parallel fifths between any voice pair
      const hasParallels = voiceLeading.hasParallelFifths(voices) || 
                          voiceLeading.hasParallelOctaves(voices);
      
      expect(hasParallels).toBe(false);
    });
    
    it('should handle different voicing types', () => {
      const chord = [60, 64, 67, 71]; // Cmaj7
      
      // Test open voicing
      let voices = voiceLeading.processChord(chord, { openVoicing: true });
      const openSpread = voices.soprano - voices.bass;
      
      // Test close voicing
      voiceLeading.reset();
      voices = voiceLeading.processChord(chord, { openVoicing: false });
      const closeSpread = voices.soprano - voices.bass;
      
      // Open voicing should have wider spread
      expect(openSpread).toBeGreaterThan(closeSpread);
    });
  });
  
  describe('Harmony Engine', () => {
    let harmony;
    
    beforeEach(() => {
      harmony = new HarmonyEngine();
      harmony.setKey('C', 'major');
    });
    
    it('should analyze chord correctly', () => {
      const notes = [60, 64, 67]; // C major
      const analysis = harmony.analyzeChord(notes);
      
      expect(analysis).toBeTruthy();
      expect(analysis.root).toBe(60);
      expect(analysis.chordType).toBe('major');
      expect(analysis.symbol).toContain('C');
    });
    
    it('should identify extended chords', () => {
      const notes = [60, 64, 67, 71]; // Cmaj7
      const analysis = harmony.analyzeChord(notes);
      
      expect(analysis.chordType).toBe('maj7');
      expect(analysis.symbol).toContain('maj7');
    });
    
    it('should generate chord from symbol', () => {
      const chord = harmony.generateChord('Dm7');
      
      expect(chord).toBeTruthy();
      expect(chord.length).toBeGreaterThanOrEqual(4);
      
      // Should contain D, F, A, C
      const pitchClasses = chord.map(n => n % 12);
      expect(pitchClasses).toContain(2);  // D
      expect(pitchClasses).toContain(5);  // F
      expect(pitchClasses).toContain(9);  // A
      expect(pitchClasses).toContain(0);  // C
    });
    
    it('should generate chord progression', () => {
      const progression = harmony.generateProgression({
        length: 4,
        style: 'pop',
        startChord: 'I',
        endChord: 'I'
      });
      
      expect(progression).toHaveLength(4);
      expect(progression[0].function).toBe('I');
      expect(progression[3].function).toBe('I');
      
      // Each chord should have notes
      progression.forEach(chord => {
        expect(chord.notes).toBeDefined();
        expect(chord.notes.length).toBeGreaterThan(0);
      });
    });
    
    it('should suggest next chord based on current', () => {
      const currentChord = [60, 64, 67]; // C major
      const suggestions = harmony.suggestNextChord(currentChord);
      
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should include common progressions like IV and V
      const functions = suggestions.map(s => s.function);
      expect(functions).toContain('IV');
      expect(functions).toContain('V');
    });
    
    it('should harmonize a melody', () => {
      const melody = [
        { note: 60, duration: 1, time: 0 },    // C
        { note: 62, duration: 1, time: 1 },    // D
        { note: 64, duration: 1, time: 2 },    // E
        { note: 60, duration: 1, time: 3 }     // C
      ];
      
      const harmonization = harmony.harmonizeMelody(melody);
      
      expect(harmonization).toBeDefined();
      expect(harmonization.length).toBeGreaterThan(0);
      
      // Each harmony event should have a chord
      harmonization.forEach(event => {
        expect(event.chord).toBeDefined();
        expect(event.chord.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
  
  describe('Phrase Manager', () => {
    let phraseManager;
    
    beforeEach(() => {
      phraseManager = new PhraseManager();
    });
    
    it('should detect phrases from melody', () => {
      const melody = [
        { note: 60, duration: 0.5, time: 0, pitch: 60 },
        { note: 62, duration: 0.5, time: 0.5, pitch: 62 },
        { note: 64, duration: 0.5, time: 1, pitch: 64 },
        { note: 65, duration: 1, time: 1.5, pitch: 65 },
        // Gap for phrase break
        { note: 67, duration: 0.5, time: 3, pitch: 67 },
        { note: 65, duration: 0.5, time: 3.5, pitch: 65 },
        { note: 64, duration: 0.5, time: 4, pitch: 64 },
        { note: 62, duration: 1, time: 4.5, pitch: 62 }
      ];
      
      const phrases = phraseManager.analyzePhrases(melody);
      
      expect(phrases).toBeDefined();
      expect(phrases.length).toBeGreaterThanOrEqual(2);
      
      // Each phrase should have properties
      phrases.forEach(phrase => {
        expect(phrase.type).toBeDefined();
        expect(phrase.arch).toBeDefined();
        expect(phrase.dynamics).toBeDefined();
        expect(phrase.breathingPoints).toBeDefined();
      });
    });
    
    it('should identify phrase types', () => {
      const ascendingPhrase = {
        notes: [
          { pitch: 60 },
          { pitch: 62 },
          { pitch: 64 },
          { pitch: 67 }
        ]
      };
      
      const type = phraseManager.analyzePhraseType(ascendingPhrase);
      expect(type).toBe('ascending');
    });
    
    it('should plan breathing points for wind instruments', () => {
      const phrase = {
        notes: [
          { time: 0, duration: 1, pitch: 60 },
          { time: 1, duration: 1, pitch: 62 },
          { time: 2, duration: 1, pitch: 64 },
          { time: 3, duration: 1, pitch: 65 },
          { time: 4, duration: 1, pitch: 67 },
          { time: 5, duration: 1, pitch: 69 }
        ]
      };
      
      const breathingPoints = phraseManager.planBreathingPoints(phrase, {
        instrumentType: 'flute'
      });
      
      expect(breathingPoints).toBeDefined();
      expect(breathingPoints.length).toBeGreaterThan(0);
    });
    
    it('should shape phrase dynamics', () => {
      const phrase = {
        arch: 'arch',
        notes: [
          { time: 0 },
          { time: 0.5 },
          { time: 1 },
          { time: 1.5 }
        ]
      };
      
      const dynamics = phraseManager.planPhraseDynamics(phrase);
      
      expect(dynamics).toHaveLength(4);
      
      // Should have crescendo to middle, then diminuendo
      expect(dynamics[1].value).toBeGreaterThan(dynamics[0].value);
      expect(dynamics[3].value).toBeLessThan(dynamics[2].value);
    });
  });
  
  describe('Chord Recognition', () => {
    let chordRecognition;
    
    beforeEach(() => {
      chordRecognition = new ChordRecognition();
    });
    
    it('should recognize major chord', () => {
      // Add notes for C major
      chordRecognition.processNote({ type: 'noteOn', note: 60, velocity: 0.8 });
      chordRecognition.processNote({ type: 'noteOn', note: 64, velocity: 0.8 });
      chordRecognition.processNote({ type: 'noteOn', note: 67, velocity: 0.8 });
      
      // Wait for detection
      vi.advanceTimersByTime(100);
      
      const state = chordRecognition.getState();
      expect(state.activeNotes).toHaveLength(3);
    });
    
    it('should detect chord inversions', () => {
      const notes = [64, 67, 72]; // E G C (C major first inversion)
      const analysis = chordRecognition.analyzeNotes(notes);
      
      expect(analysis).toBeTruthy();
      expect(analysis.chordType).toContain('major');
      expect(analysis.inversion).toBeGreaterThan(0);
    });
    
    it('should track chord progressions', () => {
      // Simulate C - F - G - C progression
      const chords = [
        [60, 64, 67],    // C
        [65, 69, 72],    // F
        [67, 71, 74],    // G
        [60, 64, 67]     // C
      ];
      
      chords.forEach(chord => {
        chordRecognition.activeNotes.clear();
        chord.forEach(note => {
          chordRecognition.addNote(note, 0.8);
        });
        chordRecognition.detectChord();
      });
      
      expect(chordRecognition.currentProgression).toHaveLength(4);
    });
  });
  
  describe('Scale Constraints', () => {
    let scaleConstraints;
    
    beforeEach(() => {
      scaleConstraints = new ScaleConstraints();
      scaleConstraints.setScale('C', 'major');
    });
    
    it('should constrain notes to scale', () => {
      const outOfScaleNote = 61; // C#
      const constrained = scaleConstraints.constrainNote(outOfScaleNote);
      
      // Should snap to nearest scale note (C or D)
      expect([60, 62]).toContain(constrained);
    });
    
    it('should get scale notes', () => {
      const scaleNotes = scaleConstraints.getScaleNotes(4);
      
      expect(scaleNotes).toHaveLength(7);
      expect(scaleNotes).toContain(60); // C4
      expect(scaleNotes).toContain(62); // D4
      expect(scaleNotes).toContain(64); // E4
      expect(scaleNotes).toContain(65); // F4
      expect(scaleNotes).toContain(67); // G4
      expect(scaleNotes).toContain(69); // A4
      expect(scaleNotes).toContain(71); // B4
    });
    
    it('should suggest notes based on context', () => {
      const suggestions = scaleConstraints.getNoteSuggestions({
        currentChord: [60, 64, 67], // C major
        previousNotes: [60],
        octaveRange: [60, 72]
      });
      
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should prioritize chord tones
      const chordTones = suggestions.filter(s => [60, 64, 67].includes(s.note % 12));
      expect(chordTones.length).toBeGreaterThan(0);
      
      // Chord tones should have higher weight
      expect(chordTones[0].weight).toBeGreaterThan(0.5);
    });
    
    it('should handle different scale types', () => {
      // Test minor scale
      scaleConstraints.setScale('A', 'natural_minor');
      const minorNotes = scaleConstraints.getScaleNotes(4);
      
      expect(minorNotes).toContain(69); // A
      expect(minorNotes).toContain(71); // B
      expect(minorNotes).toContain(72); // C (natural minor has lowered 3rd)
      
      // Test pentatonic
      scaleConstraints.setScale('C', 'major_pentatonic');
      const pentatonicNotes = scaleConstraints.getScaleNotes(4);
      
      expect(pentatonicNotes).toHaveLength(5);
    });
    
    it('should validate melodies against scale', () => {
      const melody = [60, 62, 63, 65]; // C D D# F (D# is out of scale)
      const validation = scaleConstraints.validateMelody(melody);
      
      expect(validation.outOfScaleNotes).toContain(63);
      expect(validation.suggestions).toHaveLength(1);
      expect(validation.suggestions[0].original).toBe(63);
      expect([62, 64]).toContain(validation.suggestions[0].suggested);
    });
  });
  
  describe('Integration Tests', () => {
    it('should work together for composition assistance', () => {
      // Set up components
      const voiceLeading = new VoiceLeadingEngine();
      const harmony = new HarmonyEngine();
      const scaleConstraints = new ScaleConstraints();
      
      harmony.setKey('G', 'major');
      scaleConstraints.setScale('G', 'major');
      
      // Generate a progression
      const progression = harmony.generateProgression({
        length: 4,
        style: 'classical'
      });
      
      // Apply voice leading
      const voicedProgression = progression.map(chord => {
        return voiceLeading.processChord(chord.notes);
      });
      
      // Verify all notes are in scale
      voicedProgression.forEach(voices => {
        Object.values(voices).forEach(note => {
          if (note !== null) {
            const validation = scaleConstraints.validateMelody([note]);
            expect(validation.outOfScaleNotes).toHaveLength(0);
          }
        });
      });
    });
  });
});