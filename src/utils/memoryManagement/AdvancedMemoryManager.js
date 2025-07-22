import { DisposalRegistry } from '../DisposalRegistry.js';
import * as Tone from 'tone';

/**
 * AdvancedMemoryManager - Enhanced memory management for large orchestral projects
 * Implements sample streaming, intelligent caching, and memory monitoring
 */
export class AdvancedMemoryManager {
  constructor() {
    this.registry = new DisposalRegistry('advanced-memory-manager');
    
    // Memory tracking
    this.memoryUsage = {
      samples: 0,
      effects: 0,
      instruments: 0,
      total: 0
    };
    
    // Cache management
    this.sampleCache = new SampleCache();
    this.registry.register(this.sampleCache);
    
    // Streaming system
    this.streamingEngine = new StreamingEngine();
    this.registry.register(this.streamingEngine);
    
    // Background loader
    this.backgroundLoader = new BackgroundLoader();
    this.registry.register(this.backgroundLoader);
    
    // Memory monitor
    this.memoryMonitor = new MemoryMonitor();
    this.registry.register(this.memoryMonitor);
    
    // Configuration
    this.config = {
      maxMemoryMB: 500,
      cacheSize: 200, // MB
      streamingThreshold: 10, // MB
      preloadTime: 2, // seconds
      alertThreshold: 0.8 // 80% of max memory
    };
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    this.memoryMonitor.start({
      interval: 1000, // Check every second
      onAlert: (usage) => this.handleMemoryAlert(usage),
      onCritical: (usage) => this.handleMemoryCritical(usage)
    });
  }

  /**
   * Load sample with intelligent management
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async loadSample(samplePath, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      streaming = 'auto',
      preload = true
    } = options;
    
    // Check cache first
    const cached = this.sampleCache.get(samplePath);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.buffer;
    }
    
    // Check memory availability
    const sampleInfo = await this.getSampleInfo(samplePath);
    const canLoadFully = this.checkMemoryAvailable(sampleInfo.size);
    
    let buffer;
    
    if (streaming === 'force' || (streaming === 'auto' && !canLoadFully)) {
      // Use streaming
      buffer = await this.streamingEngine.createStreamingBuffer(samplePath, {
        bufferSize: this.calculateStreamingBufferSize(sampleInfo),
        preloadTime: this.config.preloadTime
      });
    } else {
      // Load fully into memory
      buffer = await this.loadFullSample(samplePath, priority);
      
      // Cache if there's room
      if (this.sampleCache.canFit(sampleInfo.size)) {
        this.sampleCache.add(samplePath, buffer, sampleInfo.size, priority);
      }
    }
    
    // Update memory tracking
    this.updateMemoryUsage('samples', sampleInfo.size);
    
    return buffer;
  }

  /**
   * Get sample info without loading
   * @param {string} samplePath 
   * @returns {Promise<Object>}
   */
  async getSampleInfo(samplePath) {
    // In real implementation, would read file headers
    return {
      size: 5 * 1024 * 1024, // 5MB placeholder
      duration: 2.5,
      sampleRate: 48000,
      channels: 2
    };
  }

  /**
   * Check if memory is available
   * @param {number} sizeBytes 
   * @returns {boolean}
   */
  checkMemoryAvailable(sizeBytes) {
    const sizeMB = sizeBytes / (1024 * 1024);
    return (this.memoryUsage.total + sizeMB) < this.config.maxMemoryMB;
  }

  /**
   * Calculate streaming buffer size
   * @param {Object} sampleInfo 
   * @returns {number}
   */
  calculateStreamingBufferSize(sampleInfo) {
    // Buffer size based on sample rate and preload time
    const bytesPerSecond = sampleInfo.sampleRate * sampleInfo.channels * 2; // 16-bit
    return bytesPerSecond * this.config.preloadTime;
  }

  /**
   * Load full sample
   * @param {string} samplePath 
   * @param {string} priority 
   * @returns {Promise<Tone.ToneAudioBuffer>}
   */
  async loadFullSample(samplePath, priority) {
    if (priority === 'high') {
      // Load immediately
      return new Tone.ToneAudioBuffer(samplePath);
    } else {
      // Queue for background loading
      return this.backgroundLoader.queue(samplePath, priority);
    }
  }

  /**
   * Preload samples during playback
   * @param {Array} upcomingSamples 
   */
  async preloadDuringPlayback(upcomingSamples) {
    // Sort by time to play
    const sorted = upcomingSamples.sort((a, b) => a.timeToPlay - b.timeToPlay);
    
    for (const sample of sorted) {
      if (sample.timeToPlay < this.config.preloadTime) {
        // Need to load immediately
        await this.loadSample(sample.path, { priority: 'high' });
      } else {
        // Can load in background
        this.backgroundLoader.queue(sample.path, 'normal');
      }
    }
  }

