# AI Assistant Quick Start

Welcome! This guide helps AI assistants quickly understand and work effectively with the Music2 codebase.

## 📚 Essential Reading Order

1. **[CLAUDE.md](./CLAUDE.md)** - Main AI assistant guide (READ FIRST)
2. **[CODEBASE_MAP.md](./CODEBASE_MAP.md)** - File locations and responsibilities  
3. **[API_PATTERNS.md](./API_PATTERNS.md)** - Common code patterns
4. **[TASKS_QUICK_REFERENCE.md](./TASKS_QUICK_REFERENCE.md)** - How to do common tasks
5. **[REFACTORING_PLAN.md](./REFACTORING_PLAN.md)** - Overall refactoring strategy

## 🚀 Quick Start Commands

```bash
# First time setup
npm install  # Install dependencies

# Development
npm run dev  # Start dev server

# Testing
npm test     # Run tests
npm run test:watch  # Run tests in watch mode

# Code quality
npm run check  # Run all checks (lint, format, test)

# Analysis
npm run analyze  # Analyze codebase
npm run find:leaks  # Find potential memory leaks
```

## 🎯 Current Focus Areas

1. **Split audioEngine.js** (1774 lines) into modules
2. **Apply DisposalRegistry** pattern for memory safety
3. **Add tests** for critical paths
4. **Extract constants** and configuration

## ⚠️ Critical Information

### Memory Safety is Priority #1
```javascript
// ALWAYS use DisposalRegistry for Tone.js objects
const registry = new DisposalRegistry('feature');
const effect = registry.register(new Tone.Reverb());
```

### Safety Limits Are Enforced
```javascript
const SAFE_LIMITS = {
  feedback: 0.7,    // Prevent runaway feedback
  wet: 0.6,         // Prevent signal overload
  reverbDecay: 10,  // Prevent infinite reverb
  delayTime: 2      // Prevent excessive delay
};
```

### Recent Changes
- Master bus now has compression and highpass filter
- Audio health monitoring is active
- Gain staging has been reduced to prevent clipping

## 🔧 Common Workflows

### Adding a New Feature
1. Read relevant existing code
2. Use DisposalRegistry for any Tone.js objects
3. Follow existing patterns (see API_PATTERNS.md)
4. Add tests
5. Update documentation

### Fixing a Bug
1. Reproduce the issue
2. Add a failing test
3. Fix the bug
4. Verify test passes
5. Check for similar issues

### Refactoring Code
1. Understand current functionality
2. Write tests if missing
3. Make small, incremental changes
4. Ensure tests still pass
5. Update documentation

## 📁 Key Files to Understand

| Priority | File | Why Important |
|----------|------|---------------|
| 🔴 HIGH | `audioEngine.js` | Core of everything, needs splitting |
| 🔴 HIGH | `DisposalRegistry.js` | Memory leak prevention |
| 🟡 MED | `state.js` | Central state management |
| 🟡 MED | `schemas.js` | Data validation |
| 🟢 LOW | `visualizer.js` | UI updates |

## 💡 Tips for Success

1. **Start Small**: Make focused, testable changes
2. **Test Often**: Run `npm test` frequently
3. **Check Memory**: Use `npm run find:leaks`
4. **Follow Patterns**: See API_PATTERNS.md
5. **Ask Questions**: Unclear? Check documentation first

## 🐛 Known Issues

1. **audioEngine.js is too large** - Main refactoring target
2. **Effects not always disposed** - Use DisposalRegistry
3. **Temporary effects accumulate** - Need automatic cleanup
4. **Some event listeners leak** - Not using removal pattern

## 🏗️ Architecture Goals

Moving from:
```
src/
├── audioEngine.js (1774 lines of everything)
└── other files...
```

To:
```
src/
├── audio/
│   ├── core/
│   ├── instruments/
│   ├── effects/
│   └── live/
└── other files...
```

## ✅ Checklist Before Submitting Changes

- [ ] Tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Memory-safe (uses DisposalRegistry)
- [ ] Documented (JSDoc for public APIs)
- [ ] No breaking changes (or documented)

## 🆘 Getting Stuck?

1. Check the documentation files listed above
2. Look for similar patterns in existing code
3. Run `npm run analyze` to understand structure
4. Search for TODO comments: `npm run find:todos`

Remember: The goal is a maintainable, memory-safe, professional codebase. Every change should move us closer to that goal!