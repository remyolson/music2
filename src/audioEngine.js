import * as Tone from 'tone';
import { performanceOptimizer } from './performanceOptimizer.js';
import { updateLiveInputState } from './state.js';
import { audioHealthMonitor } from './audioHealthMonitor.js';
import {
  MASTER_BUS_CONFIG,
  DRUM_PITCHES,
  DRUM_DURATIONS
} from './audio/constants/index.js';
import { availableEffects } from './audio/effects/EffectFactory.js';
import { createInstrumentWithEffects } from './audio/instruments/InstrumentFactory.js';
import { 
  startLiveInput as startLiveInputModule,
  stopLiveInput as stopLiveInputModule,
  updateLiveInputEffects as updateLiveInputEffectsModule,
  measureLiveInputLatency as measureLiveInputLatencyModule,
  startLiveInputRecording as startLiveInputRecordingModule,
  stopLiveInputRecording as stopLiveInputRecordingModule,
  getLiveInputStatus as getLiveInputStatusModule
} from './audio/live/LiveInput.js';
import { 
  getMasterBus,
  applyMasterEffectPreset as applyMasterEffectPresetModule,
  getMasterEffectChain
} from './audio/core/MasterBus.js';

const instruments = new Map();
let parts = [];
let isPlaying = false;
const effects = new Map();
let harmonyCallback = null;

// Track temporary effects that need cleanup
const temporaryEffects = new Map();

// Initialize performance optimizer
performanceOptimizer.initialize().catch(console.warn);

function expandNotesWithRepeat(notes) {
  const expanded = [];
  notes.forEach(note => {
    if (note.repeat && note.repeat > 1) {
      for (let i = 0; i < note.repeat; i++) {
        expanded.push({
          ...note,
          time: note.time + (i * note.duration),
          repeat: undefined // Remove repeat to avoid confusion
        });
      }
    } else {
      expanded.push(note);
    }
  });

  // Sort by time and add small offset to duplicate times
  expanded.sort((a, b) => a.time - b.time);

  // Add small time offset to notes with identical start times
  let timeOffset = 0;
  for (let i = 1; i < expanded.length; i++) {
    if (expanded[i].time <= expanded[i - 1].time) {
      timeOffset += 0.001;
      expanded[i].time = expanded[i - 1].time + timeOffset;
    } else {
      timeOffset = 0; // Reset offset when times are different
    }
  }

  return expanded;
}

