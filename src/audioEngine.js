import * as Tone from '../node_modules/tone/build/esm/index.js';
import { performanceOptimizer } from './performanceOptimizer.js';
import { updateLiveInputState } from './state.js';
import { audioHealthMonitor } from './audioHealthMonitor.js';

let instruments = new Map();
let parts = [];
let isPlaying = false;
let effects = new Map();
let harmonyCallback = null;

// Master bus for global effects
let masterBus = null;
let masterEffectChain = [];
let masterLimiter = null;
let masterCompressor = null;
let masterHighpass = null;

// Track temporary effects that need cleanup
let temporaryEffects = new Map();

// Live input state
let liveInput = null;
let liveInputEffectChain = [];
let liveInputMonitoringBus = null;
let liveInputRecorder = null;
let isLiveInputActive = false;
let liveInputLatency = 0;

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

// Safe parameter limits
const SAFE_LIMITS = {
  feedback: 0.7,      // Maximum feedback to prevent runaway
  wet: 0.6,          // Maximum wet level
  reverbDecay: 10,   // Maximum reverb decay time
  delayTime: 2,      // Maximum delay time
};

// Create effect with safety limits
function createSafeEffect(type, params = {}) {
  // Apply safety limits to parameters
  if (params.feedback !== undefined) {
    params.feedback = Math.min(params.feedback, SAFE_LIMITS.feedback);
  }
  if (params.wet !== undefined) {
    params.wet = Math.min(params.wet, SAFE_LIMITS.wet);
  }
  if (params.decay !== undefined) {
    params.decay = Math.min(params.decay, SAFE_LIMITS.reverbDecay);
  }
  if (params.delayTime !== undefined) {
    params.delayTime = Math.min(params.delayTime, SAFE_LIMITS.delayTime);
  }
  
  const effect = availableEffects[type]();
  
  // Apply parameters
  if (effect.set) {
    effect.set(params);
  } else {
    Object.keys(params).forEach(param => {
      if (effect[param] && effect[param].value !== undefined) {
        effect[param].value = params[param];
      }
    });
  }
  
  return effect;
}

