// Enhanced visualizer components for waveform, formant, and effect chain visualization
import * as Tone from 'tone';

export class WaveformVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.analyser = null;
    this.animationId = null;
    this.dataArray = null;
    this.isActive = false;
  }

  initialize() {
    if (!this.container) {return;}

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'waveform-canvas';
    this.canvas.width = this.container.clientWidth || 300;
    this.canvas.height = this.container.clientHeight || 60;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Create analyser
    this.analyser = new Tone.Analyser('waveform', 2048);
    Tone.Destination.connect(this.analyser);

    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.clientWidth || 300;
      this.canvas.height = this.container.clientHeight || 60;
    }
  }

  start() {
    if (this.isActive) {return;}
    this.isActive = true;
    this.draw();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  draw() {
    if (!this.isActive) {return;}

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Get waveform data
    const waveform = this.analyser.getValue();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw waveform
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 2;

    const sliceWidth = width / waveform.length;
    let x = 0;

    for (let i = 0; i < waveform.length; i++) {
      const y = (1 + waveform[i]) * height / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.stroke();

    // Draw center line
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#404040';
    this.ctx.lineWidth = 1;
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
  }

  cleanup() {
    this.stop();
    if (this.analyser) {
      this.analyser.dispose();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

export class FormantVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.analyser = null;
    this.animationId = null;
    this.isActive = false;
    this.formantFrequencies = [700, 1220, 2600, 3200, 4400]; // F1-F5
  }

  initialize() {
    if (!this.container) {return;}

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'formant-canvas';
    this.canvas.width = this.container.clientWidth || 300;
    this.canvas.height = this.container.clientHeight || 60;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Create FFT analyser
    this.analyser = new Tone.Analyser('fft', 2048);
    Tone.Destination.connect(this.analyser);

    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.clientWidth || 300;
      this.canvas.height = this.container.clientHeight || 60;
    }
  }

  start() {
    if (this.isActive) {return;}
    this.isActive = true;
    this.draw();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  draw() {
    if (!this.isActive) {return;}

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Get FFT data
    const fftData = this.analyser.getValue();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw frequency spectrum
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#0088ff';
    this.ctx.lineWidth = 1;

    const binCount = fftData.length;
    const binWidth = width / binCount;

    for (let i = 0; i < binCount; i++) {
      const value = fftData[i];
      const dbValue = Math.max(-100, value); // Clamp to -100 dB
      const normalizedValue = (dbValue + 100) / 100; // Normalize 0-1
      const barHeight = normalizedValue * height;

      const x = i * binWidth;
      const y = height - barHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Highlight formant frequencies
    const nyquist = Tone.context.sampleRate / 2;
    this.formantFrequencies.forEach((freq, index) => {
      const binIndex = Math.floor((freq / nyquist) * binCount);
      const x = binIndex * binWidth;

      // Draw formant marker
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#ff00ff';
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();

      // Draw formant label
      this.ctx.fillStyle = '#ff00ff';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(`F${index + 1}`, x + 2, 12);
    });

    // Draw frequency labels
    this.ctx.fillStyle = '#606060';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('0 Hz', 2, height - 2);
    this.ctx.fillText(`${Math.floor(nyquist)} Hz`, width - 40, height - 2);
  }

  cleanup() {
    this.stop();
    if (this.analyser) {
      this.analyser.dispose();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

export class EffectChainVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.effectChains = new Map();
    this.draggedEffect = null;
  }

  initialize() {
    if (!this.container) {return;}

    // Create effect chain container
    const chainContainer = document.createElement('div');
    chainContainer.className = 'effect-chain-container';
    this.container.appendChild(chainContainer);

    // Enable drag and drop
    this.setupDragAndDrop();
  }

  updateEffectChains(instruments) {
    if (!this.container) {return;}

    this.effectChains.clear();
    const chainContainer = this.container.querySelector('.effect-chain-container');
    if (!chainContainer) {return;}

    chainContainer.innerHTML = '';

    instruments.forEach((instrumentData, trackName) => {
      const { effectChain } = instrumentData;
      if (!effectChain || effectChain.length === 0) {return;}

      // Create track effect chain visualization
      const trackChain = document.createElement('div');
      trackChain.className = 'track-effect-chain';
      trackChain.dataset.trackName = trackName;

      // Track label
      const trackLabel = document.createElement('div');
      trackLabel.className = 'track-label';
      trackLabel.textContent = trackName;
      trackChain.appendChild(trackLabel);

      // Effect nodes
      const effectsContainer = document.createElement('div');
      effectsContainer.className = 'effects-container';

      effectChain.forEach((effect, index) => {
        const effectNode = this.createEffectNode(effect, index, trackName);
        effectsContainer.appendChild(effectNode);
      });

      trackChain.appendChild(effectsContainer);
      chainContainer.appendChild(trackChain);

      this.effectChains.set(trackName, effectChain);
    });
  }

  createEffectNode(effect, index, trackName) {
    const node = document.createElement('div');
    node.className = 'effect-node';
    node.draggable = true;
    node.dataset.effectIndex = index;
    node.dataset.trackName = trackName;

    // Effect name
    const effectName = effect.constructor.name.replace('Tone', '');
    node.textContent = effectName;

    // Effect parameters
    if (effect.wet) {
      const wetValue = document.createElement('div');
      wetValue.className = 'effect-param';
      wetValue.textContent = `${Math.round(effect.wet.value * 100)}%`;
      node.appendChild(wetValue);
    }

    // Drag events
    node.addEventListener('dragstart', (e) => this.handleDragStart(e));
    node.addEventListener('dragend', (e) => this.handleDragEnd(e));

    return node;
  }

  setupDragAndDrop() {
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleDrop(e);
    });
  }

  handleDragStart(e) {
    this.draggedEffect = {
      trackName: e.target.dataset.trackName,
      effectIndex: parseInt(e.target.dataset.effectIndex)
    };
    e.target.classList.add('dragging');
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedEffect = null;
  }

  handleDrop(e) {
    if (!this.draggedEffect) {return;}

    const dropTarget = e.target.closest('.effect-node');
    if (!dropTarget) {return;}

    const targetTrackName = dropTarget.dataset.trackName;
    const targetIndex = parseInt(dropTarget.dataset.effectIndex);

    if (targetTrackName === this.draggedEffect.trackName) {
      // Reorder within same track
      this.reorderEffects(
        targetTrackName,
        this.draggedEffect.effectIndex,
        targetIndex
      );
    }
  }

  reorderEffects(trackName, fromIndex, toIndex) {
    const effectChain = this.effectChains.get(trackName);
    if (!effectChain) {return;}

    // Reorder the effects
    const [movedEffect] = effectChain.splice(fromIndex, 1);
    effectChain.splice(toIndex, 0, movedEffect);

    // Trigger effect chain update in audio engine
    if (window.reorderTrackEffects) {
      window.reorderTrackEffects(trackName, effectChain);
    }

    // Update visualization
    this.updateEffectChains(window.getInstruments());
  }

  cleanup() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Spectrum Analyzer for real-time frequency visualization
export class SpectrumAnalyzer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.analyser = null;
    this.animationId = null;
    this.isActive = false;
    this.barCount = 64;
  }

  initialize() {
    if (!this.container) {return;}

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'spectrum-canvas';
    this.canvas.width = this.container.clientWidth || 300;
    this.canvas.height = this.container.clientHeight || 60;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Create FFT analyser with smoothing
    this.analyser = new Tone.Analyser('fft', 1024);
    this.analyser.smoothing = 0.8;
    Tone.Destination.connect(this.analyser);

    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.clientWidth || 300;
      this.canvas.height = this.container.clientHeight || 60;
    }
  }

  start() {
    if (this.isActive) {return;}
    this.isActive = true;
    this.draw();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  draw() {
    if (!this.isActive) {return;}

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Get FFT data
    const fftData = this.analyser.getValue();

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Draw spectrum bars
    const barWidth = width / this.barCount;
    const barSpacing = 2;

    for (let i = 0; i < this.barCount; i++) {
      const binIndex = Math.floor((i / this.barCount) * fftData.length);
      const value = fftData[binIndex];
      const dbValue = Math.max(-80, value); // Clamp to -80 dB
      const normalizedValue = (dbValue + 80) / 80; // Normalize 0-1
      const barHeight = normalizedValue * height * 0.9;

      const x = i * barWidth + barSpacing / 2;
      const y = height - barHeight;

      // Create gradient
      const gradient = this.ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, '#00ff88');
      gradient.addColorStop(0.5, '#0088ff');
      gradient.addColorStop(1, '#004488');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, barWidth - barSpacing, barHeight);
    }
  }

  cleanup() {
    this.stop();
    if (this.analyser) {
      this.analyser.dispose();
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

export class HarmonyVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isActive = false;
    this.harmonies = [];
    this.activeNotes = new Map(); // Track active notes and their harmonies
  }

  initialize() {
    if (!this.container) {return;}

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'harmony-canvas';
    this.canvas.width = this.container.clientWidth || 300;
    this.canvas.height = this.container.clientHeight || 60;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');

    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (this.canvas && this.container) {
      this.canvas.width = this.container.clientWidth || 300;
      this.canvas.height = this.container.clientHeight || 60;
    }
  }

  start() {
    if (this.isActive) {return;}
    this.isActive = true;
    this.draw();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  // Update harmony data from playing notes
  updateHarmonies(noteData) {
    if (!noteData) {return;}

    const { trackName, note, time } = noteData;
    const key = `${trackName}-${time}`;

    if (note.harmonize && note.harmonize.length > 0) {
      this.activeNotes.set(key, {
        rootNote: note.value,
        intervals: note.harmonize,
        mix: note.harmonizeMix || 0.5,
        levels: note.harmonizeLevels || [],
        startTime: Date.now(),
        duration: note.duration * 1000, // Convert to ms
        trackName
      });
    }

    // Clean up expired notes
    const now = Date.now();
    for (const [k, v] of this.activeNotes) {
      if (now - v.startTime > v.duration) {
        this.activeNotes.delete(k);
      }
    }
  }

  draw() {
    if (!this.isActive) {return;}

    this.animationId = requestAnimationFrame(() => this.draw());

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    if (this.activeNotes.size === 0) {
      // Draw placeholder when no harmonies active
      this.ctx.fillStyle = '#404040';
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('No active harmonies', width / 2, height / 2);
      this.ctx.textAlign = 'left';
      return;
    }

    // Draw harmony visualization
    let y = 40;
    const noteHeight = 30;
    const now = Date.now();

    for (const [key, harmony] of this.activeNotes) {
      // Calculate fade based on note duration
      const elapsed = now - harmony.startTime;
      const progress = elapsed / harmony.duration;
      const opacity = Math.max(0, 1 - progress);

      // Draw track name
      this.ctx.fillStyle = `rgba(153, 153, 153, ${opacity})`;
      this.ctx.font = '10px Arial';
      this.ctx.fillText(harmony.trackName, 10, y - 5);

      // Draw root note
      this.drawHarmonyNote(20, y, 'Root', 0, opacity, 1.0);

      // Draw harmony intervals
      let x = 100;
      harmony.intervals.forEach((interval, index) => {
        const level = harmony.levels[index] || 0.5;
        this.drawHarmonyNote(x, y, this.getIntervalName(interval), interval, opacity * harmony.mix, level);
        x += 80;
      });

      y += noteHeight + 10;

      // Stop drawing if we run out of space
      if (y > height - noteHeight) {break;}
    }
  }

  drawHarmonyNote(x, y, label, interval, opacity, level) {
    const width = 70;
    const height = 25;

    // Note background
    this.ctx.fillStyle = `rgba(0, 255, 136, ${opacity * level * 0.3})`;
    this.ctx.fillRect(x, y, width, height);

    // Note border
    this.ctx.strokeStyle = `rgba(0, 255, 136, ${opacity * level})`;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // Note label
    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, x + width / 2, y + height / 2 + 4);

    // Interval number
    if (interval !== 0) {
      this.ctx.fillStyle = `rgba(153, 153, 153, ${opacity})`;
      this.ctx.font = '10px Arial';
      this.ctx.fillText(`+${interval > 0 ? '+' : ''}${interval}`, x + width / 2, y - 3);
    }

    this.ctx.textAlign = 'left';
  }

  getIntervalName(semitones) {
    const names = {
      1: 'min 2nd',
      2: 'maj 2nd',
      3: 'min 3rd',
      4: 'maj 3rd',
      5: '4th',
      6: 'tritone',
      7: '5th',
      8: 'min 6th',
      9: 'maj 6th',
      10: 'min 7th',
      11: 'maj 7th',
      12: 'Octave',
      15: 'min 10th',
      19: 'Oct+5th',
      '-12': 'Oct down'
    };
    return names[semitones] || `${semitones > 0 ? '+' : ''}${semitones}`;
  }

  cleanup() {
    this.stop();
    if (this.canvas) {
      this.canvas.remove();
    }
    this.activeNotes.clear();
  }
}