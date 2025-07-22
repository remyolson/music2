# Contributing to Music2

First off, thank you for considering contributing to Music2! It's people like you that make Music2 such a great tool. 🎵

## 🎯 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/music2.git
   cd music2
   ```

2. **Run the setup script**
   ```bash
   npm run setup
   ```
   This will:
   - Install dependencies
   - Set up git hooks
   - Run initial tests
   - Build the project

3. **Start developing**
   ```bash
   npm run dev
   ```

## 📝 Development Process

### 1. Find an Issue

- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it
- Ask questions if anything is unclear

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Write Code

Follow our coding standards:

```javascript
// ✅ Good
export function createTrack(config) {
  if (!config.name) {
    throw new Error('Track name is required');
  }
  
  return new Track(config);
}

// ❌ Bad
export function createTrack(c) {
  return new Track(c); // No validation
}
```

### 4. Write Tests

Every new feature must have tests:

```javascript
describe('createTrack', () => {
  it('should create a track with given config', () => {
    const track = createTrack({ name: 'Test' });
    expect(track.name).toBe('Test');
  });

  it('should throw error when name is missing', () => {
    expect(() => createTrack({})).toThrow('Track name is required');
  });
});
```

### 5. Document Your Code

Add JSDoc comments for all public APIs:

```javascript
/**
 * Creates a new audio track with the specified configuration.
 * 
 * @param {TrackConfig} config - The track configuration
 * @param {string} config.name - The track name
 * @param {string} [config.instrument='synth'] - The instrument type
 * @returns {Track} The created track
 * @throws {Error} When track name is not provided
 * 
 * @example
 * const track = createTrack({
 *   name: 'Lead',
 *   instrument: 'piano'
 * });
 */
```

### 6. Run Quality Checks

Before committing:

```bash
# Run all checks
npm run check

# Individual checks
npm run lint        # ESLint
npm run type-check  # TypeScript
npm run test        # Tests
npm run build       # Build
```

### 7. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add reverb effect to live input"

# Bug fixes
git commit -m "fix: prevent memory leak in audio engine"

# Documentation
git commit -m "docs: add examples for effect chain"

# Performance
git commit -m "perf: optimize note rendering"

# Refactoring
git commit -m "refactor: extract instrument factory"
```

### 8. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request with:
- Clear title and description
- Link to related issue
- Screenshots/recordings if applicable
- Test results

## 🏗️ Architecture Guidelines

### Module Structure

```javascript
// Each module should have a clear, single responsibility
// src/modules/track/Track.js

import { validateTrackConfig } from './validation';
import { DisposalRegistry } from '../../utils/DisposalRegistry';

export class Track {
  constructor(config) {
    this.config = validateTrackConfig(config);
    this.registry = new DisposalRegistry(`track-${config.name}`);
    this.setup();
  }

  setup() {
    // Initialize track
  }

  dispose() {
    this.registry.dispose();
  }
}
```

### Memory Management

Always clean up resources:

```javascript
// ✅ Good - Proper cleanup
class EffectChain {
  constructor() {
    this.effects = [];
    this.registry = new DisposalRegistry('effect-chain');
  }

  addEffect(effect) {
    this.effects.push(effect);
    this.registry.register(effect);
  }

  dispose() {
    this.registry.dispose();
    this.effects = [];
  }
}

// ❌ Bad - Memory leak
class EffectChain {
  constructor() {
    this.effects = [];
  }

  addEffect(effect) {
    this.effects.push(effect);
    // No cleanup!
  }
}
```

### Error Handling

```javascript
// Create specific error types
export class AudioEngineError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'AudioEngineError';
    this.code = code;
    this.details = details;
  }
}

// Use them appropriately
export function loadInstrument(type) {
  if (!AVAILABLE_INSTRUMENTS.includes(type)) {
    throw new AudioEngineError(
      `Unknown instrument type: ${type}`,
      'INVALID_INSTRUMENT',
      { availableTypes: AVAILABLE_INSTRUMENTS }
    );
  }
  // ...
}
```

## 🧪 Testing Guidelines

### Test Organization

```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Feature tests
├── e2e/           # End-to-end tests
└── performance/   # Performance tests
```

### Writing Good Tests

```javascript
// Descriptive test names
describe('AudioEngine', () => {
  describe('when playing a track', () => {
    it('should start the transport', () => {
      // Test implementation
    });

    it('should emit play event', () => {
      // Test implementation
    });
  });
});

// Use factories for test data
function createTestTrack(overrides = {}) {
  return {
    name: 'Test Track',
    instrument: 'synth',
    notes: [],
    ...overrides,
  };
}
```

## 📚 Documentation

### Where to Document

1. **API Documentation**: In code using JSDoc
2. **Guides**: In `docs/guides/`
3. **Examples**: In `examples/`
4. **Architecture**: In `docs/architecture/`

### Documentation Style

```markdown
# Feature Name

Brief description of what this feature does.

## When to Use

Explain when and why someone would use this feature.

## Basic Usage

\```javascript
// Simple example
const engine = new AudioEngine();
engine.doSomething();
\```

## Advanced Usage

\```javascript
// More complex example with explanation
const engine = new AudioEngine({
  latency: 'balanced',
  workletPath: '/custom/path'
});
\```

## API Reference

### `methodName(param1, param2)`

Description of the method.

**Parameters:**
- `param1` (Type): Description
- `param2` (Type): Description

**Returns:** Type - Description

## Common Issues

### Issue 1
Solution to common problem.
```

## 🚢 Release Process

We use [Changesets](https://github.com/changesets/changesets) for releases:

1. **Add a changeset**
   ```bash
   npm run changeset
   ```

2. **Select change type**
   - `patch`: Bug fixes
   - `minor`: New features
   - `major`: Breaking changes

3. **Write changelog entry**
   Be descriptive about what changed and why.

## 💡 Tips for Success

### Do's ✅

- Ask questions early
- Write tests first (TDD)
- Keep PRs focused and small
- Update documentation
- Be patient and kind

### Don'ts ❌

- Don't commit directly to main
- Don't skip tests
- Don't ignore linting errors
- Don't forget to dispose resources
- Don't be afraid to ask for help

## 🆘 Getting Help

- **Discord**: [Join our community](https://discord.gg/music2)
- **Discussions**: [GitHub Discussions](https://github.com/music2/music2/discussions)
- **Issues**: [GitHub Issues](https://github.com/music2/music2/issues)

## 🎉 Recognition

Contributors are recognized in our:
- [README](README.md#contributors)
- [Release notes](CHANGELOG.md)
- [Contributors page](https://music2.dev/contributors)

Thank you for contributing! 🙏