const availableEffects = {
  reverb: () => new Tone.Freeverb({
    roomSize: 0.7,
    dampening: 3000,
    wet: 0.3
  }),
  delay: () => new Tone.FeedbackDelay({ 
    delayTime: 0.25, 
    feedback: 0.3,
    wet: 0.2
  }),
  distortion: () => new Tone.Distortion({ distortion: 0.4, wet: 0.5 }),
  chorus: () => new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 }),
  phaser: () => new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 }),
  filter: () => new Tone.AutoFilter({ frequency: 1, depth: 1, wet: 0.5 }).start(),
  echo: () => new Tone.FeedbackDelay({ delayTime: 0.125, feedback: 0.5, wet: 0.4 }),
  tremolo: () => new Tone.Tremolo({ frequency: 10, depth: 0.5, wet: 0.5 }).start(),
  bitcrush: () => new Tone.BitCrusher({ bits: 4, wet: 0.5 }),
  wah: () => new Tone.AutoWah({ baseFrequency: 100, octaves: 6, sensitivity: 0, wet: 0.5 }),
  pitchShift: () => new Tone.PitchShift({ pitch: 0, windowSize: 0.1, delayTime: 0, feedback: 0, wet: 1.0 }),
  harmonizer: () => {
    // Create a harmonizer with multiple pitch shifters
    const harmonizer = new Tone.Gain();
    
    // Create multiple pitch shifters for different harmony voices
    const voices = [];
    const maxVoices = 4; // Support up to 4 harmony voices
    
    for (let i = 0; i < maxVoices; i++) {
      const voice = {
        pitchShifter: new Tone.PitchShift({
          pitch: 0,
          windowSize: 0.1,
          delayTime: 0,
          feedback: 0,
          wet: 1.0
        }),
        gain: new Tone.Gain(0.5) // Individual voice level control
      };
      
      // Chain: input -> pitch shifter -> gain -> output
      voice.pitchShifter.connect(voice.gain);
      voices.push(voice);
    }
    
    // Dry signal path
    const dryGain = new Tone.Gain(1.0);
    
    // Mix control
    const wetGain = new Tone.Gain(0.5);
    const outputGain = new Tone.Gain(1.0);
    
    // Connect dry path
    harmonizer.connect(dryGain);
    dryGain.connect(outputGain);
    
    // Connect wet path (harmonies)
    voices.forEach(voice => {
      harmonizer.connect(voice.pitchShifter);
      voice.gain.connect(wetGain);
    });
    wetGain.connect(outputGain);
    
    // API for controlling the harmonizer
    harmonizer.setIntervals = function(intervals) {
      // intervals is an array like [3, 5, 12] for 3rd, 5th, octave
      intervals.forEach((interval, index) => {
        if (index < voices.length) {
          voices[index].pitchShifter.pitch = interval;
          voices[index].gain.gain.value = interval !== 0 ? 0.5 : 0;
        }
      });
      
      // Mute unused voices
      for (let i = intervals.length; i < voices.length; i++) {
        voices[i].gain.gain.value = 0;
      }
    };
    
    harmonizer.setVoiceLevel = function(voiceIndex, level) {
      if (voiceIndex >= 0 && voiceIndex < voices.length) {
        voices[voiceIndex].gain.gain.value = level;
      }
    };
    
    harmonizer.setMix = function(mix) {
      // mix: 0 = dry only, 1 = wet only
      dryGain.gain.value = 1 - mix;
      wetGain.gain.value = mix;
    };
    
    // Preset intervals
    harmonizer.presets = {
      maj3: [4, 7, 12],    // Major 3rd, 5th, octave
      min3: [3, 7, 12],    // Minor 3rd, 5th, octave
      fifth: [7, 12, 19],  // 5th, octave, octave+5th
      octave: [12, -12],   // Octave up and down
      power: [7, 12],      // Power chord (5th, octave)
      sus4: [5, 7, 12],    // Sus4 chord intervals
      jazz: [3, 6, 11],    // Minor 3rd, tritone, major 7th
      bon_iver: [3, 7, 10, 15] // Minor 3rd, 5th, minor 7th, minor 10th
    };
    
    harmonizer.applyPreset = function(presetName) {
      const preset = this.presets[presetName];
      if (preset) {
        this.setIntervals(preset);
      }
    };
    
    // Return the output
    harmonizer.output = outputGain;
    
    // Override connect to use output
    const originalConnect = harmonizer.connect.bind(harmonizer);
    harmonizer.connect = function(destination) {
      return outputGain.connect(destination);
    };
    
    return harmonizer;
  },
  freezeReverb: () => {
    // Create a freeze reverb with infinite sustain capability
    // Use Freeverb which doesn't require async initialization
    const reverb = new Tone.Freeverb({
      roomSize: 0.9,  // Large room but not too extreme
      dampening: 5000,  // More dampening to prevent harsh frequencies
      wet: 0.5  // Reduced wet level
    });
    
    // Add feedback delay for infinite sustain
    const feedbackDelay = new Tone.FeedbackDelay({
      delayTime: 0.5,
      feedback: 0.7,  // Reduced to safe level
      wet: 0.3
    });
    
    // Add modulation for tail movement
    const modulation = new Tone.Chorus({
      frequency: 0.5,
      delayTime: 2,
      depth: 0.3,
      wet: 0.3
    });
    
    // Create custom freeze control
    const freezeControl = {
      _frozen: false,
      _originalFeedback: 0.95,
      
      freeze: function(enable) {
        this._frozen = enable;
        if (enable) {
          feedbackDelay.feedback.value = 0.85;  // High but safe sustain
          reverb.roomSize.value = 0.95;  // Large room
        } else {
          feedbackDelay.feedback.value = 0.7;
          reverb.roomSize.value = 0.9;
        }
      },
      
      get frozen() {
        return this._frozen;
      }
    };
    
    // Chain the effects
    const chain = new Tone.Gain();
    chain.chain(reverb, feedbackDelay, modulation);
    
    // Attach freeze control to the chain
    chain.freezeControl = freezeControl;
    chain.freeze = (enable) => freezeControl.freeze(enable);
    
    return chain;
  }
};

