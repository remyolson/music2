import { z } from '../node_modules/zod/lib/index.mjs';

export const DrumNoteSchema = z.enum(['kick', 'snare']);

export const PitchNoteSchema = z.string()
  .regex(/^[A-G]#?[0-8]$/, 'Invalid pitch notation. Use format like C4, F#5')
  .transform(note => {
    const noteMap = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };

    const noteName = note.slice(0, -1);
    const octave = parseInt(note.slice(-1));

    return noteMap[noteName] + (octave * 12);
  });

export const ChordSchema = z.array(PitchNoteSchema).min(2).max(6);

export const ChordShortcutSchema = z.string()
  .regex(/^[A-G]#?(maj|min|dim|7|maj7|min7)[0-8]?$/, 'Invalid chord notation. Use format like Cmaj4, F#min5')
  .transform(chord => {
    const match = chord.match(/^([A-G]#?)(maj|min|dim|7|maj7|min7)([0-8])?$/);
    const root = match[1];
    const type = match[2];
    const octave = match[3] ? parseInt(match[3]) : 4; // Default octave 4

    const noteMap = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };

    const rootMidi = noteMap[root] + (octave * 12);

    const intervals = {
      'maj': [0, 4, 7],
      'min': [0, 3, 7],
      'dim': [0, 3, 6],
      '7': [0, 4, 7, 10],
      'maj7': [0, 4, 7, 11],
      'min7': [0, 3, 7, 10]
    };

    return intervals[type].map(interval => rootMidi + interval);
  });

export const NoteSchema = z.object({
  time: z.number().min(0),
  duration: z.number().min(0.1),
  value: z.union([DrumNoteSchema, PitchNoteSchema, ChordSchema, ChordShortcutSchema]),
  volume: z.number().min(0).max(1).default(0.7),
  effect: z.enum(['reverb', 'delay', 'distortion', 'chorus', 'phaser', 'filter', 'echo', 'tremolo', 'bitcrush', 'wah', 'freezeReverb', 'pitchShift', 'harmonizer']).optional(),
  effectLevel: z.number().min(0).max(1).optional(),
  repeat: z.number().int().min(2).optional(),
  pitch: z.number().min(-24).max(24).optional(),
  formant: z.number().min(-5).max(5).optional(),
  harmonize: z.array(z.number().min(-24).max(24)).optional(),
  harmonizeMix: z.number().min(0).max(1).optional(),
  harmonizeLevels: z.array(z.number().min(0).max(1)).optional()
}).refine(data => {
  if (data.effect && !data.effectLevel) {
    data.effectLevel = 0.5;
  }
  return true;
});

export const GlobalEffectSchema = z.object({
  type: z.enum(['reverb', 'delay', 'distortion', 'chorus', 'phaser', 'filter', 'echo', 'tremolo', 'bitcrush', 'wah', 'freezeReverb', 'pitchShift', 'harmonizer']),
  level: z.number().min(0).max(1).default(0.5)
});

export const TrackSettingsSchema = z.object({
  globalEffects: z.array(GlobalEffectSchema).optional(),
  noteTransition: z.enum(['smooth', 'legato', 'staccato', 'normal']).default('normal').optional(),
  portamento: z.number().min(0).max(1).optional(),
  envelope: z.object({
    attack: z.number().min(0).max(2).optional(),
    decay: z.number().min(0).max(2).optional(),
    sustain: z.number().min(0).max(1).optional(),
    release: z.number().min(0).max(5).optional()
  }).optional()
}).optional();

export const TrackSchema = z.object({
  name: z.string().min(1),
  instrument: z.enum(['synth_lead', 'synth_bass', 'piano', 'strings', 'brass', 'drums_kit', 'electric_guitar', 'organ', 'flute', 'harp', 'drums_electronic', 'marimba', 'trumpet', 'violin', 'saxophone', 'pad_synth', 'celesta', 'vibraphone', 'xylophone', 'clarinet', 'tuba', 'choir', 'banjo', 'electric_piano', 'granular_pad', 'vocoder_synth']),
  notes: z.array(NoteSchema),
  settings: TrackSettingsSchema
}).refine((track) => {
  const melodicInstruments = ['synth_lead', 'synth_bass', 'piano', 'strings', 'brass', 'electric_guitar', 'organ', 'flute', 'harp', 'marimba', 'trumpet', 'violin', 'saxophone', 'pad_synth', 'celesta', 'vibraphone', 'xylophone', 'clarinet', 'tuba', 'choir', 'banjo', 'electric_piano', 'granular_pad', 'vocoder_synth'];

  if (melodicInstruments.includes(track.instrument)) {
    return track.notes.every(note =>
      typeof note.value === 'number' || Array.isArray(note.value)
    );
  } else if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
    return track.notes.every(note =>
      typeof note.value === 'string' && ['kick', 'snare'].includes(note.value)
    );
  }
  return false;
}, {
  message: 'Track notes must match instrument type: melodic instruments accept pitch notation (e.g. "C4") or chord arrays, drums_kit/drums_electronic accepts "kick" or "snare"'
});

// Live Input Effect Configuration
export const LiveInputEffectSchema = z.object({
  type: z.enum(['reverb', 'delay', 'distortion', 'chorus', 'phaser', 'filter', 'echo', 'tremolo', 'bitcrush', 'wah', 'freezeReverb', 'pitchShift', 'harmonizer']),
  mix: z.number().min(0).max(1).default(0.5),
  params: z.record(z.any()).optional(),
  intervals: z.array(z.number().min(-24).max(24)).optional() // For harmonizer
});

// Live Input Configuration
export const LiveInputSchema = z.object({
  monitor: z.boolean().default(true),
  effects: z.array(LiveInputEffectSchema).default([]),
  recordArmed: z.boolean().default(false),
  outputTrack: z.string().optional() // Target track name for recording
}).optional();

export const MusicDataSchema = z.object({
  title: z.string().min(1),
  tempo: z.number().min(20).max(300),
  tracks: z.array(TrackSchema).min(1),
  live_input: LiveInputSchema
});

export const defaultMusicData = {
  title: 'Smooth Chord Demo',
  tempo: 100,
  tracks: [
    {
      name: 'Piano',
      instrument: 'piano',
      notes: [
        // Using chord arrays for rich harmony
        { time: 0, duration: 2, value: ['C4', 'E4', 'G4', 'C5'], volume: 0.5 },
        { time: 2, duration: 2, value: ['A3', 'C4', 'E4', 'A4'], volume: 0.5 },
        { time: 4, duration: 2, value: ['F3', 'A3', 'C4', 'F4'], volume: 0.5 },
        { time: 6, duration: 2, value: ['G3', 'B3', 'D4', 'G4'], volume: 0.5 },
        // Using chord shortcuts
        { time: 8, duration: 2, value: 'Cmaj4', volume: 0.6 },
        { time: 10, duration: 2, value: 'Amin3', volume: 0.6 },
        { time: 12, duration: 2, value: 'Fmaj4', volume: 0.6 },
        { time: 14, duration: 2, value: 'G74', volume: 0.7 }
      ],
      settings: {
        globalEffects: [{ type: 'reverb', level: 0.6 }],
        noteTransition: 'smooth',
        envelope: {
          attack: 0.02,
          decay: 0.3,
          sustain: 0.7,
          release: 1.5
        }
      }
    },
    {
      name: 'Pad',
      instrument: 'pad_synth',
      notes: [
        // Long sustained chords for atmosphere
        { time: 0, duration: 8, value: ['C3', 'G3', 'C4'], volume: 0.3 },
        { time: 8, duration: 8, value: ['A2', 'E3', 'A3'], volume: 0.3 }
      ],
      settings: {
        globalEffects: [
          { type: 'reverb', level: 0.9 },
          { type: 'chorus', level: 0.4 }
        ],
        noteTransition: 'smooth',
        envelope: {
          attack: 1.0,
          release: 3.0
        }
      }
    },
    {
      name: 'Lead',
      instrument: 'synth_lead',
      notes: [
        { time: 0, duration: 1, value: 'E5', volume: 0.4 },
        { time: 1, duration: 1, value: 'D5', volume: 0.4 },
        { time: 2, duration: 2, value: 'C5', volume: 0.5 },
        { time: 4, duration: 1, value: 'A4', volume: 0.4 },
        { time: 5, duration: 1, value: 'G4', volume: 0.4 },
        { time: 6, duration: 2, value: 'F4', volume: 0.5 },
        { time: 8, duration: 0.5, value: 'G4', volume: 0.5 },
        { time: 8.5, duration: 0.5, value: 'A4', volume: 0.5 },
        { time: 9, duration: 0.5, value: 'B4', volume: 0.5 },
        { time: 9.5, duration: 0.5, value: 'C5', volume: 0.5 },
        { time: 10, duration: 3, value: 'E5', volume: 0.6 },
        { time: 13, duration: 3, value: 'D5', volume: 0.5 }
      ],
      settings: {
        globalEffects: [
          { type: 'delay', level: 0.3 },
          { type: 'reverb', level: 0.5 }
        ],
        noteTransition: 'legato',
        portamento: 0.08,
        envelope: {
          attack: 0.05,
          release: 0.8
        }
      }
    },
    {
      name: 'Bass',
      instrument: 'synth_bass',
      notes: [
        { time: 0, duration: 2, value: 'C2', volume: 0.7 },
        { time: 2, duration: 2, value: 'A1', volume: 0.7 },
        { time: 4, duration: 2, value: 'F1', volume: 0.7 },
        { time: 6, duration: 1, value: 'G1', volume: 0.7 },
        { time: 7, duration: 1, value: 'G2', volume: 0.6 },
        { time: 8, duration: 2, value: 'C2', volume: 0.7 },
        { time: 10, duration: 2, value: 'A1', volume: 0.7 },
        { time: 12, duration: 2, value: 'F1', volume: 0.7 },
        { time: 14, duration: 2, value: 'G1', volume: 0.8 }
      ],
      settings: {
        globalEffects: [{ type: 'distortion', level: 0.2 }],
        noteTransition: 'smooth',
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.5,
          release: 0.5
        }
      }
    },
    {
      name: 'Drums',
      instrument: 'drums_kit',
      notes: [
        // Gentle rhythm with softer hits
        { time: 0, duration: 0.5, value: 'kick', volume: 0.8, repeat: 16 },
        { time: 1, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 3, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 5, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 7, duration: 0.1, value: 'snare', volume: 0.6 },
        { time: 9, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 11, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 13, duration: 0.1, value: 'snare', volume: 0.5 },
        { time: 15, duration: 0.1, value: 'snare', volume: 0.7, effect: 'reverb', effectLevel: 0.4 }
      ]
    }
  ]
};