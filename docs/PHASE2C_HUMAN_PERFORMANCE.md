# Phase 2C: Human Performance System Documentation

## Overview

The Human Performance System adds realistic human-like timing, dynamics, and expression to Music2. It transforms mechanical MIDI performances into natural, expressive musical renditions by simulating the subtle imperfections and artistic choices that human musicians make.

## Core Components

### 1. **TimingHumanizer** (`TimingHumanizer.js`)
Adds natural timing variations to simulate human performance imperfections.

**Features:**
- Natural timing deviations (±20ms default)
- Instrument-specific timing profiles
- Swing and shuffle timing
- Rubato and expressive timing
- Micro-timing adjustments
- Ensemble timing relationships

**Key Methods:**
```javascript
// Process individual note
processNoteEvent(note, context)

// Set timing style
setStyle('natural' | 'tight' | 'loose' | 'jazz' | 'classical')

// Enable swing
setSwing(amount) // 0-1, where 0.67 = triplet swing

// Enable rubato
setRubato(enabled, { intensity, phraseLength, curve })
```

### 2. **VelocityPatternGenerator** (`VelocityPatternGenerator.js`)
Creates human-like velocity (dynamics) patterns.

**Features:**
- Natural velocity variations
- Accent patterns (downbeats, syncopation)
- Phrase-based dynamics
- Expression shapes (crescendo, diminuendo)
- Instrument-specific dynamic ranges
- Note relationship dynamics

**Key Methods:**
```javascript
// Generate velocity for a note
generateVelocity(noteContext)

// Generate velocities for sequence
generateSequenceVelocities(notes, options)

// Create expression curves
createVelocityCurve(type, length)
```

### 3. **MicroGroove** (`MicroGroove.js`)
Implements micro-timing and groove feel.

**Features:**
- Genre-specific groove templates
- Micro-timing adjustments per instrument
- Subdivision feel (straight, shuffle, swing)
- Human performance patterns
- Tempo-dependent adjustments

**Groove Templates:**
- `straight` - No swing
- `jazz-swing` - Classic jazz swing feel
- `funk` - Tight pocket with ghost notes
- `reggae` - Off-beat emphasis
- `hip-hop` - Laid-back with heavy swing
- `latin-clave` - Latin rhythmic feel
- `shuffle` - Heavy shuffle groove
- `bossa` - Smooth bossa nova feel

### 4. **EnsembleTimingSystem** (`EnsembleTimingSystem.js`)
Coordinates timing between multiple instruments.

**Features:**
- Instrument role-based timing
- Section timing (orchestral)
- Interaction patterns (call-response, unison)
- Ensemble tightness control
- Musical context awareness
- Skill level simulation

**Interaction Patterns:**
- `call-response` - Sequential playing
- `counterpoint` - Independent lines
- `unison` - Synchronized playing
- `accompaniment` - Supporting role
- `trading` - Jazz-style trading

### 5. **HumanPerformanceSystem** (`HumanPerformanceSystem.js`)
Main integration system coordinating all performance aspects.

**Features:**
- Unified performance processing
- Performance profiles (natural, tight, loose, jazz, classical)
- Skill level simulation
- Performance metrics
- Real-time parameter control

## Usage Examples

### Basic Usage

```javascript
import { humanPerformanceSystem } from './audio/performance/HumanPerformanceSystem.js';

// Enable human performance
humanPerformanceSystem.enabled = true;

// Set performance style
humanPerformanceSystem.loadProfile('jazz');

// Set skill level
humanPerformanceSystem.setSkillLevel('professional');

// Process a single note
const humanizedNote = humanPerformanceSystem.processNote(note, {
  instrumentType: 'piano',
  instrumentId: 'piano1'
});

// Process a sequence
const humanizedSequence = humanPerformanceSystem.processSequence(notes, {
  instrumentType: 'saxophone',
  tempo: 120
});
```

### AudioEngine Integration

The system is automatically integrated in `audioEngine.js`:

```javascript
// Control functions
setHumanPerformanceEnabled(true);
setHumanPerformanceStyle('natural');
setHumanPerformanceSkillLevel('professional');

// Fine-tune parameters
setHumanPerformanceParameter('timing', 0.02);     // Timing variation
setHumanPerformanceParameter('velocity', 0.15);   // Dynamic variation
setHumanPerformanceParameter('groove', 0.5);      // Groove intensity
setHumanPerformanceParameter('swing', 0.67);      // Swing amount
setHumanPerformanceParameter('ensemble', 0.85);   // Ensemble tightness

// Get metrics
const metrics = getHumanPerformanceMetrics();
// Returns: { timingAccuracy, dynamicRange, grooveStrength, expressiveness }
```

