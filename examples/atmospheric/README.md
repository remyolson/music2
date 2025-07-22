# Atmospheric Enhancements Examples

This directory contains example compositions showcasing the new atmospheric enhancement features added to JSON Music Codec.

## New Features

### 1. **Granular Pad Synthesizer**
A lush atmospheric pad instrument with evolving textures, perfect for ambient music.

**Settings:**
- `grainSize`: Controls the size of audio grains (0.01 - 1.0)
- `grainDensity`: Controls how many grains play simultaneously (1 - 50)
- `shimmer`: Adds chorus-like movement to the sound (0 - 1)

### 2. **Freeze Reverb Effect**
An infinite sustain reverb with modulated tail movement, ideal for creating vast soundscapes.

**Features:**
- Extremely long decay times (up to 120 seconds)
- Feedback delay for infinite sustain
- Modulated tail for evolving textures
- Can be frozen/unfrozen dynamically (future feature)

### 3. **Vocoder Synthesizer**
A vocoder-style synth with formant filtering and pitch correction for processed vocal effects.

**Parameters:**
- `formant`: Shifts the formant frequencies (-5 to +5)
- Built-in pitch correction
- Smooth portamento for voice-like glides

### 4. **Harmonizer Effect**
Creates rich harmonic layers from a single input signal.

**Features:**
- Up to 4 harmony voices
- Preset intervals (maj3, min3, fifth, octave, bon_iver)
- Individual voice level control
- Wet/dry mix control

**Usage in notes:**
```json
{
  "time": 0,
  "duration": 2,
  "value": "C4",
  "harmonize": [3, 7, 12],  // Minor 3rd, 5th, octave
  "harmonizeMix": 0.5,       // 50% wet signal
  "harmonizeLevels": [0.6, 0.4, 0.3]  // Individual voice levels
}
```

### 5. **Effect Chain Presets**
Pre-configured effect combinations for quick atmospheric sounds:

- **bonIverVocal**: Layered vocal atmosphere with harmonics
- **ambientDrone**: Deep, evolving drone texture
- **shimmerPad**: Bright, shimmering atmospheric texture
- **cinematicDark**: Dark, brooding cinematic atmosphere
- **ethereal**: Light, floating atmospheric texture

### 6. **Track Freeze**
Render tracks to static audio buffers to save CPU resources while maintaining playback quality.

**UI Feature:**
- Click the "FRZ" button next to any track to freeze it
- Click "UNFR" to unfreeze and return to dynamic processing

## Example Files

### bon-iver-woods.json
A Bon Iver-inspired composition featuring:
- Granular pad for lush harmonic foundation
- Vocoder synth with formant modulation for processed vocals
- Multiple harmony layers using pitch shifting
- Heavy use of freeze reverb for infinite sustains

### ethereal-ambient.json
An ethereal ambient soundscape showcasing:
- Long evolving granular pad textures
- Shimmering celesta melodies with delay
- Harmonized vibraphone with the harmonizer effect
- Multiple freeze reverb layers for vast spatial effects

## Performance Tips

1. **CPU Optimization**: Use the Track Freeze feature on complex pad tracks to reduce CPU load
2. **Layering**: Combine multiple granular pads at different octaves for rich textures
3. **Automation**: Vary the `formant` parameter over time for evolving vocal textures
4. **Effect Chains**: Apply effect presets to quickly achieve professional atmospheric sounds

## Loading Examples

1. Open JSON Music Codec in your browser
2. Click the "Load" button
3. Navigate to `examples/atmospheric/`
4. Select any `.json` file to load the composition
5. Click "Play" to hear the atmospheric soundscape

## Creating Your Own

Use these examples as templates for your own atmospheric compositions. Key techniques:
- Long note durations with smooth transitions
- Multiple overlapping pad layers
- Heavy reverb and delay effects
- Subtle pitch shifting for harmonic richness
- Formant modulation for vocal-like textures