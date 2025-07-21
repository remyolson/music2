# Development Plan: JSON Music Codec MVP

## Overview
This plan provides a step-by-step implementation guide for building the JSON Music Codec MVP. The focus is on simplicity and getting to a working prototype quickly, following the exact specifications without adding extra features.

## Phase 1: Project Setup and Core HTML Structure
**Goal:** Create the basic project structure and HTML layout

- [x] Initialize project directory with the following structure:
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

- [x] Create `package.json` with only essential dependencies:
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

- [x] Build `index.html` with the three-pane layout:
  - [x] Left pane: `<textarea id="json-editor">` with default JSON
  - [x] Center pane: `<pre id="error-panel">` for error display
  - [x] Right pane: `<svg id="visualizer">` for piano roll
  - [x] Global controls: Play, Pause, Start Over buttons
  - [x] Copy buttons: "Copy" and "Copy with Prompt"

- [x] Create basic `styles.css` with flexbox layout for panes

## Phase 2: Data Models and Validation
**Goal:** Implement the Zod schemas and validation logic

- [x] Implement `schemas.js` with all Zod schemas:
  - [x] `DrumNoteSchema` with enum ['kick', 'snare']
  - [x] `PitchNoteSchema` with transform and regex validation
  - [x] `NoteSchema` object structure
  - [x] `TrackSchema` with instrument contract refinement
  - [x] `MusicDataSchema` as the master schema

- [x] Create `validationService.js`:
  - [x] Implement `validate()` function with two-stage validation
  - [x] JSON.parse with try/catch for syntax errors
  - [x] Zod safeParse for schema validation
  - [x] Format error messages for user display

## Phase 3: State Management and Input Handling
**Goal:** Implement the unidirectional data flow

- [x] Build `state.js` with simple pub/sub pattern:
  - [x] Store current valid MusicData
  - [x] `update()` method to set new state
  - [x] `subscribe()` method for listeners
  - [x] Notify all subscribers on state change

- [x] Create `inputHandler.js`:
  - [x] Load default JSON into editor on page load
  - [x] Implement debounced input handler (300ms)
  - [x] Connect to validation service
  - [x] Update state on valid input
  - [x] Display errors in error panel

## Phase 4: Audio Engine Implementation
**Goal:** Build the Tone.js audio playback system

- [x] Implement `audioEngine.js`:
  - [x] Create `update()` method for stateless resource management
  - [x] Implement complete cleanup of previous Tone.js objects
  - [x] Create instrument factory:
    - [x] synth_lead → new Tone.Synth()
    - [x] drums_kit → { kick: MembraneSynth, snare: NoiseSynth }
  - [x] Schedule all notes using Tone.Part
  - [x] Implement play/pause/stop methods
  - [x] Connect to Transport controls

## Phase 5: Visualization Component
**Goal:** Create the SVG piano roll visualizer

- [x] Build `visualizer.js`:
  - [x] Implement `update()` method to render notes as SVG rects
  - [x] Calculate note positions based on time and pitch
  - [x] Create playhead element
  - [x] Implement requestAnimationFrame loop for playhead
  - [x] Sync playhead position with Tone.Transport.seconds

## Phase 6: Integration and Controls
**Goal:** Connect all components and implement UI controls

- [x] Create `main.js` entry point:
  - [x] Initialize all services and components
  - [x] Wire up button event handlers
  - [x] Connect state subscribers

- [x] Implement playback controls:
  - [x] Play button starts Tone.Transport
  - [x] Pause button pauses transport
  - [x] Start Over resets transport position

- [x] Implement copy functionality:
  - [x] Copy button copies raw JSON
  - [x] Copy with Prompt prepends schema documentation

## Phase 7: Testing and Polish
**Goal:** Ensure everything works as specified

- [x] Test the default "Hello World" example:
  - [x] Verify it loads on startup
  - [x] Check that Play button works immediately
  - [x] Ensure visualizer shows correct notes

- [x] Test validation and error handling:
  - [x] Invalid JSON syntax shows clear error
  - [x] Schema violations display helpful messages
  - [x] Instrument contract errors are specific

- [x] Test stateless audio management:
  - [x] Editing JSON while playing works smoothly
  - [x] No audio glitches or memory leaks
  - [x] Transport updates correctly

- [x] Build final bundle with Vite
- [x] Test as single HTML file with bundled JS

## Implementation Notes

1. **Keep It Simple:** This is a rudimentary MVP. Resist the urge to add features.
2. **No Backend:** Everything runs client-side in the browser.
3. **Single File Output:** Use Vite to bundle everything into one HTML file.
4. **Follow the Spec:** The tech spec's unidirectional flow and stateless audio management are critical.
5. **Default Example:** The pre-loaded JSON must work perfectly on first load.

## Success Criteria

- [x] Application loads with the default JSON example
- [x] Pressing Play immediately produces music
- [x] JSON edits update audio and visualization in real-time
- [x] Clear error messages for invalid input
- [x] No console errors or warnings
- [x] Single HTML file that works in any modern browser