import { initialize as initializeInput, updateJSONDisplay } from './inputHandler.js';
import { initialize as initializeVisualizer, update as updateVisualizer, selectedTracks } from './visualizer.js';
import { init as initAudioVisualizer } from './audioVisualizer.js';
import { subscribe } from './state.js';
import { update as updateAudioEngine, play, stop } from './audioEngine.js';
import { generateAIPrompt } from './musicConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('JSON Music Codec - Initializing...');

  initializeVisualizer();
  
  // Initialize audio visualizer
  const audioCanvas = document.getElementById('audio-spectrum');
  if (audioCanvas) {
    initAudioVisualizer(audioCanvas);
  }

  subscribe((musicData) => {
    updateAudioEngine(musicData);
    updateVisualizer(musicData);
  });

  initializeInput();

  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  const copyButton = document.getElementById('copy-json');
  const copyAiButton = document.getElementById('copy-ai');
  const saveButton = document.getElementById('save-json');
  const loadButton = document.getElementById('load-json');
  const fileInput = document.getElementById('file-input');

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
    if (!file) return;
    
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