  /**
   * Update memory usage
   * @param {string} category 
   * @param {number} sizeMB 
   */
  updateMemoryUsage(category, sizeMB) {
    this.memoryUsage[category] += sizeMB;
    this.memoryUsage.total = Object.values(this.memoryUsage)
      .filter((_, key) => key !== 'total')
      .reduce((sum, val) => sum + val, 0);
    
    // Check if we need to free memory
    if (this.memoryUsage.total > this.config.maxMemoryMB * this.config.alertThreshold) {
      this.freeMemory();
    }
  }

  /**
   * Free memory by evicting cache
   */
  freeMemory() {
    const freedBytes = this.sampleCache.evictLRU(50 * 1024 * 1024); // Free 50MB
    const freedMB = freedBytes / (1024 * 1024);
    
    this.updateMemoryUsage('samples', -freedMB);
    
    if (this.onMemoryFreed) {
      this.onMemoryFreed(freedMB);
    }
  }

  /**
   * Handle memory alert
   * @param {Object} usage 
   */
  handleMemoryAlert(usage) {
    console.warn('Memory usage high:', usage);
    
    // Start aggressive caching
    this.sampleCache.setAggressiveMode(true);
    
    // Reduce streaming buffer sizes
    this.streamingEngine.reduceBufferSizes(0.5);
    
    if (this.onMemoryAlert) {
      this.onMemoryAlert(usage);
    }
  }

  /**
   * Handle critical memory
   * @param {Object} usage 
   */
  handleMemoryCritical(usage) {
    console.error('Memory critical:', usage);
    
    // Emergency memory release
    this.sampleCache.clear();
    this.streamingEngine.pauseAllStreams();
    
    if (this.onMemoryCritical) {
      this.onMemoryCritical(usage);
    }
  }

  /**
   * Get memory statistics
   * @returns {Object}
   */
  getMemoryStats() {
    return {
      usage: { ...this.memoryUsage },
      cache: this.sampleCache.getStats(),
      streaming: this.streamingEngine.getStats(),
      config: { ...this.config }
    };
  }

  /**
   * Set memory limit
   * @param {number} limitMB 
   */
  setMemoryLimit(limitMB) {
    this.config.maxMemoryMB = limitMB;
    this.sampleCache.setMaxSize(limitMB * 0.4); // 40% for cache
  }

  /**
   * Optimize for performance mode
   * @param {string} mode - 'performance', 'balanced', 'memory-saver'
   */
  setPerformanceMode(mode) {
    switch (mode) {
      case 'performance':
        this.config.cacheSize = this.config.maxMemoryMB * 0.6;
        this.config.streamingThreshold = 20;
        this.config.preloadTime = 4;
        break;
        
      case 'memory-saver':
        this.config.cacheSize = this.config.maxMemoryMB * 0.2;
        this.config.streamingThreshold = 5;
        this.config.preloadTime = 1;
        break;
        
      case 'balanced':
      default:
        this.config.cacheSize = this.config.maxMemoryMB * 0.4;
        this.config.streamingThreshold = 10;
        this.config.preloadTime = 2;
        break;
    }
    
    // Apply new settings
    this.sampleCache.setMaxSize(this.config.cacheSize * 1024 * 1024);
    this.streamingEngine.updateConfig({
      threshold: this.config.streamingThreshold,
      preloadTime: this.config.preloadTime
    });
  }

  /**
   * Dispose
   */
  dispose() {
    this.memoryMonitor.stop();
    this.registry.dispose();
  }
}

/**
 * Sample cache with LRU eviction
 */
class SampleCache {
  constructor() {
    this.registry = new DisposalRegistry('sample-cache');
    
    // Cache storage
    this.cache = new Map();
    this.totalSize = 0;
    this.maxSize = 200 * 1024 * 1024; // 200MB default
    
    // LRU tracking
    this.accessOrder = [];
    
    // Aggressive mode
    this.aggressiveMode = false;
  }

  /**
   * Get cached sample
   * @param {string} path 
   * @returns {Object|null}
   */
  get(path) {
    const entry = this.cache.get(path);
    if (entry) {
      // Update LRU
      this.updateAccessOrder(path);
      return entry;
    }
    return null;
  }

