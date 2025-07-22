import { DisposalRegistry } from '../DisposalRegistry.js';
import * as Tone from 'tone';

/**
 * CPUOptimizer - Advanced CPU optimization for audio processing
 * Implements multi-threading, efficient algorithms, and performance monitoring
 */
export class CPUOptimizer {
  constructor() {
    this.registry = new DisposalRegistry('cpu-optimizer');
    
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();
    this.registry.register(this.performanceMonitor);
    
    // Voice allocation
    this.voiceAllocator = new VoiceAllocator();
    this.registry.register(this.voiceAllocator);
    
    // Convolution optimizer
    this.convolutionOptimizer = new ConvolutionOptimizer();
    this.registry.register(this.convolutionOptimizer);
    
    // Processing threads
    this.threadManager = new ThreadManager();
    this.registry.register(this.threadManager);
    
    // Configuration
    this.config = {
      maxVoices: 64,
      dynamicVoiceAllocation: true,
      lookaheadTime: 0.1, // seconds
      adaptiveQuality: true,
      cpuThreshold: 0.8 // 80%
    };
    
    // State
    this.cpuUsage = 0;
    this.isOptimizing = false;
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start CPU monitoring
   */
  startMonitoring() {
    this.performanceMonitor.start({
      onCPUHigh: (usage) => this.handleHighCPU(usage),
      onCPUNormal: (usage) => this.handleNormalCPU(usage)
    });
  }

  /**
   * Optimize audio chain
   * @param {Array} audioNodes 
   * @returns {Array}
   */
  optimizeAudioChain(audioNodes) {
    const optimized = [];
    
    audioNodes.forEach(node => {
      const optimizedNode = this.optimizeNode(node);
      optimized.push(optimizedNode);
    });
    
    // Group compatible nodes
    return this.groupCompatibleNodes(optimized);
  }

  /**
   * Optimize individual node
   * @param {Object} node 
   * @returns {Object}
   */
  optimizeNode(node) {
    switch (node.type) {
      case 'reverb':
        return this.optimizeReverb(node);
      case 'convolution':
        return this.optimizeConvolution(node);
      case 'compressor':
        return this.optimizeCompressor(node);
      case 'filter':
        return this.optimizeFilter(node);
      default:
        return node;
    }
  }

  /**
   * Optimize reverb
   * @param {Object} node 
   * @returns {Object}
   */
  optimizeReverb(node) {
    if (this.cpuUsage > this.config.cpuThreshold) {
      // Use lower quality reverb
      return {
        ...node,
        quality: 'low',
        roomSize: Math.min(node.roomSize, 0.7),
        damping: Math.max(node.damping, 0.3)
      };
    }
    
    return node;
  }

  /**
   * Optimize convolution
   * @param {Object} node 
   * @returns {Object}
   */
  optimizeConvolution(node) {
    return this.convolutionOptimizer.optimize(node, this.cpuUsage);
  }

  /**
   * Optimize compressor
   * @param {Object} node 
   * @returns {Object}
   */
  optimizeCompressor(node) {
    if (this.cpuUsage > this.config.cpuThreshold) {
      // Disable lookahead if CPU is high
      return {
        ...node,
        lookahead: 0,
        oversample: false
      };
    }
    
    return node;
  }

  /**
   * Optimize filter
   * @param {Object} node 
   * @returns {Object}
   */
  optimizeFilter(node) {
    if (this.cpuUsage > this.config.cpuThreshold) {
      // Reduce filter order
      return {
        ...node,
        Q: Math.min(node.Q, 10),
        rolloff: -12 // Use -12dB instead of -24dB
      };
    }
    
    return node;
  }

  /**
   * Group compatible nodes
   * @param {Array} nodes 
   * @returns {Array}
   */
  groupCompatibleNodes(nodes) {
    const groups = [];
    const ungrouped = [...nodes];
    
    while (ungrouped.length > 0) {
      const current = ungrouped.shift();
      const compatible = [];
      
      // Find compatible nodes
      for (let i = ungrouped.length - 1; i >= 0; i--) {
        if (this.areNodesCompatible(current, ungrouped[i])) {
          compatible.push(ungrouped.splice(i, 1)[0]);
        }
      }
      
      if (compatible.length > 0) {
        // Create grouped node
        groups.push(this.createGroupedNode([current, ...compatible]));
      } else {
        groups.push(current);
      }
    }
    
    return groups;
  }

  /**
   * Check if nodes are compatible for grouping
   * @param {Object} node1 
   * @param {Object} node2 
   * @returns {boolean}
   */
  areNodesCompatible(node1, node2) {
    // Simple compatibility check
    return node1.type === node2.type && 
           node1.sampleRate === node2.sampleRate;
  }

  /**
   * Create grouped node
   * @param {Array} nodes 
   * @returns {Object}
   */
  createGroupedNode(nodes) {
    return {
      type: 'group',
      nodes,
      optimized: true,
      cpuSavings: nodes.length * 0.1 // 10% savings per grouped node
    };
  }

  /**
   * Allocate voices efficiently
   * @param {Array} noteEvents 
   * @returns {Array}
   */
  allocateVoices(noteEvents) {
    return this.voiceAllocator.allocate(noteEvents, this.config.maxVoices);
  }

  /**
   * Process audio with threading
   * @param {Object} audioData 
   * @param {Function} processor 
   * @returns {Promise<Object>}
   */
  async processWithThreading(audioData, processor) {
    if (this.threadManager.canUseThreads()) {
      return this.threadManager.process(audioData, processor);
    } else {
      // Fallback to main thread
      return processor(audioData);
    }
  }

  /**
   * Handle high CPU usage
   * @param {number} usage 
   */
  handleHighCPU(usage) {
    this.cpuUsage = usage;
    this.isOptimizing = true;
    
    // Reduce quality settings
    if (this.config.adaptiveQuality) {
      this.reduceQuality();
    }
    
    // Reduce voice count
    if (this.config.dynamicVoiceAllocation) {
      this.voiceAllocator.reduceVoices(0.8);
    }
    
    // Notify subscribers
    if (this.onCPUHigh) {
      this.onCPUHigh(usage);
    }
  }

  /**
   * Handle normal CPU usage
   * @param {number} usage 
   */
  handleNormalCPU(usage) {
    this.cpuUsage = usage;
    
    if (this.isOptimizing) {
      this.isOptimizing = false;
      
      // Restore quality settings
      if (this.config.adaptiveQuality) {
        this.restoreQuality();
      }
      
      // Restore voice count
      if (this.config.dynamicVoiceAllocation) {
        this.voiceAllocator.restoreVoices();
      }
    }
    
    // Notify subscribers
    if (this.onCPUNormal) {
      this.onCPUNormal(usage);
    }
  }

  /**
   * Reduce quality settings
   */
  reduceQuality() {
    // Reduce convolution quality
    this.convolutionOptimizer.setQuality('low');
    
    // Reduce lookahead
    this.config.lookaheadTime = Math.max(0.05, this.config.lookaheadTime * 0.5);
  }

  /**
   * Restore quality settings
   */
  restoreQuality() {
    // Restore convolution quality
    this.convolutionOptimizer.setQuality('high');
    
    // Restore lookahead
    this.config.lookaheadTime = 0.1;
  }

  /**
   * Get optimization statistics
   * @returns {Object}
   */
  getStats() {
    return {
      cpuUsage: this.cpuUsage,
      isOptimizing: this.isOptimizing,
      activeVoices: this.voiceAllocator.getActiveVoices(),
      maxVoices: this.config.maxVoices,
      performance: this.performanceMonitor.getStats(),
      convolution: this.convolutionOptimizer.getStats(),
      threading: this.threadManager.getStats()
    };
  }

  /**
   * Set optimization mode
   * @param {string} mode - 'performance', 'balanced', 'quality'
   */
  setOptimizationMode(mode) {
    switch (mode) {
      case 'performance':
        this.config.maxVoices = 32;
        this.config.adaptiveQuality = true;
        this.config.cpuThreshold = 0.7;
        break;
        
      case 'quality':
        this.config.maxVoices = 128;
        this.config.adaptiveQuality = false;
        this.config.cpuThreshold = 0.9;
        break;
        
      case 'balanced':
      default:
        this.config.maxVoices = 64;
        this.config.adaptiveQuality = true;
        this.config.cpuThreshold = 0.8;
        break;
    }
    
    // Apply changes
    this.voiceAllocator.setMaxVoices(this.config.maxVoices);
  }

  /**
   * Dispose
   */
  dispose() {
    this.performanceMonitor.stop();
    this.registry.dispose();
  }
}

/**
 * Performance monitor for CPU tracking
 */
class PerformanceMonitor {
  constructor() {
    this.registry = new DisposalRegistry('performance-monitor');
    
    // Monitoring state
    this.isMonitoring = false;
    this.intervalId = null;
    
    // Performance data
    this.cpuHistory = [];
    this.audioProcessingTime = [];
    this.frameDrops = 0;
    
    // Callbacks
    this.onCPUHigh = null;
    this.onCPUNormal = null;
    
    // Thresholds
    this.highCPUThreshold = 0.8;
    this.normalCPUThreshold = 0.6;
  }

