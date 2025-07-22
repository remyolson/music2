import { updateLiveInputEffects } from './audioEngine.js';
import { availableEffectTypes, effectDescriptions } from './musicConfig.js';

let effectChain = [];
let isDragging = false;
let draggedElement = null;

export function initializeLiveChainBuilder() {
  const chainContainer = document.getElementById('live-effect-chain');
  const addButton = document.getElementById('add-effect-btn');
  const builderContainer = document.getElementById('live-chain-builder');

  // Show/hide chain builder based on live input status
  window.addEventListener('liveInputStatusChanged', (event) => {
    if (event.detail.active) {
      builderContainer.style.display = 'block';
    }
  });

  // Add effect button
  addButton.addEventListener('click', showEffectSelector);

  // Initialize drag and drop
  chainContainer.addEventListener('dragover', handleDragOver);
  chainContainer.addEventListener('drop', handleDrop);

  // Load saved chain if exists
  const savedChain = localStorage.getItem('liveEffectChain');
  if (savedChain) {
    try {
      effectChain = JSON.parse(savedChain);
      renderChain();
    } catch (e) {
      console.error('Failed to load saved effect chain:', e);
    }
  }
}

function showEffectSelector() {
  const selector = document.createElement('div');
  selector.className = 'effect-selector-modal';
  selector.innerHTML = `
    <div class="effect-selector-content">
      <h4>Select Effect</h4>
      <div class="effect-list">
        ${Object.entries(effectDescriptions).map(([type, desc]) => `
          <div class="effect-option" data-effect="${type}">
            <strong>${desc.name}</strong>
            <small>${desc.description}</small>
          </div>
        `).join('')}
      </div>
      <button class="close-selector">Cancel</button>
    </div>
  `;

  document.body.appendChild(selector);

  // Handle effect selection
  selector.querySelectorAll('.effect-option').forEach(option => {
    option.addEventListener('click', () => {
      const effectType = option.dataset.effect;
      addEffect(effectType);
      document.body.removeChild(selector);
    });
  });

  // Close button
  selector.querySelector('.close-selector').addEventListener('click', () => {
    document.body.removeChild(selector);
  });

  // Close on outside click
  selector.addEventListener('click', (e) => {
    if (e.target === selector) {
      document.body.removeChild(selector);
    }
  });
}

function addEffect(type) {
  const effect = {
    id: Date.now(),
    type: type,
    mix: 0.5,
    params: getDefaultParams(type)
  };

  effectChain.push(effect);
  renderChain();
  updateEffects();
}

function getDefaultParams(type) {
  const defaults = {
    reverb: { decay: 4.0, preDelay: 0.03 },
    delay: { delayTime: 0.25, feedback: 0.3 },
    distortion: { distortion: 0.4 },
    chorus: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
    phaser: { frequency: 0.5, octaves: 3, baseFrequency: 350 },
    filter: { frequency: 1, depth: 1 },
    echo: { delayTime: 0.125, feedback: 0.5 },
    tremolo: { frequency: 10, depth: 0.5 },
    bitcrush: { bits: 4 },
    wah: { baseFrequency: 100, octaves: 6, sensitivity: 0 },
    pitchShift: { pitch: 0, windowSize: 0.1 },
    harmonizer: { intervals: [3, 7, 12] },
    freezeReverb: { decay: 60, feedback: 0.95 }
  };

  return defaults[type] || {};
}

function renderChain() {
  const container = document.getElementById('live-effect-chain');
  container.innerHTML = '';

  effectChain.forEach((effect, index) => {
    const effectEl = createEffectElement(effect, index);
    container.appendChild(effectEl);
  });

  // Save to localStorage
  localStorage.setItem('liveEffectChain', JSON.stringify(effectChain));
}

