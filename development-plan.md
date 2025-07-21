# Development Plan: JSON Music Codec MVP

## Overview
This plan provides a step-by-step implementation guide for building the JSON Music Codec MVP. The focus is on simplicity and getting to a working prototype quickly, following the exact specifications without adding extra features.

## Phase 1: Project Setup and Core HTML Structure
**Goal:** Create the basic project structure and HTML layout

- [ ] Initialize project directory with the following structure:
  ```
  /
  ├── index.html
  ├── src/
  │   ├── main.js
  │   ├── schemas.js
  │   ├── inputHandler.js
  │   ├── validationService.js
  │   ├── state.js
  │   ├── audioEngine.js
  │   └── visualizer.js
  ├── styles.css
  └── package.json
  ```

- [ ] Create `package.json` with only essential dependencies:
  ```json
  {
    "dependencies": {
      "tone": "^14.7.77",
      "zod": "^3.22.4"
    },
    "devDependencies": {
      "vite": "latest"
    }
  }
  ```

- [ ] Build `index.html` with the three-pane layout:
  - [ ] Left pane: `<textarea id="json-editor">` with default JSON
  - [ ] Center pane: `<pre id="error-panel">` for error display
  - [ ] Right pane: `<svg id="visualizer">` for piano roll
  - [ ] Global controls: Play, Pause, Start Over buttons
  - [ ] Copy buttons: "Copy" and "Copy with Prompt"

- [ ] Create basic `styles.css` with flexbox layout for panes

## Phase 2: Data Models and Validation
**Goal:** Implement the Zod schemas and validation logic

- [ ] Implement `schemas.js` with all Zod schemas:
  - [ ] `DrumNoteSchema` with enum ['kick', 'snare']
  - [ ] `PitchNoteSchema` with transform and regex validation
  - [ ] `NoteSchema` object structure
  - [ ] `TrackSchema` with instrument contract refinement
  - [ ] `MusicDataSchema` as the master schema

- [ ] Create `validationService.js`:
  - [ ] Implement `validate()` function with two-stage validation
  - [ ] JSON.parse with try/catch for syntax errors
  - [ ] Zod safeParse for schema validation
  - [ ] Format error messages for user display

## Phase 3: State Management and Input Handling
**Goal:** Implement the unidirectional data flow

- [ ] Build `state.js` with simple pub/sub pattern:
  - [ ] Store current valid MusicData
  - [ ] `update()` method to set new state
  - [ ] `subscribe()` method for listeners
  - [ ] Notify all subscribers on state change

- [ ] Create `inputHandler.js`:
  - [ ] Load default JSON into editor on page load
  - [ ] Implement debounced input handler (300ms)
  - [ ] Connect to validation service
  - [ ] Update state on valid input
  - [ ] Display errors in error panel

## Phase 4: Audio Engine Implementation
**Goal:** Build the Tone.js audio playback system

- [ ] Implement `audioEngine.js`:
  - [ ] Create `update()` method for stateless resource management
  - [ ] Implement complete cleanup of previous Tone.js objects
  - [ ] Create instrument factory:
    - [ ] synth_lead → new Tone.Synth()
    - [ ] drums_kit → { kick: MembraneSynth, snare: NoiseSynth }
  - [ ] Schedule all notes using Tone.Part
  - [ ] Implement play/pause/stop methods
  - [ ] Connect to Transport controls

## Phase 5: Visualization Component
**Goal:** Create the SVG piano roll visualizer

- [ ] Build `visualizer.js`:
  - [ ] Implement `update()` method to render notes as SVG rects
  - [ ] Calculate note positions based on time and pitch
  - [ ] Create playhead element
  - [ ] Implement requestAnimationFrame loop for playhead
  - [ ] Sync playhead position with Tone.Transport.seconds

## Phase 6: Integration and Controls
**Goal:** Connect all components and implement UI controls

- [ ] Create `main.js` entry point:
  - [ ] Initialize all services and components
  - [ ] Wire up button event handlers
  - [ ] Connect state subscribers

- [ ] Implement playback controls:
  - [ ] Play button starts Tone.Transport
  - [ ] Pause button pauses transport
  - [ ] Start Over resets transport position

- [ ] Implement copy functionality:
  - [ ] Copy button copies raw JSON
  - [ ] Copy with Prompt prepends schema documentation

## Phase 7: Testing and Polish
**Goal:** Ensure everything works as specified

- [ ] Test the default "Hello World" example:
  - [ ] Verify it loads on startup
  - [ ] Check that Play button works immediately
  - [ ] Ensure visualizer shows correct notes

- [ ] Test validation and error handling:
  - [ ] Invalid JSON syntax shows clear error
  - [ ] Schema violations display helpful messages
  - [ ] Instrument contract errors are specific

- [ ] Test stateless audio management:
  - [ ] Editing JSON while playing works smoothly
  - [ ] No audio glitches or memory leaks
  - [ ] Transport updates correctly

- [ ] Build final bundle with Vite
- [ ] Test as single HTML file with bundled JS

## Implementation Notes

1. **Keep It Simple:** This is a rudimentary MVP. Resist the urge to add features.
2. **No Backend:** Everything runs client-side in the browser.
3. **Single File Output:** Use Vite to bundle everything into one HTML file.
4. **Follow the Spec:** The tech spec's unidirectional flow and stateless audio management are critical.
5. **Default Example:** The pre-loaded JSON must work perfectly on first load.

## Success Criteria

- [ ] Application loads with the default JSON example
- [ ] Pressing Play immediately produces music
- [ ] JSON edits update audio and visualization in real-time
- [ ] Clear error messages for invalid input
- [ ] No console errors or warnings
- [ ] Single HTML file that works in any modern browser