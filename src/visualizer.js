import { getTransport, applyTrackSelection } from './audioEngine.js';
import { updateJSONDisplay } from './inputHandler.js';
import * as Tone from 'tone';

let svg = null;
let playhead = null;
let animationId = null;
let currentData = null;
let zoomLevel = 2; // Default zoom level (1-5, was 5)
let zoomSlider = null;
let trackCountElement = null;
let jsonEditor = null;
let lineNumbers = null;
export const selectedTracks = new Set();

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

  // Add click-to-seek listener
  svg.addEventListener('click', handlePianoRollClick);

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
        drums_kit: '#ff8800',
        electric_guitar: '#00ffff',
        organ: '#8800ff',
        flute: '#88ff00',
        harp: '#ff88ff',
        drums_electronic: '#ff4400',
        marimba: '#00ff00',
        trumpet: '#ff6600',
        violin: '#ff00cc',
        saxophone: '#6600ff',
        pad_synth: '#00ccff',
        celesta: '#ccffcc',
        vibraphone: '#ffccff',
        xylophone: '#ccccff',
        clarinet: '#ffcc88',
        tuba: '#cc8800',
        choir: '#ff88cc',
        banjo: '#88cc00',
        electric_piano: '#88ffcc'
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

      // Always display the value field content
      noteLabel.textContent = note.value;

      trackGroup.appendChild(rect);
      trackGroup.appendChild(noteLabel);
    });

    // Add track label LAST so it appears on top of everything
    const trackLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    trackLabel.setAttribute('x', 5);
    trackLabel.setAttribute('y', yOffset + 15);
    trackLabel.setAttribute('fill', '#a0a0a0');
    trackLabel.setAttribute('font-size', '12');
    trackLabel.textContent = track.name;
    trackLabel.style.pointerEvents = 'none';
    trackGroup.appendChild(trackLabel);

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

  let prevLoopedPosition = 0;

  function animate() {
    if (!playhead || !currentData) return;

    const transport = getTransport();
    // Transport.seconds is ahead by lookAhead; compensate so visual matches audible output
    const lookAhead = Tone.getContext().lookAhead || 0;
    let seconds = transport.seconds - lookAhead;
    if (seconds < 0) seconds = 0;
    const bpm = transport.bpm.value;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = seconds / secondsPerBeat;

    const loopEnd = getLoopEnd(currentData);
    const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoomLevel;

    const loopedPosition = loopEnd > 0 ? totalBeats % loopEnd : totalBeats;

    // Detect wrap-around (loop restart)
    const visContainer = document.getElementById('visualizer');
    if (loopedPosition < prevLoopedPosition && visContainer) {
      visContainer.scrollLeft = 0;
    }
    prevLoopedPosition = loopedPosition;

    const x = MARGIN + (loopedPosition * pixelsPerBeat);

    playhead.setAttribute('x1', x);
    playhead.setAttribute('x2', x);

    // Auto-scroll container to keep playhead near center
    const container = document.getElementById('visualizer');
    if (container) {
      const center = container.clientWidth / 2;
      const desiredScroll = Math.max(0, x - center);
      // Only update if beyond center for smoothness
      if (x > container.scrollLeft + center) {
        container.scrollLeft = desiredScroll;
      }
    }

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

  // Toggle selection set
  if (selectedTracks.has(trackIndex)) {
    selectedTracks.delete(trackIndex);
  } else {
    selectedTracks.add(trackIndex);
  }

  // Update SVG track-selected class
  const trackGroup = svg.querySelector(`.track[data-track-index="${trackIndex}"]`);
  if (trackGroup) {
    if (selectedTracks.has(trackIndex)) {
      trackGroup.classList.add('track-selected');
    } else {
      trackGroup.classList.remove('track-selected');
    }
  }

  // Apply muting based on selection
  applyTrackSelection(selectedTracks);

  // Update JSON display to show only selected tracks
  updateJSONDisplay();

  // Don't navigate to specific lines when filtering is active
  if (selectedTracks.size === 0) {
    // Navigate JSON to track name line only when showing full JSON
    const lineNumber = findTrackNameLine(trackIndex);
    if (lineNumber !== -1) {
      const lineHeight = parseFloat(getComputedStyle(jsonEditor).lineHeight);
      jsonEditor.scrollTop = (lineNumber - 1) * lineHeight;
      highlightTrackNameInEditor(trackIndex);
    }
  }
}

function findTrackNameLine(trackIndex) {
  if (!jsonEditor) return -1;
  const lines = jsonEditor.value.split('\n');
  let currentTrackIndex = -1;
  let insideTracks = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"tracks"') && line.includes('[')) {
      insideTracks = true;
      continue;
    }
    if (insideTracks) {
      if (line.trim().startsWith('{')) {
        currentTrackIndex++;
      }
      if (currentTrackIndex === trackIndex && line.includes('"name"')) {
        return i + 1; // 1-based
      }
    }
  }
  return -1;
}

function highlightTrackNameInEditor(trackIndex) {
  if (!jsonEditor) return;
  const lines = jsonEditor.value.split('\n');
  let pos = 0;
  let currentTrackIndex = -1;
  let insideTracks = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"tracks"') && line.includes('[')) {
      insideTracks = true;
      pos += line.length + 1;
      continue;
    }
    if (insideTracks) {
      if (line.trim().startsWith('{')) currentTrackIndex++;
      if (currentTrackIndex === trackIndex && line.includes('"name"')) {
        const start = pos + line.indexOf(':') + 2; // start of value
        const end = line.endsWith(',') ? pos + line.length - 1 : pos + line.length;
        jsonEditor.focus();
        jsonEditor.setSelectionRange(start, end);
        return;
      }
    }
    pos += line.length + 1;
  }
}

function handlePianoRollClick(event) {
  // Check if click is on a track element (note, track background, etc)
  const clickedElement = event.target;
  const isTrackElement = clickedElement.classList.contains('note') || 
                        clickedElement.classList.contains('track-bg') ||
                        clickedElement.closest('.track');
  
  // If clicked on a track element, let the track handlers handle it
  if (isTrackElement) {
    return;
  }
  
  // Get click position relative to SVG
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  
  // Transform to SVG coordinate space
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  
  // Convert X position to beats
  const clickedX = svgPt.x;
  const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoomLevel;
  const clickedBeat = Math.max(0, (clickedX - MARGIN) / pixelsPerBeat);
  
  // Get transport and calculate time in seconds
  const transport = getTransport();
  const bpm = transport.bpm.value;
  const secondsPerBeat = 60 / bpm;
  const clickedTime = clickedBeat * secondsPerBeat;
  
  // Get loop end to constrain seek position
  const loopEnd = getLoopEnd(currentData);
  const loopEndTime = loopEnd * secondsPerBeat;
  
  // Set transport position (constrain to loop bounds if looping)
  if (loopEnd > 0 && clickedTime >= loopEndTime) {
    // If clicking beyond loop end, wrap to start
    transport.seconds = clickedTime % loopEndTime;
  } else {
    transport.seconds = clickedTime;
  }
}