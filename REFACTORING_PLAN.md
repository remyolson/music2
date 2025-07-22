# Music2 Refactoring Plan

> Building a world-class audio processing library that developers love to use and contribute to.

## 📊 Current Progress Update
**Last Updated**: Phase 2 in progress

### ✅ Completed
- **Testing Infrastructure**: Set up Vitest with proper mocks for Tone.js
- **Code Quality Tools**: ESLint and Prettier configured
- **Documentation System**: Created CLAUDE.md, API_PATTERNS.md, and AI assistant guides
- **Constants Extraction**: All constants moved to `src/audio/constants/`
- **Effects Factory**: Created `EffectFactory.js` with all effect creation logic
- **Instrument Factory**: Created `InstrumentFactory.js` with all instrument creation logic
- **Live Input Module**: Created `LiveInput.js` with all live audio functionality
- **Master Bus Module**: Created `MasterBus.js` with global audio routing
- **audioEngine.js Refactoring**: Reduced from 1774 to 552 lines (69% reduction)
- **DisposalRegistry Pattern**: Applied to all extracted modules for memory safety

### 🚧 In Progress
- Implementing comprehensive test coverage
- Setting up TypeScript with JSDoc
- Implementing lazy loading for instruments

### 📝 Next Steps
- Apply DisposalRegistry pattern to all modules
- Implement comprehensive test coverage
- Set up TypeScript with JSDoc
- Implement lazy loading for instruments
- Create performance benchmarks

## 🎯 Vision & Goals

### Core Principles
1. **Developer Experience First** - Make it a joy to use and contribute
2. **Production-Ready** - Battle-tested, performant, and reliable
3. **Extensible Architecture** - Easy to add features without breaking existing code
4. **Maintainable Codebase** - Clear patterns, comprehensive tests, no surprises
5. **Best-in-Class Documentation** - Learn by example, comprehensive guides

## 📋 Project Structure (Professional Standard)

```
music2/
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   │   ├── ci.yml         # Test, lint, type-check
│   │   ├── release.yml    # Automated releases
│   │   └── codeql.yml     # Security scanning
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── FUNDING.yml
├── docs/
│   ├── api/               # Auto-generated API docs
│   ├── guides/            # User guides
│   ├── tutorials/         # Step-by-step tutorials
│   ├── architecture/      # System design docs
│   └── contributing/      # Contributor guides
├── examples/              # Runnable examples
│   ├── basic/
│   ├── advanced/
│   └── playground/        # Interactive demos
├── packages/              # Monorepo structure
│   ├── core/             # Core audio engine
│   ├── effects/          # Effect plugins
│   ├── instruments/      # Instrument plugins
│   ├── ui/              # UI components
│   └── cli/             # CLI tools
├── scripts/              # Build and dev scripts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── performance/
├── .changeset/           # Automated changelogs
├── .husky/              # Git hooks
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
└── package.json
```

## 🏗️ Architecture Refactoring

### 1. Core Package Structure (@music2/core)
```typescript
// packages/core/src/index.ts
export { AudioEngine } from './engine/AudioEngine';
export { Track } from './track/Track';
export { Instrument } from './instrument/Instrument';
export { Effect } from './effect/Effect';
export * from './types';
export * from './constants';
```

### 2. Plugin Architecture
```typescript
// packages/core/src/plugin/Plugin.ts
export interface Plugin {
  name: string;
  version: string;
  install(engine: AudioEngine): void;
  uninstall(engine: AudioEngine): void;
}

// packages/effects/src/reverb/index.ts
export class ReverbPlugin implements Plugin {
  name = '@music2/reverb';
  version = '1.0.0';
  
  install(engine: AudioEngine) {
    engine.registerEffect('reverb', ReverbEffect);
  }
}
```

