/**
 * Natural Piano Instrument Definition with Sample Support
 * Enhanced with realistic physics and pedal simulation
 */
import * as Tone from 'tone';
import { sampleLibrary } from '../../samples/SampleLibrary.js';
import { DisposalRegistry } from '../../../utils/DisposalRegistry.js';
import { TRANSITION_PRESETS } from '../../constants/limits.js';

export default {
  type: 'natural_piano',
  name: 'Natural Piano',
  category: 'keyboard',
  polyphonic: true,
  sampleBased: true,
  
  /**
   * Create a natural piano instrument with sample support
   * @param {Object} settings - Instrument settings
   * @returns {Object} Enhanced piano instrument
   */
  async create(settings = {}) {
    const registry = new DisposalRegistry('NaturalPiano');
    const pianoType = settings.pianoType || 'grand_piano';
    
    try {
      // Attempt to load natural piano samples
      const naturalPiano = await sampleLibrary.createNaturalPiano(pianoType);
      
      // Enhance with realistic piano physics
      const enhancedPiano = await this._createEnhancedPiano(naturalPiano, settings, registry);
      
      return enhancedPiano;
    } catch (error) {
      console.warn('Falling back to synthesized piano:', error);
      return this._createFallbackPiano(settings, registry);
    }
  },
  
  /**
   * Create enhanced piano with realistic features
   * @private
   */
  async _createEnhancedPiano(naturalPiano, settings, registry) {
    const envelope = settings?.envelope || {};
    const noteTransition = settings?.noteTransition || 'normal';
    const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
    
    // Create sympathetic resonance simulation
    const resonanceGain = registry.register(new Tone.Gain(0.15));
    const resonanceDelay = registry.register(new Tone.FeedbackDelay(0.1, 0.2));
    const resonanceFilter = registry.register(new Tone.Filter(1000, 'highpass'));
    
    // Chain resonance effects
    resonanceGain.chain(resonanceFilter, resonanceDelay, Tone.Destination);
    
    // Create pedal effects
    const sustainPedal = registry.register(new Tone.Gain(1));
    const softPedal = registry.register(new Tone.Gain(1));
    const sostenutoPedal = registry.register(new Tone.Gain(1));
    
    // Main output chain
    naturalPiano.sampler.chain(sustainPedal, softPedal, sostenutoPedal);
    
    // Hammer action simulation
    const hammerNoise = registry.register(new Tone.Noise('pink'));
    const hammerEnvelope = registry.register(new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: 0.01,
      sustain: 0,
      release: 0.01
    }));
    const hammerFilter = registry.register(new Tone.Filter(5000, 'lowpass'));
    const hammerGain = registry.register(new Tone.Gain(0.05));
    
    hammerNoise.chain(hammerEnvelope, hammerFilter, hammerGain, Tone.Destination);
    
    return {
      type: 'natural_piano',
      naturalPiano,
      registry,
      
      // Pedal state
      pedals: {
        sustain: false,
        soft: false,
        sostenuto: false,
        sostenutoNotes: new Set()
      },
      
      // Enhanced playing methods
      play: (notes, velocity = 100, time = '+0', duration = '4n') => {
        const noteArray = Array.isArray(notes) ? notes : [notes];
        const adjustedVelocity = this.pedals.soft ? velocity * 0.7 : velocity;
        
        // Trigger hammer noise for realism
        hammerEnvelope.triggerAttackRelease('32n', time);
        
        // Play notes with sympathetic resonance
        for (const note of noteArray) {
          naturalPiano.play(note, adjustedVelocity, time, duration);
          
          // Add sympathetic resonance for realistic sustain
          if (this.pedals.sustain || this.pedals.sostenuto) {
            const resonanceNote = Tone.Frequency(note).transpose(12).toNote();
            resonanceGain.gain.setValueAtTime(adjustedVelocity / 1000, time);
          }
        }
        
        // Handle sostenuto pedal logic
        if (this.pedals.sostenuto) {
          noteArray.forEach(note => this.pedals.sostenutoNotes.add(note));
        }
      },
      
      triggerAttack: (notes, time = '+0', velocity = 100) => {
        const noteArray = Array.isArray(notes) ? notes : [notes];
        const adjustedVelocity = this.pedals.soft ? velocity * 0.7 : velocity;
        
        hammerEnvelope.triggerAttack(time);
        
        for (const note of noteArray) {
          naturalPiano.sampler.triggerAttack(note, time, adjustedVelocity / 127);
        }
      },
      
      triggerRelease: (notes, time = '+0') => {
        const noteArray = Array.isArray(notes) ? notes : [notes];
        
        for (const note of noteArray) {
          // Check if note should be sustained by pedals
          const shouldSustain = this.pedals.sustain || 
                               (this.pedals.sostenuto && this.pedals.sostenutoNotes.has(note));
          
          if (!shouldSustain) {
            naturalPiano.sampler.triggerRelease(note, time);
          }
        }
      },
      
      triggerAttackRelease: (notes, duration, time = '+0', velocity = 100) => {
        this.play(notes, velocity, time, duration);
      },
      
      // Pedal control methods
      setPedalState: (pedalType, isDown) => {
        switch (pedalType) {
          case 'sustain':
            this.pedals.sustain = isDown;
            if (!isDown) {
              // Release all sustained notes
              naturalPiano.sampler.releaseAll();
            }
            break;
            
          case 'soft':
            this.pedals.soft = isDown;
            softPedal.gain.value = isDown ? 0.7 : 1.0;
            break;
            
          case 'sostenuto':
            if (!isDown) {
              // Release sostenuto notes
              this.pedals.sostenutoNotes.forEach(note => {
                naturalPiano.sampler.triggerRelease(note);
              });
              this.pedals.sostenutoNotes.clear();
            }
            this.pedals.sustain = isDown;
            break;
        }
      },
      
      // Advanced features
      setResonanceAmount: (amount) => {
        resonanceGain.gain.value = Math.max(0, Math.min(0.5, amount));
      },
      
      setHammerHardness: (hardness) => {
        hammerGain.gain.value = Math.max(0.01, Math.min(0.2, hardness * 0.1));
      },
      
      // Get piano type and properties
      getPianoType: () => pianoType,
      
      isSampleBased: () => true,
      
      // Standard Tone.js interface compatibility
      chain: (...effects) => {
        sostenutoPedal.chain(...effects);
        return this;
      },
      
      connect: (destination) => {
        sostenutoPedal.connect(destination);
        return this;
      },
      
      disconnect: () => {
        sostenutoPedal.disconnect();
        return this;
      },
      
      toDestination: () => {
        sostenutoPedal.toDestination();
        return this;
      },
      
      // Memory management
      dispose: () => {
        naturalPiano.dispose();
        registry.dispose();
      }
    };
  },
  
  /**
   * Create fallback synthesized piano when samples unavailable
   * @private
   */
  _createFallbackPiano(settings, registry) {
    const envelope = settings?.envelope || {};
    const noteTransition = settings?.noteTransition || 'normal';
    const transitionSettings = TRANSITION_PRESETS[noteTransition] || {};
    
    // Enhanced FM synthesis for realistic piano sound
    const synth = registry.register(new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.1,
      modulationIndex: 25,
      oscillator: { 
        type: 'sine',
        partialCount: 0,
        partials: []
      },
      envelope: {
        attack: envelope.attack ?? transitionSettings.attack ?? 0.008,
        decay: envelope.decay ?? 1.2,
        sustain: envelope.sustain ?? transitionSettings.sustain ?? 0.1,
        release: envelope.release ?? transitionSettings.release ?? 1.4
      },
      modulation: { type: 'square' },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.5,
        sustain: 0,
        release: 0.5
      }
    }));
    
    // Add subtle chorus for width
    const chorus = registry.register(new Tone.Chorus(0.6, 2.5, 0.5));
    synth.chain(chorus, Tone.Destination);
    
    return {
      type: 'natural_piano',
      synth,
      registry,
      isSampleBased: () => false,
      
      // Simplified interface matching sample-based version
      play: (notes, velocity = 100, time = '+0', duration = '4n') => {
        synth.triggerAttackRelease(notes, duration, time, velocity / 127);
      },
      
      triggerAttack: (notes, time = '+0', velocity = 100) => {
        synth.triggerAttack(notes, time, velocity / 127);
      },
      
      triggerRelease: (notes, time = '+0') => {
        synth.triggerRelease(notes, time);
      },
      
      triggerAttackRelease: (notes, duration, time = '+0', velocity = 100) => {
        synth.triggerAttackRelease(notes, duration, time, velocity / 127);
      },
      
      // Pedal methods (simplified for synthesis)
      setPedalState: (pedalType, isDown) => {
        // Basic sustain pedal simulation
        if (pedalType === 'sustain') {
          synth.releaseAll = isDown ? () => {} : () => synth.releaseAll();
        }
      },
      
      // Compatibility methods
      chain: (...effects) => synth.chain(...effects),
      connect: (destination) => synth.connect(destination),
      disconnect: () => synth.disconnect(),
      toDestination: () => synth.toDestination(),
      dispose: () => registry.dispose()
    };
  },
  
  /**
   * Default settings for natural piano
   */
  defaults: {
    volume: -6,
    maxPolyphony: 16,
    pianoType: 'grand_piano',
    resonance: 0.15,
    hammerHardness: 0.8,
    envelope: {
      attack: 0.008,
      decay: 1.2,
      sustain: 0.1,
      release: 1.4
    },
    pedals: {
      sustain: false,
      soft: false,
      sostenuto: false
    }
  },
  
  /**
   * Available piano types
   */
  pianoTypes: [
    'grand_piano',
    'upright_piano', 
    'honky_tonk'
  ],
  
  /**
   * Recommended effects for natural piano
   */
  recommendedEffects: [
    { type: 'reverb', wet: 0.25, roomSize: 0.7, decay: 2.5 },
    { type: 'eq', low: 1.1, mid: 1.0, high: 1.2 }
  ]
};