export function update(musicData) {
  // Stop transport if playing to avoid timing conflicts
  if (Tone.Transport.state === "started") {
    Tone.Transport.stop();
  }
  
  cleanup();

  if (!musicData) return;

  Tone.Transport.bpm.value = musicData.tempo;

  const secondsPerBeat = 60 / musicData.tempo;

  musicData.tracks.forEach((track, trackIndex) => {
    const { instrument, effectChain } = createInstrumentWithEffects(track);
    instruments.set(track.name, { instrument, effectChain });

    const expandedNotes = expandNotesWithRepeat(track.notes);
    
    // Debug drum timing issues
    if (track.name === "Drums" || track.instrument === "drums_kit" || track.instrument === "drums_electronic") {
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

        let playInstrument = instrument;

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
        audioHealthMonitor.updateEffectCount(effects.size + masterEffectChain.length);
        
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
          audioHealthMonitor.updateEffectCount(effects.size + masterEffectChain.length);
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
          playInstrument.kick.triggerAttackRelease('C2', 0.1, time, velocity);
        } else {
          // Snare uses regular synth
          playInstrument.snare.triggerAttackRelease('A4', 0.05, time, velocity);
        }
      } else {
        // Handle chords (arrays of notes)
        if (Array.isArray(note.value)) {
          const frequencies = note.value.map(midi =>
            Tone.Frequency(midi, 'midi').toFrequency()
          );
          playInstrument.triggerAttackRelease(frequencies, note.duration + "s", time, velocity);
        } else {
          const frequency = Tone.Frequency(note.value, 'midi').toFrequency();
          playInstrument.triggerAttackRelease(frequency, note.duration + "s", time, velocity);
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
  });
}

function createInstrumentWithEffects(track) {
  const instrument = createInstrument(track.instrument, track.settings);
  const effectChain = [];
  
  // Add gain stage to reduce individual instrument volumes
  const instrumentGain = new Tone.Gain(0.5); // Reduce each instrument by 50%
  effectChain.push(instrumentGain);

  // Apply global effects from track settings first
  if (track.settings?.globalEffects) {
    track.settings.globalEffects.forEach(globalEffect => {
      if (availableEffects[globalEffect.type]) {
        const effect = availableEffects[globalEffect.type]();
        if (effect.wet) {
          effect.wet.value = globalEffect.level ?? 0.5;
        }
        effectChain.push(effect);
      }
    });
  }

  // Collect unique note-level effects (for backward compatibility)
  const trackEffects = new Set();
  track.notes.forEach(note => {
    if (note.effect && availableEffects[note.effect]) {
      trackEffects.add(note.effect);
    }
  });

  trackEffects.forEach(effectName => {
    // Skip if already added as global effect
    const isGlobal = track.settings?.globalEffects?.some(e => e.type === effectName);
    if (!isGlobal) {
      const effect = availableEffects[effectName]();
      effectChain.push(effect);
    }
  });

  if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
    if (effectChain.length > 0) {
      instrument.kick.chain(...effectChain, getMasterBus());
      instrument.snare.chain(...effectChain, getMasterBus());
    } else {
      instrument.kick.connect(getMasterBus());
      instrument.snare.connect(getMasterBus());
    }
  } else {
    if (effectChain.length > 0) {
      instrument.chain(...effectChain, getMasterBus());
    } else {
      instrument.connect(getMasterBus());
    }
  }

  return { instrument, effectChain };
}