### 3. Event-Driven Architecture
```typescript
// packages/core/src/events/EventBus.ts
export class EventBus {
  private listeners = new Map<string, Set<EventListener>>();
  
  on(event: string, listener: EventListener): () => void {
    // Implementation with automatic cleanup
  }
  
  emit(event: string, data: any): void {
    // Type-safe event emission
  }
}

// Usage
engine.on('track:add', (track) => {
  console.log('Track added:', track.name);
});
```

## 🧪 Testing Strategy

### 1. Test Structure
```typescript
// tests/unit/engine/AudioEngine.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '@music2/core';
import { createMockContext } from '../mocks/audioContext';

describe('AudioEngine', () => {
  let engine: AudioEngine;
  
  beforeEach(() => {
    engine = new AudioEngine({
      context: createMockContext()
    });
  });
  
  afterEach(() => {
    engine.dispose();
  });
  
  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(engine.isReady).toBe(true);
      expect(engine.tracks.size).toBe(0);
    });
  });
});
```

### 2. Integration Tests
```typescript
// tests/integration/live-input.test.ts
describe('Live Input Integration', () => {
  it('should process live input through effect chain', async () => {
    const { engine, mockInput } = await setupLiveTest();
    
    await engine.liveInput.start();
    engine.liveInput.addEffect('reverb', { roomSize: 0.8 });
    
    const output = await mockInput.process(testSignal);
    expect(output).toMatchSnapshot();
  });
});
```

### 3. Performance Tests
```typescript
// tests/performance/memory.test.ts
describe('Memory Management', () => {
  it('should not leak memory during 1000 play/stop cycles', async () => {
    const initialMemory = performance.memory.usedJSHeapSize;
    
    for (let i = 0; i < 1000; i++) {
      await engine.play();
      await engine.stop();
    }
    
    await forceGarbageCollection();
    const finalMemory = performance.memory.usedJSHeapSize;
    
    expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // 1MB
  });
});
```

## 📚 Documentation System

### 1. API Documentation (TypeDoc)
```typescript
/**
 * Creates a new audio track with the specified configuration.
 * 
 * @example
 * ```typescript
 * const track = engine.createTrack({
 *   name: 'Lead Synth',
 *   instrument: 'synth',
 *   effects: ['reverb', 'delay']
 * });
 * ```
 * 
 * @param config - Track configuration
 * @returns The created track instance
 * @throws {InvalidInstrumentError} If instrument type is not registered
 * @since 1.0.0
 * @see {@link Track} for track methods
 * @see {@link https://music2.dev/guides/tracks} for detailed guide
 */
createTrack(config: TrackConfig): Track {
  // Implementation
}
```

### 2. Interactive Documentation
```typescript
// docs/playground/src/examples/basic-synth.ts
export const basicSynthExample = {
  title: 'Basic Synthesizer',
  description: 'Create a simple melody with a synthesizer',
  code: `
const engine = new AudioEngine();
const track = engine.createTrack({
  name: 'Melody',
  instrument: 'synth'
});

track.addNotes([
  { time: 0, note: 'C4', duration: 0.5 },
  { time: 0.5, note: 'E4', duration: 0.5 },
  { time: 1, note: 'G4', duration: 0.5 }
]);

engine.play();
  `,
  runnable: true
};
```

## 🤖 Automation & CI/CD

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - uses: github/codeql-action/analyze@v2
      
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:performance
      - uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance-results.json
```

### 2. Automated Release Process
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: changesets/action@v1
        with:
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🛡️ Code Quality Standards

### 1. ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:jsdoc/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'import', 'jsdoc'],
  rules: {
    // Enforce consistent imports
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' }
    }],
    
    // Require JSDoc for public APIs
    'jsdoc/require-jsdoc': ['error', {
      publicOnly: true,
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true
      }
    }],
    
    // Enforce naming conventions
    '@typescript-eslint/naming-convention': ['error', {
      selector: 'interface',
      format: ['PascalCase'],
      prefix: ['I']
    }]
  }
};
```

