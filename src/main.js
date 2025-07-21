import { initialize as initializeInput } from './inputHandler.js';
import { initialize as initializeVisualizer, update as updateVisualizer } from './visualizer.js';
import { subscribe } from './state.js';
import { update as updateAudioEngine, play, stop } from './audioEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('JSON Music Codec - Initializing...');

  initializeVisualizer();

  subscribe((musicData) => {
    updateAudioEngine(musicData);
    updateVisualizer(musicData);
  });

  initializeInput();

  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  const copyButton = document.getElementById('copy-json');
  const copyAiButton = document.getElementById('copy-ai');

  playButton.addEventListener('click', async () => {
    await play();
  });

  stopButton.addEventListener('click', () => {
    stop();
  });

  copyButton.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonText = jsonEditor.value;

    navigator.clipboard.writeText(jsonText).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  copyAiButton.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonText = jsonEditor.value;

    const AI_PROMPT = `You are an AI assistant for JSON Music Codec.

Your task:
• When the user asks to create or modify music, respond with **ONLY** a single, complete JSON object (no code fences, no commentary).
• The JSON **must exactly** match the schema below. If a required field is missing, you must include it. Do not add any extra top-level keys.

Schema (all fields required unless marked optional):
{
  "title": string              // Human-readable song title
  "tempo": integer 20-300      // Beats per minute
  "tracks": [                  // One or more tracks
    {
      "name": string           // Track label (e.g., "Lead", "Drums")
      "instrument": "synth_lead" | "drums_kit",
      "notes": [              // One or more note events
        {
          "time": number       // Beat position (e.g., 0, 0.5, 3.25)
          "duration": number   // Length in beats (e.g., 0.5 = eighth note if tempo is 120)
          "value": string      // If synth_lead: pitch (C4, F#5, etc.)
                                // If drums_kit: "kick" | "snare"
        }
      ]
    }
  ]
}

Instrument contract:
• synth_lead → value must be valid scientific pitch notation (A0–C8, optional #/b).
• drums_kit  → value must be exactly "kick" or "snare".

Formatting rules:
1. Use double quotes on all keys & string values (valid JSON).
2. top-level keys order: title, tempo, tracks.
3. Do NOT wrap the JSON in Markdown code fences (triple backticks).
    4. Respond with the entire object each time(overwrite existing JSON).

      Example 1(minimal valid):
    {
      "title": "Hello World",
        "tempo": 120,
          "tracks": [
            {
              "name": "Lead",
              "instrument": "synth_lead",
              "notes": [
                { "time": 0, "duration": 0.5, "value": "C4" },
                { "time": 0.5, "duration": 0.5, "value": "E4" },
                { "time": 1, "duration": 0.5, "value": "G4" },
                { "time": 1.5, "duration": 0.5, "value": "C5" }
              ]
            },
            {
              "name": "Drums",
              "instrument": "drums_kit",
              "notes": [
                { "time": 0, "duration": 0.1, "value": "kick" },
                { "time": 1, "duration": 0.1, "value": "snare" },
                { "time": 2, "duration": 0.1, "value": "kick" },
                { "time": 3, "duration": 0.1, "value": "snare" }
              ]
            }
          ]
    }

Example 2(different tempo & pitches):
    {
      "title": "Funk Groove",
        "tempo": 100,
          "tracks": [
            {
              "name": "Bass",
              "instrument": "synth_lead",
              "notes": [
                { "time": 0, "duration": 1, "value": "E2" },
                { "time": 2, "duration": 1, "value": "G2" },
                { "time": 4, "duration": 1, "value": "A2" }
              ]
            },
            {
              "name": "Drums",
              "instrument": "drums_kit",
              "notes": [
                { "time": 0, "duration": 0.2, "value": "kick" },
                { "time": 1, "duration": 0.2, "value": "snare" },
                { "time": 1.5, "duration": 0.2, "value": "kick" },
                { "time": 2.5, "duration": 0.2, "value": "snare" }
              ]
            }
          ]
    } `;

    const combinedText = `${AI_PROMPT} \n\n${jsonText} `;

    navigator.clipboard.writeText(combinedText).then(() => {
      const originalText = copyAiButton.textContent;
      copyAiButton.textContent = 'Copied!';
      setTimeout(() => {
        copyAiButton.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  console.log('JSON Music Codec - Ready!');
});