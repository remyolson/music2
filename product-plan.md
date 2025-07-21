### **Product Requirements Document: "JSON Music Codec"**

*   **Version:** 3.0
*   **Status:** Ready for MVP Development
*   **Author:** Gemini
*   **Last Updated:** July 21, 2025

### **1. Overview**

"JSON Music Codec" is a minimalist, local-first desktop application for composing music through a simple, human-readable JSON format. It is designed for developers, hobbyists, and musicians who want to experiment with programmatic music creation. The core user experience centers on a dual-pane interface: a JSON editor on the left and a live music visualizer on the right, providing immediate, interactive feedback between the code and the resulting audio.

### **2. Target Audience**

*   **Creative Coders & Developers:** Programmers interested in generative art and exploring the intersection of code and music.
*   **Musicians & Composers:** Musicians seeking a novel, programmatic method for sketching musical ideas.
*   **Beginners & Hobbyists:** Individuals new to programming or music composition who desire a simple and accessible entry point.

### **3. Key Features & User Experience**

#### **3.1. The "Hello, World!" - Initial State**

To provide an immediate "Aha!" moment and reduce the friction of a blank slate, the application will launch with a default, pre-filled musical example in the JSON editor. This simple piece serves as instant documentation and allows the user's first action to be pressing "Play."

*   **Default JSON on Launch:**
    ```json
    {
      "tempo": 120,
      "timeSignature": "4/4",
      "tracks": [
        {
          "instrument": "synth_lead",
          "notes": [
            {"time": "0:0", "note": "C4", "duration": "4n"},
            {"time": "0:1", "note": "E4", "duration": "4n"},
            {"time": "0:2", "note": "G4", "duration": "4n"}
          ]
        },
        {
          "instrument": "drums_kit",
          "notes": [
            {"time": "0:0", "note": "kick", "duration": "8n"},
            {"time": "0:1", "note": "snare", "duration": "8n"},
            {"time": "0:2", "note": "kick", "duration": "8n"},
            {"time": "0:3", "note": "snare", "duration": "8n"}
          ]
        }
      ]
    }
    ```

#### **3.2. Core Interface**

*   **Left Pane (JSON Editor):**
    *   An editable text area for music definition, pre-populated with the default example.
    *   **"Copy" Button:** Copies raw JSON to the clipboard.
    *   **"Copy with Prompt" Button:** Copies JSON prefixed with a schema explanation.

*   **Center Pane (Error Panel):**
    *   A dedicated, static UI panel located directly below the JSON editor.
    *   This panel will display validation and syntax errors in a clear, non-disruptive manner, allowing the user to reference the error while editing. The message will persist until a valid update occurs.

*   **Right Pane (Music Visualizer):**
    *   A real-time piano roll-style visualization of the musical data.

*   **Global Playback Controls:**
    *   Standard **Play**, **Pause**, and **Start Over** buttons.

### **4. Technical Architecture & Implementation Plan**

#### **4.1. Core Technology Stack**

*   **Runtime:** Modern web browser or a desktop wrapper (e.g., Electron).
*   **Audio Engine:** **Tone.js**.
*   **UI Framework:** Plain HTML, CSS, JavaScript.
*   **Schema Validation:** **Zod** or **Ajv**.

#### **4.2. JSON Schema and Validation**

##### **4.2.1. Schema Definition**
The application will parse a JSON object adhering to the following structure and rules.

*   **Top-Level Properties:** `tempo` (number), `timeSignature` (string, optional, e.g., "4/4"), `tracks` (array).
*   **Track Object:** `instrument` (string), `notes` (array).
*   **Note Object:** `time` (string, e.g., "bar:beat:sixteenth"), `note` (string), `duration` (string, e.g., "4n").

##### **4.2.2. The Instrument Contract**
To prevent silent failures and provide clear feedback, each instrument has a strict API for its valid notes. Any deviation will result in a schema validation error.

*   `instrument: "synth_lead"`
    *   **Accepted Notes:** Any valid scientific pitch notation string (e.g., `"C4"`, `"F#5"`, `"Ab2"`). The validator will check the pattern.
*   `instrument: "drums_kit"`
    *   **Accepted Notes:** The `note` property **must** be one of the following strings: `"kick"` or `"snare"`.
    *   *Example Error:* "`hi-hat` is not a valid note for the `drums_kit` instrument. Allowed notes are: `kick`, `snare`."

##### **4.2.3. Validation Process**
A two-stage validation process ensures robustness:
1.  **Syntax Check:** `JSON.parse()` is wrapped in a `try...catch` block. Syntax errors are immediately displayed in the error panel.
2.  **Schema Check:** A valid JSON object is run through the Zod/Ajv validator. Schema errors, including violations of the Instrument Contract, are displayed in the error panel.

#### **4.3. Audio Engine & Resource Management**

*   **Scheduling:** All note events will be scheduled on the master `Tone.Transport` for timing precision.

*   **Stateless Resource Management:** To ensure simplicity and guarantee consistency, the application will adopt a stateless rendering approach for the audio engine.
    *   **On any valid JSON change:**
        1.  Completely stop the transport and dispose of **all** previously created `Tone.js` objects (synths, parts, etc.) to prevent memory leaks or state conflicts.
        2.  Create a fresh set of instrument objects based on the new, validated `Parsed State`.
        3.  Schedule all notes on the new objects.
    *   This approach avoids the complexity of diffing state and ensures the audio engine is always a perfect 1:1 representation of the user's code.

#### **4.4. State Management & UI Rendering**

*   **Unidirectional Data Flow:** A strict one-way data flow will be enforced:
    1.  **Raw State:** Text in the editor.
    2.  **Parsed State (Source of Truth):** The valid JS object.
    3.  **UI/Audio Reaction:** Visualizer and audio engine react *only* to changes in the Parsed State.

*   **Visualization:** **SVG** will be used to render notes as `<rect>` elements.
*   **Playhead Animation:** A playhead will be animated using `requestAnimationFrame`, synchronized with `Tone.Transport.seconds` for smooth, performant feedback.

### **5. Non-Functional Requirements**

*   **Performance:** The JSON editor input will be **debounced** (300-500ms) to prevent re-rendering on every keystroke.
*   **Error Handling:** All errors will be presented clearly in the dedicated error panel below the editor.
*   **Simplicity:** The application will be a single, self-contained local executable or web page with no external dependencies or backend required for operation.

### **6. MVP Scope Summary**

*   **Features:** All functionality described in this document.
*   **Instruments:** `synth_lead` and `drums_kit` with their defined note contracts.
*   **Initial State:** Launches with a pre-filled, playable example.
*   **Error Handling:** A dedicated, persistent error panel is implemented.
*   **Architecture:** Follows the stateless resource management and unidirectional data flow principles.