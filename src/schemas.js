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
  value: z.union([DrumNoteSchema, PitchNoteSchema])
});

export const TrackSchema = z.object({
  name: z.string().min(1),
  instrument: z.enum(['synth_lead', 'drums_kit']),
  notes: z.array(NoteSchema)
}).refine((track) => {
  if (track.instrument === 'synth_lead') {
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
  message: 'Track notes must match instrument type: synth_lead accepts pitch notation (e.g. "C4"), drums_kit accepts "kick" or "snare"'
});

export const MusicDataSchema = z.object({
  title: z.string().min(1),
  tempo: z.number().min(60).max(200),
  tracks: z.array(TrackSchema).min(1)
});

export const defaultMusicData = {
  title: "Hello World",
  tempo: 120,
  tracks: [
    {
      name: "Lead",
      instrument: "synth_lead",
      notes: [
        { time: 0, duration: 0.5, value: "C4" },
        { time: 0.5, duration: 0.5, value: "E4" },
        { time: 1, duration: 0.5, value: "G4" },
        { time: 1.5, duration: 0.5, value: "C5" }
      ]
    },
    {
      name: "Drums",
      instrument: "drums_kit",
      notes: [
        { time: 0, duration: 0.1, value: "kick" },
        { time: 1, duration: 0.1, value: "snare" },
        { time: 2, duration: 0.1, value: "kick" },
        { time: 3, duration: 0.1, value: "snare" }
      ]
    }
  ]
};