export async function update(musicData) {
  // Stop transport if playing to avoid timing conflicts
  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop();
  }

  cleanup();

  if (!musicData) {return;}

  Tone.Transport.bpm.value = musicData.tempo;

  const secondsPerBeat = 60 / musicData.tempo;

  for (let trackIndex = 0; trackIndex < musicData.tracks.length; trackIndex++) {
    const track = musicData.tracks[trackIndex];
    const { instrument, effectChain } = await createInstrumentWithEffects(track, getMasterBus);
    instruments.set(track.name, { instrument, effectChain });

    const expandedNotes = expandNotesWithRepeat(track.notes);

    // Debug drum timing issues
    if (track.name === 'Drums' || track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
      console.log(`${track.name} track - first 10 expanded notes:`,
        expandedNotes.slice(0, 10).map(n => ({
          time: n.time,
          value: n.value,
          duration: n.duration
        }))
      );
    }

    // Convert notes to the format Tone.Part expects
    const partNotes = expandedNotes.map(note => ({
      time: note.time * secondsPerBeat,
      duration: note.duration * secondsPerBeat,
      value: note.value,
      volume: note.volume,
      effect: note.effect,
      effectLevel: note.effectLevel,
      pitch: note.pitch,
      formant: note.formant,
      harmonize: note.harmonize,
      harmonizeMix: note.harmonizeMix,
      harmonizeLevels: note.harmonizeLevels
    }));

    const part = new Tone.Part((time, note) => {
      try {
        // Validate note data
        if (!note || !note.value) {
          console.error(`Invalid note in track ${track.name}:`, note);
          return;
        }

        if (note.duration <= 0) {
          console.error(`Invalid duration for note in track ${track.name}:`, note);
          return;
        }

        const volume = note.volume !== undefined ? note.volume : 0.7;
        const velocity = volume;

        const playInstrument = instrument;

        // Handle pitch shifting effect if pitch parameter is present
        if (note.pitch !== undefined && note.pitch !== 0) {
        // Create temporary pitch effect that will be cleaned up
          const pitchEffect = new Tone.PitchShift({
            pitch: note.pitch,
            windowSize: 0.1,
            wet: 1.0
          });

          // Connect through pitch effect
          playInstrument.disconnect();
          playInstrument.chain(pitchEffect, getMasterBus());

          // Schedule cleanup after note ends
          Tone.Transport.scheduleOnce(() => {
            playInstrument.disconnect();
            playInstrument.connect(getMasterBus());
            pitchEffect.dispose();
          }, time + note.duration);
        }

        // Handle harmonize array if present
        if (note.harmonize && Array.isArray(note.harmonize) && note.harmonize.length > 0) {
        // Use a shared harmonizer per track, update its settings
          const harmonizerKey = `${track.name}-harmonizer`;
          let harmonizer = effects.get(harmonizerKey);

          if (!harmonizer) {
            harmonizer = availableEffects.harmonizer();
            effects.set(harmonizerKey, harmonizer);
          }

          // Update health monitor
          audioHealthMonitor.updateEffectCount(effects.size + getMasterEffectChain().length);

          // Update harmonizer settings for this note
          harmonizer.setIntervals(note.harmonize);

          // Set mix level if provided
          if (note.harmonizeMix !== undefined) {
            harmonizer.setMix(note.harmonizeMix);
          }

          // Set individual voice levels if provided
          if (note.harmonizeLevels && Array.isArray(note.harmonizeLevels)) {
            note.harmonizeLevels.forEach((level, index) => {
              harmonizer.setVoiceLevel(index, level);
            });
          }

          // Chain harmonizer to instrument
          playInstrument.disconnect();
          playInstrument.chain(harmonizer, getMasterBus());
        }

        // Notify harmony visualizer
        if (harmonyCallback) {
          harmonyCallback({
            trackName: track.name,
            note: note,
            time: time
          });
        }

        if (note.effect && availableEffects[note.effect]) {
          const noteEffect = effects.get(`${track.name}-${note.effect}-${time}`);
          if (!noteEffect) {
            const newEffect = availableEffects[note.effect]();
            if (note.effectLevel !== undefined) {
              newEffect.wet.value = note.effectLevel;
            }
            // Handle pitch parameter for pitchShift effect
            if (note.effect === 'pitchShift' && note.pitch !== undefined) {
              newEffect.pitch = note.pitch;
            }
            effects.set(`${track.name}-${note.effect}-${time}`, newEffect);
            newEffect.connect(getMasterBus());

            // Update health monitor
            audioHealthMonitor.updateEffectCount(effects.size + getMasterEffectChain().length);
          }
        }

        // Handle formant parameter for vocoder synth
        if (track.instrument === 'vocoder_synth' && note.formant !== undefined && playInstrument.formantControl) {
          playInstrument.formantControl(note.formant);
        }

        if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
          if (!playInstrument[note.value]) {
            console.error(`Invalid drum note "${note.value}" in track ${track.name}. Expected "kick" or "snare"`);
            return;
          }
          // For drums, handle kick and snare differently
          if (note.value === 'kick') {
          // Kick uses PolySynth
            playInstrument.kick.triggerAttackRelease(DRUM_PITCHES.kick, DRUM_DURATIONS.kick, time, velocity);
          } else {
          // Snare uses regular synth
            playInstrument.snare.triggerAttackRelease(DRUM_PITCHES.snare, DRUM_DURATIONS.snare, time, velocity);
          }
        } else {
        // Handle chords (arrays of notes)
          if (Array.isArray(note.value)) {
            const frequencies = note.value.map(midi =>
              Tone.Frequency(midi, 'midi').toFrequency()
            );
            playInstrument.triggerAttackRelease(frequencies, note.duration + 's', time, velocity);
          } else {
            const frequency = Tone.Frequency(note.value, 'midi').toFrequency();
            playInstrument.triggerAttackRelease(frequency, note.duration + 's', time, velocity);
          }
        }
      } catch (error) {
        console.error(`Error playing note in track ${track.name}:`, error, note);
      }
    }, partNotes);

    part.trackIndex = trackIndex;
    part.loop = true;
    part.loopEnd = getLoopEnd({ tracks: [track] }) * secondsPerBeat;
    parts.push(part);
  }
}

