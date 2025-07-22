import { validate, formatErrorForDisplay } from './validationService.js';
import { update } from './state.js';
import { defaultMusicData } from './schemas.js';
import { selectedTracks } from './visualizer.js';

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
  if (!lineNumbers) return;
  const lineCount = jsonEditor.value.split('\n').length;
  let numbers = '';
  for (let i = 1; i <= lineCount; i++) {
    numbers += i + '\n';
  }
  lineNumbers.textContent = numbers;
}

export function updateJSONDisplay() {
  if (!jsonEditor || !fullMusicData) return;

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