function createInstrument(type, settings) {
  const envelope = settings?.envelope || {};
  const noteTransition = settings?.noteTransition || 'normal';
  const portamentoTime = settings?.portamento || 0;

  // Apply note transition presets - enhanced for smoother sound
  const transitionPresets = {
    smooth: { attack: 0.1, release: 1.5, sustain: 0.8 },
    legato: { attack: 0.02, release: 0.3, sustain: 0.9 },
    staccato: { attack: 0.001, release: 0.05, sustain: 0.2 },
    normal: { attack: 0.02, release: 0.5, sustain: 0.7 }
  };

  const transitionSettings = transitionPresets[noteTransition] || {};

  switch (type) {
    case 'synth_lead':
      return new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.02,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 1.0
        },
        portamento: portamentoTime
      });

    case 'synth_bass':
      return new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.005,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.4,
          release: envelope.release ?? transitionSettings.release ?? 0.7
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5,
          baseFrequency: 200,
          octaves: 2.5
        },
        portamento: portamentoTime
      });

    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fmsine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 0.4,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.6,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        }
      });

    case 'strings':
      const stringSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.8,
        modulationIndex: 5,
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.4,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.35,
          decay: 0.3,
          sustain: 0.7,
          release: 1.5
        }
      });
      // Add a lowpass filter to remove high frequency buzz
      const stringFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 2000,
        rolloff: -24
      });
      stringSynth.connect(stringFilter);
      return stringFilter;

    case 'brass':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.02,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.4
        },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.5,
          release: 0.4,
          baseFrequency: 300,
          octaves: 3
        },
        portamento: portamentoTime
      });

    case 'drums_kit':
      // Create multiple instances for polyphony
      const drumKit = {
        kick: new Tone.PolySynth(Tone.MembraneSynth, {
          maxPolyphony: 8,
          voice: {
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.001,
              decay: 0.4,
              sustain: 0.01,
              release: 1.4,
              attackCurve: 'exponential'
            }
          }
        }),
        // Create a simple synth for snare
        snare: new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.1
          }
        })
      };
      return drumKit;

    case 'electric_guitar':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.5,
          release: 0.2,
          baseFrequency: 400,
          octaves: 2.5
        },
        portamento: portamentoTime
      });

    case 'organ':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.2
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.3,
          release: 0.5
        }
      });

    case 'flute':
      return new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.1,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.8,
          release: 0.5,
          baseFrequency: 800,
          octaves: 2
        },
        portamento: portamentoTime
      });

    case 'harp':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 2.0,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        }
      });

    case 'drums_electronic':
      return {
        kick: new Tone.PolySynth(Tone.MembraneSynth, {
          maxPolyphony: 8,
          voice: {
            pitchDecay: 0.08,
            octaves: 6,
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.001,
              decay: 0.3,
              sustain: 0.0,
              release: 0.5,
              attackCurve: 'exponential'
            }
          }
        }),
        // Use FM synth for electronic snare
        snare: new Tone.FMSynth({
          harmonicity: 0.5,
          modulationIndex: 10,
          oscillator: { type: 'square' },
          envelope: {
            attack: 0.001,
            decay: 0.06,
            sustain: 0,
            release: 0.07
          },
          modulation: { type: 'square' },
          modulationEnvelope: {
            attack: 0.001,
            decay: 0.06,
            sustain: 0,
            release: 0.07
          }
        })
      };

    case 'marimba':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 1.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.002,
          decay: 0.2,
          sustain: 0.0,
          release: 0.2
        }
      });

    case 'trumpet':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.7,
          release: 0.3,
          baseFrequency: 600,
          octaves: 3.5
        },
        portamento: portamentoTime
      });

    case 'violin':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.1,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 1.0
        }
      });

    case 'saxophone':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.03,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.03,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5,
          baseFrequency: 500,
          octaves: 3
        },
        portamento: portamentoTime
      });

    case 'pad_synth':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.8,
          decay: envelope.decay ?? 0.5,
          sustain: envelope.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        }
      });

    case 'celesta':
      return new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 15,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.002,
          decay: envelope.decay ?? 1.5,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.001,
          decay: 0.5,
          sustain: 0.0,
          release: 0.5
        }
      });

    case 'vibraphone':
      const vibeSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.01,
          decay: envelope.decay ?? 2.0,
          sustain: envelope.sustain ?? 0.2,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.5,
          sustain: 0.2,
          release: 0.5
        }
      });
      // Add vibrato for authentic vibraphone sound
      const vibrato = new Tone.Vibrato({
        frequency: 5,
        depth: 0.1
      });
      vibeSynth.connect(vibrato);
      return vibrato;

    case 'xylophone':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
          decay: envelope.decay ?? 0.3,
          sustain: envelope.sustain ?? 0.0,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        }
      });

    case 'clarinet':
      return new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.7,
          release: envelope.release ?? transitionSettings.release ?? 0.3
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.2,
          sustain: 0.6,
          release: 0.3,
          baseFrequency: 800,
          octaves: 1.5
        },
        portamento: portamentoTime
      });

    case 'tuba':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? transitionSettings.release ?? 0.5
        },
        filterEnvelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5,
          baseFrequency: 150,
          octaves: 2
        },
        portamento: portamentoTime
      });

    case 'choir':
      const choirSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 5, spread: 40 },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.4,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 1.5
        }
      });
      // Add filter for "ah" vowel sound
      const choirFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: 700,
        Q: 5
      });
      choirSynth.connect(choirFilter);
      return choirFilter;

    case 'banjo':
      return new Tone.PluckSynth({
        attackNoise: 3,
        dampening: 3500,
        resonance: 0.95,
        release: envelope.release ?? transitionSettings.release ?? 0.5
      });

    case 'electric_piano':
      return new Tone.PolySynth(Tone.DuoSynth, {
        vibratoAmount: 0.5,
        vibratoRate: 5,
        harmonicity: 1.5,
        voice0: {
          volume: -10,
          oscillator: { type: 'sine' },
          envelope: {
            attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
            decay: envelope.decay ?? 0.3,
            sustain: envelope.sustain ?? 0.5,
            release: envelope.release ?? transitionSettings.release ?? 1.0
          }
        },
        voice1: {
          volume: -20,
          oscillator: { type: 'sine' },
          envelope: {
            attack: envelope.attack ?? transitionSettings.attack ?? 0.001,
            decay: envelope.decay ?? 0.3,
            sustain: envelope.sustain ?? 0.5,
            release: envelope.release ?? transitionSettings.release ?? 1.0
          }
        }
      });

    case 'granular_pad':
      // Create a custom granular pad synthesizer with evolving textures
      const grainSize = settings?.grainSize || 0.1;
      const grainDensity = settings?.grainDensity || 10;
      const shimmer = settings?.shimmer || 0.3;
      
      // Using multiple detuned voices to create granular-like texture
      const granularPad = new Tone.PolySynth({
        maxPolyphony: 8,
        voice: Tone.FatOscillator,
        options: {
          oscillator: {
            type: 'sawtooth',
            count: 3,
            spread: 40
          },
          envelope: {
            attack: envelope.attack ?? 2.0,  // Long attack for evolving sound
            decay: envelope.decay ?? 1.0,
            sustain: envelope.sustain ?? 0.8,
            release: envelope.release ?? 4.0  // Long release for ambient tails
          }
        }
      });
      
      // Add shimmer effect with chorus and slight pitch modulation
      const shimmerChorus = new Tone.Chorus({
        frequency: 2 * shimmer,
        delayTime: 5,
        depth: 0.5,
        wet: shimmer
      });
      
      // Add subtle tremolo for movement
      const tremolo = new Tone.Tremolo({
        frequency: grainDensity / 4,
        depth: 0.2,
        wet: 0.3
      }).start();
      
      // Add filter for warmth
      const warmthFilter = new Tone.Filter({
        type: 'lowpass',
        frequency: 3000,
        rolloff: -12
      });
      
      // Create feedback delay for spaciousness
      const spatialDelay = new Tone.FeedbackDelay({
        delayTime: grainSize,
        feedback: 0.4,
        wet: 0.3
      });
      
      // Connect the chain
      granularPad.chain(shimmerChorus, tremolo, warmthFilter, spatialDelay);
      
      return spatialDelay;

    case 'vocoder_synth':
      // Create a vocoder-style synth with formant filtering and pitch correction
      const vocoderCarrier = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? 0.05,
          decay: envelope.decay ?? 0.1,
          sustain: envelope.sustain ?? 0.9,
          release: envelope.release ?? 0.5
        }
      });
      
      // Create 5-band formant filter bank
      const formantFrequencies = [700, 1220, 2600, 3200, 4400]; // Formant frequencies
      const formantQ = [12, 10, 8, 8, 6]; // Q values for each formant
      const formantGains = [0, -5, -10, -15, -20]; // Relative gains in dB
      
      const formantFilters = formantFrequencies.map((freq, i) => {
        const filter = new Tone.Filter({
          type: 'bandpass',
          frequency: freq,
          Q: formantQ[i]
        });
        const gain = new Tone.Gain(Tone.dbToGain(formantGains[i]));
        return { filter, gain };
      });
      
      // Create parallel filter bank
      const filterMixer = new Tone.Gain(0.3); // Reduce overall level to prevent clipping
      
      // Connect carrier to all formant filters in parallel
      formantFilters.forEach(({ filter, gain }) => {
        vocoderCarrier.connect(filter);
        filter.connect(gain);
        gain.connect(filterMixer);
      });
      
      // Add gentle pitch correction using AutoFilter modulation
      const pitchModulation = new Tone.AutoFilter({
        frequency: 4,
        depth: 0.1,
        baseFrequency: 1000,
        octaves: 2,
        wet: 0.2
      }).start();
      
      // Add smooth portamento for voice-like glides
      vocoderCarrier.set({ portamento: portamentoTime || 0.05 });
      
      // Connect the chain
      filterMixer.connect(pitchModulation);
      
      // Store formant control for dynamic adjustment
      pitchModulation.formantControl = (formantShift) => {
        // Shift formant frequencies based on formant parameter (-5 to +5)
        const shiftFactor = Math.pow(2, formantShift / 12); // Convert to frequency ratio
        formantFilters.forEach(({ filter }, i) => {
          filter.frequency.value = formantFrequencies[i] * shiftFactor;
        });
      };
      
      return pitchModulation;

    default:
      return new Tone.Synth();
  }
}

