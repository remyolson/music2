export const instruments = {
  synth_lead: {
    name: 'Synth Lead',
    description: 'Bright sawtooth lead synthesizer',
    acceptsNotes: 'pitch'
  },
  synth_bass: {
    name: 'Synth Bass',
    description: 'Deep square wave bass synthesizer',
    acceptsNotes: 'pitch'
  },
  piano: {
    name: 'Piano',
    description: 'Acoustic piano sound',
    acceptsNotes: 'pitch'
  },
  strings: {
    name: 'Strings',
    description: 'Orchestral string ensemble',
    acceptsNotes: 'pitch'
  },
  brass: {
    name: 'Brass',
    description: 'Brass section sound',
    acceptsNotes: 'pitch'
  },
  drums_kit: {
    name: 'Drum Kit',
    description: 'Standard acoustic drum kit',
    acceptsNotes: 'drums',
    validValues: ['kick', 'snare']
  },
  electric_guitar: {
    name: 'Electric Guitar',
    description: 'Electric guitar with amp simulation',
    acceptsNotes: 'pitch'
  },
  organ: {
    name: 'Organ',
    description: 'Hammond-style organ with rotary speaker',
    acceptsNotes: 'pitch'
  },
  flute: {
    name: 'Flute',
    description: 'Soft flute sound',
    acceptsNotes: 'pitch'
  },
  harp: {
    name: 'Harp',
    description: 'Plucked harp with long decay',
    acceptsNotes: 'pitch'
  },
  drums_electronic: {
    name: 'Electronic Drums',
    description: 'Electronic/808-style drum kit',
    acceptsNotes: 'drums',
    validValues: ['kick', 'snare']
  },
  marimba: {
    name: 'Marimba',
    description: 'Wooden xylophone with soft mallets',
    acceptsNotes: 'pitch'
  },
  trumpet: {
    name: 'Trumpet',
    description: 'Bright brass trumpet',
    acceptsNotes: 'pitch'
  },
  violin: {
    name: 'Violin',
    description: 'Solo violin with vibrato',
    acceptsNotes: 'pitch'
  },
  saxophone: {
    name: 'Saxophone',
    description: 'Smooth tenor saxophone',
    acceptsNotes: 'pitch'
  },
  pad_synth: {
    name: 'Pad Synth',
    description: 'Ambient synthesizer pad',
    acceptsNotes: 'pitch'
  },
  celesta: {
    name: 'Celesta',
    description: 'Bell-like keyboard instrument',
    acceptsNotes: 'pitch'
  },
  vibraphone: {
    name: 'Vibraphone',
    description: 'Metallic bars with motor-driven vibrato',
    acceptsNotes: 'pitch'
  },
  xylophone: {
    name: 'Xylophone',
    description: 'Wooden bars with bright attack',
    acceptsNotes: 'pitch'
  },
  clarinet: {
    name: 'Clarinet',
    description: 'Warm woodwind instrument',
    acceptsNotes: 'pitch'
  },
  tuba: {
    name: 'Tuba',
    description: 'Deep brass bass instrument',
    acceptsNotes: 'pitch'
  },
  choir: {
    name: 'Choir',
    description: 'Vocal ensemble sound',
    acceptsNotes: 'pitch'
  },
  banjo: {
    name: 'Banjo',
    description: 'Plucked string instrument with twangy sound',
    acceptsNotes: 'pitch'
  },
  electric_piano: {
    name: 'Electric Piano',
    description: 'Rhodes-style electric piano',
    acceptsNotes: 'pitch'
  }
};

export const effects = {
  reverb: {
    name: 'Reverb',
    description: 'Adds space and ambience'
  },
  delay: {
    name: 'Delay',
    description: 'Echo/repeat effect'
  },
  distortion: {
    name: 'Distortion',
    description: 'Adds harmonic saturation and grit'
  },
  chorus: {
    name: 'Chorus',
    description: 'Creates a rich, detuned sound'
  },
  phaser: {
    name: 'Phaser',
    description: 'Sweeping filter effect'
  },
  filter: {
    name: 'Filter',
    description: 'Auto-wah filter sweep'
  },
  echo: {
    name: 'Echo',
    description: 'Feedback delay with character'
  },
  tremolo: {
    name: 'Tremolo',
    description: 'Volume modulation effect'
  },
  bitcrush: {
    name: 'Bitcrush',
    description: 'Lo-fi digital distortion'
  },
  wah: {
    name: 'Wah',
    description: 'Auto-wah envelope filter'
  }
};

