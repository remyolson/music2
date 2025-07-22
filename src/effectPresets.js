// Effect Presets with Bon Iver-style chains
export const effectPresets = {
  // No effect preset
  'no-effect': {
    name: 'No Effect',
    description: 'Clean, unprocessed audio',
    effects: []
  },

  // Bon Iver-inspired presets
  'bon-iver-classic': {
    name: 'Bon Iver Classic',
    description: 'Harmonizer with vocoder-style processing',
    effects: [
      {
        type: 'harmonizer',
        params: {
          intervals: [3, 7, 10, 15], // Minor 3rd, 5th, minor 7th, minor 10th
          mix: 0.4
        }
      },
      {
        type: 'reverb',
        params: {
          decay: 3.0,
          preDelay: 0.03,
          wet: 0.25
        }
      }
    ]
  },

  'woods': {
    name: 'Woods',
    description: 'Deep forest ambience with pitch shifting',
    effects: [
      {
        type: 'pitchShift',
        params: {
          pitch: 12,
          windowSize: 0.1,
          wet: 0.2
        }
      },
      {
        type: 'freezeReverb',
        params: {
          decay: 5,
          wet: 0.3
        }
      },
      {
        type: 'delay',
        params: {
          delayTime: 0.375,
          feedback: 0.3,
          wet: 0.2
        }
      }
    ]
  },

  'holocene': {
    name: 'Holocene',
    description: 'Ethereal harmonies with subtle modulation',
    effects: [
      {
        type: 'harmonizer',
        params: {
          intervals: [7, 12], // 5th and octave
          mix: 0.3
        }
      },
      {
        type: 'chorus',
        params: {
          frequency: 0.5,
          delayTime: 4,
          depth: 0.3,
          wet: 0.2
        }
      },
      {
        type: 'reverb',
        params: {
          decay: 4.0,
          wet: 0.2
        }
      }
    ]
  },

  'creeks': {
    name: 'Creeks',
    description: 'Flowing water-like modulation',
    effects: [
      {
        type: 'phaser',
        params: {
          frequency: 0.3,
          octaves: 2,
          baseFrequency: 400,
          wet: 0.3
        }
      },
      {
        type: 'tremolo',
        params: {
          frequency: 4,
          depth: 0.3,
          wet: 0.3
        }
      },
      {
        type: 'echo',
        params: {
          delayTime: 0.0625,
          feedback: 0.4,
          wet: 0.3
        }
      }
    ]
  },

  'skinny-love': {
    name: 'Skinny Love',
    description: 'Intimate vocals with warm harmonies',
    effects: [
      {
        type: 'harmonizer',
        params: {
          intervals: [3, 5, 7], // Minor 3rd, 4th, 5th
          mix: 0.3
        }
      },
      {
        type: 'filter',
        params: {
          frequency: 0.5,
          depth: 0.5,
          wet: 0.2
        }
      },
      {
        type: 'reverb',
        params: {
          decay: 3.0,
          wet: 0.25
        }
      }
    ]
  },

  'michicant': {
    name: 'Michicant',
    description: 'Glitchy, chopped vocals',
    effects: [
      {
        type: 'bitcrush',
        params: {
          bits: 6,
          wet: 0.2
        }
      },
      {
        type: 'delay',
        params: {
          delayTime: 0.0625,
          feedback: 0.4,
          wet: 0.3
        }
      },
      {
        type: 'harmonizer',
        params: {
          intervals: [-12, 7], // Octave down and 5th
          mix: 0.3
        }
      }
    ]
  },

  // Standard vocal presets
  'radio-ready': {
    name: 'Radio Ready',
    description: 'Polished vocal with compression and brightness',
    effects: [
      {
        type: 'reverb',
        params: {
          decay: 2.5,
          wet: 0.2
        }
      },
      {
        type: 'delay',
        params: {
          delayTime: 0.125,
          feedback: 0.2,
          wet: 0.15
        }
      }
    ]
  },

  'dream-pop': {
    name: 'Dream Pop',
    description: 'Ethereal, floating vocals',
    effects: [
      {
        type: 'chorus',
        params: {
          frequency: 2,
          delayTime: 5,
          depth: 0.7,
          wet: 0.5
        }
      },
      {
        type: 'reverb',
        params: {
          decay: 8.0,
          wet: 0.5
        }
      },
      {
        type: 'echo',
        params: {
          delayTime: 0.25,
          feedback: 0.4,
          wet: 0.3
        }
      }
    ]
  },

  'lofi-bedroom': {
    name: 'Lo-Fi Bedroom',
    description: 'Warm, intimate sound',
    effects: [
      {
        type: 'bitcrush',
        params: {
          bits: 8,
          wet: 0.15
        }
      },
      {
        type: 'wah',
        params: {
          baseFrequency: 200,
          octaves: 3,
          sensitivity: -0.5,
          wet: 0.2
        }
      },
      {
        type: 'reverb',
        params: {
          decay: 1.5,
          wet: 0.3
        }
      }
    ]
  },

  'cathedral': {
    name: 'Cathedral',
    description: 'Massive reverberant space',
    effects: [
      {
        type: 'freezeReverb',
        params: {
          decay: 10,
          wet: 0.6
        }
      },
      {
        type: 'harmonizer',
        params: {
          intervals: [7, 12, 19], // 5th, octave, octave+5th
          mix: 0.2
        }
      }
    ]
  }
};

// Apply preset to a track or globally
export function applyEffectPreset(presetId, trackName = null) {
  const preset = effectPresets[presetId];
  if (!preset) {return null;}

  return {
    name: preset.name,
    effects: preset.effects.map(effect => ({
      ...effect,
      // Deep clone to avoid modifying original preset
      params: { ...effect.params }
    }))
  };
}

// Get preset categories
export function getPresetCategories() {
  return {
    'Basic': ['no-effect'],
    'Bon Iver Style': ['bon-iver-classic', 'woods', 'holocene', 'creeks', 'skinny-love', 'michicant'],
    'Vocal Effects': ['radio-ready', 'dream-pop', 'lofi-bedroom', 'cathedral']
  };
}

// Save custom preset
let customPresets = {};

export function saveCustomPreset(name, effects) {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  customPresets[id] = {
    name,
    description: 'Custom preset',
    effects
  };

  // Save to localStorage
  try {
    localStorage.setItem('customEffectPresets', JSON.stringify(customPresets));
  } catch (e) {
    console.warn('Failed to save custom preset:', e);
  }

  return id;
}

// Load custom presets
export function loadCustomPresets() {
  try {
    const saved = localStorage.getItem('customEffectPresets');
    if (saved) {
      customPresets = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load custom presets:', e);
  }
  return customPresets;
}

// Get all presets including custom ones
export function getAllPresets() {
  return {
    ...effectPresets,
    ...customPresets
  };
}