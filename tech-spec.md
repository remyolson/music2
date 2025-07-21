Excellent. This feedback provides critical, low-effort/high-impact improvements that will strengthen the final product and simplify the development process. By incorporating these changes directly into the schemas, we make the entire system more robust and developer-friendly.

Here is the second version of the Technical Specification, updated and improved based on the provided feedback.

***

### **Technical Specification: JSON Music Codec MVP**

*   **Version:** 2.0
*   **Status:** Ready for Implementation
*   **Author:** Gemini
*   **Corresponding PRD:** [JSON Music Codec PRD v3.0](link-to-prd)

### **1. Introduction**

This document outlines the technical implementation plan for the JSON Music Codec application. It is intended for the engineering team and provides a detailed guide to architecture, data models, component logic, and dependencies required to build the Minimum Viable Product (MVP) as defined in the corresponding Product Requirements Document. This specification is designed to be a complete and unambiguous guide for development.

### **2. High-Level Architecture**

The application will follow a unidirectional data flow pattern to ensure predictable state management and clear separation of concerns. The user's input will trigger a validation and parsing step, which, if successful, updates a central state object. The UI and Audio Engine are reactive, exclusively re-rendering or re-scheduling based on changes to this central state.

**Architectural Diagram:**

```
+----------------+      (oninput, debounced)      +----------------------+      (if valid)      +--------------------+
|                | ----------------------------> |                      | -------------------> |                    |
|   JSON Editor  |                               |  Validation Service  |                      |  Application State |
|  (Raw String)  | <---------------------------  | (Parses & Validates) | <------------------- |  (Source of Truth) |
|                |      (on error) Display      |                      |         ^            |                    |
+----------------+      in Error Panel          +----------------------+         |            +---------+----------+
                                                                                 |                      |
                                                                          (User Action)                 | (on state update)
                                                                                 |                      |
                                                                        +--------+--------+    +-------v-------+      +------------------+
                                                                        |                 |    |               |      |                  |
                                                                        | Playback        |--->|  Audio Engine |----->|  Web Audio API   |
                                                                        | Controls        |    |  (Tone.js)    |      |  (Browser)       |
                                                                        +-----------------+    +---------------+      +------------------+
                                                                                                     |
                                                                                                     | (on state update)
                                                                                               +-----v-----+
                                                                                               |           |
                                                                                               | Visualizer|
                                                                                               | (SVG)     |
                                                                                               +-----------+
```

### **3. Core Dependencies**

*   **Audio:** `tone` (^14.7.77) - The definitive library for Web Audio scheduling and synthesis.
*   **Validation:** `zod` (^3.22.4) - For robust, type-safe schema definition and validation.
*   **Development:** A standard web toolchain (e.g., Vite) is recommended. The final output must be vanilla HTML, CSS, and a single bundled JS file.

### **4. Data Models & Interfaces (Schema Definition)**

The Zod schemas are the **single source of truth for all validation logic**. By using `.transform()` for user-friendly input and `.refine()` for cross-field validation, we eliminate the need for any custom validation logic in other parts of the application.

```typescript
// /src/schemas.ts

import { z } from 'zod';

// Defines the contract for the "drums_kit" instrument
const DrumNoteSchema = z.enum(['kick', 'snare']);

// Defines the contract for "synth_lead" notes.
// It automatically corrects case ("c#4" -> "C#4") before validating the format.
const PitchNoteSchema = z.string()
  .transform(note => note.charAt(0).toUpperCase() + note.slice(1))
  .refine(note => /^[A-G][b#]?\d$/.test(note), {
    message: "Invalid note format. Must be a valid scientific pitch notation (e.g., C4, F#5)."
  });

// A note can be either a pitch or a drum sound.
const NoteSchema = z.object({
  time: z.string(), // e.g., "0:1", "0:2:2"
  note: z.union([PitchNoteSchema, DrumNoteSchema]),
  duration: z.string(), // e.g., "4n", "8t"
});

// Defines a track and refines it to enforce the Instrument Contract.
// This ensures that notes are valid for the selected instrument.
const TrackSchema = z.object({
  instrument: z.enum(['synth_lead', 'drums_kit']),
  notes: z.array(NoteSchema),
})
.refine(track => {
  if (track.instrument === 'synth_lead') {
    // If the instrument is a synth, every note MUST be a valid pitch.
    return track.notes.every(note => PitchNoteSchema.safeParse(note.note).success);
  }
  if (track.instrument === 'drums_kit') {
    // If the instrument is a drum kit, every note MUST be a valid drum sound.
    return track.notes.every(note => DrumNoteSchema.safeParse(note.note).success);
  }
  return false; // Should be unreachable
}, {
  // User-friendly error message if the refinement fails.
  message: "Instrument Contract Violation: One or more notes are not valid for the selected instrument (e.g., using 'kick' with 'synth_lead')."
});

// The master schema for the entire JSON object
export const MusicDataSchema = z.object({
  tempo: z.number().int().min(20).max(300),
  timeSignature: z.string().regex(/^\d+\/\d+$/).optional(),
  tracks: z.array(TrackSchema),
});

// Inferred TypeScript type for our application state
export type MusicData = z.infer<typeof MusicDataSchema>;
```