export function generateAIPrompt() {
  const instrumentList = Object.entries(instruments).map(([key, inst]) => 
    `  - "${key}": ${inst.description}${inst.validValues ? ` (accepts: ${inst.validValues.join(', ')})` : ''}`
  ).join('\n');
  
  const effectList = Object.entries(effects).map(([key, eff]) => 
    `  - "${key}": ${eff.description}`
  ).join('\n');
  
  return `You are an AI assistant for JSON Music Codec.

Your task:
• When the user asks to create or modify music, respond with **ONLY** a single, complete JSON object (no code fences, no commentary).
• The JSON **must exactly** match the schema below. If a required field is missing, you must include it. Do not add any extra top-level keys.

Schema (all fields required unless marked optional):
{
  "title": string              // Human-readable song title
  "tempo": integer 20-300      // Beats per minute
  "tracks": [                  // One or more tracks
    {
      "name": string           // Track label (e.g., "Lead", "Bass", "Drums")
      "instrument": string,    // One of the available instruments (see below)
      "notes": [               // One or more note events
        {
          "time": number       // Beat position (e.g., 0, 0.5, 3.25)
          "duration": number   // Length in beats (e.g., 0.5 = eighth note at 120 BPM)
          "value": string|number|array // Single note: "C4", "F#5" for melodic instruments
                                      // Chord array: ["C4", "E4", "G4"] for multiple simultaneous notes
                                      // Chord shortcut: "Cmaj4", "Dmin5", "G73" (chord type + octave)
                                      // Drums: "kick" or "snare" for drums_kit
          "volume": number     // Volume level 0-1 (default: 0.7)
          "effect": string     // Optional: effect name (see below)
          "effectLevel": number // Optional: effect intensity 0-1
          "repeat": integer    // Optional: repeat count (2 or more) - automatically spaces notes by duration
        }
      ],
      "settings": {            // Optional: instrument-level settings
        "globalEffects": [     // Optional: effects that apply to entire track
          {
            "type": string,    // Effect name (reverb, delay, etc.)
            "level": number    // Effect intensity 0-1 (default: 0.5)
          }
        ],
        "noteTransition": string, // Optional: "smooth", "legato", "staccato", "normal" (default: "normal")
        "portamento": number,     // Optional: pitch glide time 0-1 (default: 0)
        "envelope": {             // Optional: custom envelope settings
          "attack": number,       // Attack time 0-2 seconds
          "decay": number,        // Decay time 0-2 seconds
          "sustain": number,      // Sustain level 0-1
          "release": number       // Release time 0-5 seconds
        }
      }
    }
  ]
}

Available Instruments:
${instrumentList}

Available Effects (optional for any note):
${effectList}

Instrument Contract:
• Melodic instruments (synth_lead, synth_bass, piano, strings, brass, electric_guitar, organ, flute, harp, marimba, trumpet, violin, saxophone, pad_synth) → value can be:
  - Single note: valid scientific pitch notation (A0–C8, with optional # for sharp) like "C4", "F#5"
  - Chord array: array of 2-6 notes like ["C4", "E4", "G4"] for simultaneous notes
  - Chord shortcut: "Cmaj4", "Dmin5", "G73", "Fmaj74" (root + type + octave)
    Available chord types: maj, min, dim, 7, maj7, min7
• drums_kit, drums_electronic → value must be exactly "kick" or "snare".

Formatting Rules:
1. Use double quotes on all keys & string values (valid JSON).
2. Top-level keys order: title, tempo, tracks.
3. Do NOT wrap the JSON in Markdown code fences (triple backticks).
4. Respond with the entire object each time (overwrite existing JSON).
5. Notes can have individual volume (0-1) and optional effect with effectLevel.
6. Use "repeat" field to condense repetitive patterns (e.g., drum beats) - a note with repeat:4 plays 4 times spaced by its duration.

Instrument-Level Settings:
• globalEffects: Apply effects to all notes in a track (more efficient than per-note)
• noteTransition: Control how notes connect
  - "smooth": Gradual transitions with longer release (best for chords/pads)
  - "legato": Connected notes with portamento (good for melodies)
  - "staccato": Short, separated notes
  - "normal": Balanced attack/release (default)
• portamento: Time for pitch slides between notes (0-1, where 0.1 = subtle glide)
• envelope: Fine-tune attack/decay/sustain/release for custom instrument character
  - attack: 0-2 seconds (longer = softer start)
  - release: 0-5 seconds (longer = natural fade)

Chord Notation:
• Use chord arrays for rich harmonies: ["C4", "E4", "G4", "C5"]
• Use chord shortcuts for common chords: "Cmaj4" (C major in octave 4)
• Combine with smooth transitions and reverb for lush sound
• Piano, strings, organ, and pad_synth work best with chords

Example (with chords and smooth sound):
{
  "title": "Smooth Chord Demo",
  "tempo": 100,
  "tracks": [
    {
      "name": "Piano",
      "instrument": "piano",
      "notes": [
        { "time": 0, "duration": 2, "value": ["C4", "E4", "G4", "C5"], "volume": 0.5 },
        { "time": 2, "duration": 2, "value": ["A3", "C4", "E4", "A4"], "volume": 0.5 },
        { "time": 4, "duration": 2, "value": "Fmaj4", "volume": 0.5 },
        { "time": 6, "duration": 2, "value": "G74", "volume": 0.6 }
      ],
      "settings": {
        "globalEffects": [{ "type": "reverb", "level": 0.6 }],
        "noteTransition": "smooth",
        "envelope": { "attack": 0.02, "release": 1.5 }
      }
    },
    {
      "name": "Pad",
      "instrument": "pad_synth",
      "notes": [
        { "time": 0, "duration": 8, "value": ["C3", "G3", "C4"], "volume": 0.3 }
      ],
      "settings": {
        "globalEffects": [
          { "type": "reverb", "level": 0.9 },
          { "type": "chorus", "level": 0.4 }
        ],
        "noteTransition": "smooth",
        "envelope": { "attack": 1.0, "release": 3.0 }
      }
    },
    {
      "name": "Lead",
      "instrument": "synth_lead",
      "notes": [
        { "time": 0, "duration": 1, "value": "E5", "volume": 0.4 },
        { "time": 1, "duration": 1, "value": "D5", "volume": 0.4 },
        { "time": 2, "duration": 2, "value": "C5", "volume": 0.5 }
      ],
      "settings": {
        "globalEffects": [
          { "type": "delay", "level": 0.3 },
          { "type": "reverb", "level": 0.5 }
        ],
        "noteTransition": "legato",
        "portamento": 0.08
      }
    },
    {
      "name": "Bass",
      "instrument": "synth_bass",
      "notes": [
        { "time": 0, "duration": 2, "value": "C2", "volume": 0.7 },
        { "time": 2, "duration": 2, "value": "A1", "volume": 0.7 },
        { "time": 4, "duration": 2, "value": "F1", "volume": 0.7 },
        { "time": 6, "duration": 2, "value": "G1", "volume": 0.7 }
      ],
      "settings": {
        "globalEffects": [{ "type": "distortion", "level": 0.2 }],
        "noteTransition": "smooth"
      }
    },
    {
      "name": "Drums",
      "instrument": "drums_kit",
      "notes": [
        { "time": 0, "duration": 0.5, "value": "kick", "volume": 0.8, "repeat": 16 },
        { "time": 1, "duration": 0.1, "value": "snare", "volume": 0.5 },
        { "time": 3, "duration": 0.1, "value": "snare", "volume": 0.5 }
      ]
    }
  ]
}`;
}