### 2. Pre-commit Hooks
```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run quality checks
npm run lint-staged
npm run type-check
npm run test:affected
```

### 3. Code Review Guidelines
```markdown
# Code Review Checklist

## Architecture
- [ ] Follows established patterns
- [ ] No circular dependencies
- [ ] Proper separation of concerns

## Code Quality
- [ ] Meaningful variable/function names
- [ ] No magic numbers/strings
- [ ] Proper error handling
- [ ] Memory leaks prevented

## Testing
- [ ] Unit tests added/updated
- [ ] Edge cases covered
- [ ] Performance impact considered

## Documentation
- [ ] Public APIs documented
- [ ] Examples provided
- [ ] Breaking changes noted
```

## 👥 Contributor Experience

### 1. Development Setup Script
```bash
#!/bin/bash
# scripts/setup.sh

echo "🎵 Setting up Music2 development environment..."

# Check prerequisites
check_requirement "node" "18.0.0"
check_requirement "npm" "8.0.0"

# Install dependencies
npm ci

# Set up git hooks
npm run prepare

# Build packages
npm run build

# Run initial tests
npm test

echo "✅ Setup complete! Run 'npm run dev' to start developing."
```

### 2. Interactive Contribution Guide
```typescript
// scripts/contribute.ts
import { select, input } from '@inquirer/prompts';

async function contribute() {
  const type = await select({
    message: 'What would you like to contribute?',
    choices: [
      { value: 'bug', name: '🐛 Fix a bug' },
      { value: 'feature', name: '✨ Add a feature' },
      { value: 'docs', name: '📚 Improve documentation' },
      { value: 'test', name: '🧪 Add tests' }
    ]
  });
  
  // Guide through contribution process
  await guideContribution(type);
}
```

## 📊 Metrics & Monitoring

### 1. Bundle Size Tracking
```javascript
// scripts/bundle-size.js
import { bundleSize } from 'bundle-buddy';

const limits = {
  '@music2/core': 50 * 1024,      // 50KB
  '@music2/effects': 30 * 1024,    // 30KB
  '@music2/instruments': 40 * 1024 // 40KB
};

export async function checkBundleSize() {
  const sizes = await bundleSize('./packages/*/dist');
  
  for (const [pkg, limit] of Object.entries(limits)) {
    if (sizes[pkg] > limit) {
      throw new Error(`${pkg} exceeds size limit`);
    }
  }
}
```

### 2. Performance Benchmarks
```typescript
// benchmarks/audio-processing.ts
import { bench, describe } from 'vitest';

describe('Audio Processing Performance', () => {
  bench('process 1000 notes', async () => {
    const engine = createEngine();
    await engine.processNotes(generate1000Notes());
  });
  
  bench('apply effect chain', async () => {
    const chain = createEffectChain(['reverb', 'delay', 'chorus']);
    await chain.process(testBuffer);
  });
});
```

## 🚀 Implementation Roadmap

### Immediate Actions (Today)

#### 1. Install Dependencies (5 minutes)
```bash
npm install --save-dev vitest @vitest/ui happy-dom
npm install --save-dev @testing-library/dom @testing-library/user-event
npm install --save-dev eslint prettier eslint-config-prettier
npm install --save-dev husky lint-staged
```

#### 2. Run First Test (1 minute)
```bash
npm run test
```

#### 3. Apply Memory Safety Pattern
Example refactoring using DisposalRegistry:

```javascript
// Before (memory leak prone)
export function startLiveInput() {
  liveInput = new Tone.UserMedia();
  liveInput.open();
  // No cleanup!
}

// After (memory safe)
import { DisposalRegistry } from './utils/DisposalRegistry.js';

const liveInputRegistry = new DisposalRegistry('liveInput');

export function startLiveInput() {
  liveInput = liveInputRegistry.register(new Tone.UserMedia());
  liveInputRegistry.registerListener(window, 'resize', handleResize);
  liveInput.open();
}

export function stopLiveInput() {
  liveInputRegistry.dispose(); // Cleans up everything
}
```

