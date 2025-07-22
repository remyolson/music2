import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * RehearsalTools - Tools for rehearsal and performance
 * Includes click track, section isolation, tempo training, and more
 */
export class RehearsalTools {
  constructor() {
    this.registry = new DisposalRegistry('rehearsal-tools');
    
    // Click track system
    this.clickTrack = new ClickTrackSystem();
    this.registry.register(this.clickTrack);
    
    // Section isolator
    this.sectionIsolator = new SectionIsolator();
    this.registry.register(this.sectionIsolator);
    
    // Tempo trainer
    this.tempoTrainer = new TempoTrainer();
    this.registry.register(this.tempoTrainer);
    
    // Loop system
    this.loopSystem = new LoopSystem();
    this.registry.register(this.loopSystem);
    
    // Visual cues
    this.visualCues = new VisualCueSystem();
    this.registry.register(this.visualCues);
    
    // Performance recorder
    this.performanceRecorder = new PerformanceRecorder();
    this.registry.register(this.performanceRecorder);
    
    // Current state
    this.isRehearsing = false;
    this.currentMeasure = 1;
    this.currentBeat = 1;
  }

  /**
   * Start rehearsal mode
   * @param {Object} score 
   * @param {Object} options 
   */
  startRehearsal(score, options = {}) {
    this.isRehearsing = true;
    this.score = score;
    
    const {
      startMeasure = 1,
      endMeasure = null,
      clickTrack = true,
      countIn = true,
      visualCues = true,
      recordPerformance = false
    } = options;
    
    // Configure click track
    if (clickTrack) {
      this.clickTrack.configure({
        timeSignature: score.timeSignature,
        tempo: score.tempo,
        subdivisions: options.subdivisions || 1,
        accentBeats: options.accentBeats || [1],
        countIn: countIn ? 2 : 0 // 2 measure count-in
      });
    }
    
    // Set up loop if specified
    if (endMeasure) {
      this.loopSystem.setLoop(startMeasure, endMeasure);
    }
    
    // Configure visual cues
    if (visualCues) {
      this.visualCues.prepare(score);
    }
    
    // Start recording if requested
    if (recordPerformance) {
      this.performanceRecorder.startRecording();
    }
    
    // Start from specified measure
    this.jumpToMeasure(startMeasure);
  }

  /**
   * Stop rehearsal
   */
  stopRehearsal() {
    this.isRehearsing = false;
    this.clickTrack.stop();
    this.loopSystem.stop();
    this.visualCues.stop();
    
    if (this.performanceRecorder.isRecording) {
      return this.performanceRecorder.stopRecording();
    }
  }

  /**
   * Jump to measure
   * @param {number} measure 
   */
  jumpToMeasure(measure) {
    this.currentMeasure = measure;
    this.currentBeat = 1;
    
    // Find rehearsal mark if any
    const mark = this.findRehearsalMark(measure);
    if (mark) {
      this.visualCues.showRehearsalMark(mark);
    }
    
    // Update all systems
    this.clickTrack.jumpToMeasure(measure);
    this.loopSystem.updatePosition(measure);
    this.visualCues.updatePosition(measure);
  }

  /**
   * Jump to rehearsal mark
   * @param {string} mark 
   */
  jumpToRehearsalMark(mark) {
    if (!this.score || !this.score.rehearsalMarks) return;
    
    const rehearsalMark = this.score.rehearsalMarks.find(rm => rm.mark === mark);
    if (rehearsalMark) {
      this.jumpToMeasure(rehearsalMark.measure);
    }
  }

  /**
   * Find rehearsal mark at measure
   * @param {number} measure 
   * @returns {Object|null}
   */
  findRehearsalMark(measure) {
    if (!this.score || !this.score.rehearsalMarks) return null;
    
    return this.score.rehearsalMarks.find(rm => rm.measure === measure);
  }

  /**
   * Set tempo adjustment
   * @param {number} factor - Multiplier (0.5 = half speed, 2.0 = double speed)
   */
  setTempoFactor(factor) {
    this.clickTrack.setTempoFactor(factor);
    
    // Notify other systems
    if (this.onTempoChange) {
      this.onTempoChange(this.score.tempo * factor);
    }
  }

  /**
   * Isolate sections
   * @param {Array} sectionIds 
   */
  isolateSections(sectionIds) {
    this.sectionIsolator.isolate(sectionIds);
  }

  /**
   * Clear isolation
   */
  clearIsolation() {
    this.sectionIsolator.clearIsolation();
  }

