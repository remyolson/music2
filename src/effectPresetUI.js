// Effect Preset UI Component
import { effectPresets, getPresetCategories, applyEffectPreset, getAllPresets } from './effectPresets.js';

export class EffectPresetUI {
  constructor() {
    this.presetDropdown = null;
    this.presetMenu = null;
    this.selectedPreset = null;
    this.onPresetSelect = null;
  }

  initialize(containerId, onPresetSelect) {
    this.onPresetSelect = onPresetSelect;

    const container = document.getElementById(containerId);
    if (!container) {return;}

    // Create preset dropdown button
    this.presetDropdown = document.createElement('div');
    this.presetDropdown.className = 'effect-preset-dropdown';
    this.presetDropdown.innerHTML = `
      <button class="preset-button" id="preset-dropdown-btn">
        <span class="preset-icon">🎵</span>
        <span class="preset-label">Effect Presets</span>
        <span class="preset-arrow">▼</span>
      </button>
    `;

    // Create preset menu
    this.presetMenu = document.createElement('div');
    this.presetMenu.className = 'preset-menu';
    this.presetMenu.style.display = 'none';

    this.buildPresetMenu();

    // Add to container
    container.appendChild(this.presetDropdown);
    container.appendChild(this.presetMenu);

    // Setup event listeners
    this.setupEventListeners();
  }

  buildPresetMenu() {
    const categories = getPresetCategories();
    let menuHTML = '';

    // Add categories
    for (const [category, presetIds] of Object.entries(categories)) {
      menuHTML += '<div class="preset-category">';
      menuHTML += `<div class="preset-category-header">${category}</div>`;

      presetIds.forEach(presetId => {
        const preset = effectPresets[presetId];
        if (preset) {
          menuHTML += `
            <div class="preset-item" data-preset-id="${presetId}">
              <div class="preset-name">${preset.name}</div>
              <div class="preset-description">${preset.description}</div>
            </div>
          `;
        }
      });

      menuHTML += '</div>';
    }

    // Add custom presets section
    menuHTML += `
      <div class="preset-category">
        <div class="preset-category-header">Custom Presets</div>
        <div id="custom-presets-list"></div>
        <button class="preset-save-btn" id="save-current-preset">Save Current Effects</button>
      </div>
    `;

    this.presetMenu.innerHTML = menuHTML;
  }

  setupEventListeners() {
    const dropdownBtn = document.getElementById('preset-dropdown-btn');

    // Toggle menu
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.presetMenu.contains(e.target) && !this.presetDropdown.contains(e.target)) {
        this.closeMenu();
      }
    });

    // Handle preset selection
    this.presetMenu.addEventListener('click', (e) => {
      const presetItem = e.target.closest('.preset-item');
      if (presetItem) {
        const presetId = presetItem.dataset.presetId;
        this.selectPreset(presetId);
      }
    });

    // Save custom preset
    const saveBtn = document.getElementById('save-current-preset');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveCurrentEffects();
      });
    }
  }

  toggleMenu() {
    if (this.presetMenu.style.display === 'none') {
      this.openMenu();
    } else {
      this.closeMenu();
    }
  }

  openMenu() {
    this.presetMenu.style.display = 'block';

    // Position menu below dropdown
    const rect = this.presetDropdown.getBoundingClientRect();
    this.presetMenu.style.top = `${rect.bottom + 5}px`;
    this.presetMenu.style.left = `${rect.left}px`;
  }

  closeMenu() {
    this.presetMenu.style.display = 'none';
  }

  selectPreset(presetId) {
    this.selectedPreset = presetId;

    // Update button label
    const preset = effectPresets[presetId] || getAllPresets()[presetId];
    if (preset) {
      const label = this.presetDropdown.querySelector('.preset-label');
      label.textContent = preset.name;
    }

    // Apply preset
    if (this.onPresetSelect) {
      const presetData = applyEffectPreset(presetId);
      this.onPresetSelect(presetData);
    }

    this.closeMenu();
  }

  saveCurrentEffects() {
    const name = prompt('Enter a name for this preset:');
    if (!name) {return;}

    // Get current effects from the active track or global effects
    // This would need to be implemented based on your current effect chain
    console.log('Saving preset:', name);

    // Refresh menu to show new custom preset
    this.buildPresetMenu();
  }

  reset() {
    this.selectedPreset = null;
    const label = this.presetDropdown.querySelector('.preset-label');
    label.textContent = 'Effect Presets';
  }
}

// Create global instance
export const effectPresetUI = new EffectPresetUI();