function createEffectElement(effect, index) {
  const div = document.createElement('div');
  div.className = 'effect-item';
  div.draggable = true;
  div.dataset.index = index;

  const desc = effectDescriptions[effect.type] || { name: effect.type };

  div.innerHTML = `
    <div class="effect-header">
      <span class="effect-handle">≡</span>
      <span class="effect-name">${desc.name}</span>
      <button class="remove-effect" data-index="${index}">×</button>
    </div>
    <div class="effect-controls">
      <label>
        Mix: <input type="range" class="mix-control" min="0" max="100" value="${effect.mix * 100}" data-index="${index}">
        <span>${Math.round(effect.mix * 100)}%</span>
      </label>
      ${getEffectControls(effect, index)}
    </div>
  `;

  // Remove button
  div.querySelector('.remove-effect').addEventListener('click', () => {
    removeEffect(index);
  });

  // Mix control
  const mixControl = div.querySelector('.mix-control');
  mixControl.addEventListener('input', (e) => {
    effect.mix = e.target.value / 100;
    e.target.nextElementSibling.textContent = `${e.target.value}%`;
    updateEffects();
  });

  // Drag handlers
  div.addEventListener('dragstart', handleDragStart);
  div.addEventListener('dragend', handleDragEnd);

  return div;
}

function getEffectControls(effect, index) {
  switch (effect.type) {
    case 'harmonizer':
      return `
        <label>
          Intervals: 
          <select class="preset-control" data-index="${index}">
            <option value="maj3">Major 3rd</option>
            <option value="min3">Minor 3rd</option>
            <option value="fifth">5th</option>
            <option value="octave">Octave</option>
            <option value="power">Power</option>
            <option value="bon_iver">Bon Iver</option>
          </select>
        </label>
      `;

    case 'pitchShift':
      return `
        <label>
          Pitch: 
          <input type="range" class="pitch-control" min="-24" max="24" value="${effect.params.pitch || 0}" data-index="${index}">
          <span>${effect.params.pitch || 0} st</span>
        </label>
      `;

    case 'delay':
    case 'echo':
      return `
        <label>
          Time: 
          <input type="range" class="time-control" min="0" max="1000" value="${(effect.params.delayTime || 0.25) * 1000}" data-index="${index}">
          <span>${Math.round((effect.params.delayTime || 0.25) * 1000)} ms</span>
        </label>
      `;

    default:
      return '';
  }
}

function removeEffect(index) {
  effectChain.splice(index, 1);
  renderChain();
  updateEffects();
}

function updateEffects() {
  // Send updated chain to audio engine
  updateLiveInputEffects(effectChain);

  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('liveEffectChainUpdated', {
    detail: { chain: effectChain }
  }));
}

// Drag and drop handlers
function handleDragStart(e) {
  isDragging = true;
  draggedElement = e.target;
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  isDragging = false;
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  if (!isDragging) {return;}
  e.preventDefault();

  const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
  if (afterElement == null) {
    e.currentTarget.appendChild(draggedElement);
  } else {
    e.currentTarget.insertBefore(draggedElement, afterElement);
  }
}

function handleDrop(e) {
  e.preventDefault();

  // Reorder the effect chain based on new DOM order
  const items = Array.from(document.querySelectorAll('.effect-item'));
  const newChain = [];

  items.forEach(item => {
    const oldIndex = parseInt(item.dataset.index);
    newChain.push(effectChain[oldIndex]);
  });

  effectChain = newChain;
  renderChain();
  updateEffects();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.effect-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Event listeners for special controls
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('preset-control')) {
    const index = parseInt(e.target.dataset.index);
    const preset = e.target.value;

    // Apply harmonizer preset
    const presets = {
      maj3: [4, 7, 12],
      min3: [3, 7, 12],
      fifth: [7, 12, 19],
      octave: [12, -12],
      power: [7, 12],
      bon_iver: [3, 7, 10, 15]
    };

    if (effectChain[index] && presets[preset]) {
      effectChain[index].intervals = presets[preset];
      updateEffects();
    }
  }
});

document.addEventListener('input', (e) => {
  if (e.target.classList.contains('pitch-control')) {
    const index = parseInt(e.target.dataset.index);
    const value = parseInt(e.target.value);

    if (effectChain[index]) {
      effectChain[index].params.pitch = value;
      e.target.nextElementSibling.textContent = `${value} st`;
      updateEffects();
    }
  }

  if (e.target.classList.contains('time-control')) {
    const index = parseInt(e.target.dataset.index);
    const value = parseFloat(e.target.value) / 1000;

    if (effectChain[index]) {
      effectChain[index].params.delayTime = value;
      e.target.nextElementSibling.textContent = `${Math.round(value * 1000)} ms`;
      updateEffects();
    }
  }
});

export function getLiveEffectChain() {
  return effectChain;
}