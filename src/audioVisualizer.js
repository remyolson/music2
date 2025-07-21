import * as Tone from 'tone';

let analyser = null;
let canvas = null;
let ctx = null;
let animationId = null;
let isInitialized = false;

const BARS = 32;
const BAR_WIDTH_RATIO = 0.8;
const MIN_HEIGHT = 2;
const SMOOTHING = 0.8;

export function init(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  
  // Create analyser and connect to master output
  analyser = new Tone.Analyser({
    type: 'fft',
    size: 64,
    smoothing: SMOOTHING
  });
  
  // Connect to master output
  Tone.Destination.connect(analyser);
  
  isInitialized = true;
  
  // Set initial canvas size
  resizeCanvas();
  
  // Start idle animation
  startAnimation();
}

function resizeCanvas() {
  if (!canvas) return;
  
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

function drawIdleState() {
  if (!ctx || !canvas) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const barWidth = canvas.width / BARS;
  const spacing = barWidth * (1 - BAR_WIDTH_RATIO) / 2;
  
  // Draw minimal idle bars
  for (let i = 0; i < BARS; i++) {
    const x = i * barWidth + spacing;
    const height = MIN_HEIGHT + Math.sin(Date.now() * 0.001 + i * 0.2) * 2;
    
    ctx.fillStyle = '#404040';
    ctx.fillRect(x, canvas.height - height, barWidth * BAR_WIDTH_RATIO, height);
  }
}

function drawSpectrum() {
  if (!ctx || !canvas || !analyser) return;
  
  const values = analyser.getValue();
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const barWidth = canvas.width / BARS;
  const spacing = barWidth * (1 - BAR_WIDTH_RATIO) / 2;
  
  // Map FFT bins to our bar count
  const binsPerBar = Math.floor(values.length / BARS);
  
  for (let i = 0; i < BARS; i++) {
    // Average multiple bins for each bar
    let sum = 0;
    for (let j = 0; j < binsPerBar; j++) {
      const binIndex = i * binsPerBar + j;
      if (binIndex < values.length) {
        // Convert from dB to linear scale (0-1)
        const db = values[binIndex];
        const normalized = Math.max(0, (db + 80) / 80);
        sum += normalized;
      }
    }
    
    const average = sum / binsPerBar;
    const height = Math.max(MIN_HEIGHT, average * canvas.height * 0.8);
    
    const x = i * barWidth + spacing;
    
    // Create gradient from accent color
    const gradient = ctx.createLinearGradient(0, canvas.height - height, 0, canvas.height);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(1, '#00cc66');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, canvas.height - height, barWidth * BAR_WIDTH_RATIO, height);
  }
}

function animate() {
  if (!isInitialized) return;
  
  if (Tone.Transport.state === 'started') {
    drawSpectrum();
  } else {
    drawIdleState();
  }
  
  animationId = requestAnimationFrame(animate);
}

export function startAnimation() {
  if (animationId) return;
  animate();
}

export function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function cleanup() {
  stopAnimation();
  
  if (analyser) {
    analyser.dispose();
    analyser = null;
  }
  
  canvas = null;
  ctx = null;
  isInitialized = false;
}

// Handle window resize
window.addEventListener('resize', () => {
  if (canvas) {
    resizeCanvas();
  }
});