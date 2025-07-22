# Tasks Quick Reference

Common tasks and how to approach them during refactoring.

## 🔧 Refactoring Tasks

### Splitting a Large File

**Task**: "Split audioEngine.js into smaller modules"

```bash
# 1. Identify logical sections
grep -n "^function\|^export\|^const.*=" src/audioEngine.js | head -50

# 2. Create new module structure
mkdir -p src/audio/{core,instruments,effects,live}

# 3. Move code (example for instruments)
# - Copy instrument-related code to src/audio/instruments/factory.js
# - Update imports
# - Add exports
# - Test that nothing breaks
```

### Adding Memory Safety

**Task**: "Make this code memory-safe"

```javascript
// 1. Import DisposalRegistry
import { DisposalRegistry } from '../utils/DisposalRegistry.js';

// 2. Create registry for the feature
const featureRegistry = new DisposalRegistry('feature-name');

// 3. Register all Tone.js objects
const reverb = featureRegistry.register(new Tone.Reverb());

// 4. Add cleanup method
export function cleanup() {
  featureRegistry.dispose();
}
```

### Writing Tests

**Task**: "Add tests for this module"

```bash
# 1. Create test file
touch test/unit/moduleName.test.js

# 2. Run tests in watch mode
npm run test -- --watch moduleName

# 3. Check coverage
npm run test -- --coverage
```

### Extracting Constants

**Task**: "Remove magic numbers/strings"

```javascript
// 1. Identify all magic values
// Search for: numbers, quoted strings

// 2. Create constants file
// src/audio/constants.js
export const AUDIO_CONSTANTS = {
  DEFAULT_TEMPO: 120,
  MAX_TRACKS: 16,
  // ...
};

// 3. Replace throughout codebase
// Find: 120
// Replace: AUDIO_CONSTANTS.DEFAULT_TEMPO
```

## 🐛 Debugging Tasks

### Finding Memory Leaks

```javascript
// 1. Enable memory monitor
import { memoryMonitor } from './utils/memoryMonitor.js';
memoryMonitor.start();

// 2. Check for common leak patterns
grep -n "addEventListener\|setInterval\|new Tone" src/audioEngine.js

// 3. Look for missing dispose() calls
grep -A5 -B5 "new Tone" src/audioEngine.js | grep -v "dispose"
```

### Performance Issues

```javascript
// 1. Add timing
console.time('operation-name');
// ... code ...
console.timeEnd('operation-name');

// 2. Check Tone.js object count
console.log('Active instruments:', instruments.size);
console.log('Active effects:', effects.size);

// 3. Use performance monitor
performanceOptimizer.logStats();
```

## 📝 Documentation Tasks

### Adding JSDoc

```javascript
/**
 * Short description of what this does
 * 
 * @param {string} type - Parameter description
 * @param {Object} [options] - Optional parameter
 * @param {number} [options.volume=0.5] - Nested optional with default
 * @returns {Tone.Instrument} Return value description
 * @throws {Error} When does it throw
 * 
 * @example
 * const inst = createInstrument('synth', { volume: 0.7 });
 */
```

### Updating CLAUDE.md

When you:
- Add a new pattern → Add to "Code Conventions"
- Find a pitfall → Add to "Common Pitfalls"  
- Create a utility → Add to "Architecture Overview"
- Change safety limits → Update "Safety Limits"

## 🏗️ Architecture Tasks

### Creating a New Module

```bash
# 1. Create the file
touch src/audio/newFeature.js

# 2. Basic structure
cat > src/audio/newFeature.js << 'EOF'
import { DisposalRegistry } from '../utils/DisposalRegistry.js';

const registry = new DisposalRegistry('newFeature');

export function initialize() {
  // Setup code
}

export function cleanup() {
  registry.dispose();
}
EOF

# 3. Add tests
touch test/unit/newFeature.test.js
```

### Implementing Lazy Loading

```javascript
// 1. Convert eager loading
// Before:
const instruments = {
  synth: new Tone.Synth(),
  piano: new Tone.PolySynth()
};

// After:
const instrumentFactories = {
  synth: () => new Tone.Synth(),
  piano: () => new Tone.PolySynth()
};

const instrumentCache = new Map();

function getInstrument(type) {
  if (!instrumentCache.has(type)) {
    instrumentCache.set(type, instrumentFactories[type]());
  }
  return instrumentCache.get(type);
}
```

## 🔍 Code Search Tasks

### Finding Dependencies

```bash
# What depends on audioEngine?
grep -l "from.*audioEngine" src/*.js

# What does audioEngine depend on?
grep "^import" src/audioEngine.js

# Find circular dependencies
# If A imports B and B imports A
```

### Finding TODOs

```bash
# Find all TODOs
grep -n "TODO\|FIXME\|XXX" src/**/*.js

# Find all safety limits
grep -n "SAFE_LIMITS\|safety\|limit" src/**/*.js
```

## 🚀 Quick Wins

1. **Add DisposalRegistry to one module** (30 min)
2. **Extract one set of constants** (15 min)
3. **Write tests for one small module** (45 min)
4. **Split one instrument definition** (20 min)
5. **Document one complex function** (10 min)

## ⚡ Shortcuts

```bash
# Quick test
npm test -- src/utils/DisposalRegistry

# Quick lint check
npm run lint -- src/audioEngine.js

# Find large functions
grep -n "^function" src/audioEngine.js | awk '{print NR, $0}' | sort -n

# Count lines in each function (approximate)
awk '/^function|^export function/ {if (prev) print prev, NR-prevNR-1; prev=$0; prevNR=NR}' src/audioEngine.js
```

## 🎯 Decision Framework

When refactoring, ask:

1. **Size**: Is this change < 100 lines? → Do it now
2. **Risk**: Could this break existing features? → Write tests first  
3. **Memory**: Does it create Tone.js objects? → Use DisposalRegistry
4. **Performance**: Is it called frequently? → Consider caching
5. **API**: Does it change public API? → Document breaking changes

Remember: Small, focused changes with tests are better than large rewrites!