  /**
   * Add to cache
   * @param {string} path 
   * @param {Object} buffer 
   * @param {number} size 
   * @param {string} priority 
   */
  add(path, buffer, size, priority) {
    // Make room if needed
    while (this.totalSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOne();
    }
    
    // Add to cache
    this.cache.set(path, {
      buffer,
      size,
      priority,
      created: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    });
    
    this.totalSize += size;
    this.accessOrder.push(path);
  }

  /**
   * Check if sample can fit
   * @param {number} size 
   * @returns {boolean}
   */
  canFit(size) {
    return size <= this.maxSize;
  }

  /**
   * Update access order
   * @param {string} path 
   */
  updateAccessOrder(path) {
    const index = this.accessOrder.indexOf(path);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(path);
  }

  /**
   * Evict one item
   */
  evictOne() {
    if (this.accessOrder.length === 0) return;
    
    // Find least recently used with lowest priority
    let victimPath = null;
    let lowestScore = Infinity;
    
    for (const path of this.accessOrder) {
      const entry = this.cache.get(path);
      if (entry) {
        const score = this.calculateEvictionScore(entry);
        if (score < lowestScore) {
          lowestScore = score;
          victimPath = path;
        }
      }
    }
    
    if (victimPath) {
      const entry = this.cache.get(victimPath);
      this.cache.delete(victimPath);
      this.totalSize -= entry.size;
      
      const index = this.accessOrder.indexOf(victimPath);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      
      // Dispose buffer
      if (entry.buffer && entry.buffer.dispose) {
        entry.buffer.dispose();
      }
    }
  }

  /**
   * Calculate eviction score
   * @param {Object} entry 
   * @returns {number}
   */
  calculateEvictionScore(entry) {
    const age = Date.now() - entry.lastAccessed;
    const priorityWeight = entry.priority === 'high' ? 10 : 1;
    const accessWeight = Math.log(entry.accessCount + 1);
    
    return age / (priorityWeight * accessWeight);
  }

  /**
   * Evict LRU to free space
   * @param {number} bytesToFree 
   * @returns {number} Actual bytes freed
   */
  evictLRU(bytesToFree) {
    let freed = 0;
    
    while (freed < bytesToFree && this.cache.size > 0) {
      const oldSize = this.totalSize;
      this.evictOne();
      freed += oldSize - this.totalSize;
    }
    
    return freed;
  }

  /**
   * Set aggressive mode
   * @param {boolean} aggressive 
   */
  setAggressiveMode(aggressive) {
    this.aggressiveMode = aggressive;
    
    if (aggressive) {
      // Evict low priority items
      const toEvict = [];
      this.cache.forEach((entry, path) => {
        if (entry.priority === 'low') {
          toEvict.push(path);
        }
      });
      
      toEvict.forEach(path => {
        const entry = this.cache.get(path);
        this.cache.delete(path);
        this.totalSize -= entry.size;
        if (entry.buffer && entry.buffer.dispose) {
          entry.buffer.dispose();
        }
      });
    }
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.forEach(entry => {
      if (entry.buffer && entry.buffer.dispose) {
        entry.buffer.dispose();
      }
    });
    
    this.cache.clear();
    this.accessOrder = [];
    this.totalSize = 0;
  }

  /**
   * Set max size
   * @param {number} maxSizeBytes 
   */
  setMaxSize(maxSizeBytes) {
    this.maxSize = maxSizeBytes;
    
    // Evict if over new limit
    while (this.totalSize > this.maxSize && this.cache.size > 0) {
      this.evictOne();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      aggressiveMode: this.aggressiveMode
    };
  }

  /**
   * Calculate hit rate
   * @returns {number}
   */
  calculateHitRate() {
    // In real implementation, would track hits/misses
    return 0.75; // Placeholder
  }

  dispose() {
    this.clear();
    this.registry.dispose();
  }
}

/**
 * Streaming engine for large samples
 */
class StreamingEngine {
  constructor() {
    this.registry = new DisposalRegistry('streaming-engine');
    
    // Active streams
    this.streams = new Map();
    
    // Configuration
    this.config = {
      bufferSize: 65536, // 64KB
      preloadTime: 2,
      maxConcurrentStreams: 10
    };
  }

