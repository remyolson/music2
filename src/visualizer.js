import { getTransport } from './audioEngine.js';

let svg = null;
let playhead = null;
let animationId = null;
let currentData = null;
let zoomLevel = 5; // Default zoom most zoomed in per new scale (1-5)
let zoomSlider = null;
let trackCountElement = null;
let jsonEditor = null;
let lineNumbers = null;

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

const NOTE_HEIGHT = 20;
const BASE_PIXELS_PER_BEAT = 100; // Base scale, will be multiplied by zoom
const PIANO_ROLL_HEIGHT = 500;
const MARGIN = 20;
const DEFAULT_VISIBLE_BARS = 6; // Show ~6 bars by default
const BEATS_PER_BAR = 4;

export function initialize() {
  svg = document.getElementById('piano-roll');
  zoomSlider = document.getElementById('zoom-slider');
  trackCountElement = document.getElementById('track-count');
  jsonEditor = document.getElementById('json-editor');
  lineNumbers = document.querySelector('.line-numbers');

  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      zoomLevel = parseFloat(e.target.value);
      if (currentData) {
        update(currentData);
      }
    });
  }
}

export function update(musicData) {
  if (!svg) return;

  currentData = musicData;

  svg.innerHTML = '';

  if (!musicData) return;

  // Update track count display
  if (trackCountElement) {
    const trackCount = musicData.tracks.length;
    trackCountElement.textContent = `${trackCount} track${trackCount !== 1 ? 's' : ''}`;
  }

  const loopEnd = getLoopEnd(musicData);
  const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoomLevel;
  const totalBeats = Math.max(loopEnd, DEFAULT_VISIBLE_BARS * BEATS_PER_BAR);
  const svgWidth = (totalBeats * pixelsPerBeat) + (MARGIN * 2);

  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${PIANO_ROLL_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  // Set explicit pixel width so container can scroll horizontally
  svg.setAttribute('width', `${svgWidth}px`);

  drawGrid(svgWidth, totalBeats, pixelsPerBeat);

  drawTracks(musicData, pixelsPerBeat);

  createPlayhead();

  startAnimation();
}

function drawGrid(width, totalBeats, pixelsPerBeat) {
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('class', 'grid');

  for (let beat = 0; beat <= totalBeats; beat++) {
    const x = MARGIN + (beat * pixelsPerBeat);
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

function drawTracks(musicData, pixelsPerBeat) {
  const tracksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  tracksGroup.setAttribute('class', 'tracks');

  let yOffset = MARGIN;
  const loopEnd = getLoopEnd(musicData);
  const trackWidth = (Math.max(loopEnd, DEFAULT_VISIBLE_BARS * BEATS_PER_BAR) * pixelsPerBeat) + MARGIN;

  musicData.tracks.forEach((track, trackIndex) => {
    // Create a group for the entire track
    const trackGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    trackGroup.setAttribute('class', 'track');
    trackGroup.setAttribute('data-track-index', trackIndex);

    // Create invisible background rect for hover/click detection
    const trackBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    trackBg.setAttribute('x', 0);
    trackBg.setAttribute('y', yOffset - 5);
    trackBg.setAttribute('width', trackWidth);
    trackBg.setAttribute('height', NOTE_HEIGHT + 10);
    trackBg.setAttribute('fill', 'transparent');
    trackBg.setAttribute('class', 'track-bg');
    trackBg.style.cursor = 'pointer';

    // Add hover and click event listeners
    trackBg.addEventListener('mouseenter', () => handleTrackHover(trackIndex, true));
    trackBg.addEventListener('mouseleave', () => handleTrackHover(trackIndex, false));
    trackBg.addEventListener('click', () => handleTrackClick(trackIndex));

    trackGroup.appendChild(trackBg);

    const trackLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    trackLabel.setAttribute('x', 5);
    trackLabel.setAttribute('y', yOffset + 15);
    trackLabel.setAttribute('fill', '#a0a0a0');
    trackLabel.setAttribute('font-size', '12');
    trackLabel.textContent = track.name;
    trackLabel.style.pointerEvents = 'none';
    trackGroup.appendChild(trackLabel);

    const notesForTrack = expandNotesWithRepeat(track.notes);
    notesForTrack.forEach((note, noteIndex) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', MARGIN + (note.time * pixelsPerBeat));
      rect.setAttribute('y', yOffset);
      rect.setAttribute('width', note.duration * pixelsPerBeat);
      rect.setAttribute('height', NOTE_HEIGHT);
      rect.setAttribute('class', 'note');
      rect.style.cursor = 'pointer';

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

      // Add hover and click event listeners to notes
      rect.addEventListener('mouseenter', () => handleTrackHover(trackIndex, true));
      rect.addEventListener('mouseleave', () => handleTrackHover(trackIndex, false));
      rect.addEventListener('click', () => handleTrackClick(trackIndex));

      const noteLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      noteLabel.setAttribute('x', MARGIN + (note.time * pixelsPerBeat) + 5);
      noteLabel.setAttribute('y', yOffset + 14);
      noteLabel.setAttribute('fill', '#000');
      noteLabel.setAttribute('font-size', '10');
      noteLabel.setAttribute('font-weight', 'bold');
      noteLabel.style.pointerEvents = 'none';

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

    tracksGroup.appendChild(trackGroup);
    yOffset += NOTE_HEIGHT + 30;
  });

  svg.appendChild(tracksGroup);
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
    // Use seconds for more accurate timing
    const seconds = transport.seconds;
    const bpm = transport.bpm.value;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = seconds / secondsPerBeat;

    const loopEnd = getLoopEnd(currentData);
    const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoomLevel;

    const loopedPosition = loopEnd > 0 ? totalBeats % loopEnd : totalBeats;
    const x = MARGIN + (loopedPosition * pixelsPerBeat);

    playhead.setAttribute('x1', x);
    playhead.setAttribute('x2', x);

    animationId = requestAnimationFrame(animate);
  }

  animate();
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

function handleTrackHover(trackIndex, isHovering) {
  if (!svg) return;

  const track = svg.querySelector(`.track[data-track-index="${trackIndex}"]`);
  if (!track) return;

  if (isHovering) {
    track.classList.add('track-hover');
  } else {
    track.classList.remove('track-hover');
  }
}

function handleTrackClick(trackIndex) {
  if (!jsonEditor || !currentData) return;

  // Find the line number where this track starts in the JSON
  const lineNumber = findTrackLineNumber(trackIndex);
  if (lineNumber === -1) return;

  // Calculate the position to scroll to
  const lineHeight = parseFloat(getComputedStyle(jsonEditor).lineHeight);
  const scrollPosition = (lineNumber - 1) * lineHeight;

  // Scroll the editor
  jsonEditor.scrollTop = scrollPosition;

  // Highlight the track in the JSON editor
  highlightTrackInEditor(trackIndex);
}

function findTrackLineNumber(trackIndex) {
  if (!jsonEditor) return -1;

  const jsonText = jsonEditor.value;
  const lines = jsonText.split('\n');

  let currentTrackIndex = -1;
  let insideTracks = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we're entering the tracks array
    if (line.includes('"tracks"') && line.includes('[')) {
      insideTracks = true;
      continue;
    }

    if (insideTracks) {
      // Check for start of a new track object
      if (line === '{') {
        currentTrackIndex++;
        if (currentTrackIndex === trackIndex) {
          return i + 1; // Return 1-based line number
        }
      }
    }
  }

  return -1;
}

function highlightTrackInEditor(trackIndex) {
  if (!jsonEditor) return;

  const jsonText = jsonEditor.value;
  const lines = jsonText.split('\n');

  let currentTrackIndex = -1;
  let insideTracks = false;
  let trackStartLine = -1;
  let trackEndLine = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('"tracks"') && line.includes('[')) {
      insideTracks = true;
      continue;
    }

    if (insideTracks) {
      if (line === '{' && braceCount === 0) {
        currentTrackIndex++;
        if (currentTrackIndex === trackIndex) {
          trackStartLine = i;
        }
      }

      if (trackStartLine !== -1) {
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;

        if (braceCount === 0 && line.includes('}')) {
          trackEndLine = i;
          break;
        }
      }
    }
  }

  if (trackStartLine !== -1 && trackEndLine !== -1) {
    // Calculate selection positions
    let startPos = 0;
    for (let i = 0; i < trackStartLine; i++) {
      startPos += lines[i].length + 1; // +1 for newline
    }

    let endPos = startPos;
    for (let i = trackStartLine; i <= trackEndLine; i++) {
      endPos += lines[i].length + 1;
    }

    // Set selection in the editor
    jsonEditor.focus();
    jsonEditor.setSelectionRange(startPos, endPos - 1);
  }
}