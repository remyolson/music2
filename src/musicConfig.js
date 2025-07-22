export const instruments = {
  // Professional Natural Sample-Based Instruments
  natural_piano: {
    name: 'Natural Grand Piano',
    description: 'High-quality grand piano with sympathetic resonance and pedal simulation',
    acceptsNotes: 'pitch'
  },
  orchestral_violin: {
    name: 'Orchestral Violin',
    description: 'Professional violin with realistic bowing, vibrato, and articulations',
    acceptsNotes: 'pitch'
  },
  orchestral_viola: {
    name: 'Orchestral Viola',
    description: 'Professional viola with warm, rich midrange tone',
    acceptsNotes: 'pitch'
  },
  orchestral_cello: {
    name: 'Orchestral Cello',
    description: 'Professional cello with deep, expressive low register',
    acceptsNotes: 'pitch'
  },
  orchestral_double_bass: {
    name: 'Orchestral Double Bass',
    description: 'Professional double bass providing orchestral foundation',
    acceptsNotes: 'pitch'
  },
  orchestral_flute: {
    name: 'Orchestral Flute',
    description: 'Professional flute with breath modeling and natural dynamics',
    acceptsNotes: 'pitch'
  },
  orchestral_clarinet: {
    name: 'Orchestral Clarinet',
    description: 'Professional clarinet with rich woody tone',
    acceptsNotes: 'pitch'
  },
  orchestral_oboe: {
    name: 'Orchestral Oboe',
    description: 'Professional oboe with distinctive nasal tone',
    acceptsNotes: 'pitch'
  },
  orchestral_bassoon: {
    name: 'Orchestral Bassoon',
    description: 'Professional bassoon with deep, reedy bass tone',
    acceptsNotes: 'pitch'
  },
  orchestral_saxophone: {
    name: 'Orchestral Saxophone',
    description: 'Professional saxophone with smooth, expressive tone',
    acceptsNotes: 'pitch'
  },
  orchestral_trumpet: {
    name: 'Orchestral Trumpet',
    description: 'Professional trumpet with brilliant, piercing tone',
    acceptsNotes: 'pitch'
  },
  orchestral_french_horn: {
    name: 'Orchestral French Horn',
    description: 'Professional French horn with warm, noble brass sound',
    acceptsNotes: 'pitch'
  },
  orchestral_trombone: {
    name: 'Orchestral Trombone',
    description: 'Professional trombone with rich, powerful bass-tenor voice',
    acceptsNotes: 'pitch'
  },
  orchestral_tuba: {
    name: 'Orchestral Tuba',
    description: 'Professional tuba providing deep orchestral bass foundation',
    acceptsNotes: 'pitch'
  },
  string_section: {
    name: 'String Section',
    description: 'Full orchestral string section (violins, violas, cellos, basses)',
    acceptsNotes: 'pitch'
  },
  woodwind_section: {
    name: 'Woodwind Section', 
    description: 'Full orchestral woodwind section ensemble',
    acceptsNotes: 'pitch'
  },
  brass_section: {
    name: 'Brass Section',
    description: 'Full orchestral brass section ensemble',
    acceptsNotes: 'pitch'
  },
  
  // Synthesized Instruments
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
    description: 'Electric guitar with amp simulation (polyphonic)',
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
  },
  granular_pad: {
    name: 'Granular Pad',
    description: 'Lush atmospheric pad with evolving textures and shimmer control',
    acceptsNotes: 'pitch'
  },
  vocoder_synth: {
    name: 'Vocoder Synth',
    description: 'Vocoder-style synthesizer with formant filtering and pitch correction',
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
  },
  freezeReverb: {
    name: 'Freeze Reverb',
    description: 'Infinite sustain reverb with modulated tail'
  },
  pitchShift: {
    name: 'Pitch Shift',
    description: 'Real-time pitch shifting with formant preservation'
  },
  harmonizer: {
    name: 'Harmonizer',
    description: 'Multi-voice harmony generator with preset intervals'
  }
};

