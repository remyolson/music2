# Music2 Design Principles

## Core Philosophy

Music2 is built on the principle of **progressive enhancement** - simple things should be simple, complex things should be possible.

## 🎯 Design Principles

### 1. Developer Experience First

```javascript
// ✅ Good - Intuitive API
const engine = new AudioEngine();
const track = engine.createTrack('Lead Synth');
track.play();

// ❌ Bad - Complex setup
const ctx = new AudioContext();
const gain = ctx.createGain();
const osc = ctx.createOscillator();
osc.connect(gain);
gain.connect(ctx.destination);
```

### 2. Fail Fast, Fail Clearly

```javascript
// ✅ Good - Clear error messages
throw new AudioEngineError(
  'Invalid instrument type: "syntth". Did you mean "synth"?',
  'INVALID_INSTRUMENT',
  { 
    provided: 'syntth',
    suggestions: ['synth', 'synth_lead', 'synth_bass'],
    validTypes: INSTRUMENT_TYPES 
  }
);

// ❌ Bad - Generic errors
throw new Error('Invalid input');
```

### 3. Performance by Default

```javascript
// ✅ Good - Lazy loading
async function loadInstrument(type) {
  const loader = instrumentLoaders[type];
  return loader ? loader() : null;
}

// ❌ Bad - Load everything upfront
function initializeAllInstruments() {
  return Object.keys(INSTRUMENTS).map(createInstrument);
}
```

### 4. Memory Safety

```javascript
// ✅ Good - Automatic cleanup
class Track {
  constructor() {
    this.registry = new DisposalRegistry();
  }
  
  addEffect(effect) {
    this.registry.register(effect);
  }
  
  dispose() {
    this.registry.dispose();
  }
}

// ❌ Bad - Manual cleanup prone to leaks
class Track {
  constructor() {
    this.effects = [];
  }
  
  dispose() {
    // Easy to forget an effect
    this.effects.forEach(e => e.dispose());
  }
}
```

### 5. Composition Over Inheritance

```javascript
// ✅ Good - Composable behaviors
const withEffects = (target) => ({
  ...target,
  effects: [],
  addEffect(effect) { this.effects.push(effect); }
});

const withRecording = (target) => ({
  ...target,
  record() { /* ... */ }
});

// Combine behaviors
const track = withRecording(withEffects(baseTrack));

// ❌ Bad - Deep inheritance hierarchies
class Track extends AudioNode { }
class EffectTrack extends Track { }
class RecordableEffectTrack extends EffectTrack { }
```

### 6. Plugin Architecture

```javascript
// ✅ Good - Extensible design
engine.use(ReverbPlugin);
engine.use(CustomInstrumentPlugin);

// Each plugin is self-contained
export class ReverbPlugin {
  install(engine) {
    engine.registerEffect('reverb', ReverbEffect);
  }
}

// ❌ Bad - Monolithic design
// Everything hardcoded in core
```

### 7. Type Safety (Progressive)

```javascript
// ✅ Good - JSDoc for type hints
/**
 * @param {TrackConfig} config
 * @returns {Track}
 */
function createTrack(config) {
  // IDE provides autocomplete
}

// Future: Full TypeScript
interface TrackConfig {
  name: string;
  instrument?: InstrumentType;
  effects?: Effect[];
}
```

### 8. Testability

```javascript
// ✅ Good - Dependency injection
class AudioEngine {
  constructor(context = new AudioContext()) {
    this.context = context;
  }
}

// Easy to test with mocks
const mockContext = createMockContext();
const engine = new AudioEngine(mockContext);

// ❌ Bad - Hard dependencies
class AudioEngine {
  constructor() {
    this.context = new AudioContext(); // Can't mock
  }
}
```

### 9. Documentation as Code

```javascript
// ✅ Good - Self-documenting
const EFFECT_LIMITS = {
  reverb: { maxRoomSize: 0.95, maxDampening: 10000 },
  delay: { maxTime: 5, maxFeedback: 0.95 }
};

function validateEffect(type, params) {
  const limits = EFFECT_LIMITS[type];
  if (!limits) {
    throw new Error(`Unknown effect type: ${type}`);
  }
  // Validation logic
}

// ❌ Bad - Magic numbers
if (params.roomSize > 0.95) {
  params.roomSize = 0.95;
}
```

### 10. Progressive Disclosure

```javascript
// ✅ Good - Simple API with advanced options
// Basic usage
engine.play();

// Advanced usage
engine.play({
  when: '+1m',
  offset: 0.5,
  duration: 30,
  onStart: () => console.log('Started'),
  onEnd: () => console.log('Ended')
});

// ❌ Bad - Complex API for simple tasks
engine.schedulePlayback({
  startTime: Tone.now() + 60,
  config: { offset: 0, duration: Infinity }
});
```

## 🏛️ Architectural Patterns

### Separation of Concerns

```
src/
├── audio/        # Audio processing logic
├── ui/           # UI components
├── state/        # State management
├── utils/        # Shared utilities
└── plugins/      # Plugin system
```

### Event-Driven Communication

```javascript
// Loose coupling between modules
engine.on('track:add', updateUI);
engine.on('effect:change', processAudio);
engine.on('error', handleError);
```

### Factory Pattern

```javascript
// Centralized object creation
const factories = {
  instrument: InstrumentFactory,
  effect: EffectFactory,
  track: TrackFactory
};

function create(type, subtype, config) {
  return factories[type].create(subtype, config);
}
```

## 📏 Code Standards

### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_TRACKS = 16;

// Classes: PascalCase
class AudioEngine { }

// Functions/Methods: camelCase
function createTrack() { }

// Private: underscore prefix
class Track {
  _internalState = {};
}

// Events: kebab-case
engine.emit('track:add');
```

### File Organization

```javascript
// One class per file
// src/track/Track.js
export class Track { }

// Group related functions
// src/utils/audio.js
export function noteToFrequency() { }
export function frequencyToNote() { }

// Index files for public API
// src/effects/index.js
export { Reverb } from './Reverb';
export { Delay } from './Delay';
```

## 🔍 Review Checklist

When reviewing code, ensure it:

- [ ] Follows the single responsibility principle
- [ ] Has proper error handling
- [ ] Includes tests
- [ ] Has JSDoc comments for public APIs
- [ ] Properly disposes resources
- [ ] Uses meaningful variable names
- [ ] Avoids magic numbers
- [ ] Is accessible to users
- [ ] Performs well at scale
- [ ] Is backwards compatible (or documents breaking changes)