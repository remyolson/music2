/**
 * Memory Monitor for detecting leaks during development
 */
export class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.isMonitoring = false;
    this.interval = null;
    this.disposables = new WeakMap();
    this.objectCounts = new Map();
  }

  /**
   * Start monitoring memory usage
   * @param {number} intervalMs - Measurement interval in milliseconds
   */
  start(intervalMs = 5000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.measurements = [];
    
    // Take initial measurement
    this.measure();
    
    // Set up periodic measurements
    this.interval = setInterval(() => {
      this.measure();
      this.detectLeaks();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Take a memory measurement
   */
  async measure() {
    if (!performance.memory) {
      console.warn('Memory monitoring not available in this browser');
      return;
    }

    const measurement = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      audioNodes: this.countAudioNodes(),
      domNodes: document.getElementsByTagName('*').length,
      eventListeners: this.countEventListeners()
    };

    this.measurements.push(measurement);

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }
  }

  /**
   * Count active audio nodes (approximation)
   */
  countAudioNodes() {
    // This is an approximation - in real implementation,
    // you'd track node creation/disposal
    if (window.Tone && Tone.context) {
      // Estimate based on context state
      return Tone.context.state === 'running' ? 
        Object.keys(Tone).filter(k => k.includes('Node')).length : 0;
    }
    return 0;
  }

  /**
   * Count event listeners (approximation)
   */
  countEventListeners() {
    // Get all elements
    const elements = document.querySelectorAll('*');
    let count = 0;
    
    // Common event types to check
    const eventTypes = ['click', 'input', 'change', 'mousedown', 'keydown'];
    
    elements.forEach(el => {
      eventTypes.forEach(type => {
        // This is an approximation - actual listeners are not directly accessible
        if (el[`on${type}`]) count++;
      });
    });
    
    return count;
  }

  /**
   * Detect potential memory leaks
   */
  detectLeaks() {
    if (this.measurements.length < 10) return;

    const recent = this.measurements.slice(-10);
    const memoryGrowth = recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize;
    const growthRate = memoryGrowth / (recent[recent.length - 1].timestamp - recent[0].timestamp);

    // Warn if memory is growing too fast (more than 1MB per minute)
    if (growthRate > 1024 * 1024 / 60000) {
      console.warn('Potential memory leak detected:', {
        growthRate: `${(growthRate * 60000 / 1024 / 1024).toFixed(2)} MB/min`,
        currentMemory: `${(recent[recent.length - 1].usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        audioNodes: recent[recent.length - 1].audioNodes,
        domNodes: recent[recent.length - 1].domNodes
      });
    }
  }

  /**
   * Register an object for disposal tracking
   */
  registerDisposable(obj, disposeMethod = 'dispose') {
    if (!obj) return;
    
    this.disposables.set(obj, {
      disposeMethod,
      stackTrace: new Error().stack,
      timestamp: Date.now()
    });
  }

  /**
   * Check if a disposable object was properly disposed
   */
  checkDisposed(obj) {
    return !this.disposables.has(obj);
  }

  /**
   * Get memory statistics
   */
  getStats() {
    if (this.measurements.length === 0) return null;

    const latest = this.measurements[this.measurements.length - 1];
    const oldest = this.measurements[0];

    return {
      currentMemory: latest.usedJSHeapSize,
      memoryDelta: latest.usedJSHeapSize - oldest.usedJSHeapSize,
      timespan: latest.timestamp - oldest.timestamp,
      measurements: this.measurements.length,
      audioNodes: latest.audioNodes,
      domNodes: latest.domNodes,
      eventListeners: latest.eventListeners
    };
  }

  /**
   * Generate a memory report
   */
  generateReport() {
    const stats = this.getStats();
    if (!stats) return 'No measurements available';

    return `
Memory Monitor Report
====================
Current Memory: ${(stats.currentMemory / 1024 / 1024).toFixed(2)} MB
Memory Change: ${(stats.memoryDelta / 1024 / 1024).toFixed(2)} MB
Duration: ${(stats.timespan / 1000 / 60).toFixed(2)} minutes
Audio Nodes: ${stats.audioNodes}
DOM Nodes: ${stats.domNodes}
Event Listeners: ${stats.eventListeners}
`;
  }
}

// Create singleton instance
export const memoryMonitor = new MemoryMonitor();

// Auto-start in development mode
if (import.meta.env.DEV) {
  memoryMonitor.start();
  
  // Log report every minute in development
  setInterval(() => {
    console.log(memoryMonitor.generateReport());
  }, 60000);
}