## Performance Profiles

### Natural (Default)
- Moderate timing variations (±20ms)
- Natural velocity patterns
- Subtle groove
- Balanced ensemble

### Tight
- Minimal timing variations (±10ms)
- Consistent dynamics
- No groove
- Very tight ensemble

### Loose
- Large timing variations (±40ms)
- Expressive dynamics
- Strong groove feel
- Relaxed ensemble

### Jazz
- Swing timing
- Dynamic expression
- Behind-the-beat feel
- Interactive ensemble

### Classical
- Precise timing with rubato
- Wide dynamic range
- No swing
- Orchestral ensemble

## Skill Levels

### Beginner
- Large timing variations
- Inconsistent dynamics
- Loose ensemble
- More "mistakes"

### Intermediate
- Moderate variations
- Better dynamic control
- Improving ensemble
- Occasional imperfections

### Advanced
- Good timing control
- Consistent dynamics
- Solid ensemble
- Rare imperfections

### Professional
- Excellent timing
- Expressive dynamics
- Tight ensemble
- Intentional variations

### Virtuoso
- Perfect control
- Masterful expression
- Flawless ensemble
- Artistic choices

## Configuration Options

### Timing Configuration
```javascript
timing: {
  style: 'natural',           // Timing style
  amount: 0.02,              // Base variation (seconds)
  swingAmount: 0,            // 0-1 swing amount
  rubato: {
    enabled: false,
    intensity: 0.1,          // Rubato amount
    phraseLength: 4,         // Bars per phrase
    curve: 'sine'            // Rubato shape
  }
}
```

### Velocity Configuration
```javascript
velocity: {
  style: 'natural',          // Velocity style
  variationAmount: 0.15,     // Variation range
  phraseDynamics: true,      // Enable phrase shaping
  accentPattern: '4/4-basic' // Accent pattern
}
```

### Groove Configuration
```javascript
groove: {
  style: 'straight',         // Groove template
  intensity: 0.5,            // Overall intensity
  microAdjustments: true,    // Enable micro-timing
  behindBeat: 0              // Global behind-beat amount
}
```

### Ensemble Configuration
```javascript
ensemble: {
  tightness: 0.85,          // How tight ensemble plays
  interaction: true,         // Enable interactions
  style: 'jazz-combo'       // Ensemble type
}
```

## Performance Metrics

The system provides real-time metrics:

```javascript
{
  timingAccuracy: 0.95,     // How accurate timing is (0-1)
  dynamicRange: 0.7,        // Dynamic variation range
  grooveStrength: 0.8,      // Groove consistency
  expressiveness: 0.75      // Overall expressiveness
}
```

## Advanced Features

### Custom Groove Templates
```javascript
microGroove.grooveTemplates.set('custom-groove', {
  subdivisions: [0, 0.01, -0.005, 0.002],
  velocities: [1, 0.6, 0.8, 0.7],
  consistency: 0.9
});
```

### Instrument-Specific Timing
```javascript
timingHumanizer.instrumentProfiles.set('custom-instrument', {
  baseDeviation: 0.02,
  specificParameter: 0.01
});
```

### Performance Analysis
```javascript
const analysis = humanPerformanceSystem.analyzePerformance(notes);
// Returns detailed timing, groove, and ensemble analysis
```

## Best Practices

1. **Start Subtle**: Begin with default settings and adjust gradually
2. **Match Genre**: Use appropriate profiles for musical style
3. **Consider Tempo**: Faster tempos need less variation
4. **Ensemble Size**: Larger ensembles need more careful timing
5. **Test in Context**: Always test with actual musical content

## Memory and Performance

The system is designed to be efficient:
- Minimal processing overhead
- No audio buffer allocations
- Stateless note processing
- Efficient pattern caching
- Automatic cleanup

## Integration with Other Systems

Works seamlessly with:
- **Music Expression System**: Velocity affects expression
- **Composition System**: Respects voice leading
- **MIDI Input**: Enhances live performance
- **Effects**: Timing affects effect parameters

## Troubleshooting

### Too Much Variation
- Reduce timing amount
- Increase ensemble tightness
- Use 'tight' profile
- Increase skill level

### Not Human Enough
- Increase variation amounts
- Use 'loose' or 'natural' profile
- Enable rubato
- Add groove

### Timing Issues
- Check tempo settings
- Verify time signature
- Adjust for instrument latency
- Check ensemble relationships

## Future Enhancements

Planned improvements:
- Machine learning-based patterns
- Genre-specific AI models
- Adaptive performance styles
- Recording analysis
- MIDI export with humanization