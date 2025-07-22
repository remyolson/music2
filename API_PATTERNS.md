# API Patterns & Common Tasks

Quick reference for common patterns and tasks in the Music2 codebase.

## Memory-Safe Patterns

### Creating Tone.js Objects
```javascript
// ❌ WRONG - Memory leak
function createEffect() {
  const reverb = new Tone.Reverb();
  return reverb;
}

// ✅ CORRECT - Memory safe
function createEffect(registry) {
  const reverb = registry.register(new Tone.Reverb());
  return reverb;
}
```

### Cleanup Pattern
```javascript
// ✅ CORRECT - Full cleanup
function cleanup() {
  // 1. Stop any ongoing processes
  if (part) part.stop();
  
  // 2. Disconnect audio nodes
  if (effect) effect.disconnect();
  
  // 3. Dispose of objects
  if (effect) effect.dispose();
  
  // 4. Clear references
  effect = null;
}
```

### Event Listener Pattern
```javascript
// ❌ WRONG - Leaks memory
element.addEventListener('click', handler);

// ✅ CORRECT - Auto cleanup
const registry = new DisposalRegistry('feature');
registry.registerListener(element, 'click', handler);
// Cleanup: registry.dispose() removes all listeners
```

## Common Audio Patterns

### Creating an Instrument
```javascript
// Current pattern (to be refactored)
function createInstrument(type, settings) {
  const envelope = settings?.envelope || {};
  const instrument = new Tone.Synth({
    envelope: {
      attack: envelope.attack ?? 0.02,
      decay: envelope.decay ?? 0.1,
      sustain: envelope.sustain ?? 0.5,
      release: envelope.release ?? 1.0
    }
  });
  return instrument;
}
```

### Adding Effects
```javascript
// Safe effect creation with limits
function createSafeEffect(type, params = {}) {
  // Apply safety limits
  if (params.feedback !== undefined) {
    params.feedback = Math.min(params.feedback, SAFE_LIMITS.feedback);
  }
  
  const effect = availableEffects[type]();
  if (effect.set) {
    effect.set(params);
  }
  
  return effect;
}
```

### Effect Chain Pattern
```javascript
// Current pattern
instrument.chain(effect1, effect2, destination);

// With registry
const chain = [
  registry.register(effect1),
  registry.register(effect2)
];
instrument.chain(...chain, destination);
```

## State Management Patterns

### Publishing State Changes
```javascript
import { publish } from './state.js';

// Publish a state change
publish('stateChange', {
  tracks: updatedTracks,
  tempo: 120
});
```

### Subscribing to State
```javascript
import { subscribe } from './state.js';

// Subscribe with cleanup
const unsubscribe = subscribe((newState) => {
  console.log('State updated:', newState);
});

// Later: unsubscribe();
```

## Validation Patterns

### Input Validation
```javascript
import { validate } from './validationService.js';

const result = validate(jsonString);
if (result.success) {
  // Use result.data
  processMusic(result.data);
} else {
  // Handle result.error
  showError(result.error);
}
```

## Testing Patterns

### Basic Test Structure
```javascript
describe('Feature', () => {
  let registry;
  
  beforeEach(() => {
    registry = new DisposalRegistry('test');
  });
  
  afterEach(() => {
    registry.dispose();
  });
  
  it('should work correctly', () => {
    // Test implementation
  });
});
```

### Mocking Tone.js
```javascript
// Tone.js is already mocked in test/setup.js
it('should create instrument', () => {
  const synth = new Tone.Synth(); // This is mocked
  expect(synth.triggerAttackRelease).toBeDefined();
});
```

## Common Refactoring Tasks

### Extract Constants
```javascript
// Before
if (type === 'reverb') {
  effect.roomSize = 0.7;
}

// After
const EFFECT_DEFAULTS = {
  reverb: { roomSize: 0.7 }
};

if (type === 'reverb') {
  Object.assign(effect, EFFECT_DEFAULTS[type]);
}
```

### Extract Function
```javascript
// Before (inline in audioEngine.js)
const envelope = settings?.envelope || {};
const attack = envelope.attack ?? 0.02;
// ... more logic

// After (extracted)
function createEnvelope(settings) {
  const defaults = { attack: 0.02, decay: 0.1, sustain: 0.5, release: 1.0 };
  return { ...defaults, ...settings?.envelope };
}
```

### Convert to Factory
```javascript
// Before
switch(type) {
  case 'synth': return new Tone.Synth(options);
  case 'fm': return new Tone.FMSynth(options);
}

// After
const factories = {
  synth: (options) => new Tone.Synth(options),
  fm: (options) => new Tone.FMSynth(options)
};

return factories[type]?.(options);
```

## Performance Patterns

### Lazy Loading
```javascript
// Instead of creating all instruments upfront
let instrument = null;

function getInstrument() {
  if (!instrument) {
    instrument = createInstrument();
  }
  return instrument;
}
```

### Batch Operations
```javascript
// Batch Tone.js operations
Tone.Transport.scheduleOnce(() => {
  // Multiple operations in one scheduling
  notes.forEach(note => {
    instrument.triggerAttackRelease(note.pitch, note.duration);
  });
}, time);
```

## Error Handling Patterns

### Descriptive Errors
```javascript
// Provide context and suggestions
if (!VALID_INSTRUMENTS.includes(type)) {
  throw new Error(
    `Invalid instrument type: "${type}". ` +
    `Valid types are: ${VALID_INSTRUMENTS.join(', ')}`
  );
}
```

### Safe Property Access
```javascript
// Use optional chaining
const attack = settings?.envelope?.attack ?? DEFAULT_ATTACK;

// Check before calling methods
if (effect.setIntervals) {
  effect.setIntervals(intervals);
}
```

## File Organization Patterns

### Module Exports
```javascript
// Named exports for utilities
export { createInstrument, disposeInstrument };

// Default export for main class
export default class AudioEngine { }

// Re-export from index
export * from './instruments';
export * from './effects';
```

### Import Organization
```javascript
// 1. External dependencies
import * as Tone from 'tone';

// 2. Internal modules
import { state } from './state.js';
import { validate } from './validation.js';

// 3. Types/constants
import { INSTRUMENT_TYPES } from './constants.js';
```

## Debugging Patterns

### Console Groups
```javascript
console.group('AudioEngine initialization');
console.log('Creating context...');
console.log('Loading instruments...');
console.groupEnd();
```

### Performance Timing
```javascript
console.time('instrument-creation');
const instrument = createInstrument(type);
console.timeEnd('instrument-creation');
```

### Memory Debugging
```javascript
// In development
if (import.meta.env.DEV) {
  window.debugAudio = {
    instruments,
    effects,
    registry
  };
}
```