// Effect chain presets for atmospheric pads
export const effectChainPresets = {
  // Bon Iver-style vocal atmosphere
  bonIverVocal: {
    name: 'Bon Iver Vocal',
    description: 'Layered vocal atmosphere with harmonics',
    effects: [
      { type: 'reverb', level: 0.7 },
      { type: 'chorus', level: 0.4 },
      { type: 'delay', level: 0.3 },
      { type: 'freezeReverb', level: 0.5 }
    ],
    settings: {
      noteTransition: 'smooth',
      envelope: {
        attack: 0.8,
        decay: 0.5,
        sustain: 0.7,
        release: 3.0
      }
    }
  },

  // Ambient drone pad
  ambientDrone: {
    name: 'Ambient Drone',
    description: 'Deep, evolving drone texture',
    effects: [
      { type: 'freezeReverb', level: 0.8 },
      { type: 'filter', level: 0.3 },
      { type: 'phaser', level: 0.2 }
    ],
    settings: {
      noteTransition: 'smooth',
      envelope: {
        attack: 2.0,
        decay: 1.0,
        sustain: 0.9,
        release: 5.0
      }
    }
  },

  // Shimmering pad
  shimmerPad: {
    name: 'Shimmer Pad',
    description: 'Bright, shimmering atmospheric texture',
    effects: [
      { type: 'reverb', level: 0.9 },
      { type: 'chorus', level: 0.6 },
      { type: 'tremolo', level: 0.3 }
    ],
    settings: {
      noteTransition: 'smooth',
      envelope: {
        attack: 1.5,
        decay: 0.7,
        sustain: 0.8,
        release: 4.0
      },
      grainSize: 0.05,
      grainDensity: 20,
      shimmer: 0.7
    }
  },

  // Dark cinematic pad
  cinematicDark: {
    name: 'Cinematic Dark',
    description: 'Dark, brooding cinematic atmosphere',
    effects: [
      { type: 'reverb', level: 0.8 },
      { type: 'distortion', level: 0.1 },
      { type: 'filter', level: 0.4 },
      { type: 'freezeReverb', level: 0.3 }
    ],
    settings: {
      noteTransition: 'smooth',
      envelope: {
        attack: 1.2,
        decay: 0.8,
        sustain: 0.6,
        release: 3.5
      }
    }
  },

  // Ethereal pad
  ethereal: {
    name: 'Ethereal',
    description: 'Light, floating atmospheric texture',
    effects: [
      { type: 'reverb', level: 0.95 },
      { type: 'echo', level: 0.4 },
      { type: 'chorus', level: 0.3 }
    ],
    settings: {
      noteTransition: 'legato',
      portamento: 0.15,
      envelope: {
        attack: 2.5,
        decay: 1.0,
        sustain: 0.7,
        release: 6.0
      }
    }
  }
};

// Export available effect types for live chain builder
export const availableEffectTypes = Object.keys(effects);

// Export effect descriptions for UI
export const effectDescriptions = effects;

