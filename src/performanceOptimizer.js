// Performance optimization module for DSP graph
// Implements Web Audio Worklet offloading for CPU-intensive effects

export class PerformanceOptimizer {
  constructor() {
    this.cpuUsage = 0;
    this.cpuThreshold = 60; // Target CPU < 60%
    this.workletSupported = false;
    this.workletProcessors = new Map();
    this.monitoringInterval = null;
  }

  async initialize() {
    // Check if AudioWorklet is supported
    if (typeof AudioWorklet !== 'undefined') {
      this.workletSupported = true;
      await this.loadWorkletProcessors();
    }
    
    // Start CPU monitoring
    this.startCPUMonitoring();
  }

  async loadWorkletProcessors() {
    try {
      // Load custom worklet processors for CPU-intensive effects
      const audioContext = new AudioContext();
      
      // Load reverb processor worklet
      await audioContext.audioWorklet.addModule('/src/worklets/reverb-processor.js');
      this.workletProcessors.set('reverb', 'reverb-processor');
      
      // Load granular synthesis processor worklet
      await audioContext.audioWorklet.addModule('/src/worklets/granular-processor.js');
      this.workletProcessors.set('granular', 'granular-processor');
      
      audioContext.close();
    } catch (error) {
      console.warn('Failed to load AudioWorklet processors:', error);
      this.workletSupported = false;
    }
  }

  startCPUMonitoring() {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(() => {
      this.measureCPUUsage();
    }, 1000);
  }

  async measureCPUUsage() {
    // Use Performance Observer API to estimate CPU usage
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let totalDuration = 0;
          entries.forEach(entry => {
            totalDuration += entry.duration;
          });
          
          // Estimate CPU usage based on long tasks
          this.cpuUsage = Math.min(100, (totalDuration / 1000) * 100);
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
        
        // Cleanup after measurement
        setTimeout(() => observer.disconnect(), 100);
      } catch (error) {
        // Fallback to basic estimation
        this.cpuUsage = 30; // Conservative estimate
      }
    }
  }

  shouldOffloadEffect(effectType) {
    // Determine if effect should be offloaded to AudioWorklet
    const cpuIntensiveEffects = ['reverb', 'freezeReverb', 'granular_pad', 'chorus', 'phaser'];
    
    return this.workletSupported && 
           cpuIntensiveEffects.includes(effectType) &&
           this.cpuUsage > 40; // Start offloading at 40% CPU
  }

  async createOptimizedEffect(effectType, params, audioContext) {
    if (this.shouldOffloadEffect(effectType) && this.workletProcessors.has(effectType)) {
      // Create AudioWorklet node for CPU-intensive effect
      try {
        const workletNode = new AudioWorkletNode(
          audioContext, 
          this.workletProcessors.get(effectType),
          { processorOptions: params }
        );
        
        // Add wet/dry control
        const wetGain = audioContext.createGain();
        const dryGain = audioContext.createGain();
        const outputGain = audioContext.createGain();
        
        wetGain.gain.value = params.wet || 0.5;
        dryGain.gain.value = 1 - (params.wet || 0.5);
        
        // Create effect chain
        const input = audioContext.createGain();
        input.connect(dryGain);
        input.connect(workletNode);
        workletNode.connect(wetGain);
        wetGain.connect(outputGain);
        dryGain.connect(outputGain);
        
        return {
          input,
          output: outputGain,
          setWet: (value) => {
            wetGain.gain.value = value;
            dryGain.gain.value = 1 - value;
          }
        };
      } catch (error) {
        console.warn(`Failed to create worklet for ${effectType}:`, error);
        return null;
      }
    }
    
    return null; // Fall back to regular Tone.js effect
  }

  optimizeDSPGraph(instruments, effects) {
    // Analyze and optimize the DSP graph
    const optimizations = {
      mergedEffects: new Map(),
      reorderedChains: new Map(),
      workletOffloads: new Set()
    };
    
    // Group similar effects to reduce processing overhead
    instruments.forEach((instrument, trackName) => {
      const { effectChain } = instrument;
      
      if (effectChain && effectChain.length > 0) {
        // Identify candidates for merging
        const reverbEffects = effectChain.filter(e => 
          e.constructor.name.includes('Reverb')
        );
        
        if (reverbEffects.length > 1) {
          // Merge multiple reverbs into one
          optimizations.mergedEffects.set(trackName, {
            type: 'reverb',
            count: reverbEffects.length
          });
        }
        
        // Reorder effects for optimal processing
        // Place dynamics before time-based effects
        const optimizedOrder = this.getOptimalEffectOrder(effectChain);
        if (optimizedOrder) {
          optimizations.reorderedChains.set(trackName, optimizedOrder);
        }
      }
    });
    
    return optimizations;
  }

  getOptimalEffectOrder(effectChain) {
    // Define effect categories and optimal ordering
    const effectCategories = {
      dynamics: ['Compressor', 'Limiter', 'Gate'],
      eq: ['EQ', 'Filter'],
      distortion: ['Distortion', 'BitCrusher'],
      modulation: ['Chorus', 'Phaser', 'Tremolo'],
      timeBased: ['Delay', 'Reverb', 'Echo']
    };
    
    // Categorize effects
    const categorized = effectChain.map(effect => {
      const effectName = effect.constructor.name;
      for (const [category, types] of Object.entries(effectCategories)) {
        if (types.some(type => effectName.includes(type))) {
          return { effect, category };
        }
      }
      return { effect, category: 'other' };
    });
    
    // Sort by optimal order
    const order = ['dynamics', 'eq', 'distortion', 'modulation', 'timeBased', 'other'];
    const sorted = categorized.sort((a, b) => 
      order.indexOf(a.category) - order.indexOf(b.category)
    );
    
    // Check if reordering is needed
    const needsReorder = sorted.some((item, index) => 
      item.effect !== effectChain[index]
    );
    
    return needsReorder ? sorted.map(item => item.effect) : null;
  }

  getPerformanceStats() {
    return {
      cpuUsage: this.cpuUsage,
      workletSupported: this.workletSupported,
      activeWorklets: this.workletProcessors.size,
      targetCPU: this.cpuThreshold
    };
  }

  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();