### Phase 1: Foundation (Week 1-2)
- [x] Set up testing infrastructure (vitest.config.js)
- [x] Create memory management utilities (DisposalRegistry, memoryMonitor)
- [x] Add code quality tools (ESLint, Prettier)
- [x] Create contribution guidelines
- [ ] Configure TypeScript with JSDoc
- [ ] Add pre-commit hooks
- [ ] Set up initial CI/CD

### Phase 2: Core Refactoring (Week 3-4)

#### Priority: Split audioEngine.js (1666 lines)
```
src/audio/
├── core/
│   ├── AudioContext.js
│   ├── MasterBus.js
│   └── Transport.js
├── instruments/
│   ├── InstrumentFactory.js ✅ COMPLETED - All instrument creation logic extracted
│   └── definitions/
├── effects/
│   ├── EffectFactory.js ✅ COMPLETED - All effect creation logic extracted  
│   └── definitions/
└── live/
    ├── LiveInput.js
    └── LiveRecorder.js
```

#### Extract Configuration ✅ COMPLETED
```javascript
// src/config/instruments.js
export const INSTRUMENT_DEFINITIONS = {
  synth_lead: {
    factory: 'Synth',
    options: { /* ... */ }
  }
};
```

- [x] Extract instrument definitions ✅ COMPLETED - InstrumentFactory.js created with all instrument logic
- [x] Create effect registry ✅ COMPLETED - EffectFactory.js created with all effect logic
- [x] Extract constants and configuration ✅ COMPLETED - All constants moved to src/audio/constants/
- [ ] Extract live input logic to separate module
- [ ] Extract master bus logic to separate module  
- [ ] Implement state management
- [ ] Add comprehensive tests

### Phase 3: Quality & Automation (Week 5-6)
- [ ] Implement lazy loading
- [ ] Add resource pooling
- [ ] Set up performance benchmarks
- [ ] Create bundle size tracking
- [ ] Add security scanning
- [ ] Create interactive examples
- [ ] Complete API documentation

## 🎯 Success Metrics

- **Code Coverage**: > 90%
- **Bundle Size**: < 100KB total
- **Performance**: < 10ms latency
- **Documentation**: 100% public API coverage
- **Memory Leaks**: Zero leaks in 24-hour stress tests
- **Development Velocity**: 50% faster feature implementation

## 🔥 Common Refactoring Patterns

### Extract Constants
```javascript
// Before
if (effect.type === 'reverb') {
  effect.roomSize = 0.7;
  effect.dampening = 3000;
}

// After
const EFFECT_DEFAULTS = {
  reverb: { roomSize: 0.7, dampening: 3000 }
};
```

### Factory Pattern
```javascript
// Before
switch(type) {
  case 'synth': return new Tone.Synth({...});
  case 'piano': return new Tone.PolySynth({...});
}

// After
const instrumentFactories = {
  synth: (options) => new Tone.Synth(options),
  piano: (options) => new Tone.PolySynth(options)
};
```

## 🚨 Memory Leak Prevention Checklist

1. **Event Listeners**: Always remove with DisposalRegistry
2. **Tone.js Objects**: Call `.dispose()` on all instances
3. **Timers**: Clear all setInterval/setTimeout
4. **Audio Nodes**: Disconnect before disposal
5. **Circular References**: Use WeakMap where appropriate

## 📊 Progress Tracking

- **Test Coverage**: `npm run test -- --coverage`
- **Memory Leaks**: Check console for monitor reports
- **Bundle Size**: `npm run build && ls -lh dist/`
- **Code Quality**: `npm run lint`

## 🆘 Getting Help

- Tone.js disposal: https://tonejs.github.io/docs/14.7.77/Tone#dispose
- Vitest docs: https://vitest.dev/
- Memory profiling: Chrome DevTools > Memory tab