function getLoopEnd(musicData) {
  let maxTime = 0;
  musicData.tracks.forEach(track => {
    const notes = expandNotesWithRepeat(track.notes);
    notes.forEach(note => {
      const endTime = note.time + note.duration;
      if (endTime > maxTime) maxTime = endTime;
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
        if (effect.dispose) effect.dispose();
      });
    }

    if (instrument.dispose) {
      instrument.dispose();
    } else if (typeof instrument === 'object') {
      Object.values(instrument).forEach(subInstrument => {
        if (subInstrument.dispose) subInstrument.dispose();
      });
    }
  });
  instruments.clear();

  effects.forEach(effect => {
    if (effect.dispose) effect.dispose();
  });
  effects.clear();
  
  // Clean up any temporary effects
  temporaryEffects.forEach(effect => {
    if (effect.dispose) effect.dispose();
  });
  temporaryEffects.clear();
  
  // Cancel all scheduled events to prevent lingering effects
  Tone.Transport.cancel();
}

export async function play() {
  if (isPlaying) return;

  // Ensure audio context is started
  if (Tone.context.state !== 'running') {
    await Tone.start();
    console.log('Audio context started');
  }
  
  // Initialize and start health monitoring
  audioHealthMonitor.initialize();
  audioHealthMonitor.startMonitoring();
  
  // Update effect count
  const totalEffects = effects.size + masterEffectChain.length + temporaryEffects.size;
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
  const offlineContext = new Tone.OfflineContext(2, duration, 44100);
  
  // Get the track's part and instrument
  const part = parts.find(p => p.trackIndex === trackIndex);
  if (!part) return;
  
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
  if (isLiveInputActive) {
    console.warn('Live input already active');
    return;
  }

  try {
    // Start Tone.js context if not already started
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    // Create UserMedia source
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: config.echoCancellation ?? false,
        noiseSuppression: config.noiseSuppression ?? false,
        autoGainControl: config.autoGainControl ?? false,
        latency: 0
      }
    });

    // Create Tone.js UserMedia node
    liveInput = new Tone.UserMedia();
    await liveInput.open(stream);

    // Create monitoring bus for low-latency monitoring
    liveInputMonitoringBus = new Tone.Gain(1);
    
    // Initialize effect chain
    updateLiveInputEffects(config.effects || []);

    // Connect routing
    if (liveInputEffectChain.length > 0) {
      liveInput.chain(...liveInputEffectChain, liveInputMonitoringBus);
    } else {
      liveInput.connect(liveInputMonitoringBus);
    }

    // Connect to both monitoring and main outputs
    if (config.monitor !== false) {
      liveInputMonitoringBus.connect(getMasterBus());
    }

    isLiveInputActive = true;

    // Measure latency
    await measureLiveInputLatency();
    
    // Update state
    updateLiveInputState({
      active: true,
      latency: liveInputLatency,
      effectCount: liveInputEffectChain.length
    });

    return {
      success: true,
      latency: liveInputLatency
    };
  } catch (error) {
    console.error('Failed to start live input:', error);
    throw error;
  }
}

