import { validate, formatErrorForDisplay } from './validationService.js';
import { update } from './state.js';
import { defaultMusicData } from './schemas.js';

let debounceTimer = null;
let jsonEditor = null;
let errorPanel = null;
let lineNumbers = null;

export function initialize() {
  jsonEditor = document.getElementById('json-editor');
  errorPanel = document.getElementById('error-panel');
  lineNumbers = document.getElementById('line-numbers');

  jsonEditor.value = JSON.stringify(defaultMusicData, null, 2);

  updateLineNumbers();
  handleInput();

  jsonEditor.addEventListener('input', () => {
    updateLineNumbers();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleInput, 300);
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

    update(result.data);
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