  /**
   * Start monitoring
   * @param {Object} config 
   */
  start(config = {}) {
    const {
      interval = 100, // Check every 100ms
      onCPUHigh,
      onCPUNormal
    } = config;
    
    this.onCPUHigh = onCPUHigh;
    this.onCPUNormal = onCPUNormal;
    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      this.checkPerformance();
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check performance
   */
  checkPerformance() {
    const cpuUsage = this.getCPUUsage();
    const audioLatency = this.getAudioLatency();
    
    // Add to history
    this.cpuHistory.push({
      timestamp: performance.now(),
      usage: cpuUsage,
      latency: audioLatency
    });
    
    // Trim history (keep last 100 samples)
    if (this.cpuHistory.length > 100) {
      this.cpuHistory.shift();
    }
    
    // Check thresholds
    if (cpuUsage > this.highCPUThreshold && this.onCPUHigh) {
      this.onCPUHigh(cpuUsage);
    } else if (cpuUsage < this.normalCPUThreshold && this.onCPUNormal) {
      this.onCPUNormal(cpuUsage);
    }
  }

  /**
   * Get CPU usage
   * @returns {number}
   */
  getCPUUsage() {
    // In real implementation, would use performance API
    // For now, estimate based on audio context performance
    const context = Tone.getContext();
    const currentTime = context.currentTime;
    const lastTime = this.lastCheckTime || currentTime;
    
    // Estimate based on processing time
    const processingRatio = (currentTime - lastTime) / 0.1; // 100ms interval
    this.lastCheckTime = currentTime;
    
    return Math.min(processingRatio, 1.0);
  }

  /**
   * Get audio latency
   * @returns {number}
   */
  getAudioLatency() {
    const context = Tone.getContext();
    return context.baseLatency + context.outputLatency;
  }

  /**
   * Record audio processing time
   * @param {number} processingTime 
   */
  recordProcessingTime(processingTime) {
    this.audioProcessingTime.push({
      timestamp: performance.now(),
      time: processingTime
    });
    
    // Trim history
    if (this.audioProcessingTime.length > 100) {
      this.audioProcessingTime.shift();
    }
  }

  /**
   * Record frame drop
   */
  recordFrameDrop() {
    this.frameDrops++;
  }

  /**
   * Get performance statistics
   * @returns {Object}
   */
  getStats() {
    const recent = this.cpuHistory.slice(-10);
    const avgCPU = recent.length > 0 ? 
      recent.reduce((sum, sample) => sum + sample.usage, 0) / recent.length : 0;
    
    const recentProcessing = this.audioProcessingTime.slice(-10);
    const avgProcessingTime = recentProcessing.length > 0 ? 
      recentProcessing.reduce((sum, sample) => sum + sample.time, 0) / recentProcessing.length : 0;
    
    return {
      averageCPU: avgCPU,
      currentCPU: recent.length > 0 ? recent[recent.length - 1].usage : 0,
      averageProcessingTime: avgProcessingTime,
      frameDrops: this.frameDrops,
      isMonitoring: this.isMonitoring
    };
  }

  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

/**
 * Voice allocator for efficient polyphony management
 */
class VoiceAllocator {
  constructor() {
    this.registry = new DisposalRegistry('voice-allocator');
    
    // Voice tracking
    this.activeVoices = new Map();
    this.voicePool = [];
    this.maxVoices = 64;
    this.originalMaxVoices = 64;
    
    // Priority system
    this.voicePriorities = new Map();
  }

  /**
   * Allocate voices for note events
   * @param {Array} noteEvents 
   * @param {number} maxVoices 
   * @returns {Array}
   */
  allocate(noteEvents, maxVoices) {
    this.maxVoices = maxVoices;
    const allocated = [];
    
    // Sort by priority (velocity, time, pitch)
    const sortedEvents = noteEvents.sort((a, b) => {
      const priorityA = this.calculatePriority(a);
      const priorityB = this.calculatePriority(b);
      return priorityB - priorityA;
    });
    
    sortedEvents.forEach(event => {
      if (this.activeVoices.size < this.maxVoices) {
        // Allocate new voice
        const voiceId = this.allocateVoice(event);
        allocated.push({ ...event, voiceId });
      } else {
        // Steal voice if this event has higher priority
        const stolen = this.stealVoice(event);
        if (stolen) {
          allocated.push({ ...event, voiceId: stolen.voiceId });
        }
      }
    });
    
    return allocated;
  }

  /**
   * Calculate event priority
   * @param {Object} event 
   * @returns {number}
   */
  calculatePriority(event) {
    // Priority based on velocity, recency, and pitch
    const velocityWeight = event.velocity || 0.5;
    const timeWeight = 1 / (Date.now() - (event.timestamp || Date.now()) + 1);
    const pitchWeight = event.pitch > 60 ? 1.2 : 1.0; // Favor higher pitches slightly
    
    return velocityWeight * 0.5 + timeWeight * 0.3 + pitchWeight * 0.2;
  }

  /**
   * Allocate new voice
   * @param {Object} event 
   * @returns {string}
   */
  allocateVoice(event) {
    const voiceId = this.generateVoiceId();
    
    this.activeVoices.set(voiceId, {
      event,
      startTime: Date.now(),
      priority: this.calculatePriority(event)
    });
    
    return voiceId;
  }

  /**
   * Steal voice from lower priority event
   * @param {Object} event 
   * @returns {Object|null}
   */
  stealVoice(event) {
    const newPriority = this.calculatePriority(event);
    let victimVoiceId = null;
    let lowestPriority = newPriority;
    
    // Find voice with lowest priority
    this.activeVoices.forEach((voice, voiceId) => {
      if (voice.priority < lowestPriority) {
        lowestPriority = voice.priority;
        victimVoiceId = voiceId;
      }
    });
    
    if (victimVoiceId) {
      // Steal the voice
      this.activeVoices.set(victimVoiceId, {
        event,
        startTime: Date.now(),
        priority: newPriority
      });
      
      return { voiceId: victimVoiceId };
    }
    
    return null;
  }

  /**
   * Release voice
   * @param {string} voiceId 
   */
  releaseVoice(voiceId) {
    this.activeVoices.delete(voiceId);
  }

  /**
   * Reduce voice count
   * @param {number} factor 
   */
  reduceVoices(factor) {
    this.maxVoices = Math.floor(this.originalMaxVoices * factor);
    
    // Release excess voices
    if (this.activeVoices.size > this.maxVoices) {
      const excess = this.activeVoices.size - this.maxVoices;
      const toRelease = [];
      
      // Release lowest priority voices
      const sortedVoices = Array.from(this.activeVoices.entries())
        .sort(([, a], [, b]) => a.priority - b.priority);
      
      for (let i = 0; i < excess; i++) {
        toRelease.push(sortedVoices[i][0]);
      }
      
      toRelease.forEach(voiceId => this.releaseVoice(voiceId));
    }
  }

  /**
   * Restore voice count
   */
  restoreVoices() {
    this.maxVoices = this.originalMaxVoices;
  }

  /**
   * Set max voices
   * @param {number} maxVoices 
   */
  setMaxVoices(maxVoices) {
    this.maxVoices = maxVoices;
    this.originalMaxVoices = maxVoices;
  }

  /**
   * Get active voice count
   * @returns {number}
   */
  getActiveVoices() {
    return this.activeVoices.size;
  }

  /**
   * Generate voice ID
   * @returns {string}
   */
  generateVoiceId() {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  dispose() {
    this.activeVoices.clear();
    this.voicePool = [];
    this.registry.dispose();
  }
}

/**
 * Convolution optimizer
 */
class ConvolutionOptimizer {
  constructor() {
    this.registry = new DisposalRegistry('convolution-optimizer');
    
    // Quality settings
    this.quality = 'high';
    this.qualitySettings = {
      low: { fftSize: 1024, overlap: 0.5 },
      medium: { fftSize: 2048, overlap: 0.75 },
      high: { fftSize: 4096, overlap: 0.75 }
    };
    
    // IR cache
    this.irCache = new Map();
  }

  /**
   * Optimize convolution node
   * @param {Object} node 
   * @param {number} cpuUsage 
   * @returns {Object}
   */
  optimize(node, cpuUsage) {
    const quality = this.getQualityForCPU(cpuUsage);
    const settings = this.qualitySettings[quality];
    
    return {
      ...node,
      fftSize: settings.fftSize,
      overlap: settings.overlap,
      quality
    };
  }

  /**
   * Get quality setting for CPU usage
   * @param {number} cpuUsage 
   * @returns {string}
   */
  getQualityForCPU(cpuUsage) {
    if (cpuUsage > 0.8) {
      return 'low';
    } else if (cpuUsage > 0.6) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Set quality
   * @param {string} quality 
   */
  setQuality(quality) {
    this.quality = quality;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      quality: this.quality,
      cacheSize: this.irCache.size,
      qualitySettings: this.qualitySettings[this.quality]
    };
  }

  dispose() {
    this.irCache.clear();
    this.registry.dispose();
  }
}

/**
 * Thread manager for multi-threading
 */
class ThreadManager {
  constructor() {
    this.registry = new DisposalRegistry('thread-manager');
    
    // Worker threads
    this.workers = [];
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.workerQueue = [];
    
    // Thread support detection
    this.threadsSupported = this.detectThreadSupport();
    
    if (this.threadsSupported) {
      this.initializeWorkers();
    }
  }

  /**
   * Detect thread support
   * @returns {boolean}
   */
  detectThreadSupport() {
    return typeof Worker !== 'undefined' && 
           typeof SharedArrayBuffer !== 'undefined';
  }

  /**
   * Initialize worker threads
   */
  initializeWorkers() {
    // In real implementation, would create audio worklet workers
    // For now, simulate with regular workers
    for (let i = 0; i < Math.min(this.maxWorkers, 4); i++) {
      this.createWorker();
    }
  }

  /**
   * Create worker
   */
  createWorker() {
    // Placeholder for worker creation
    const worker = {
      id: `worker_${this.workers.length}`,
      busy: false,
      process: async (data) => {
        // Simulate processing
        return new Promise(resolve => {
          setTimeout(() => resolve(data), 10);
        });
      }
    };
    
    this.workers.push(worker);
  }

  /**
   * Check if threads can be used
   * @returns {boolean}
   */
  canUseThreads() {
    return this.threadsSupported && this.workers.length > 0;
  }

  /**
   * Process with threading
   * @param {Object} audioData 
   * @param {Function} processor 
   * @returns {Promise<Object>}
   */
  async process(audioData, processor) {
    if (!this.canUseThreads()) {
      return processor(audioData);
    }
    
    // Find available worker
    const worker = this.workers.find(w => !w.busy);
    
    if (!worker) {
      // No available workers, process on main thread
      return processor(audioData);
    }
    
    // Process on worker
    worker.busy = true;
    
    try {
      const result = await worker.process(audioData);
      return result;
    } finally {
      worker.busy = false;
    }
  }

  /**
   * Get threading statistics
   * @returns {Object}
   */
  getStats() {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    
    return {
      threadsSupported: this.threadsSupported,
      totalWorkers: this.workers.length,
      busyWorkers,
      availableWorkers: this.workers.length - busyWorkers,
      queueLength: this.workerQueue.length
    };
  }

  dispose() {
    // Terminate workers
    this.workers.forEach(worker => {
      if (worker.terminate) {
        worker.terminate();
      }
    });
    
    this.workers = [];
    this.registry.dispose();
  }
}

// Factory function
export function createCPUOptimizer() {
  return new CPUOptimizer();
}