export async function stopLiveInput() {
  if (!isLiveInputActive) {
    return;
  }

  try {
    // Smooth fade out to prevent pops
    if (liveInputMonitoringBus) {
      await liveInputMonitoringBus.gain.rampTo(0, 0.1);
    }

    // Disconnect and dispose
    if (liveInput) {
      liveInput.close();
      liveInput.dispose();
      liveInput = null;
    }

    // Clean up effects
    liveInputEffectChain.forEach(effect => {
      effect.disconnect();
      effect.dispose();
    });
    liveInputEffectChain = [];

    if (liveInputMonitoringBus) {
      liveInputMonitoringBus.disconnect();
      liveInputMonitoringBus.dispose();
      liveInputMonitoringBus = null;
    }

    // Stop any active recording
    if (liveInputRecorder) {
      await liveInputRecorder.stop();
      liveInputRecorder.dispose();
      liveInputRecorder = null;
    }

    isLiveInputActive = false;
    
    // Update state
    updateLiveInputState({
      active: false,
      latency: 0,
      recording: false,
      effectCount: 0
    });
  } catch (error) {
    console.error('Error stopping live input:', error);
  }
}

export function updateLiveInputEffects(effectsConfig) {
  if (!liveInput) return;

  // Disconnect existing chain
  liveInput.disconnect();
  liveInputEffectChain.forEach(effect => {
    effect.disconnect();
    effect.dispose();
  });
  liveInputEffectChain = [];

  // Create new effects chain
  effectsConfig.forEach(effectConfig => {
    if (availableEffects[effectConfig.type]) {
      const effect = availableEffects[effectConfig.type]();
      
      // Apply effect parameters
      if (effectConfig.params) {
        Object.entries(effectConfig.params).forEach(([key, value]) => {
          if (effect[key] !== undefined) {
            if (typeof effect[key] === 'object' && effect[key].value !== undefined) {
              effect[key].value = value;
            } else {
              effect[key] = value;
            }
          }
        });
      }

      // Set wet/dry mix
      if (effect.wet && effectConfig.mix !== undefined) {
        effect.wet.value = effectConfig.mix;
      }

      // Handle special effects like harmonizer
      if (effectConfig.type === 'harmonizer' && effectConfig.intervals) {
        effect.setIntervals(effectConfig.intervals);
      }

      liveInputEffectChain.push(effect);
    }
  });

  // Reconnect with new chain
  if (liveInputEffectChain.length > 0) {
    liveInput.chain(...liveInputEffectChain, liveInputMonitoringBus);
  } else {
    liveInput.connect(liveInputMonitoringBus);
  }
  
  // Update state
  updateLiveInputState({
    effectCount: liveInputEffectChain.length
  });
}

