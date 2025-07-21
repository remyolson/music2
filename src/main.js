import { initialize as initializeInput } from './inputHandler.js';
import { initialize as initializeVisualizer, update as updateVisualizer } from './visualizer.js';
import { subscribe } from './state.js';
import { update as updateAudioEngine, play, stop } from './audioEngine.js';
import { generateAIPrompt } from './musicConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('JSON Music Codec - Initializing...');

  initializeVisualizer();

  subscribe((musicData) => {
    updateAudioEngine(musicData);
    updateVisualizer(musicData);
  });

  initializeInput();

  const playButton = document.getElementById('play-button');
  const stopButton = document.getElementById('stop-button');
  const copyButton = document.getElementById('copy-json');
  const copyAiButton = document.getElementById('copy-ai');

  playButton.addEventListener('click', async () => {
    await play();
  });

  stopButton.addEventListener('click', () => {
    stop();
  });

  copyButton.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonText = jsonEditor.value;

    navigator.clipboard.writeText(jsonText).then(() => {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  copyAiButton.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor');
    const jsonText = jsonEditor.value;

    const AI_PROMPT = generateAIPrompt();
    const combinedText = `${AI_PROMPT}\n\nCurrent JSON:\n${jsonText}`;

    navigator.clipboard.writeText(combinedText).then(() => {
      const originalText = copyAiButton.textContent;
      copyAiButton.textContent = 'Copied!';
      setTimeout(() => {
        copyAiButton.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });

  console.log('JSON Music Codec - Ready!');
});