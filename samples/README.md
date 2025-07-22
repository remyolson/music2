# Sample Library Directory Structure

This directory contains high-quality audio samples for natural-sounding instruments in Music2.

## Directory Structure

```
samples/
├── piano/
│   ├── grand_piano.sf2        # Full concert grand piano
│   ├── upright_piano.sf2      # Acoustic upright piano
│   └── honky_tonk.sf2         # Honky-tonk piano
├── strings/
│   ├── violin.sf2             # Solo violin with multiple articulations
│   ├── viola.sf2              # Solo viola
│   ├── cello.sf2              # Solo cello
│   ├── double_bass.sf2        # Solo double bass
│   └── string_section.sf2     # Full string section ensemble
├── woodwinds/
│   ├── flute.sf2              # Concert flute
│   ├── clarinet.sf2           # Bb clarinet
│   ├── oboe.sf2               # Oboe
│   ├── bassoon.sf2            # Bassoon
│   └── saxophone.sf2          # Alto saxophone
├── brass/
│   ├── trumpet.sf2            # Bb trumpet with mutes
│   ├── french_horn.sf2        # French horn
│   ├── trombone.sf2           # Tenor trombone
│   └── tuba.sf2               # Tuba
└── percussion/
    ├── timpani.sf2            # Orchestral timpani
    ├── orchestral_perc.sf2    # Xylophone, marimba, etc.
    └── drum_kit.sf2           # Acoustic drum kit
```

## Sample Requirements

### Format Support
- **SoundFont 2 (.sf2)** - Primary format for multi-sampled instruments
- **SFZ (.sfz)** - Alternative format with external samples
- **WAV files** - Individual samples (44.1kHz/24-bit minimum)

### Quality Standards
- **Velocity Layers**: Minimum 3, preferred 4+ layers for realistic dynamics
- **Round Robin**: Multiple samples per note to avoid machine-gun effect
- **Articulations**: Multiple playing techniques per instrument
- **Range Coverage**: Full professional range for each instrument

### Memory Optimization
- **Streaming**: Large samples load progressively
- **Compression**: Lossless compression where possible
- **Caching**: Smart caching based on usage patterns

## Sample Sources

### Recommended Free Sources
- **Philharmonia Orchestra Samples** - High-quality orchestral instruments
- **VSCO 2 Community Edition** - Full orchestra samples
- **Sonatina Symphonic Orchestra** - Complete symphonic library
- **FluidR3** - General MIDI compatible SoundFont

### Commercial Sources (Optional)
- **Native Instruments** - Kontakt libraries
- **Spitfire Audio** - Orchestral samples
- **EastWest** - Symphonic libraries
- **Vienna Symphonic Library** - Professional samples

## Installation Instructions

### Automatic Installation
```bash
# Download basic sample pack
npm run samples:download

# Download full orchestral pack (larger)
npm run samples:download-full
```

### Manual Installation
1. Download SoundFont files to appropriate directories
2. Ensure proper naming convention
3. Update sample library configuration if needed

## Usage in Code

```javascript
import { sampleLibrary } from './src/audio/samples/SampleLibrary.js';

// Load a natural piano
const piano = await sampleLibrary.createNaturalPiano('grand_piano');

// Load orchestral strings
const violin = await sampleLibrary.createOrchestralStrings('violin');

// Use in your composition
piano.play('C4', 100, '+0.1', '2n');
violin.setArticulation('legato');
violin.play(['G3', 'D4', 'A4', 'E5'], 80, '+0.5', '1n');
```

## Performance Considerations

### Memory Usage
- **Basic Pack**: ~50MB (essential instruments)
- **Full Pack**: ~500MB (complete orchestra)
- **Streaming**: Samples load on-demand to minimize memory

### Loading Time
- **Initial Load**: 2-5 seconds for basic instruments
- **Background Loading**: Additional instruments load during use
- **Preloading**: Critical instruments can be preloaded

### CPU Usage
- **Convolution**: Modern CPUs handle real-time convolution well
- **Polyphony**: Up to 128 simultaneous voices
- **Effects Processing**: Minimal impact on sample playback

## Troubleshooting

### Common Issues

**Samples not loading:**
- Check file paths in configuration
- Verify SoundFont file integrity
- Check browser's CORS policy for local files

**High memory usage:**
- Enable sample streaming in settings
- Reduce number of velocity layers
- Clear unused instruments from cache

**Audio dropouts:**
- Increase audio buffer size
- Reduce number of simultaneous voices
- Check CPU usage

### Fallback Behavior
When samples fail to load, the system automatically falls back to:
1. **Synthesized equivalents** - High-quality Tone.js synthesis
2. **Cached alternatives** - Previously loaded similar instruments
3. **Basic waveforms** - Simple oscillators as last resort

## Contributing Samples

### Guidelines
- **Legal**: Only contribute samples you have rights to distribute
- **Quality**: Minimum 44.1kHz/16-bit, prefer 48kHz/24-bit
- **Format**: Convert to SoundFont 2 format
- **Documentation**: Include instrument range and articulation info

### Submission Process
1. Test samples with the SampleLibrary system
2. Verify memory usage is reasonable
3. Submit pull request with documentation
4. Provide licensing information

## License Information

Sample files may have different licenses than the Music2 codebase. Check individual sample pack licenses for usage rights and attribution requirements.

### Default Samples
- **Source**: Free and open-source libraries
- **License**: Generally Creative Commons or similar permissive licenses
- **Attribution**: Listed in SAMPLE_CREDITS.md (when applicable)

---

**Note**: This directory structure supports the Music2 V2 enhancement plan for natural instrument support. The sample library automatically handles loading, caching, and fallback behavior to ensure smooth operation regardless of available samples.