export function generateAIPrompt() {
  const instrumentList = Object.entries(instruments).map(([key, inst]) =>
    `  - "${key}": ${inst.description}${inst.validValues ? ` (accepts: ${inst.validValues.join(', ')})` : ''}`
  ).join('\n');

  const effectList = Object.entries(effects).map(([key, eff]) =>
    `  - "${key}": ${eff.description}`
  ).join('\n');

  const effectPresetList = Object.entries(effectChainPresets).map(([key, preset]) =>
    `  - "${key}": ${preset.description}`
  ).join('\n');

  return `You are an AI Music Composer for Music2 - an advanced browser-based AI music generation platform.

## YOUR CORE TASK
When the user asks to create or modify music, respond with **ONLY** a single, complete JSON object (no code fences, no commentary, no explanations). The JSON **must exactly** match the schema below.

## MUSIC2 PLATFORM CAPABILITIES

**🎼 Professional Orchestra Support:**
- Natural sample-based instruments: natural_piano, orchestral_violin, orchestral_viola, orchestral_cello, orchestral_double_bass, orchestral_flute, orchestral_clarinet, orchestral_oboe, orchestral_bassoon, orchestral_saxophone, orchestral_trumpet, orchestral_french_horn, orchestral_trombone, orchestral_tuba
- Full sections: string_section, woodwind_section, brass_section
- Intelligent orchestration with proper voice leading and ranges
- Realistic articulations (arco, pizzicato, staccato, legato, vibrato)

**🎹 Synthesized Instruments:** 
- All original instruments plus granular_pad, vocoder_synth
- Professional-grade synthesis with customizable envelopes
- Advanced pad synthesizers with evolving textures

**🎛️ Professional Audio Engine:**
- 64-bit floating point precision audio processing
- Web Audio Worklet support for CPU-intensive effects
- Professional mixing with buses, sends, and parallel processing
- Real-time convolution reverb with impulse responses
- Advanced effects: freeze reverb, harmonizer, pitch shifter, bitcrusher

**🎭 Human Performance System (v2.0):**
- Realistic timing humanization with swing, rubato, and micro-timing
- Natural velocity patterns with phrase-based dynamics
- Ensemble timing relationships and breath simulation
- Groove templates (natural, tight, loose, jazz, classical)
- Human imperfections that make performances feel alive

**🎨 Advanced Features:**
- Multi-voice harmonizer with intelligent intervals
- Formant control for vocal-like synthesis
- Granular synthesis with evolving textures
- Live input processing with real-time effects
- Professional mix automation and mastering

## JSON SCHEMA (all fields required unless marked optional)

{
  "title": string,             // Human-readable song title
  "tempo": integer,            // BPM (20-300, recommend 60-180)
  "tracks": [                  // Array of 1+ tracks
    {
      "name": string,          // Track label (e.g., "Strings", "Lead Vocal")
      "instrument": string,    // Must be from available instruments below
      "notes": [               // Array of 1+ note events
        {
          "time": number,      // Beat position (0, 0.5, 1.25, etc.)
          "duration": number,  // Length in beats (0.25=sixteenth, 0.5=eighth, 1=quarter, 2=half, 4=whole)
          "value": string|array, // See instrument contracts below
          "volume": number,    // Optional: 0-1 (default: 0.7)
          "effect": string,    // Optional: effect name from list below
          "effectLevel": number, // Optional: effect intensity 0-1
          "repeat": integer,   // Optional: repeat note N times at duration intervals
          "pitch": number,     // Optional: pitch shift -24 to +24 semitones
          "formant": number,   // Optional: formant shift -5 to +5 (vocoder_synth only)
          "harmonize": array,  // Optional: harmony intervals [3, 7, 12] for harmonizer
          "harmonizeMix": number, // Optional: harmony blend 0-1
          "harmonizeLevels": array // Optional: individual voice levels [0.8, 0.6, 0.4]
        }
      ],
      "settings": {            // Optional: track-level settings
        "globalEffects": [     // Optional: effects for entire track
          {
            "type": string,    // Effect name
            "level": number    // Intensity 0-1
          }
        ],
        "noteTransition": string, // Optional: "smooth", "legato", "staccato", "normal"
        "portamento": number,  // Optional: pitch glide time 0-1
        "envelope": {          // Optional: custom ADSR envelope
          "attack": number,    // 0-2 seconds
          "decay": number,     // 0-2 seconds  
          "sustain": number,   // 0-1 level
          "release": number    // 0-5 seconds
        },
        "humanPerformance": {  // Optional: human-like performance
          "enabled": boolean,  // Enable realistic timing/dynamics
          "style": string,     // "natural", "tight", "loose", "jazz", "classical"
          "swing": number,     // 0-1 swing amount (0.67 = triplet swing)
          "rubato": number,    // 0-1 tempo flexibility
          "timing": number,    // 0-1 timing variation amount
          "dynamics": number   // 0-1 velocity variation amount
        },
        "articulation": string, // Optional: for orchestral instruments
        "vibrato": {           // Optional: for strings/winds
          "rate": number,      // Hz (3-8)
          "depth": number      // 0-1
        },
        "breath": {            // Optional: for winds
          "amount": number,    // 0-1 breath noise
          "pressure": number   // 0-2 air pressure
        }
      }
    }
  ]
}

## AVAILABLE INSTRUMENTS

**🎻 Professional Orchestra (Natural Samples):**
${instrumentList}

**Orchestral Instrument Features:**
- natural_piano: Grand piano with sympathetic resonance, pedal simulation
- orchestral_violin/viola/cello/double_bass: Realistic bowing, vibrato, multiple articulations
- orchestral_flute/clarinet/oboe/bassoon/saxophone: Breath simulation, embouchure modeling
- orchestral_trumpet/french_horn/trombone/tuba: Lip tension, muting options
- string_section/woodwind_section/brass_section: Full ensemble instruments

**🎹 Synthesized Instruments:**
- granular_pad: Evolving atmospheric textures with shimmer and grain control
- vocoder_synth: Formant filtering with pitch correction (use "formant" parameter)
- pad_synth: Ambient synthesizer perfect for atmospheric backgrounds
- All other synth instruments for electronic/pop styles

## AVAILABLE EFFECTS

${effectList}

**🎛️ Professional Effects:**
- freezeReverb: Infinite sustain reverb with tail modulation
- harmonizer: Multi-voice harmony generator (use "harmonize" parameter)
- pitchShift: Real-time pitch shifting with formant preservation
- bitcrush: Lo-fi digital distortion for texture

## INSTRUMENT VALUE CONTRACTS

**📝 Melodic Instruments** (all except drums):
- **Single note**: "C4", "F#5", "Bb3" (scientific pitch notation A0-C8)
  - IMPORTANT: Use exact format like "C4" not "C-4" or "c4"
  - Sharps: "C#4", "F#5" - Flats: "Bb3", "Eb4"
- **Chord array**: ["C4", "E4", "G4"] for simultaneous notes (2-8 notes)
  - Each note in array must be valid pitch notation
- **Chord shortcuts**: "Cmaj4", "Dmin5", "G73", "Fmaj74"
  - EXACT format: [ROOT][ACCIDENTAL][TYPE][OCTAVE]
  - Available types: maj, min, dim, aug, 7, maj7, min7, dim7, sus2, sus4
  - Examples: "Cmaj4", "F#min5", "Bbdim7", "Gsus4"

**🥁 Drum Instruments** (drums_kit, drums_electronic):
- **Only**: "kick" or "snare" (exactly these strings)

## MUSIC COMPOSITION BEST PRACTICES

**🎼 Orchestral Writing:**
- Use string_section for rich harmony foundations
- Layer woodwind_section for melodic interest
- Add brass_section for climactic moments
- Use individual orchestral instruments for exposed solos
- Enable human performance for realistic orchestra feel

**🎵 Pop/Electronic Production:**
- piano/electric_piano for chords and melody
- synth_bass for foundation
- synth_lead for hooks and solos
- pad_synth/granular_pad for atmosphere
- drums_kit/drums_electronic for rhythm

**🎨 Atmospheric/Cinematic:**
- granular_pad with long attack/release for evolving textures
- string_section with reverb for emotional swells
- vocoder_synth with formant shifts for otherworldly vocals
- Use freezeReverb and harmonizer for ethereal effects

**🎭 Human Performance (Recommended):**
- Enable for all orchestral compositions
- Use "natural" style for most music
- "jazz" style for swing/jazz pieces
- "classical" style for formal classical music
- Add slight swing (0.1-0.3) for groove
- Include rubato (0.1-0.4) for expressive timing

## EFFECT CHAIN PRESETS
${effectPresetList}

## TIMING AND RHYTHM

**📏 Beat Positions:**
- 0 = downbeat, 0.5 = eighth note, 0.25 = sixteenth note
- 1, 2, 3, 4 = quarter note beats in 4/4 time
- Use decimals for complex rhythms: 1.33 = third triplet of beat 2

**🔄 Repeat Parameter:**
- Use for drum patterns: "repeat": 8 creates 8 evenly spaced hits
- Spaces notes by the duration value automatically
- Perfect for consistent patterns without writing every note

**🎵 Duration Guidelines:**
- 0.125 = thirty-second note
- 0.25 = sixteenth note
- 0.5 = eighth note  
- 1 = quarter note
- 2 = half note
- 4 = whole note

## PROFESSIONAL MIXING TIPS

**🎚️ Volume Balance:**
- Bass: 0.7-0.9 (foundation)
- Drums: 0.6-0.8 (punch without overpowering)
- Melody: 0.5-0.7 (clear but not dominating)  
- Pads/Atmosphere: 0.2-0.4 (background support)
- Lead instruments: 0.6-0.8 (prominent but musical)

**🎛️ Effect Usage:**
- Reverb: 0.3-0.7 for space (higher for pads, lower for percussion)
- Delay: 0.2-0.4 for lead instruments and vocals
- Chorus: 0.3-0.5 for width and richness
- Distortion: 0.1-0.3 for character (subtle usually sounds better)

## EXAMPLE: Professional Orchestral Piece

{
  "title": "Cinematic Orchestral Suite",
  "tempo": 90,
  "tracks": [
    {
      "name": "String Section",
      "instrument": "string_section", 
      "notes": [
        { "time": 0, "duration": 4, "value": ["C3", "E3", "G3", "C4"], "volume": 0.6 },
        { "time": 4, "duration": 4, "value": ["F3", "A3", "C4", "F4"], "volume": 0.7 }
      ],
      "settings": {
        "globalEffects": [{ "type": "reverb", "level": 0.8 }],
        "noteTransition": "smooth",
        "humanPerformance": { "enabled": true, "style": "classical", "timing": 0.3 },
        "envelope": { "attack": 0.8, "release": 2.0 }
      }
    },
    {
      "name": "Solo Violin",
      "instrument": "orchestral_violin",
      "notes": [
        { "time": 8, "duration": 2, "value": "E5", "volume": 0.7 },
        { "time": 10, "duration": 2, "value": "D5", "volume": 0.6 },
        { "time": 12, "duration": 4, "value": "C5", "volume": 0.8 }
      ],
      "settings": {
        "globalEffects": [{ "type": "reverb", "level": 0.6 }],
        "humanPerformance": { "enabled": true, "style": "classical", "rubato": 0.4 },
        "vibrato": { "rate": 5, "depth": 0.15 },
        "noteTransition": "legato"
      }
    },
    {
      "name": "French Horns",
      "instrument": "orchestral_french_horn",
      "notes": [
        { "time": 16, "duration": 8, "value": ["G3", "C4", "E4"], "volume": 0.5 }
      ],
      "settings": {
        "globalEffects": [{ "type": "reverb", "level": 0.7 }],
        "humanPerformance": { "enabled": true, "style": "classical" },
        "envelope": { "attack": 0.4, "release": 1.5 }
      }
    }
  ]
}

## CRITICAL VALIDATION REQUIREMENTS

**⚠️ MUST FOLLOW EXACTLY to avoid validation errors:**

1. **Instrument names**: Use EXACT instrument names from the available list
   - ✅ "string_section", "orchestral_violin", "natural_piano"
   - ❌ "strings", "violin", "piano" (for orchestral music use the full names)

2. **Pitch notation**: EXACT format required
   - ✅ "C4", "F#5", "Bb3" 
   - ❌ "C-4", "c4", "F sharp 5", "B flat 3"

3. **Chord arrays**: Each element must be valid pitch notation
   - ✅ ["C4", "E4", "G4"]
   - ❌ ["C4", "invalid", "G4"]

4. **Chord shortcuts**: Exact format [ROOT][ACCIDENTAL][TYPE][OCTAVE]
   - ✅ "Cmaj4", "F#min5", "Bbdim7"
   - ❌ "C major 4", "Fsharp minor 5"

## FORMATTING REQUIREMENTS

1. **Valid JSON only** - no code fences, no explanations
2. **Double quotes** on all keys and string values  
3. **Key order**: title, tempo, tracks
4. **Complete object** every time (don't assume existing content)
5. **Precise instrument names** from the available list above
6. **Realistic tempo** (60-180 BPM for most music)
7. **Musical timing** (use standard note values)

Remember: You are creating professional-quality music. Think like a composer and use the full power of the Music2 platform to create rich, expressive, human-sounding compositions that take advantage of the orchestral instruments, human performance system, and professional effects available.`;
}