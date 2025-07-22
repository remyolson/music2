# Preflight Checklist for AI Assistants

Use this checklist before making any code changes to the Music2 project.

## 🔍 Before You Start

- [ ] Have you read `CLAUDE.md`?
- [ ] Do you understand the current task's context?
- [ ] Have you checked `CODEBASE_MAP.md` for file locations?
- [ ] Are you familiar with the memory safety requirements?

## 💭 Understanding the Task

- [ ] Is this a refactoring, bug fix, or new feature?
- [ ] What files will be affected?
- [ ] Are there existing patterns to follow? (Check `API_PATTERNS.md`)
- [ ] Will this change any public APIs?

## 🏗️ Planning the Change

- [ ] Can this be done in small, incremental steps?
- [ ] Do tests exist for the code being changed?
- [ ] Will you need to use DisposalRegistry?
- [ ] Are there any safety limits to consider?

## 💻 While Coding

### Memory Safety
- [ ] All Tone.js objects use DisposalRegistry
- [ ] Event listeners have cleanup
- [ ] Timers are cleared on disposal
- [ ] No circular references

### Code Quality
- [ ] Following existing patterns
- [ ] No magic numbers (use constants)
- [ ] Descriptive variable names
- [ ] Error messages provide context

### Testing
- [ ] Tests written/updated for changes
- [ ] Edge cases considered
- [ ] Mocks used appropriately
- [ ] Tests actually run and pass

## 📋 Before Completing

- [ ] Run `npm test` - all tests pass?
- [ ] Run `npm run lint` - no errors?
- [ ] Check for memory leaks with `npm run find:leaks`
- [ ] Updated relevant documentation?
- [ ] Verified no breaking changes (or documented them)?

## 🚀 Final Checks

- [ ] Changes are focused and minimal
- [ ] Code is self-documenting
- [ ] Performance impact considered
- [ ] Future maintainability preserved

## ⚠️ Red Flags to Avoid

1. **Creating Tone.js objects without cleanup**
   ```javascript
   // ❌ BAD
   const reverb = new Tone.Reverb();
   
   // ✅ GOOD
   const reverb = registry.register(new Tone.Reverb());
   ```

2. **Adding to audioEngine.js**
   - It's already too large!
   - Consider creating a new module instead

3. **Ignoring safety limits**
   - Always respect SAFE_LIMITS
   - Never set feedback > 0.7

4. **Breaking existing functionality**
   - Maintain backward compatibility
   - Or clearly document breaking changes

## 📝 Template Response

When presenting changes, use this format:

```
## Changes Made

1. **What**: Brief description
   **Why**: Reasoning
   **Impact**: What it affects

2. **What**: Next change
   **Why**: Reasoning  
   **Impact**: What it affects

## Tests
- Added/Updated: [list test files]
- Coverage: X%

## Memory Safety
- Used DisposalRegistry: Yes/No
- Cleanup verified: Yes/No

## Breaking Changes
- None / [List any breaking changes]

## Next Steps
- [What should be done next]
```

Remember: Quality > Quantity. Better to do one thing well than many things poorly!