### **5. Component & Service Breakdown**

#### **5.1. UI Components**

*   **`index.html`:** The main application shell containing `<textarea id="json-editor">`, control buttons, `<pre id="error-panel"></pre>`, and `<svg id="visualizer"></svg>`.

#### **5.2. Input Handling (`/src/inputHandler.ts`)**

*   **Responsibility:** Manages the JSON editor and orchestrates the update flow.
*   **Logic:**
    1.  On load, populate `#json-editor` with the default JSON string.
    2.  Attach a **debounced** `input` event listener (300ms) to the editor.
    3.  The debounced function calls `ValidationService.validate(rawText)`. On success, it calls `State.update(validatedData)`; on failure, it calls `UI.showError(errorMessage)`.

#### **5.3. Validation Service (`/src/validationService.ts`)**

*   **Responsibility:** To parse raw text and validate it against the master Zod schema. **This service contains no custom validation logic itself.**
*   **API:**
    *   `validate(jsonString: string): { success: true, data: MusicData } | { success: false, error: string }`
*   **Logic:**
    1.  **Syntax Check:** Wrap `JSON.parse(jsonString)` in a `try...catch` block. Return a formatted error on failure.
    2.  **Schema Check:** Call `MusicDataSchema.safeParse(parsedJson)`.
        *   If `result.success` is `false`, format `result.error.issues` into a user-friendly string and return it.
        *   If `result.success` is `true`, return `result.data`.

#### **5.4. Application State (`/src/state.ts`)**

*   **Responsibility:** Hold the single source of truth (`MusicData`) and notify subscribers of changes using a simple pub/sub pattern.
*   **Subscribers:** `AudioEngine.update`, `Visualizer.update`.

#### **5.5. Audio Engine (`/src/audioEngine.ts`)**

*   **Responsibility:** Manage all audio playback using Tone.js.
*   **`update` Logic:**
    1.  **Cleanup:** Dispose of all existing `Tone.js` instrument and part objects to ensure a stateless render.
    2.  **Set Transport:** Update `Tone.Transport.bpm` and `Tone.Transport.timeSignature`.
    3.  **Re-create Instruments:** Iterate through `state.tracks`, creating new synth instances based on the `track.instrument` and storing them.
        *   `"synth_lead"` -> `new Tone.Synth()`
        *   `"drums_kit"` -> A map of synths, e.g., `{ kick: new Tone.MembraneSynth(), snare: new Tone.NoiseSynth() }`.
    4.  **Re-create Parts:** For each track, create a new `Tone.Part`, providing a callback that triggers the correct synth from the newly created instrument instances.

#### **5.6. Visualization Component (`/src/visualizer.ts`)**

*   **Responsibility:** Render the SVG piano roll and playhead.
*   **`update` Logic:** Clear the SVG and re-render all note `<rect>` elements based on the new `MusicData` state.
*   **Playhead Logic:** Use `requestAnimationFrame` to update the playhead's position based on `Tone.Transport.seconds`.

### **6. "Copy with Prompt" Template**

The template remains unchanged, providing clear documentation to the end-user. The improved validation ensures the application is more robust in handling the described format.