import { validate, formatErrorForDisplay } from './validationService.js';
import { update } from './state.js';
import { defaultMusicData } from './schemas.js';
import { selectedTracks } from './visualizer.js';
import { play, stop, applyTrackSelection, startLiveInput, stopLiveInput, getLiveInputStatus, startLiveInputRecording, stopLiveInputRecording, applyMasterEffectPreset } from './audioEngine.js';
import { initializeLiveChainBuilder, getLiveEffectChain } from './liveChainBuilder.js';
import { effectPresetUI } from './effectPresetUI.js';

let debounceTimer = null;
let jsonEditor = null;
let errorPanel = null;
let lineNumbers = null;
let fullMusicData = null;

export function initialize() {
  jsonEditor = document.getElementById('json-editor');
  errorPanel = document.getElementById('error-panel');
  lineNumbers = document.getElementById('line-numbers');

  jsonEditor.value = JSON.stringify(defaultMusicData, null, 2);
  fullMusicData = defaultMusicData;

  updateLineNumbers();
  handleInput();

  jsonEditor.addEventListener('input', () => {
    updateLineNumbers();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleInput, 300);
  });

  jsonEditor.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');

    try {
      const parsed = JSON.parse(pastedText);
      const formatted = JSON.stringify(parsed, null, 2);

      const start = jsonEditor.selectionStart;
      const end = jsonEditor.selectionEnd;
      const value = jsonEditor.value;

      jsonEditor.value = value.substring(0, start) + formatted + value.substring(end);

      const newCursorPos = start + formatted.length;
      jsonEditor.setSelectionRange(newCursorPos, newCursorPos);

      updateLineNumbers();
      handleInput();
    } catch (error) {
      document.execCommand('insertText', false, pastedText);
    }
  });

  jsonEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = jsonEditor.scrollTop;
  });

  // Initialize keyboard shortcuts
  initializeKeyboardShortcuts();

  // Initialize live input controls
  initializeLiveInput();

  // Initialize live chain builder
  initializeLiveChainBuilder();

  // Initialize effect preset UI
  effectPresetUI.initialize('effect-preset-container', (presetData) => {
    // Apply preset to master bus
    applyMasterEffectPreset(presetData);
  });

  // Start with "No Effect" preset
  effectPresetUI.selectPreset('no-effect');
}

function handleInput() {
  const jsonString = jsonEditor.value;
  const result = validate(jsonString);

  if (result.success) {
    errorPanel.innerHTML = '';
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = 'Valid JSON - Music updated';
    errorPanel.appendChild(successDiv);

    // If tracks are selected, merge the edited filtered data back into fullMusicData
    if (selectedTracks.size > 0 && fullMusicData) {
      const editedData = result.data;

      // Create a map of selected track indices to their new data
      const selectedTrackIndices = Array.from(selectedTracks).sort();
      const trackUpdates = new Map();

      editedData.tracks.forEach((track, i) => {
        if (i < selectedTrackIndices.length) {
          trackUpdates.set(selectedTrackIndices[i], track);
        }
      });

      // Update the full music data with changes
      fullMusicData = {
        ...fullMusicData,
        title: editedData.title,
        tempo: editedData.tempo,
        tracks: fullMusicData.tracks.map((track, index) => {
          return trackUpdates.has(index) ? trackUpdates.get(index) : track;
        })
      };

      // Update the state with merged data
      update(fullMusicData);
    } else {
      // Store the full music data
      fullMusicData = result.data;

      // Update the state with full data (not filtered)
      update(result.data);
    }
  } else {
    errorPanel.innerHTML = '';
    const errorElements = formatErrorForDisplay(result.error);
    errorElements.forEach(element => errorPanel.appendChild(element));
  }
}

function updateLineNumbers() {
  if (!lineNumbers) {return;}
  const lineCount = jsonEditor.value.split('\n').length;
  let numbers = '';
  for (let i = 1; i <= lineCount; i++) {
    numbers += i + '\n';
  }
  lineNumbers.textContent = numbers;
}

export function updateJSONDisplay() {
  if (!jsonEditor || !fullMusicData) {return;}

  let displayData;

  if (selectedTracks.size > 0) {
    // Create filtered data with only selected tracks
    displayData = {
      title: fullMusicData.title,
      tempo: fullMusicData.tempo,
      tracks: fullMusicData.tracks.filter((track, index) => selectedTracks.has(index))
    };
  } else {
    // Show full data when no tracks are selected
    displayData = fullMusicData;
  }

  // Update editor without triggering validation
  jsonEditor.value = JSON.stringify(displayData, null, 2);
  updateLineNumbers();
}

