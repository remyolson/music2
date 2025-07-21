import { getTransport } from './audioEngine.js';

let svg = null;
let playhead = null;
let animationId = null;
let currentData = null;

const NOTE_HEIGHT = 20;
const PIXELS_PER_BEAT = 100;
const PIANO_ROLL_HEIGHT = 500;
const MARGIN = 20;
const FIXED_BARS = 16;
const BEATS_PER_BAR = 4;

export function initialize() {
  svg = document.getElementById('piano-roll');
}

export function update(musicData) {
  if (!svg) return;
  
  currentData = musicData;
  
  svg.innerHTML = '';
  
  if (!musicData) return;
  
  const loopEnd = getLoopEnd(musicData);
  const fixedBeats = FIXED_BARS * BEATS_PER_BAR;
  const svgWidth = (fixedBeats * PIXELS_PER_BEAT) + (MARGIN * 2);
  
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${PIANO_ROLL_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  
  drawGrid(svgWidth, fixedBeats);
  
  drawTracks(musicData);
  
  createPlayhead();
  
  startAnimation();
}

function drawGrid(width, loopEnd) {
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('class', 'grid');
  
  for (let beat = 0; beat <= loopEnd; beat++) {
    const x = MARGIN + (beat * PIXELS_PER_BEAT);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', PIANO_ROLL_HEIGHT);
    line.setAttribute('stroke', '#404040');
    line.setAttribute('stroke-width', beat % 4 === 0 ? 2 : 1);
    gridGroup.appendChild(line);
  }
  
  svg.appendChild(gridGroup);
}

function drawTracks(musicData) {
  const trackGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  trackGroup.setAttribute('class', 'tracks');
  
  let yOffset = MARGIN;
  
  musicData.tracks.forEach((track, trackIndex) => {
    const trackLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    trackLabel.setAttribute('x', 5);
    trackLabel.setAttribute('y', yOffset + 15);
    trackLabel.setAttribute('fill', '#a0a0a0');
    trackLabel.setAttribute('font-size', '12');
    trackLabel.textContent = track.name;
    trackGroup.appendChild(trackLabel);
    
    track.notes.forEach((note, noteIndex) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', MARGIN + (note.time * PIXELS_PER_BEAT));
      rect.setAttribute('y', yOffset);
      rect.setAttribute('width', note.duration * PIXELS_PER_BEAT);
      rect.setAttribute('height', NOTE_HEIGHT);
      const instrumentColors = {
        synth_lead: '#00ff88',
        synth_bass: '#0088ff',
        piano: '#ff00ff',
        strings: '#ffff00',
        brass: '#ff0088',
        drums_kit: '#ff8800'
      };
      rect.setAttribute('fill', instrumentColors[track.instrument] || '#888888');
      rect.setAttribute('rx', 2);
      rect.setAttribute('ry', 2);
      
      if (note.effect) {
        rect.setAttribute('stroke', '#ffffff');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('stroke-dasharray', '3,2');
      }
      
      if (note.volume !== undefined && note.volume !== 0.7) {
        rect.setAttribute('opacity', 0.3 + (note.volume * 0.7));
      }
      
      const noteLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      noteLabel.setAttribute('x', MARGIN + (note.time * PIXELS_PER_BEAT) + 5);
      noteLabel.setAttribute('y', yOffset + 14);
      noteLabel.setAttribute('fill', '#000');
      noteLabel.setAttribute('font-size', '10');
      noteLabel.setAttribute('font-weight', 'bold');
      
      if (track.instrument === 'synth_lead') {
        const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const midiNote = note.value;
        const octave = Math.floor(midiNote / 12);
        const noteName = pitchNames[midiNote % 12];
        noteLabel.textContent = `${noteName}${octave}`;
      } else {
        noteLabel.textContent = note.value;
      }
      
      trackGroup.appendChild(rect);
      trackGroup.appendChild(noteLabel);
    });
    
    yOffset += NOTE_HEIGHT + 30;
  });
  
  svg.appendChild(trackGroup);
}

function createPlayhead() {
  playhead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  playhead.setAttribute('class', 'playhead');
  playhead.setAttribute('x1', MARGIN);
  playhead.setAttribute('y1', 0);
  playhead.setAttribute('x2', MARGIN);
  playhead.setAttribute('y2', PIANO_ROLL_HEIGHT);
  playhead.setAttribute('stroke', '#ff0000');
  playhead.setAttribute('stroke-width', 2);
  svg.appendChild(playhead);
}

function startAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  function animate() {
    if (!playhead || !currentData) return;
    
    const transport = getTransport();
    const positionInBeats = transport.position;
    const [bars, beats, sixteenths] = positionInBeats.split(':').map(Number);
    const totalBeats = (bars * 4) + beats + (sixteenths / 4);
    
    const loopEnd = getLoopEnd(currentData);
    const fixedBeats = FIXED_BARS * BEATS_PER_BAR;
    
    const loopedPosition = loopEnd > 0 ? totalBeats % loopEnd : totalBeats;
    const x = MARGIN + (loopedPosition * PIXELS_PER_BEAT);
    
    if (x <= MARGIN + (fixedBeats * PIXELS_PER_BEAT)) {
      playhead.setAttribute('x1', x);
      playhead.setAttribute('x2', x);
      playhead.style.display = 'block';
    } else {
      playhead.style.display = 'none';
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  animate();
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