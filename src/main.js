import { initialize as initializeInput, updateJSONDisplay } from './inputHandler.js';
import { initialize as initializeVisualizer, update as updateVisualizer, selectedTracks } from './visualizer.js';
import { init as initAudioVisualizer } from './audioVisualizer.js';
import { subscribe } from './state.js';
import { update as updateAudioEngine, play, stop, getInstruments, reorderTrackEffects, setHarmonyCallback } from './audioEngine.js';
import { generateAIPrompt } from './musicConfig.js';
import { WaveformVisualizer, FormantVisualizer, EffectChainVisualizer, SpectrumAnalyzer, HarmonyVisualizer } from './visualizerComponents.js';
import { audioHealthMonitor } from './audioHealthMonitor.js';

// Initialize visualizer components
let waveformViz = null;
let formantViz = null;
let effectChainViz = null;
let spectrumViz = null;
let harmonyViz = null;

// Make functions available globally for visualizers
window.getInstruments = getInstruments;
window.reorderTrackEffects = reorderTrackEffects;

document.addEventListener('DOMContentLoaded', () => {
  console.log('JSON Music Codec - Initializing...');

  // Add global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    const errorDiv = document.getElementById('error-panel');
    if (errorDiv) {
      errorDiv.innerHTML += `<div class="error-message">JavaScript Error: ${event.error.message}</div>`;
    }
  });

  initializeVisualizer();

  // Initialize audio visualizer
  const audioCanvas = document.getElementById('audio-spectrum');
  if (audioCanvas) {
    initAudioVisualizer(audioCanvas);
  }

  // Initialize audio health monitor visual
  audioHealthMonitor.createVisualMeter('audio-health-meter');

  // Initialize enhanced visualizers
  waveformViz = new WaveformVisualizer('waveform-viz');
  waveformViz.initialize();

  formantViz = new FormantVisualizer('formant-viz');
  formantViz.initialize();

  effectChainViz = new EffectChainVisualizer('effect-chain-viz');
  effectChainViz.initialize();

  spectrumViz = new SpectrumAnalyzer('spectrum-viz');
  spectrumViz.initialize();

  harmonyViz = new HarmonyVisualizer('harmony-viz');
  harmonyViz.initialize();

  // Set up visualizer dropdown
  const visualizerSelect = document.getElementById('visualizer-select');
  if (visualizerSelect) {
    visualizerSelect.addEventListener('change', (e) => {
      const selectedViz = e.target.value;

      // Hide all visualizers
      document.getElementById('audio-spectrum').style.display = 'none';
      document.getElementById('waveform-viz').style.display = 'none';
      document.getElementById('formant-viz').style.display = 'none';
      document.getElementById('spectrum-viz').style.display = 'none';
      document.getElementById('harmony-viz').style.display = 'none';

      // Show selected visualizer
      switch (selectedViz) {
        case 'spectrum':
          document.getElementById('audio-spectrum').style.display = 'block';
          break;
        case 'waveform':
          document.getElementById('waveform-viz').style.display = 'block';
          break;
        case 'formant':
          document.getElementById('formant-viz').style.display = 'block';
          break;
        case 'spectrum-analyzer':
          document.getElementById('spectrum-viz').style.display = 'block';
          break;
        case 'harmony':
          document.getElementById('harmony-viz').style.display = 'block';
          break;
      }
    });
  }

  // Set up harmony visualization callback
  setHarmonyCallback((noteData) => {
    if (harmonyViz) {
      harmonyViz.updateHarmonies(noteData);
    }
  });

  subscribe((musicData) => {
    updateAudioEngine(musicData);
    updateVisualizer(musicData);

    // Update effect chain visualization
    if (effectChainViz) {
      const instruments = getInstruments();
      effectChainViz.updateEffectChains(instruments);
    }
  });

  try {
    initializeInput();
  } catch (error) {
    console.error('Error initializing input:', error);
    const errorDiv = document.getElementById('error-panel');
    if (errorDiv) {
      errorDiv.innerHTML += `<div class="error-message">Initialization Error: ${error.message}</div>`;
    }
  }

  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  const copyButton = document.getElementById('copy-json');
  const copyAiButton = document.getElementById('copy-ai');
  const saveButton = document.getElementById('save-json');
  const loadButton = document.getElementById('load-json');
  const fileInput = document.getElementById('file-input');

  playButton.addEventListener('click', async () => {
    await play();

    // Start visualizers
    if (waveformViz) {waveformViz.start();}
    if (formantViz) {formantViz.start();}
    if (spectrumViz) {spectrumViz.start();}
    if (harmonyViz) {harmonyViz.start();}
  });

  stopButton.addEventListener('click', () => {
    stop();

    // Stop visualizers
    if (waveformViz) {waveformViz.stop();}
    if (formantViz) {formantViz.stop();}
    if (spectrumViz) {spectrumViz.stop();}
    if (harmonyViz) {harmonyViz.stop();}
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

    const AI_PROMPT = generateAIPrompt();
    const combinedText = `${AI_PROMPT}\n\nCurrent JSON:\n${jsonText}`;

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

  saveButton.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonText = jsonEditor.value;

    try {
      // Parse JSON to get the title
      const musicData = JSON.parse(jsonText);
      const title = musicData.title || 'untitled';

      // Sanitize filename - remove special characters and limit length
      const sanitizedTitle = title
        .replace(/[^a-z0-9\s-]/gi, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase()
        .substring(0, 50); // Limit length

      const filename = `${sanitizedTitle}.json`;

      // Create blob and download link
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      // Clean up
      URL.revokeObjectURL(url);

      // Visual feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Error!';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 2000);
    }
  });

  loadButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {return;}

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      const jsonEditor = document.getElementById('json-editor');

      try {
        // Validate it's proper JSON
        const parsed = JSON.parse(content);
        // Format with 2-space indentation
        const formatted = JSON.stringify(parsed, null, 2);

        // Clear any track selections
        selectedTracks.clear();
        document.querySelectorAll('.track-selected').forEach(el => {
          el.classList.remove('track-selected');
        });

        // Set the content
        jsonEditor.value = formatted;

        // Trigger input event to validate and update
        const inputEvent = new Event('input', { bubbles: true });
        jsonEditor.dispatchEvent(inputEvent);

        // Visual feedback
        const originalText = loadButton.textContent;
        loadButton.textContent = 'Loaded!';
        setTimeout(() => {
          loadButton.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to load file:', err);

        // Show error in error panel
        const errorPanel = document.getElementById('error-panel');
        errorPanel.innerHTML = `<div class="error-message">Failed to load file: ${err.message}</div>`;

        // Visual feedback
        const originalText = loadButton.textContent;
        loadButton.textContent = 'Error!';
        setTimeout(() => {
          loadButton.textContent = originalText;
        }, 2000);
      }
    };

    reader.onerror = () => {
      console.error('Failed to read file');
      const originalText = loadButton.textContent;
      loadButton.textContent = 'Error!';
      setTimeout(() => {
        loadButton.textContent = originalText;
      }, 2000);
    };

    reader.readAsText(file);

    // Reset the input so the same file can be loaded again
    event.target.value = '';
  });

  console.log('JSON Music Codec - Ready!');
});