  /**
   * Start tempo training
   * @param {Object} config 
   */
  startTempoTraining(config) {
    this.tempoTrainer.start(config);
  }

  /**
   * Get performance analysis
   * @returns {Object}
   */
  getPerformanceAnalysis() {
    if (!this.performanceRecorder.lastRecording) return null;
    
    return this.performanceRecorder.analyzePerformance();
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Click track system with complex time signatures
 */
class ClickTrackSystem {
  constructor() {
    this.registry = new DisposalRegistry('click-track');
    
    // Click sounds
    this.highClick = this.registry.register(new Tone.Oscillator(1000, 'sine'));
    this.lowClick = this.registry.register(new Tone.Oscillator(600, 'sine'));
    
    // Envelopes
    this.highEnv = this.registry.register(new Tone.Envelope({
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1
    }));
    
    this.lowEnv = this.registry.register(new Tone.Envelope({
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.1
    }));
    
    // Volume
    this.volume = this.registry.register(new Tone.Gain(0.5));
    
    // Connect
    this.highClick.connect(this.highEnv);
    this.lowClick.connect(this.lowEnv);
    this.highEnv.connect(this.volume);
    this.lowEnv.connect(this.volume);
    
    // Configuration
    this.config = {
      timeSignature: [4, 4],
      tempo: 120,
      subdivisions: 1,
      accentBeats: [1],
      countIn: 0
    };
    
    // State
    this.isPlaying = false;
    this.currentMeasure = 1;
    this.currentBeat = 1;
    this.tempoFactor = 1.0;
    
    // Scheduling
    this.scheduledEvents = [];
  }

  /**
   * Configure click track
   * @param {Object} config 
   */
  configure(config) {
    Object.assign(this.config, config);
  }

  /**
   * Start click track
   */
  start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.highClick.start();
    this.lowClick.start();
    
    // Schedule count-in if needed
    if (this.config.countIn > 0) {
      this.scheduleCountIn();
    } else {
      this.scheduleNextMeasure();
    }
  }

  /**
   * Stop click track
   */
  stop() {
    this.isPlaying = false;
    
    // Cancel scheduled events
    this.scheduledEvents.forEach(id => Tone.Transport.clear(id));
    this.scheduledEvents = [];
    
    this.highClick.stop();
    this.lowClick.stop();
  }

  /**
   * Schedule count-in
   */
  scheduleCountIn() {
    const beatDuration = 60 / (this.config.tempo * this.tempoFactor);
    let currentTime = Tone.now();
    
    for (let measure = 0; measure < this.config.countIn; measure++) {
      for (let beat = 0; beat < this.config.timeSignature[0]; beat++) {
        const isDownbeat = beat === 0;
        const clickTime = currentTime + (measure * this.config.timeSignature[0] + beat) * beatDuration;
        
        const id = Tone.Transport.scheduleOnce(() => {
          this.playClick(isDownbeat);
          
          // Voice count if first measure
          if (measure === 0) {
            this.voiceCount(beat + 1);
          }
        }, clickTime);
        
        this.scheduledEvents.push(id);
      }
    }
    
    // Schedule first real measure
    const countInDuration = this.config.countIn * this.config.timeSignature[0] * beatDuration;
    const id = Tone.Transport.scheduleOnce(() => {
      this.scheduleNextMeasure();
    }, currentTime + countInDuration);
    
    this.scheduledEvents.push(id);
  }

  /**
   * Voice count
   * @param {number} beat 
   */
  voiceCount(beat) {
    // This would trigger speech synthesis or pre-recorded count
    if (this.onVoiceCount) {
      this.onVoiceCount(beat);
    }
  }

  /**
   * Schedule next measure
   */
  scheduleNextMeasure() {
    if (!this.isPlaying) return;
    
    const [beatsPerMeasure, beatUnit] = this.config.timeSignature;
    const beatDuration = 60 / (this.config.tempo * this.tempoFactor);
    const subdivisionDuration = beatDuration / this.config.subdivisions;
    
    let currentTime = Tone.now();
    
    // Schedule all beats and subdivisions in measure
    for (let beat = 0; beat < beatsPerMeasure; beat++) {
      for (let sub = 0; sub < this.config.subdivisions; sub++) {
        const isDownbeat = beat === 0 && sub === 0;
        const isAccent = this.config.accentBeats.includes(beat + 1) && sub === 0;
        const clickTime = currentTime + (beat * this.config.subdivisions + sub) * subdivisionDuration;
        
        const id = Tone.Transport.scheduleOnce(() => {
          if (sub === 0) {
            // Main beat
            this.playClick(isDownbeat || isAccent);
            this.currentBeat = beat + 1;
          } else {
            // Subdivision
            this.playSubdivision();
          }
          
          // Trigger beat callback
          if (this.onBeat) {
            this.onBeat(this.currentMeasure, this.currentBeat, sub);
          }
        }, clickTime);
        
        this.scheduledEvents.push(id);
      }
    }
    
    // Schedule next measure
    const measureDuration = beatsPerMeasure * beatDuration;
    const id = Tone.Transport.scheduleOnce(() => {
      this.currentMeasure++;
      this.currentBeat = 1;
      this.scheduleNextMeasure();
    }, currentTime + measureDuration);
    
    this.scheduledEvents.push(id);
  }

  /**
   * Play click
   * @param {boolean} accent 
   */
  playClick(accent) {
    if (accent) {
      this.highEnv.triggerAttackRelease(0.05);
    } else {
      this.lowEnv.triggerAttackRelease(0.05);
    }
  }

  /**
   * Play subdivision click
   */
  playSubdivision() {
    // Quieter and shorter for subdivisions
    const oldGain = this.volume.gain.value;
    this.volume.gain.value = oldGain * 0.5;
    this.lowEnv.triggerAttackRelease(0.02);
    this.volume.gain.value = oldGain;
  }

  /**
   * Jump to measure
   * @param {number} measure 
   */
  jumpToMeasure(measure) {
    this.currentMeasure = measure;
    this.currentBeat = 1;
    
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  /**
   * Set tempo factor
   * @param {number} factor 
   */
  setTempoFactor(factor) {
    this.tempoFactor = factor;
    
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  /**
   * Connect to destination
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.volume.connect(destination);
  }

  /**
   * Dispose
   */
  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

/**
 * Section isolation system
 */
class SectionIsolator {
  constructor() {
    this.registry = new DisposalRegistry('section-isolator');
    
    // Isolated sections
    this.isolatedSections = new Set();
    
    // Volume automation
    this.volumeAutomation = new Map();
  }

  /**
   * Isolate sections
   * @param {Array} sectionIds 
   */
  isolate(sectionIds) {
    this.clearIsolation();
    
    sectionIds.forEach(id => {
      this.isolatedSections.add(id);
    });
    
    this.applyIsolation();
  }

  /**
   * Apply isolation
   */
  applyIsolation() {
    if (this.orchestra) {
      this.orchestra.sections.forEach((section, sectionId) => {
        const isIsolated = this.isolatedSections.has(sectionId);
        
        // Fade non-isolated sections
        const targetVolume = isIsolated ? 0 : -20; // dB
        
        if (!this.volumeAutomation.has(sectionId)) {
          this.volumeAutomation.set(sectionId, {
            current: 0,
            target: targetVolume
          });
        }
        
        // Apply volume change
        this.orchestra.setSectionLevel(sectionId, targetVolume);
      });
    }
  }

  /**
   * Clear isolation
   */
  clearIsolation() {
    this.isolatedSections.clear();
    
    // Restore all volumes
    this.volumeAutomation.forEach((automation, sectionId) => {
      if (this.orchestra) {
        this.orchestra.setSectionLevel(sectionId, 0);
      }
    });
    
    this.volumeAutomation.clear();
  }

  /**
   * Set orchestra reference
   * @param {Object} orchestra 
   */
  setOrchestra(orchestra) {
    this.orchestra = orchestra;
  }

  /**
   * Dispose
   */
  dispose() {
    this.clearIsolation();
    this.registry.dispose();
  }
}

/**
 * Tempo trainer
 */
class TempoTrainer {
  constructor() {
    this.registry = new DisposalRegistry('tempo-trainer');
    
    // Training modes
    this.modes = {
      gradual: this.gradualTraining.bind(this),
      random: this.randomTraining.bind(this),
      accelerando: this.accelerandoTraining.bind(this),
      target: this.targetTraining.bind(this)
    };
    
    // State
    this.isTraining = false;
    this.currentTempo = 120;
    this.progress = 0;
  }

  /**
   * Start training
   * @param {Object} config 
   */
  start(config) {
    const {
      mode = 'gradual',
      startTempo = 60,
      endTempo = 120,
      duration = 300, // seconds
      steps = 10
    } = config;
    
    this.isTraining = true;
    this.config = config;
    this.startTime = Tone.now();
    
    const trainingFn = this.modes[mode];
    if (trainingFn) {
      trainingFn(config);
    }
  }

  /**
   * Stop training
   */
  stop() {
    this.isTraining = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Gradual tempo increase
   * @param {Object} config 
   */
  gradualTraining(config) {
    const { startTempo, endTempo, duration, steps } = config;
    const stepDuration = duration / steps;
    const tempoIncrement = (endTempo - startTempo) / steps;
    
    let currentStep = 0;
    this.currentTempo = startTempo;
    
    this.intervalId = setInterval(() => {
      if (currentStep >= steps) {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
        return;
      }
      
      this.currentTempo = startTempo + tempoIncrement * currentStep;
      this.progress = currentStep / steps;
      
      if (this.onTempoChange) {
        this.onTempoChange(this.currentTempo);
      }
      
      currentStep++;
    }, stepDuration * 1000);
  }

  /**
   * Random tempo changes
   * @param {Object} config 
   */
  randomTraining(config) {
    const { minTempo = 60, maxTempo = 180, changeInterval = 30 } = config;
    
    this.intervalId = setInterval(() => {
      this.currentTempo = minTempo + Math.random() * (maxTempo - minTempo);
      
      if (this.onTempoChange) {
        this.onTempoChange(this.currentTempo);
      }
    }, changeInterval * 1000);
  }

  /**
   * Accelerando/Ritardando training
   * @param {Object} config 
   */
  accelerandoTraining(config) {
    const { startTempo, endTempo, duration } = config;
    const startTime = Tone.now();
    
    const updateTempo = () => {
      if (!this.isTraining) return;
      
      const elapsed = Tone.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Exponential curve for more musical accelerando
      this.currentTempo = startTempo + (endTempo - startTempo) * Math.pow(progress, 2);
      this.progress = progress;
      
      if (this.onTempoChange) {
        this.onTempoChange(this.currentTempo);
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateTempo);
      } else {
        this.stop();
        if (this.onComplete) {
          this.onComplete();
        }
      }
    };
    
    updateTempo();
  }

  /**
   * Target tempo training
   * @param {Object} config 
   */
  targetTraining(config) {
    const { targetTempo, tolerance = 2 } = config;
    
    // Start without click, user must match target
    this.targetTempo = targetTempo;
    this.tolerance = tolerance;
    
    if (this.onTargetMode) {
      this.onTargetMode(targetTempo);
    }
  }

  /**
   * Check tempo accuracy
   * @param {number} userTempo 
   * @returns {Object}
   */
  checkAccuracy(userTempo) {
    if (!this.targetTempo) return null;
    
    const difference = Math.abs(userTempo - this.targetTempo);
    const accurate = difference <= this.tolerance;
    
    return {
      accurate,
      difference,
      percentage: (1 - difference / this.targetTempo) * 100
    };
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      isTraining: this.isTraining,
      currentTempo: this.currentTempo,
      progress: this.progress,
      mode: this.config?.mode
    };
  }

  /**
   * Dispose
   */
  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

/**
 * Loop system for practicing sections
 */
class LoopSystem {
  constructor() {
    this.registry = new DisposalRegistry('loop-system');
    
    // Loop settings
    this.loopStart = null;
    this.loopEnd = null;
    this.isLooping = false;
    this.currentPosition = 1;
  }

  /**
   * Set loop points
   * @param {number} startMeasure 
   * @param {number} endMeasure 
   */
  setLoop(startMeasure, endMeasure) {
    this.loopStart = startMeasure;
    this.loopEnd = endMeasure;
    this.isLooping = true;
  }

  /**
   * Clear loop
   */
  clearLoop() {
    this.loopStart = null;
    this.loopEnd = null;
    this.isLooping = false;
  }

  /**
   * Update position
   * @param {number} measure 
   */
  updatePosition(measure) {
    this.currentPosition = measure;
    
    if (this.isLooping && measure > this.loopEnd) {
      // Jump back to start
      if (this.onLoopRestart) {
        this.onLoopRestart(this.loopStart);
      }
    }
  }

  /**
   * Stop looping
   */
  stop() {
    this.isLooping = false;
  }

  /**
   * Get loop info
   * @returns {Object}
   */
  getLoopInfo() {
    return {
      isLooping: this.isLooping,
      start: this.loopStart,
      end: this.loopEnd,
      currentPosition: this.currentPosition
    };
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Visual cue system
 */
class VisualCueSystem {
  constructor() {
    this.registry = new DisposalRegistry('visual-cues');
    
    // Cue types
    this.cues = new Map();
    this.activeCues = new Set();
    
    // Beat indicator
    this.beatIndicator = {
      currentBeat: 1,
      totalBeats: 4,
      isFlashing: false
    };
  }

  /**
   * Prepare cues from score
   * @param {Object} score 
   */
  prepare(score) {
    // Extract cues from score
    if (score.cues) {
      score.cues.forEach(cue => {
        this.cues.set(cue.measure, cue);
      });
    }
    
    // Prepare rehearsal marks
    if (score.rehearsalMarks) {
      score.rehearsalMarks.forEach(mark => {
        this.cues.set(mark.measure, {
          type: 'rehearsal',
          text: mark.mark,
          measure: mark.measure
        });
      });
    }
    
    // Prepare tempo changes
    if (score.tempoChanges) {
      score.tempoChanges.forEach(change => {
        this.cues.set(change.measure, {
          type: 'tempo',
          tempo: change.tempo,
          measure: change.measure
        });
      });
    }
  }

  /**
   * Update position
   * @param {number} measure 
   */
  updatePosition(measure) {
    // Check for cues at this measure
    const cue = this.cues.get(measure);
    if (cue) {
      this.showCue(cue);
    }
    
    // Update upcoming cues
    this.updateUpcomingCues(measure);
  }

  /**
   * Show cue
   * @param {Object} cue 
   */
  showCue(cue) {
    this.activeCues.add(cue);
    
    if (this.onShowCue) {
      this.onShowCue(cue);
    }
    
    // Auto-hide after duration
    setTimeout(() => {
      this.hideCue(cue);
    }, 3000);
  }

  /**
   * Hide cue
   * @param {Object} cue 
   */
  hideCue(cue) {
    this.activeCues.delete(cue);
    
    if (this.onHideCue) {
      this.onHideCue(cue);
    }
  }

  /**
   * Update upcoming cues
   * @param {number} currentMeasure 
   */
  updateUpcomingCues(currentMeasure) {
    const upcomingCues = [];
    const lookAhead = 8; // measures
    
    for (let i = 1; i <= lookAhead; i++) {
      const cue = this.cues.get(currentMeasure + i);
      if (cue) {
        upcomingCues.push({
          ...cue,
          measuresUntil: i
        });
      }
    }
    
    if (this.onUpcomingCues) {
      this.onUpcomingCues(upcomingCues);
    }
  }

  /**
   * Show rehearsal mark
   * @param {Object} mark 
   */
  showRehearsalMark(mark) {
    if (this.onRehearsalMark) {
      this.onRehearsalMark(mark);
    }
  }

  /**
   * Update beat indicator
   * @param {number} beat 
   * @param {number} totalBeats 
   */
  updateBeat(beat, totalBeats) {
    this.beatIndicator.currentBeat = beat;
    this.beatIndicator.totalBeats = totalBeats;
    
    // Flash on downbeat
    if (beat === 1) {
      this.beatIndicator.isFlashing = true;
      setTimeout(() => {
        this.beatIndicator.isFlashing = false;
      }, 100);
    }
    
    if (this.onBeatUpdate) {
      this.onBeatUpdate(this.beatIndicator);
    }
  }

  /**
   * Stop visual cues
   */
  stop() {
    this.activeCues.clear();
  }

  /**
   * Dispose
   */
  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

/**
 * Performance recorder
 */
class PerformanceRecorder {
  constructor() {
    this.registry = new DisposalRegistry('performance-recorder');
    
    // Recording state
    this.isRecording = false;
    this.recordingData = null;
    this.startTime = null;
    
    // Audio recorder
    this.recorder = this.registry.register(new Tone.Recorder());
    
    // MIDI recorder
    this.midiEvents = [];
    
    // Performance metrics
    this.metrics = {
      timing: [],
      dynamics: [],
      accuracy: []
    };
  }

  /**
   * Start recording
   */
  async startRecording() {
    this.isRecording = true;
    this.startTime = Tone.now();
    this.midiEvents = [];
    this.metrics = {
      timing: [],
      dynamics: [],
      accuracy: []
    };
    
    // Start audio recording
    await this.recorder.start();
  }

  /**
   * Stop recording
   * @returns {Object}
   */
  async stopRecording() {
    this.isRecording = false;
    
    // Stop audio recording
    const audioBlob = await this.recorder.stop();
    
    // Create recording data
    this.recordingData = {
      audio: audioBlob,
      midiEvents: this.midiEvents,
      metrics: this.metrics,
      duration: Tone.now() - this.startTime,
      timestamp: Date.now()
    };
    
    this.lastRecording = this.recordingData;
    
    return this.recordingData;
  }

  /**
   * Record MIDI event
   * @param {Object} event 
   */
  recordMidiEvent(event) {
    if (!this.isRecording) return;
    
    const timestampedEvent = {
      ...event,
      time: Tone.now() - this.startTime
    };
    
    this.midiEvents.push(timestampedEvent);
    
    // Update metrics
    this.updateMetrics(timestampedEvent);
  }

  /**
   * Update performance metrics
   * @param {Object} event 
   */
  updateMetrics(event) {
    if (event.type === 'noteOn') {
      // Timing accuracy
      if (event.expectedTime !== undefined) {
        const timingError = event.time - event.expectedTime;
        this.metrics.timing.push({
          time: event.time,
          error: timingError,
          absolute: Math.abs(timingError)
        });
      }
      
      // Dynamics
      this.metrics.dynamics.push({
        time: event.time,
        velocity: event.velocity
      });
      
      // Note accuracy
      if (event.expectedNote !== undefined) {
        this.metrics.accuracy.push({
          time: event.time,
          correct: event.note === event.expectedNote,
          played: event.note,
          expected: event.expectedNote
        });
      }
    }
  }

  /**
   * Analyze performance
   * @returns {Object}
   */
  analyzePerformance() {
    if (!this.lastRecording) return null;
    
    const analysis = {
      timing: this.analyzeTimingAccuracy(),
      dynamics: this.analyzeDynamics(),
      accuracy: this.analyzeNoteAccuracy(),
      overall: 0
    };
    
    // Calculate overall score
    analysis.overall = (
      analysis.timing.score * 0.4 +
      analysis.dynamics.score * 0.3 +
      analysis.accuracy.score * 0.3
    );
    
    return analysis;
  }

  /**
   * Analyze timing accuracy
   * @returns {Object}
   */
  analyzeTimingAccuracy() {
    const timingData = this.lastRecording.metrics.timing;
    if (timingData.length === 0) {
      return { score: 100, averageError: 0, consistency: 100 };
    }
    
    const errors = timingData.map(t => t.absolute);
    const averageError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxAcceptableError = 0.05; // 50ms
    
    // Calculate consistency (standard deviation)
    const variance = errors.reduce((sum, error) => {
      return sum + Math.pow(error - averageError, 2);
    }, 0) / errors.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      score: Math.max(0, 100 - (averageError / maxAcceptableError) * 100),
      averageError: averageError * 1000, // Convert to ms
      consistency: Math.max(0, 100 - stdDev * 200),
      details: timingData
    };
  }

  /**
   * Analyze dynamics
   * @returns {Object}
   */
  analyzeDynamics() {
    const dynamicsData = this.lastRecording.metrics.dynamics;
    if (dynamicsData.length === 0) {
      return { score: 100, range: 0, consistency: 100 };
    }
    
    const velocities = dynamicsData.map(d => d.velocity);
    const min = Math.min(...velocities);
    const max = Math.max(...velocities);
    const range = max - min;
    
    // Good dynamics have appropriate range
    const idealRange = 0.6;
    const rangeScore = 100 * (1 - Math.abs(range - idealRange) / idealRange);
    
    return {
      score: rangeScore,
      range,
      min,
      max,
      details: dynamicsData
    };
  }

  /**
   * Analyze note accuracy
   * @returns {Object}
   */
  analyzeNoteAccuracy() {
    const accuracyData = this.lastRecording.metrics.accuracy;
    if (accuracyData.length === 0) {
      return { score: 100, correctNotes: 0, totalNotes: 0 };
    }
    
    const correctNotes = accuracyData.filter(a => a.correct).length;
    const totalNotes = accuracyData.length;
    const accuracy = (correctNotes / totalNotes) * 100;
    
    return {
      score: accuracy,
      correctNotes,
      totalNotes,
      errors: accuracyData.filter(a => !a.correct)
    };
  }

  /**
   * Connect audio input
   * @param {Tone.ToneAudioNode} source 
   */
  connect(source) {
    source.connect(this.recorder);
  }

  /**
   * Dispose
   */
  dispose() {
    if (this.isRecording) {
      this.stopRecording();
    }
    this.registry.dispose();
  }
}

// Factory function
export function createRehearsalTools() {
  return new RehearsalTools();
}