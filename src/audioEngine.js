import * as Tone from 'tone';

let instruments = new Map();
let parts = [];
let isPlaying = false;

export function update(musicData) {
  cleanup();
  
  if (!musicData) return;
  
  Tone.Transport.bpm.value = musicData.tempo;
  
  musicData.tracks.forEach(track => {
    const instrument = createInstrument(track.instrument);
    instruments.set(track.name, instrument);
    
    const part = new Tone.Part((time, note) => {
      if (track.instrument === 'synth_lead') {
        const frequency = Tone.Frequency(note.value, 'midi').toFrequency();
        instrument.triggerAttackRelease(frequency, note.duration, time);
      } else if (track.instrument === 'drums_kit') {
        instrument[note.value].triggerAttackRelease(note.duration, time);
      }
    }, track.notes.map(note => ({
      time: note.time,
      duration: note.duration,
      value: note.value
    })));
    
    part.loop = true;
    part.loopEnd = getLoopEnd(musicData);
    parts.push(part);
  });
}

function createInstrument(type) {
  if (type === 'synth_lead') {
    return new Tone.Synth().toDestination();
  } else if (type === 'drums_kit') {
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
      }).toDestination(),
      snare: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0
        }
      }).toDestination()
    };
  }
}

function getLoopEnd(musicData) {
  let maxTime = 0;
  musicData.tracks.forEach(track => {
    track.notes.forEach(note => {
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
  
  instruments.forEach(instrument => {
    if (instrument.dispose) {
      instrument.dispose();
    } else {
      Object.values(instrument).forEach(subInstrument => {
        if (subInstrument.dispose) subInstrument.dispose();
      });
    }
  });
  instruments.clear();
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