// Instrument creation functions have been moved to InstrumentFactory.js

function getLoopEnd(musicData) {
  let maxTime = 0;
  musicData.tracks.forEach(track => {
    const notes = expandNotesWithRepeat(track.notes);
    notes.forEach(note => {
      const endTime = note.time + note.duration;
      if (endTime > maxTime) {maxTime = endTime;}
    });
  });
  return Math.ceil(maxTime);
}

function cleanup() {
  parts.forEach(part => {
    part.stop();
    part.dispose();
  });
  parts = [];

  instruments.forEach(({ instrument, effectChain }) => {
    if (effectChain) {
      effectChain.forEach(effect => {
        if (effect.dispose) {effect.dispose();}
      });
    }

    if (instrument.dispose) {
      instrument.dispose();
    } else if (typeof instrument === 'object') {
      Object.values(instrument).forEach(subInstrument => {
        if (subInstrument.dispose) {subInstrument.dispose();}
      });
    }
  });
  instruments.clear();

  effects.forEach(effect => {
    if (effect.dispose) {effect.dispose();}
  });
  effects.clear();

  // Clean up any temporary effects
  temporaryEffects.forEach(effect => {
    if (effect.dispose) {effect.dispose();}
  });
  temporaryEffects.clear();

  // Cancel all scheduled events to prevent lingering effects
  Tone.Transport.cancel();
}

export async function play() {
  if (isPlaying) {return;}

  // Ensure audio context is started
  if (Tone.context.state !== 'running') {
    await Tone.start();
    console.log('Audio context started');
  }

  // Initialize and start health monitoring
  audioHealthMonitor.initialize();
  audioHealthMonitor.startMonitoring();

  // Update effect count
  const totalEffects = effects.size + getMasterEffectChain().length + temporaryEffects.size;
  audioHealthMonitor.updateEffectCount(totalEffects);

  parts.forEach(part => part.start(0));
  Tone.Transport.start();
  isPlaying = true;
}

export function stop() {
  Tone.Transport.stop();
  // Cancel any scheduled events to prevent dangling callbacks
  Tone.Transport.cancel(0);

  // Stop health monitoring and generate report
  if (audioHealthMonitor.isMonitoring) {
    audioHealthMonitor.stopMonitoring();
  }

  // Stop all parts so they can be restarted
  parts.forEach(part => {
    part.stop();
  });

  // Immediately release all active notes to stop sound instantly
  instruments.forEach(({ instrument }) => {
    if (instrument.releaseAll) {
      // PolySynth has releaseAll
      instrument.releaseAll();
    } else if (instrument.triggerRelease) {
      // MonoSynth has triggerRelease - use immediate time to stop sound
      instrument.triggerRelease(Tone.now());
    } else if (typeof instrument === 'object') {
      // Handle drum kits and other compound instruments
      Object.values(instrument).forEach(subInst => {
        if (subInst.releaseAll) {
          subInst.releaseAll();
        } else if (subInst.triggerRelease) {
          subInst.triggerRelease(Tone.now());
        }
      });
    }
  });
  Tone.Transport.position = 0;
  isPlaying = false;
}

export function getTransport() {
  return Tone.Transport;
}

export function applyTrackSelection(selectedIndices) {
  const hasSelection = selectedIndices.size > 0;
  parts.forEach(part => {
    if (part.trackIndex !== undefined) {
      part.mute = hasSelection && !selectedIndices.has(part.trackIndex);
    }
  });
}