  /**
   * Create streaming buffer
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async createStreamingBuffer(samplePath, options = {}) {
    const stream = {
      path: samplePath,
      bufferSize: options.bufferSize || this.config.bufferSize,
      preloadTime: options.preloadTime || this.config.preloadTime,
      chunks: [],
      currentChunk: 0,
      isLoading: false,
      isPaused: false
    };
    
    // Start preloading
    await this.preloadInitialChunks(stream);
    
    // Store stream
    const streamId = this.generateStreamId();
    this.streams.set(streamId, stream);
    
    // Return buffer-like object
    return this.createBufferInterface(streamId);
  }

  /**
   * Preload initial chunks
   * @param {Object} stream 
   */
  async preloadInitialChunks(stream) {
    // Load chunks for preload time
    const chunksNeeded = Math.ceil(
      stream.preloadTime * 48000 * 2 * 2 / stream.bufferSize
    );
    
    for (let i = 0; i < chunksNeeded; i++) {
      const chunk = await this.loadChunk(stream.path, i, stream.bufferSize);
      stream.chunks.push(chunk);
    }
  }

  /**
   * Load chunk
   * @param {string} path 
   * @param {number} chunkIndex 
   * @param {number} size 
   * @returns {Promise<ArrayBuffer>}
   */
  async loadChunk(path, chunkIndex, size) {
    // In real implementation, would read file chunk
    return new ArrayBuffer(size);
  }

  /**
   * Create buffer interface
   * @param {string} streamId 
   * @returns {Object}
   */
  createBufferInterface(streamId) {
    const self = this;
    
    return {
      get duration() {
        const stream = self.streams.get(streamId);
        return stream ? stream.duration || 0 : 0;
      },
      
      get numberOfChannels() {
        return 2; // Stereo default
      },
      
      get sampleRate() {
        return 48000; // Default
      },
      
      getChannelData(channel) {
        const stream = self.streams.get(streamId);
        if (!stream) return new Float32Array(0);
        
        // Return current chunk data
        return self.getStreamData(stream, channel);
      },
      
      dispose() {
        self.closeStream(streamId);
      }
    };
  }

  /**
   * Get stream data
   * @param {Object} stream 
   * @param {number} channel 
   * @returns {Float32Array}
   */
  getStreamData(stream, channel) {
    // Continue loading in background
    if (!stream.isLoading && stream.currentChunk < stream.totalChunks - 1) {
      this.loadNextChunks(stream);
    }
    
    // Return available data
    const availableChunks = stream.chunks.slice(
      stream.currentChunk, 
      stream.currentChunk + 10
    );
    
    // Convert to Float32Array
    const totalLength = availableChunks.reduce((sum, chunk) => 
      sum + chunk.byteLength / 4, 0
    );
    
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    availableChunks.forEach(chunk => {
      const view = new Float32Array(chunk);
      result.set(view, offset);
      offset += view.length;
    });
    
    return result;
  }

  /**
   * Load next chunks
   * @param {Object} stream 
   */
  async loadNextChunks(stream) {
    if (stream.isLoading || stream.isPaused) return;
    
    stream.isLoading = true;
    
    try {
      // Load next few chunks
      const chunksToLoad = 5;
      for (let i = 0; i < chunksToLoad; i++) {
        const nextIndex = stream.chunks.length;
        if (nextIndex < stream.totalChunks) {
          const chunk = await this.loadChunk(
            stream.path, 
            nextIndex, 
            stream.bufferSize
          );
          stream.chunks.push(chunk);
        }
      }
    } finally {
      stream.isLoading = false;
    }
  }

  /**
   * Close stream
   * @param {string} streamId 
   */
  closeStream(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      // Clear chunks
      stream.chunks = [];
      this.streams.delete(streamId);
    }
  }

  /**
   * Pause all streams
   */
  pauseAllStreams() {
    this.streams.forEach(stream => {
      stream.isPaused = true;
    });
  }

  /**
   * Resume all streams
   */
  resumeAllStreams() {
    this.streams.forEach(stream => {
      stream.isPaused = false;
    });
  }

  /**
   * Reduce buffer sizes
   * @param {number} factor 
   */
  reduceBufferSizes(factor) {
    this.config.bufferSize *= factor;
    
    // Apply to existing streams
    this.streams.forEach(stream => {
      stream.bufferSize *= factor;
    });
  }

  /**
   * Generate stream ID
   * @returns {string}
   */
  generateStreamId() {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   * @param {Object} config 
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      activeStreams: this.streams.size,
      config: { ...this.config },
      totalMemory: Array.from(this.streams.values()).reduce(
        (sum, stream) => sum + stream.chunks.length * stream.bufferSize, 0
      )
    };
  }

  dispose() {
    // Close all streams
    this.streams.forEach((stream, id) => {
      this.closeStream(id);
    });
    
    this.registry.dispose();
  }
}

/**
 * Background loader for non-critical samples
 */
class BackgroundLoader {
  constructor() {
    this.registry = new DisposalRegistry('background-loader');
    
    // Loading queue
    this.queue = [];
    this.isLoading = false;
    
    // Loaded buffers
    this.loaded = new Map();
    
    // Worker for background loading (if available)
    this.worker = null;
    this.initializeWorker();
  }

