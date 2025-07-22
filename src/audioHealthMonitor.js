import * as Tone from 'tone';

export class AudioHealthMonitor {
  constructor() {
    this.meter = null;
    this.waveform = null;
    this.fft = null;
    this.history = [];
    this.clipCount = 0;
    this.effectCount = 0;
    this.isMonitoring = false;
    this.degradationDetected = false;
    this.monitoringInterval = null;

    // Thresholds
    this.CLIP_THRESHOLD = -0.1; // dB
    this.RMS_THRESHOLD = -3; // dB
    this.DC_OFFSET_THRESHOLD = 0.2; // Increased - small DC offset is normal in web audio
    this.SILENCE_THRESHOLD = -60; // dB
    this.MAX_EFFECT_COUNT = 50;
  }

  initialize() {
    // Create analyzers
    this.meter = new Tone.Meter();
    this.waveform = new Tone.Waveform(512);
    this.fft = new Tone.FFT(512);

    // Connect to master output
    Tone.Destination.connect(this.meter);
    Tone.Destination.connect(this.waveform);
    Tone.Destination.connect(this.fft);
  }

  startMonitoring() {
    if (this.isMonitoring) {return;}

    this.isMonitoring = true;
    this.history = [];
    this.clipCount = 0;

    // Monitor every 100ms
    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, 100);

    console.log('Audio health monitoring started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {return;}

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Audio health monitoring stopped');
    this.generateReport();
  }

  checkHealth() {
    const reading = {
      time: Date.now(),
      level: this.meter.getValue(),
      waveform: this.waveform.getValue(),
      spectrum: this.fft.getValue(),
      effectCount: this.effectCount,
      issues: []
    };

    // Check for clipping
    if (reading.level > this.CLIP_THRESHOLD) {
      this.clipCount++;
      reading.issues.push('CLIPPING');
    }

    // Check for DC offset
    const dcOffset = this.calculateDCOffset(reading.waveform);
    if (Math.abs(dcOffset) > this.DC_OFFSET_THRESHOLD) {
      reading.issues.push(`DC_OFFSET: ${dcOffset.toFixed(3)}`);
    }

    // Check for silence (audio stopped)
    if (reading.level < this.SILENCE_THRESHOLD && this.history.length > 10) {
      const recentLevels = this.history.slice(-10).map(h => h.level);
      const wasPlaying = recentLevels.some(l => l > this.SILENCE_THRESHOLD);
      if (wasPlaying) {
        reading.issues.push('AUDIO_STOPPED');
        this.degradationDetected = true;
      }
    }

    // Check for excessive effects
    if (this.effectCount > this.MAX_EFFECT_COUNT) {
      reading.issues.push(`EXCESSIVE_EFFECTS: ${this.effectCount}`);
    }

    // Check for frequency buildup (feedback)
    const feedbackFreq = this.detectFeedback(reading.spectrum);
    if (feedbackFreq) {
      reading.issues.push(`FEEDBACK_AT: ${feedbackFreq}Hz`);
    }

    // Store history
    this.history.push(reading);
    if (this.history.length > 300) { // Keep last 30 seconds
      this.history.shift();
    }

    // Log issues in real-time
    if (reading.issues.length > 0) {
      console.warn('Audio health issues detected:', reading.issues);
    }
  }

  calculateDCOffset(waveform) {
    if (!waveform || waveform.length === 0) {return 0;}
    const sum = waveform.reduce((acc, val) => acc + val, 0);
    return sum / waveform.length;
  }

  detectFeedback(spectrum) {
    if (!spectrum || spectrum.length === 0) {return null;}

    // Find peaks in spectrum
    const peaks = [];
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1] && spectrum[i] > -20) {
        peaks.push({ bin: i, level: spectrum[i] });
      }
    }

    // Check for sustained narrow peaks (feedback)
    if (peaks.length > 0) {
      const strongestPeak = peaks.reduce((max, p) => p.level > max.level ? p : max);
      if (strongestPeak.level > -10) {
        // Convert bin to frequency
        const freq = (strongestPeak.bin * Tone.context.sampleRate) / (2 * spectrum.length);
        return Math.round(freq);
      }
    }

    return null;
  }

  updateEffectCount(count) {
    this.effectCount = count;
  }

  generateReport() {
    if (this.history.length === 0) {
      console.log('No audio health data collected');
      return;
    }

    const report = {
      duration: (this.history[this.history.length - 1].time - this.history[0].time) / 1000,
      clipCount: this.clipCount,
      maxLevel: Math.max(...this.history.map(h => h.level)),
      avgLevel: this.history.reduce((sum, h) => sum + h.level, 0) / this.history.length,
      issues: {},
      degradationDetected: this.degradationDetected
    };

    // Count issues
    this.history.forEach(reading => {
      reading.issues.forEach(issue => {
        const issueType = issue.split(':')[0];
        report.issues[issueType] = (report.issues[issueType] || 0) + 1;
      });
    });

    console.log('=== Audio Health Report ===');
    console.log(`Duration: ${report.duration.toFixed(1)}s`);
    console.log(`Clip Count: ${report.clipCount}`);
    console.log(`Max Level: ${report.maxLevel.toFixed(1)} dB`);
    console.log(`Avg Level: ${report.avgLevel.toFixed(1)} dB`);
    console.log('Issues:', report.issues);
    console.log(`Degradation Detected: ${report.degradationDetected ? 'YES' : 'NO'}`);
    console.log('========================');

    return report;
  }

  // Visual meter for real-time monitoring
  createVisualMeter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {return;}

    container.innerHTML = `
      <div class="audio-health-meter">
        <h3>Audio Health Monitor</h3>
        <div class="meter-display">
          <label>Level:</label>
          <div class="level-bar">
            <div class="level-fill" id="level-fill"></div>
          </div>
          <span id="level-db">-∞ dB</span>
        </div>
        <div class="health-stats">
          <div>Clips: <span id="clip-count">0</span></div>
          <div>Effects: <span id="effect-count">0</span></div>
          <div>Status: <span id="health-status">OK</span></div>
        </div>
      </div>
    `;

    // Update visual meter
    setInterval(() => {
      if (!this.isMonitoring) {return;}

      const level = this.meter.getValue();
      const levelPercent = Math.max(0, Math.min(100, (level + 60) * 100 / 60));

      document.getElementById('level-fill').style.width = levelPercent + '%';
      document.getElementById('level-db').textContent = level.toFixed(1) + ' dB';
      document.getElementById('clip-count').textContent = this.clipCount;
      document.getElementById('effect-count').textContent = this.effectCount;

      const status = this.degradationDetected ? 'DEGRADED' :
        this.clipCount > 0 ? 'CLIPPING' :
          this.effectCount > this.MAX_EFFECT_COUNT ? 'OVERLOADED' : 'OK';

      const statusEl = document.getElementById('health-status');
      statusEl.textContent = status;
      statusEl.style.color = status === 'OK' ? '#00ff88' : '#ff4444';
    }, 100);
  }
}

// Create global instance
export const audioHealthMonitor = new AudioHealthMonitor();