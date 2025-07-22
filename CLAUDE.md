# Claude AI Assistant Guide for Music2

## Project Overview

Music2 is a browser-based audio processing library built on Tone.js that enables real-time music creation, live input processing, and advanced audio effects. The project emphasizes memory safety, performance, and developer experience.

## Key Context for AI Assistants

### Current State
- **Main Issue**: The `audioEngine.js` file is 1700+ lines and handles too many responsibilities
- **Memory Concerns**: Active focus on preventing memory leaks with new patterns being implemented
- **Refactoring**: Currently undergoing major refactoring to improve maintainability
- **Testing**: Basic testing infrastructure set up with Vitest, needs expansion

### Architecture Overview

```
Current Structure:
src/
├── audioEngine.js      # MASSIVE FILE - needs splitting
├── inputHandler.js     # UI input handling
├── visualizer.js       # Main visualization
├── state.js           # Simple pub-sub state management
├── schemas.js         # Zod validation schemas
└── utils/             # New utilities being added
    ├── DisposalRegistry.js  # Memory management helper
    └── memoryMonitor.js     # Memory leak detection

Target Structure (see REFACTORING_PLAN.md):
src/
├── audio/
│   ├── core/
│   ├── instruments/
│   ├── effects/
│   └── live/
└── ...
```

## Critical Information

### Memory Management
**ALWAYS** use the DisposalRegistry pattern for Tone.js objects:

```javascript
// ✅ CORRECT - Memory safe
const registry = new DisposalRegistry('feature-name');
const effect = registry.register(new Tone.Reverb());

// ❌ WRONG - Memory leak
const effect = new Tone.Reverb(); // No cleanup!
```

### Tone.js Patterns
1. **Always dispose**: Every Tone.js object must be disposed
2. **Disconnect before dispose**: `obj.disconnect()` then `obj.dispose()`
3. **Audio context**: Check `Tone.context.state === 'running'` before audio operations
4. **Scheduling**: Use `Tone.Transport.scheduleOnce()` for cleanup

### Common Pitfalls
1. **Circular dependencies**: State subscribes to audio, audio updates state
2. **Event listeners**: Not cleaned up, causing memory leaks
3. **Effect references**: Stored in Maps but not always disposed
4. **Temporary effects**: Created per-note but not cleaned up

## Code Conventions

### Naming
- **Files**: camelCase.js
- **Classes**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Events**: kebab-case (e.g., 'track:add')

### Error Handling
```javascript
// Always provide context
throw new Error(`Invalid instrument type: ${type}. Valid types: ${VALID_TYPES.join(', ')}`);
```

### Documentation
- Use JSDoc for all public functions
- Include @example blocks
- Document side effects

## Current Tasks Priority

1. **Split audioEngine.js** into logical modules
2. **Apply DisposalRegistry** to all Tone.js usage
3. **Add tests** for critical paths
4. **Extract constants** and configuration
5. **Implement lazy loading** for instruments

## Testing Approach

```javascript
// Tests use mocked Tone.js (see test/setup.js)
import { describe, it, expect, vi } from 'vitest';

describe('Feature', () => {
  it('should handle the happy path', () => {
    // Arrange
    const mockContext = createMockContext();
    
    // Act
    const result = doSomething();
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Performance Considerations

1. **Lazy load instruments**: Don't create all upfront
2. **Pool objects**: Reuse effects where possible
3. **Batch operations**: Group Tone.js operations
4. **Use Web Workers**: For heavy computations (future)

## Safety Limits

The codebase implements safety limits to prevent audio feedback loops:

```javascript
const SAFE_LIMITS = {
  feedback: 0.7,      // Maximum feedback
  wet: 0.6,          // Maximum wet level
  reverbDecay: 10,   // Maximum reverb decay
  delayTime: 2,      // Maximum delay time
};
```

## How to Help Best

1. **Read these files first**:
   - This file (CLAUDE.md)
   - REFACTORING_PLAN.md
   - Current code you're modifying

2. **Always consider**:
   - Memory leaks (use DisposalRegistry)
   - Performance impact
   - Test coverage
   - Breaking changes

3. **When refactoring**:
   - Keep changes focused
   - Update tests
   - Preserve public APIs
   - Document decisions

## Common Commands

```bash
# Development
npm run dev          # Start dev server
npm run test         # Run tests
npm run lint         # Check code quality

# Not yet implemented but planned
npm run test:memory  # Memory leak tests
npm run build       # Production build
npm run size        # Check bundle size
```

## Questions to Ask

When working on a task, consider asking:
1. "Should this use the DisposalRegistry pattern?"
2. "Are there existing patterns in the codebase I should follow?"
3. "Will this change break existing functionality?"
4. "How should this be tested?"
5. "Are there performance implications?"

## Recent Changes to Note

- Added `audioHealthMonitor` for tracking audio health
- Master bus now includes DC blocking filter
- Harmonizer effects are now shared per track (not per note)
- Safety limits implemented for all effects
- Temporary pitch effects are properly cleaned up

## Contact for Major Decisions

For architectural decisions or breaking changes, always discuss first. The project prioritizes:
1. Memory safety
2. Performance  
3. Developer experience
4. Code maintainability

Remember: This is becoming a professional open-source project. Code quality matters!