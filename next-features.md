# Next Features Plan: Bon Iver-Inspired Sound Capabilities

## 1. Inspiration & Target Sound

**Reference**: Bon Iver's "715 – Creeks" features:
- Heavily processed vocals with auto-tune/vocoder effects
- Multiple vocal harmonies creating chord progressions
- Pitch-shifted formants for ethereal quality
- Rich ambient pads and atmospheric textures
- Dynamic swells and emotional expression
- Minimal instrumentation focusing on voice as instrument

**Goal**: Enable similar atmospheric, vocal-inspired sounds within our browser-based constraints, focusing on synthetic approximations rather than actual vocal processing.

## 2. Minimal JSON Enhancements

### Proposed Extensions (Backward Compatible)

```json
{
  "track": {
    "instrument": "vocoder_synth",
    "effects": [
      {
        "type": "pitch_shift",
        "semitones": 7,
        "mix": 0.5
      },
      {
        "type": "harmonizer",
        "intervals": [0, 4, 7],
        "mix": 0.8
      }
    ],
    "note_settings": {
      "glide": 0.3,
      "formant": -2
    }
  }
}
```

### New Note Properties
- `formant`: Shift formant frequencies (-5 to 5)
- `harmonize`: Array of semitone intervals for instant harmonies

## 3. New Instruments/Effects

### Priority 1: Essential for Bon Iver Sound
- [ ] **Vocoder Synth** - Synthesizer optimized for vocal-like timbres
  - Formant filter bank
  - Built-in pitch correction
  - Smooth portamento by default
  
- [ ] **Pitch Shifter** - Real-time pitch shifting effect
  - -24 to +24 semitones range
  - Formant preservation option
  - Mix control for parallel processing

- [ ] **Harmonizer** - Intelligent harmony generation
  - Preset intervals (3rd, 5th, octave)
  - Custom interval arrays
  - Per-voice level control

### Priority 2: Enhanced Atmosphere
- [ ] **Granular Pad** - Texture synthesizer
  - Grain size/density control
  - Built-in shimmer effect
  - Long, evolving textures

- [ ] **Freeze Reverb** - Infinite sustain reverb
  - Freeze toggle for drone creation
  - Pre-delay for rhythmic effects
  - Modulated tail for movement

### Priority 3: Nice-to-Have
- [ ] **Formant Filter** - Vowel-like filtering
- [ ] **Ring Modulator** - Metallic textures
- [ ] **Sidechain Compressor** - Pumping effects

## 4. UI/UX Tweaks

### Visual Enhancements
- [ ] **Waveform Display** for vocoder/pitched tracks
- [ ] **Formant Visualizer** showing vowel positions
- [ ] **Effect Chain Visualizer** with drag-and-drop reordering

### Performance Features
- [ ] **Track Freeze** button to reduce CPU load
- [ ] **Solo/Mute** improvements with keyboard shortcuts
- [ ] **Effect Presets** dropdown for quick Bon Iver-style chains

## 5. AI Prompt Updates

### Enhanced Prompt Templates

```markdown
For Bon Iver-style compositions, the AI should:

1. **Instrument Selection**
   - Prefer vocoder_synth for lead melodies
   - Layer 2-3 pad_synth tracks at different octaves
   - Use minimal percussion (kick, subtle shaker)

2. **Effect Chains**
   - Lead: harmonizer → pitch_shift → chorus → reverb
   - Pads: filter → delay → freeze_reverb
   - Global: gentle compression → master_reverb

3. **Composition Patterns**
   - Start sparse, build layers gradually
   - Use sustained chords with slow harmonic movement
   - Implement call-and-response between harmonized voices
   - Create dynamic swells with volume automation

4. **Technical Settings**
   - BPM: 60-80 for contemplative feel
   - Note transitions: "smooth" or "legato" exclusively
   - Heavy reverb (0.7-0.9) on most elements
   - Portamento: 0.2-0.5 on melodic instruments
```

### Example AI Instruction
"Create a Bon Iver-inspired piece using vocoder_synth with harmonizer creating maj7 chords, backed by layered pad_synths. Include pitch-shifted echoes and frozen reverb tails. Emotional arc: intimate to expansive."

## 6. Implementation Phases

### Phase 1: Core Vocal Effects (Week 1-2)
- [ ] Implement basic Pitch Shifter effect
- [ ] Create Vocoder Synth instrument with formant control
- [ ] Add formant property to note settings
- [ ] Update JSON parser for new properties
- [ ] Test with simple vocal-style melodies

### Phase 2: Harmony Generation (Week 3)
- [ ] Build Harmonizer effect with preset intervals
- [ ] Add harmonize property for per-note harmonies
- [ ] Create UI for harmony visualization
- [ ] Implement CPU-efficient voice allocation
- [ ] Add harmony presets (maj3, min3, 5th, octave)

### Phase 3: Atmospheric Enhancements (Week 4)
- [ ] Develop Freeze Reverb effect
- [ ] Enhance Pad Synth with granular textures
- [ ] Add effect chain presets to UI
- [ ] Implement track freeze for performance
- [ ] Create Bon Iver-style templates

### Phase 4: Polish & Integration (Week 5)
- [ ] Optimize performance for mobile devices
- [ ] Add keyboard shortcuts for effect toggling
- [ ] Create demo songs showcasing new features
- [ ] Update AI prompts with new capabilities
- [ ] Write user documentation

## Success Metrics
- Can recreate the essence of "715 – Creeks" atmospherics
- CPU usage remains under 60% with full arrangement
- New users can create Bon Iver-style tracks within 10 minutes
- Maintains backward compatibility with existing songs
- Mobile performance acceptable on 2020+ devices