// Track Freeze functionality
const frozenTracks = new Map(); // Stores frozen audio buffers
const freezeRecorders = new Map(); // Stores active recorders

export async function freezeTrack(trackIndex, duration) {
  // Stop any existing freeze for this track
  unfreezeTrack(trackIndex);

  // Create offline context for rendering
  // const offlineContext = new Tone.OfflineContext(2, duration, 44100);

  // Get the track's part and instrument
  const part = parts.find(p => p.trackIndex === trackIndex);
  if (!part) {return;}

  const trackName = Array.from(instruments.keys())[trackIndex];
  const { instrument, effectChain } = instruments.get(trackName);

  // Create a recorder to capture the track output
  const recorder = new Tone.Recorder();

  // Connect instrument to recorder
  if (effectChain && effectChain.length > 0) {
    effectChain[effectChain.length - 1].connect(recorder);
  } else {
    instrument.connect(recorder);
  }

  freezeRecorders.set(trackIndex, recorder);

  // Start recording
  await recorder.start();

  // Play the part once to record it
  part.start(0);
  await Tone.Transport.start();

  // Wait for the duration
  await new Promise(resolve => setTimeout(resolve, duration * 1000));

  // Stop recording and get the buffer
  const recording = await recorder.stop();

  // Create a player for the frozen audio
  const frozenPlayer = new Tone.Player({
    url: recording,
    loop: true,
    loopStart: 0,
    loopEnd: duration
  }).connect(getMasterBus());

  // Store the frozen player
  frozenTracks.set(trackIndex, {
    player: frozenPlayer,
    originalPart: part,
    duration: duration
  });

  // Mute the original part
  part.mute = true;

  // Clean up recorder
  recorder.dispose();
  freezeRecorders.delete(trackIndex);

  return frozenPlayer;
}

export function unfreezeTrack(trackIndex) {
  const frozen = frozenTracks.get(trackIndex);
  if (frozen) {
    // Stop and dispose the frozen player
    frozen.player.stop();
    frozen.player.dispose();

    // Unmute the original part
    frozen.originalPart.mute = false;

    // Remove from frozen tracks
    frozenTracks.delete(trackIndex);
  }

  // Clean up any active recorder
  const recorder = freezeRecorders.get(trackIndex);
  if (recorder) {
    recorder.stop();
    recorder.dispose();
    freezeRecorders.delete(trackIndex);
  }
}

export function isTrackFrozen(trackIndex) {
  return frozenTracks.has(trackIndex);
}

export function getFrozenTracks() {
  return Array.from(frozenTracks.keys());
}

// Live Input Management
export async function startLiveInput(config = {}) {
  return startLiveInputModule(config, getMasterBus);
}

export async function stopLiveInput() {
  return stopLiveInputModule();
}

export function updateLiveInputEffects(effectsConfig) {
  return updateLiveInputEffectsModule(effectsConfig);
}

export async function measureLiveInputLatency() {
  return measureLiveInputLatencyModule();
}

export async function startLiveInputRecording() {
  return startLiveInputRecordingModule();
}

export async function stopLiveInputRecording() {
  return stopLiveInputRecordingModule();
}

export function getLiveInputStatus() {
  return getLiveInputStatusModule();
}

// Export instruments for visualizer
export function getInstruments() {
  return instruments;
}

// Function to reorder effects in a track's effect chain
export function reorderTrackEffects(trackName, newEffectChain) {
  const instrumentData = instruments.get(trackName);
  if (!instrumentData) {return;}

  const { instrument } = instrumentData;

  // Disconnect current chain
  instrument.disconnect();

  // Reconnect with new order
  if (newEffectChain && newEffectChain.length > 0) {
    instrument.chain(...newEffectChain, getMasterBus());
  } else {
    instrument.connect(getMasterBus());
  }

  // Update stored effect chain
  instrumentData.effectChain = newEffectChain;
}

// Set callback for harmony visualization
export function setHarmonyCallback(callback) {
  harmonyCallback = callback;
}


// Apply master effect preset
export function applyMasterEffectPreset(presetData) {
  applyMasterEffectPresetModule(presetData);
}

