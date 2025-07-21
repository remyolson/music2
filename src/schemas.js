import { z } from 'zod';

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

export const NoteSchema = z.object({
  time: z.number().min(0),
  duration: z.number().min(0.1),
  value: z.union([DrumNoteSchema, PitchNoteSchema]),
  volume: z.number().min(0).max(1).default(0.7),
  effect: z.enum(['reverb', 'delay', 'distortion', 'chorus', 'phaser']).optional(),
  effectLevel: z.number().min(0).max(1).optional()
}).refine(data => {
  if (data.effect && !data.effectLevel) {
    data.effectLevel = 0.5;
  }
  return true;
});

export const GlobalEffectSchema = z.object({
  type: z.enum(['reverb', 'delay', 'distortion', 'chorus', 'phaser']),
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
  instrument: z.enum(['synth_lead', 'synth_bass', 'piano', 'strings', 'brass', 'drums_kit']),
  notes: z.array(NoteSchema),
  settings: TrackSettingsSchema
}).refine((track) => {
  const melodicInstruments = ['synth_lead', 'synth_bass', 'piano', 'strings', 'brass'];
  
  if (melodicInstruments.includes(track.instrument)) {
    return track.notes.every(note => 
      typeof note.value === 'number'
    );
  } else if (track.instrument === 'drums_kit') {
    return track.notes.every(note => 
      typeof note.value === 'string' && ['kick', 'snare'].includes(note.value)
    );
  }
  return false;
}, {
  message: 'Track notes must match instrument type: melodic instruments accept pitch notation (e.g. "C4"), drums_kit accepts "kick" or "snare"'
});

export const MusicDataSchema = z.object({
  title: z.string().min(1),
  tempo: z.number().min(60).max(200),
  tracks: z.array(TrackSchema).min(1)
});

export const defaultMusicData = {
  title: "Enhanced Demo Song",
  tempo: 120,
  tracks: [
    {
      name: "Piano",
      instrument: "piano",
      notes: [
        { time: 0, duration: 1, value: "C4", volume: 0.6 },
        { time: 1, duration: 1, value: "E4", volume: 0.6 },
        { time: 2, duration: 1, value: "G4", volume: 0.6 },
        { time: 3, duration: 1, value: "C5", volume: 0.7 }
      ],
      settings: {
        globalEffects: [{ type: "reverb", level: 0.7 }],
        noteTransition: "smooth"
      }
    },
    {
      name: "Lead",
      instrument: "synth_lead",
      notes: [
        { time: 4, duration: 0.5, value: "E5", volume: 0.5 },
        { time: 4.5, duration: 0.5, value: "D5", volume: 0.5 },
        { time: 5, duration: 0.5, value: "C5", volume: 0.5 },
        { time: 5.5, duration: 0.5, value: "G4", volume: 0.5 },
        { time: 6, duration: 2, value: "E4", volume: 0.6 }
      ],
      settings: {
        globalEffects: [
          { type: "delay", level: 0.4 },
          { type: "chorus", level: 0.5 }
        ],
        noteTransition: "legato",
        portamento: 0.05
      }
    },
    {
      name: "Bass",
      instrument: "synth_bass",
      notes: [
        { time: 0, duration: 0.5, value: "C2", volume: 0.8 },
        { time: 0.5, duration: 0.5, value: "C2", volume: 0.6 },
        { time: 1, duration: 0.5, value: "E2", volume: 0.8 },
        { time: 1.5, duration: 0.5, value: "E2", volume: 0.6 },
        { time: 2, duration: 0.5, value: "G2", volume: 0.8 },
        { time: 2.5, duration: 0.5, value: "G2", volume: 0.6 },
        { time: 3, duration: 0.5, value: "C3", volume: 0.8 },
        { time: 3.5, duration: 0.5, value: "G2", volume: 0.6 },
        { time: 4, duration: 0.5, value: "C2", volume: 0.8 },
        { time: 4.5, duration: 0.5, value: "C2", volume: 0.6 },
        { time: 5, duration: 0.5, value: "G2", volume: 0.8 },
        { time: 5.5, duration: 0.5, value: "G2", volume: 0.6 },
        { time: 6, duration: 0.5, value: "C2", volume: 0.8 },
        { time: 6.5, duration: 0.5, value: "C2", volume: 0.6 },
        { time: 7, duration: 0.5, value: "G1", volume: 0.8 },
        { time: 7.5, duration: 0.5, value: "C2", volume: 0.6 }
      ],
      settings: {
        globalEffects: [{ type: "distortion", level: 0.3 }],
        noteTransition: "staccato"
      }
    },
    {
      name: "Strings",
      instrument: "strings",
      notes: [
        { time: 4, duration: 4, value: "C4", volume: 0.4 },
        { time: 4, duration: 4, value: "E4", volume: 0.4 },
        { time: 4, duration: 4, value: "G4", volume: 0.4 }
      ],
      settings: {
        globalEffects: [{ type: "reverb", level: 0.8 }],
        noteTransition: "smooth",
        envelope: {
          attack: 0.4,
          release: 1.8
        }
      }
    },
    {
      name: "Drums",
      instrument: "drums_kit",
      notes: [
        { time: 0, duration: 0.1, value: "kick", volume: 1.0 },
        { time: 0.5, duration: 0.1, value: "kick", volume: 0.7 },
        { time: 1, duration: 0.1, value: "snare", volume: 0.9 },
        { time: 2, duration: 0.1, value: "kick", volume: 1.0 },
        { time: 2.5, duration: 0.1, value: "kick", volume: 0.7 },
        { time: 3, duration: 0.1, value: "snare", volume: 0.9 },
        { time: 4, duration: 0.1, value: "kick", volume: 1.0 },
        { time: 4.5, duration: 0.1, value: "kick", volume: 0.7 },
        { time: 5, duration: 0.1, value: "snare", volume: 0.9, effect: "reverb", effectLevel: 0.3 },
        { time: 6, duration: 0.1, value: "kick", volume: 1.0 },
        { time: 6.5, duration: 0.1, value: "kick", volume: 0.7 },
        { time: 7, duration: 0.1, value: "snare", volume: 0.9, effect: "reverb", effectLevel: 0.3 }
      ]
    }
  ]
};