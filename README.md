# JSON Music Codec 🎵

**A sophisticated web-based music composition platform that transforms human-readable JSON into expressive musical performances.**

🌐 **Live Demo:** [https://music-1v186cbd4-meroai.vercel.app](https://music-1v186cbd4-meroai.vercel.app)

## 🎯 Overview

JSON Music Codec is an advanced browser-based Digital Audio Workstation (DAW) that revolutionizes music composition by using JSON as a universal music notation format. Create complex musical arrangements, from ambient soundscapes to orchestral compositions, all through intuitive JSON syntax.

### ✨ Key Features

- **📝 JSON-Based Composition**: Write music using human-readable JSON syntax
- **🎹 Real-time Piano Roll Visualization**: Visual feedback with interactive piano roll
- **🎭 Human Performance System**: Adds realistic timing, dynamics, and expression
- **🎼 Intelligent Harmonization**: Automatic harmony generation with customizable intervals
- **🎚️ Professional Audio Effects**: Studio-quality reverb, delay, EQ, compression, and more
- **🎤 Live Input Processing**: Real-time microphone input with vocal effects
- **🎻 Rich Instrument Library**: Orchestra, piano, synthesizers, drums, and atmospheric pads
- **📊 Advanced Visualizations**: Spectrum analysis, waveform, formant analysis, and harmony visualization
- **🔄 Audio Health Monitoring**: Real-time performance metrics and optimization

## 🚀 Quick Start

### Online (Recommended)
Visit the live demo at [music-1v186cbd4-meroai.vercel.app](https://music-1v186cbd4-meroai.vercel.app) - no installation required!

### Local Development
```bash
# Clone the repository
git clone https://github.com/[your-username]/music2.git
cd music2

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎼 JSON Music Format

### Basic Structure
```json
{
  "title": "My Composition",
  "tempo": 120,
  "tracks": [
    {
      "name": "Piano",
      "instrument": "piano",
      "notes": [
        {
          "time": 0,
          "duration": 1,
          "value": "C4",
          "volume": 0.8
        }
      ]
    }
  ]
}
```

### Advanced Features

#### Harmonization
```json
{
  "time": 0,
  "duration": 2,
  "value": "C4",
  "harmonize": [3, 7, 12],
  "harmonizeMix": 0.6,
  "harmonizeLevels": [0.5, 0.4, 0.3]
}
```

#### Effects
```json
{
  "name": "Vocal",
  "instrument": "vocoder_synth",
  "settings": {
    "globalEffects": [
      { "type": "reverb", "level": 0.4 },
      { "type": "delay", "level": 0.2 },
      { "type": "harmonizer", "preset": "bon_iver" }
    ]
  }
}
```

## 🎹 Instruments

### Traditional Instruments
- **Piano**: Realistic piano with velocity sensitivity
- **Orchestra**: Strings, brass, woodwinds with articulations
- **Drums**: Full drum kit with natural samples

### Synthesizers
- **Granular Pad**: Atmospheric textures with grain control
- **Vocoder Synth**: Formant-processed vocal synthesis
- **Lead Synth**: Classic analog-style leads

### Parameters
```json
{
  "instrument": "granular_pad",
  "settings": {
    "grainSize": 0.1,
    "grainDensity": 20,
    "shimmer": 0.6
  }
}
```

## 🎚️ Effects Suite

### Professional Effects
- **Reverb Suite**: Room, hall, plate, freeze reverb
- **EQ Suite**: Parametric EQ with multiple bands
- **Compression**: Professional dynamics control
- **Spatial Panner**: 3D audio positioning
- **Convolution Reverb**: Impulse response-based reverb

### Creative Effects
- **Harmonizer**: Multi-voice pitch shifting
- **Granular Delay**: Textural delay effects
- **Formant Filter**: Vocal character shaping
- **Chorus/Flanger**: Modulation effects

## 🎭 Human Performance System

Transform mechanical sequences into expressive performances:

- **Timing Humanization**: Natural timing variations
- **Velocity Patterns**: Realistic dynamics
- **Micro-Groove**: Subtle rhythmic feel
- **Ensemble Timing**: Orchestral section relationships

```json
{
  "settings": {
    "humanPerformance": {
      "timing": "natural",
      "dynamics": "expressive",
      "groove": 0.3
    }
  }
}
```

## 🎤 Live Input Features

- **Real-time Processing**: Live microphone input
- **Effect Chains**: Build custom vocal processing chains
- **Latency Monitoring**: Sub-20ms latency tracking
- **Recording**: Capture processed audio

## 📊 Visualization Suite

### Audio Analysis
- **Spectrum Analyzer**: Frequency domain visualization
- **Waveform Display**: Time domain analysis
- **Formant Analysis**: Vocal characteristic tracking
- **Harmony Visualization**: Chord progression display

### Performance Monitoring
- **Audio Health Meter**: CPU and memory usage
- **Effect Chain Visualization**: Signal flow display
- **Real-time Metrics**: Latency and performance stats

## 💾 Examples Library

Explore pre-built compositions in the `/examples` directory:

- **harmony_demo.json**: Vocal harmonization showcase
- **atmospheric/bon-iver-woods.json**: Ambient soundscape
- **atmospheric/ethereal-ambient.json**: Cinematic atmosphere

## 🔧 Technical Architecture

### Core Technologies
- **Web Audio API**: High-performance audio processing
- **Tone.js**: Audio synthesis and effects framework
- **Vite**: Fast development and optimized builds
- **ES Modules**: Modern JavaScript architecture

### Audio Engine Features
- **64-sample buffer processing**: Ultra-low latency
- **Professional audio worklets**: Custom DSP processors
- **Memory management**: Automatic cleanup and optimization
- **Cross-Origin Isolation**: AudioWorklet and SharedArrayBuffer support

### Performance Optimizations
- **Lazy loading**: Instruments load on demand
- **Track freezing**: Render complex tracks to audio buffers
- **Adaptive quality**: Automatic performance scaling
- **Memory monitoring**: Prevents audio dropouts

## 🛠️ Development

### Project Structure
```
src/
├── audio/                    # Core audio engine
│   ├── instruments/         # Instrument definitions
│   ├── effects/            # Effect processors
│   ├── performance/        # Human performance system
│   └── composition/        # Harmony and composition tools
├── ui/                     # User interface components
├── visualizer/             # Audio visualization
└── utils/                  # Utilities and helpers
```

### Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run test suite
npm run lint         # Code linting
npm run deploy       # Deploy to Vercel
```

### Testing
```bash
npm run test:watch     # Watch mode testing
npm run test:coverage  # Coverage reports
npm run test:ui        # Visual test runner
```

## 📖 Documentation

- [Design Principles](docs/architecture/DESIGN_PRINCIPLES.md)
- [Human Performance System](docs/PHASE2C_HUMAN_PERFORMANCE.md)
- [Atmospheric Examples](examples/atmospheric/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🎵 Create Something Amazing

Whether you're composing ambient soundscapes, orchestral arrangements, or experimental electronic music, JSON Music Codec provides the tools to bring your musical vision to life. The combination of intuitive JSON syntax and professional-grade audio processing makes complex music creation accessible to everyone.

**Start composing:** [Open the app](https://music-1v186cbd4-meroai.vercel.app) and load an example to get started!

---

**Built with ❤️ for musicians, developers, and audio enthusiasts**