function initializeLiveInput() {
  const liveInputButton = document.getElementById('live-input-button');
  const modal = document.getElementById('live-input-modal');
  const startButton = document.getElementById('start-live-input');
  const stopButton = document.getElementById('stop-live-input');
  const recordButton = document.getElementById('record-live-input');
  const stopRecordButton = document.getElementById('stop-recording');
  const closeButton = document.getElementById('close-modal');
  const errorDiv = document.getElementById('permission-error');
  const latencyInfo = document.getElementById('latency-info');
  const latencyValue = document.getElementById('latency-value');

  // Open modal when live input button is clicked
  liveInputButton.addEventListener('click', () => {
    modal.style.display = 'block';
    updateLiveInputUI();
  });

  // Close modal
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Start live input
  startButton.addEventListener('click', async () => {
    try {
      errorDiv.style.display = 'none';

      const config = {
        monitor: document.getElementById('live-monitor').checked,
        echoCancellation: document.getElementById('echo-cancel').checked,
        noiseSuppression: document.getElementById('noise-suppress').checked,
        effects: getLiveEffectChain() // Get effects from chain builder
      };

      const result = await startLiveInput(config);

      if (result && result.success) {
        latencyValue.textContent = result.latency;
        latencyInfo.style.display = 'block';
        updateLiveInputUI();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('liveInputStatusChanged', {
          detail: { active: true }
        }));
      }
    } catch (error) {
      errorDiv.textContent = 'Microphone access denied or unavailable: ' + error.message;
      errorDiv.style.display = 'block';
    }
  });

  // Stop live input
  stopButton.addEventListener('click', async () => {
    await stopLiveInput();
    latencyInfo.style.display = 'none';
    updateLiveInputUI();
  });

  // Start recording
  recordButton.addEventListener('click', async () => {
    const result = await startLiveInputRecording();
    if (result) {
      recordButton.style.display = 'none';
      stopRecordButton.style.display = 'inline-block';
    }
  });

  // Stop recording and add to tracks
  stopRecordButton.addEventListener('click', async () => {
    const recording = await stopLiveInputRecording();
    if (recording && recording.buffer) {
      // Create a new track with the recorded audio
      const newTrack = {
        name: `Live Recording ${new Date().toLocaleTimeString()}`,
        instrument: 'sampler',
        buffer: recording.buffer,
        notes: [{ time: 0, duration: recording.duration, value: 'C4', volume: 0.7 }]
      };

      // Add to current music data
      if (fullMusicData) {
        fullMusicData.tracks.push(newTrack);
        jsonEditor.value = JSON.stringify(fullMusicData, null, 2);
        updateLineNumbers();
        handleInput();
      }

      recordButton.style.display = 'inline-block';
      stopRecordButton.style.display = 'none';
    }
  });

  function updateLiveInputUI() {
    const status = getLiveInputStatus();

    if (status.active) {
      startButton.style.display = 'none';
      stopButton.style.display = 'inline-block';
      recordButton.style.display = status.recording ? 'none' : 'inline-block';
      stopRecordButton.style.display = status.recording ? 'inline-block' : 'none';
      liveInputButton.textContent = '🔴 Live Input Active';
      liveInputButton.style.color = '#ff4444';
    } else {
      startButton.style.display = 'inline-block';
      stopButton.style.display = 'none';
      recordButton.style.display = 'none';
      stopRecordButton.style.display = 'none';
      liveInputButton.textContent = '🎤 Live Input';
      liveInputButton.style.color = '';
    }
  }
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't handle shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Play/Stop controls
    if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const playButton = document.getElementById('play-button');
      const stopButton = document.getElementById('stop-button');

      // Toggle play/stop
      if (playButton && stopButton) {
        if (document.querySelector('.is-playing')) {
          stop();
          document.body.classList.remove('is-playing');
        } else {
          play();
          document.body.classList.add('is-playing');
        }
      }
    }

    // Solo track (S key + number)
    if (e.key === 's' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const nextKey = prompt('Enter track number to solo (1-9):');
      if (nextKey && /^[1-9]$/.test(nextKey)) {
        const trackIndex = parseInt(nextKey) - 1;
        if (fullMusicData && trackIndex < fullMusicData.tracks.length) {
          // Clear all selections and select only this track
          selectedTracks.clear();
          selectedTracks.add(trackIndex);
          applyTrackSelection(selectedTracks);
          updateJSONDisplay();

          // Update visual selection
          document.querySelectorAll('.track-selected').forEach(el => {
            el.classList.remove('track-selected');
          });
          const trackGroup = document.querySelector(`.track[data-track-index="${trackIndex}"]`);
          if (trackGroup) {
            trackGroup.classList.add('track-selected');
          }
        }
      }
    }

    // Mute track (M key + number)
    if (e.key === 'm' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const nextKey = prompt('Enter track number to mute/unmute (1-9):');
      if (nextKey && /^[1-9]$/.test(nextKey)) {
        const trackIndex = parseInt(nextKey) - 1;
        if (fullMusicData && trackIndex < fullMusicData.tracks.length) {
          // Toggle track in selection
          if (selectedTracks.has(trackIndex)) {
            selectedTracks.delete(trackIndex);
          } else {
            selectedTracks.add(trackIndex);
          }
          applyTrackSelection(selectedTracks);
          updateJSONDisplay();

          // Update visual selection
          const trackGroup = document.querySelector(`.track[data-track-index="${trackIndex}"]`);
          if (trackGroup) {
            if (selectedTracks.has(trackIndex)) {
              trackGroup.classList.add('track-selected');
            } else {
              trackGroup.classList.remove('track-selected');
            }
          }
        }
      }
    }

    // Clear all selections (C key)
    if (e.key === 'c' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      selectedTracks.clear();
      applyTrackSelection(selectedTracks);
      updateJSONDisplay();

      // Clear visual selections
      document.querySelectorAll('.track-selected').forEach(el => {
        el.classList.remove('track-selected');
      });
    }

    // Effect presets (E key)
    if (e.key === 'e' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      // Show effect preset menu
      showEffectPresetMenu();
    }

    // Show keyboard shortcuts help (? or H key)
    if ((e.key === '?' || e.key === 'h') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      showKeyboardShortcutsHelp();
    }
  });
}

// Show keyboard shortcuts help
function showKeyboardShortcutsHelp() {
  const helpText = `
Keyboard Shortcuts:

Space - Play/Stop
S + [1-9] - Solo track
M + [1-9] - Mute/Unmute track
C - Clear all selections
E - Effect presets menu
? or H - Show this help

Track numbers correspond to their order in the JSON.
  `.trim();

  alert(helpText);
}

// Show effect preset menu
function showEffectPresetMenu() {
  // Open the preset dropdown menu
  const presetButton = document.getElementById('preset-dropdown-btn');
  if (presetButton) {
    presetButton.click();
  }
}