  /**
   * Initialize web worker
   */
  initializeWorker() {
    // In real implementation, would create web worker
    // For now, use async loading
  }

  /**
   * Queue sample for loading
   * @param {string} path 
   * @param {string} priority 
   * @returns {Promise<Tone.ToneAudioBuffer>}
   */
  queue(path, priority) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loaded.has(path)) {
        resolve(this.loaded.get(path));
        return;
      }
      
      // Add to queue
      const item = {
        path,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      if (priority === 'high') {
        this.queue.unshift(item);
      } else {
        this.queue.push(item);
      }
      
      // Start loading if not already
      if (!this.isLoading) {
        this.processQueue();
      }
    });
  }

  /**
   * Process loading queue
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.isLoading = false;
      return;
    }
    
    this.isLoading = true;
    
    // Sort by priority and timestamp
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return a.timestamp - b.timestamp;
    });
    
    // Process next item
    const item = this.queue.shift();
    
    try {
      const buffer = await this.loadSample(item.path);
      this.loaded.set(item.path, buffer);
      item.resolve(buffer);
    } catch (error) {
      item.reject(error);
    }
    
    // Continue processing
    if (this.queue.length > 0) {
      // Small delay to not block main thread
      setTimeout(() => this.processQueue(), 10);
    } else {
      this.isLoading = false;
    }
  }

  /**
   * Load sample
   * @param {string} path 
   * @returns {Promise<Tone.ToneAudioBuffer>}
   */
  async loadSample(path) {
    // Load with Tone.js
    return new Tone.ToneAudioBuffer(path);
  }

  /**
   * Clear queue
   */
  clearQueue() {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Get queue info
   * @returns {Object}
   */
  getQueueInfo() {
    return {
      queueLength: this.queue.length,
      isLoading: this.isLoading,
      loadedCount: this.loaded.size
    };
  }

  dispose() {
    this.clearQueue();
    
    // Dispose loaded buffers
    this.loaded.forEach(buffer => {
      if (buffer && buffer.dispose) {
        buffer.dispose();
      }
    });
    
    this.loaded.clear();
    
    if (this.worker) {
      this.worker.terminate();
    }
    
    this.registry.dispose();
  }
}

/**
 * Memory monitor
 */
class MemoryMonitor {
  constructor() {
    this.registry = new DisposalRegistry('memory-monitor');
    
    // Monitoring state
    this.isMonitoring = false;
    this.intervalId = null;
    
    // Callbacks
    this.onAlert = null;
    this.onCritical = null;
    
    // History
    this.history = [];
    this.maxHistory = 60; // 1 minute at 1 second intervals
  }

  /**
   * Start monitoring
   * @param {Object} config 
   */
  start(config = {}) {
    const {
      interval = 1000,
      onAlert,
      onCritical
    } = config;
    
    this.onAlert = onAlert;
    this.onCritical = onCritical;
    this.isMonitoring = true;
    
    this.intervalId = setInterval(() => {
      this.checkMemory();
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
   * Check memory usage
   */
  checkMemory() {
    const usage = this.getMemoryUsage();
    
    // Add to history
    this.history.push({
      timestamp: Date.now(),
      usage
    });
    
    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    
    // Check thresholds
    if (usage.percentage > 0.9 && this.onCritical) {
      this.onCritical(usage);
    } else if (usage.percentage > 0.8 && this.onAlert) {
      this.onAlert(usage);
    }
  }

  /**
   * Get current memory usage
   * @returns {Object}
   */
  getMemoryUsage() {
    // In real implementation, would use performance.memory API
    // For now, return placeholder
    return {
      used: 300 * 1024 * 1024, // 300MB
      total: 500 * 1024 * 1024, // 500MB
      percentage: 0.6
    };
  }

  /**
   * Get memory trends
   * @returns {Object}
   */
  getMemoryTrends() {
    if (this.history.length < 2) {
      return { trend: 'stable', rate: 0 };
    }
    
    const recent = this.history.slice(-10);
    const first = recent[0].usage.used;
    const last = recent[recent.length - 1].usage.used;
    const duration = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
    
    const rate = (last - first) / duration; // Bytes per second
    
    return {
      trend: rate > 1024 * 1024 ? 'increasing' : rate < -1024 * 1024 ? 'decreasing' : 'stable',
      rate,
      ratePerMinute: rate * 60
    };
  }

  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

// Factory function
export function createAdvancedMemoryManager() {
  return new AdvancedMemoryManager();
}