export async function measureLiveInputLatency() {
  if (!liveInput || !isLiveInputActive) return;

  try {
    // Create test signal
    const osc = new Tone.Oscillator(1000, 'sine');
    const envelope = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.001,
      sustain: 0,
      release: 0.001
    });

    // Connect test signal
    osc.connect(envelope);
    envelope.connect(getMasterBus());

    // Measure round-trip time
    const startTime = Tone.now();
    osc.start();
    envelope.triggerAttackRelease(0.001);

    // Estimate latency based on buffer size and sample rate
    const bufferSize = Tone.context.baseLatency * Tone.context.sampleRate;
    const outputLatency = Tone.context.outputLatency || 0;
    
    liveInputLatency = Math.round((bufferSize / Tone.context.sampleRate + outputLatency) * 1000);

    // Clean up
    osc.stop();
    osc.dispose();
    envelope.dispose();

    return liveInputLatency;
  } catch (error) {
    console.error('Error measuring latency:', error);
    return 0;
  }
}

export async function startLiveInputRecording() {
  if (!isLiveInputActive || liveInputRecorder) {
    return null;
  }

  try {
    // Create recorder connected to the monitoring bus (post-effects)
    liveInputRecorder = new Tone.Recorder();
    liveInputMonitoringBus.connect(liveInputRecorder);
    
    // Start recording
    await liveInputRecorder.start();
    
    // Update state
    updateLiveInputState({
      recording: true
    });
    
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return null;
  }
}

export async function stopLiveInputRecording() {
  if (!liveInputRecorder) {
    return null;
  }

  try {
    // Stop recording and get the audio buffer
    const recording = await liveInputRecorder.stop();
    const audioBuffer = await Tone.context.decodeAudioData(await recording.arrayBuffer());
    
    // Convert to Tone.js ToneAudioBuffer
    const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);
    
    // Clean up recorder
    liveInputRecorder.dispose();
    liveInputRecorder = null;
    
    // Update state
    updateLiveInputState({
      recording: false
    });
    
    return {
      buffer: toneBuffer,
      duration: audioBuffer.duration
    };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return null;
  }
}

