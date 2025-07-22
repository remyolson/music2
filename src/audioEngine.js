import * as Tone from 'tone';

let instruments = new Map();
let parts = [];
let isPlaying = false;
let effects = new Map();

function expandNotesWithRepeat(notes) {
  const expanded = [];
  notes.forEach(note => {
    if (note.repeat && note.repeat > 1) {
      for (let i = 0; i < note.repeat; i++) {
        expanded.push({
          ...note,
          time: note.time + (i * note.duration)
        });
      }
    } else {
      expanded.push(note);
    }
  });
  return expanded;
}

const availableEffects = {
  reverb: () => new Tone.Reverb({ 
    decay: 4.0,  // Increased for more natural room sound
    preDelay: 0.03,
    wet: 0.5 
  }),
  delay: () => new Tone.Delay({ delayTime: 0.25, feedback: 0.3, wet: 0.3 }),
  distortion: () => new Tone.Distortion({ distortion: 0.4, wet: 0.5 }),
  chorus: () => new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0.5 }),
  phaser: () => new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350, wet: 0.5 }),
  filter: () => new Tone.AutoFilter({ frequency: 1, depth: 1, wet: 0.5 }).start(),
  echo: () => new Tone.FeedbackDelay({ delayTime: 0.125, feedback: 0.5, wet: 0.4 }),
  tremolo: () => new Tone.Tremolo({ frequency: 10, depth: 0.5, wet: 0.5 }).start(),
  bitcrush: () => new Tone.BitCrusher({ bits: 4, wet: 0.5 }),
  wah: () => new Tone.AutoWah({ baseFrequency: 100, octaves: 6, sensitivity: 0, wet: 0.5 })
};

export function update(musicData) {
  cleanup();

  if (!musicData) return;

  Tone.Transport.bpm.value = musicData.tempo;

  const secondsPerBeat = 60 / musicData.tempo;

  musicData.tracks.forEach(track => {
    const { instrument, effectChain } = createInstrumentWithEffects(track);
    instruments.set(track.name, { instrument, effectChain });

    const expandedNotes = expandNotesWithRepeat(track.notes);

    const part = new Tone.Part((time, note) => {
      const volume = note.volume !== undefined ? note.volume : 0.7;
      const velocity = volume;

      let playInstrument = instrument;

      if (note.effect && availableEffects[note.effect]) {
        const noteEffect = effects.get(`${track.name}-${note.effect}-${time}`);
        if (!noteEffect) {
          const newEffect = availableEffects[note.effect]();
          if (note.effectLevel !== undefined) {
            newEffect.wet.value = note.effectLevel;
          }
          effects.set(`${track.name}-${note.effect}-${time}`, newEffect);
          newEffect.toDestination();
        }
      }

      if (track.instrument === 'drums_kit' || track.instrument === 'drums_electronic') {
        playInstrument[note.value].triggerAttackRelease(note.duration, time, velocity);
      } else {
        // Handle chords (arrays of notes)
        if (Array.isArray(note.value)) {
          const frequencies = note.value.map(midi => 
            Tone.Frequency(midi, 'midi').toFrequency()
          );
          playInstrument.triggerAttackRelease(frequencies, note.duration, time, velocity);
        } else {
          const frequency = Tone.Frequency(note.value, 'midi').toFrequency();
          playInstrument.triggerAttackRelease(frequency, note.duration, time, velocity);
        }
      }
    }, expandedNotes.map(note => ({
      time: note.time * secondsPerBeat,
      duration: note.duration * secondsPerBeat,
      value: note.value,
      volume: note.volume,
      effect: note.effect,
      effectLevel: note.effectLevel
    })));

    part.loop = true;
    part.loopEnd = getLoopEnd(musicData) * secondsPerBeat;
    parts.push(part);
  });
}

function createInstrumentWithEffects(track) {
  const instrument = createInstrument(track.instrument, track.settings);
  const effectChain = [];

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
      instrument.kick.chain(...effectChain, Tone.Destination);
      instrument.snare.chain(...effectChain, Tone.Destination);
    } else {
      instrument.kick.toDestination();
      instrument.snare.toDestination();
    }
  } else {
    if (effectChain.length > 0) {
      instrument.chain(...effectChain, Tone.Destination);
    } else {
      instrument.toDestination();
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
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: envelope.attack ?? transitionSettings.attack ?? 0.4,
          decay: envelope.decay ?? 0.2,
          sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.8,
          release: envelope.release ?? transitionSettings.release ?? 2.0
        }
      });

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
      return {
        kick: new Tone.MembraneSynth({
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
        }),
        snare: new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0
          }
        })
      };

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
        kick: new Tone.MembraneSynth({
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
        }),
        snare: new Tone.MetalSynth({
          frequency: 200,
          envelope: {
            attack: 0.001,
            decay: 0.1,
            release: 0.2
          },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5
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
}

export async function play() {
  if (isPlaying) return;

  await Tone.start();
  parts.forEach(part => part.start(0));
  Tone.Transport.start();
  isPlaying = true;
}

export function stop() {
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  isPlaying = false;
}

export function getTransport() {
  return Tone.Transport;
}