export function getLiveInputStatus() {
  return {
    active: isLiveInputActive,
    latency: liveInputLatency,
    recording: liveInputRecorder !== null,
    effectCount: liveInputEffectChain.length
  };
}

// Export instruments for visualizer
export function getInstruments() {
  return instruments;
}

// Function to reorder effects in a track's effect chain
export function reorderTrackEffects(trackName, newEffectChain) {
  const instrumentData = instruments.get(trackName);
  if (!instrumentData) return;
  
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

// Initialize master bus
function initializeMasterBus() {
  if (!masterBus) {
    masterBus = new Tone.Gain(0.2); // Further reduce gain to prevent clipping
    
    // Create a compressor for dynamic control
    if (!masterCompressor) {
      masterCompressor = new Tone.Compressor({
        threshold: -12,
        ratio: 4,
        attack: 0.003,
        release: 0.25
      });
    }
    
    // Create a highpass filter for DC blocking (20Hz cutoff)
    if (!masterHighpass) {
      masterHighpass = new Tone.Filter({
        type: "highpass",
        frequency: 20,
        rolloff: -24
      });
    }
    
    // Create a limiter to prevent clipping
    if (!masterLimiter) {
      masterLimiter = new Tone.Limiter(-6); // Even more conservative limiting
    }
    
    // Connect master bus through processing chain to destination
    if (masterEffectChain.length > 0) {
      masterBus.chain(...masterEffectChain, masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    } else {
      masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    }
    
    // Initialize and start health monitoring
    audioHealthMonitor.initialize();
    audioHealthMonitor.startMonitoring();
  }
  return masterBus;
}

// Apply master effect preset
export function applyMasterEffectPreset(presetData) {
  // Initialize master bus if needed
  initializeMasterBus();
  
  // Clean up old effects
  masterEffectChain.forEach(effect => {
    effect.disconnect();
    effect.dispose();
  });
  masterEffectChain = [];
  
  // If no preset data or effects, just connect through processing chain
  if (!presetData || !presetData.effects || presetData.effects.length === 0) {
    masterBus.disconnect();
    masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
    return;
  }
  
  // Create new effects chain
  presetData.effects.forEach(effectConfig => {
    const effectType = effectConfig.type;
    const params = effectConfig.params || {};
    
    if (availableEffects[effectType]) {
      const effect = availableEffects[effectType]();
      
      // Apply parameters
      if (effectType === 'harmonizer') {
        // Special handling for harmonizer
        if (params.intervals && effect.setIntervals) {
          effect.setIntervals(params.intervals);
        }
        if (params.mix !== undefined && effect.setMix) {
          effect.setMix(params.mix);
        }
      } else if (effectType === 'freezeReverb') {
        // Special handling for freezeReverb parameters
        if (params.decay && effect.children && effect.children[0]) {
          effect.children[0].roomSize.value = Math.min(params.decay / 100, 0.99);
        }
        if (params.wet !== undefined) {
          effect.wet.value = params.wet;
        }
      } else if (effect.set) {
        // For standard Tone.js effects
        try {
          effect.set(params);
        } catch (e) {
          // Fallback to manual parameter setting
          Object.keys(params).forEach(param => {
            if (effect[param] && effect[param].value !== undefined) {
              effect[param].value = params[param];
            }
          });
        }
      } else {
        // Manual parameter setting
        Object.keys(params).forEach(param => {
          if (effect[param] && effect[param].value !== undefined) {
            effect[param].value = params[param];
          }
        });
      }
      
      masterEffectChain.push(effect);
    }
  });
  
  // Reconnect with new effect chain through processing chain
  masterBus.disconnect();
  if (masterEffectChain.length > 0) {
    masterBus.chain(...masterEffectChain, masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
  } else {
    masterBus.chain(masterCompressor, masterHighpass, masterLimiter, Tone.Destination);
  }
}

// Get master bus (creates it if it doesn't exist)
function getMasterBus() {
  return initializeMasterBus();
}