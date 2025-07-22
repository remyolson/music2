import { DisposalRegistry } from '../DisposalRegistry.js';
import * as Tone from 'tone';

/**
 * RobustErrorRecovery - Comprehensive error handling and recovery system
 * Handles corrupted samples, audio dropouts, memory exhaustion, and provides user-friendly error messages
 */
export class RobustErrorRecovery {
  constructor() {
    this.registry = new DisposalRegistry('robust-error-recovery');
    
    // Error handling systems
    this.sampleErrorHandler = new SampleErrorHandler();
    this.registry.register(this.sampleErrorHandler);
    
    this.audioDropoutHandler = new AudioDropoutHandler();
    this.registry.register(this.audioDropoutHandler);
    
    this.memoryProtection = new MemoryProtection();
    this.registry.register(this.memoryProtection);
    
    this.userMessageSystem = new UserMessageSystem();
    this.registry.register(this.userMessageSystem);
    
    // Recovery strategies
    this.recoveryStrategies = new RecoveryStrategies();
    this.registry.register(this.recoveryStrategies);
    
    // Error monitoring
    this.errorMonitor = new ErrorMonitor();
    this.registry.register(this.errorMonitor);
    
    // State tracking
    this.systemState = {
      health: 'good', // 'good', 'degraded', 'critical'
      lastError: null,
      recoveryCount: 0,
      errorHistory: []
    };
    
    // Initialize error handling
    this.initializeErrorHandling();
  }

  /**
   * Initialize global error handling
   */
  initializeErrorHandling() {
    // Global unhandled error handler
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledPromise(event.reason, event);
    });
    
    // Audio context state change handler
    if (Tone.getContext) {
      const context = Tone.getContext();
      context.addEventListener('statechange', () => {
        this.handleAudioContextChange(context.state);
      });
    }
    
    // Start monitoring
    this.errorMonitor.start();
  }

  /**
   * Handle sample loading with recovery
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async loadSampleWithRecovery(samplePath, options = {}) {
    try {
      return await this.sampleErrorHandler.loadSample(samplePath, options);
    } catch (error) {
      return this.handleSampleError(error, samplePath, options);
    }
  }

  /**
   * Handle sample loading error
   * @param {Error} error 
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async handleSampleError(error, samplePath, options) {
    this.recordError('sample_load', error, { samplePath, options });
    
    // Try recovery strategies
    const recoveryResult = await this.recoveryStrategies.recoverSample(
      error, samplePath, options
    );
    
    if (recoveryResult.success) {
      this.userMessageSystem.showMessage({
        type: 'warning',
        title: 'Sample Loading Issue',
        message: `Used fallback for ${samplePath}: ${recoveryResult.fallbackUsed}`,
        duration: 3000
      });
      
      return recoveryResult.sample;
    } else {
      // Final fallback
      this.userMessageSystem.showMessage({
        type: 'error',
        title: 'Sample Loading Failed',
        message: `Could not load ${samplePath}. Using silence.`,
        duration: 5000
      });
      
      return this.createSilentSample();
    }
  }

  /**
   * Handle audio dropout with recovery
   * @param {Object} dropoutInfo 
   */
  handleAudioDropout(dropoutInfo) {
    this.recordError('audio_dropout', new Error('Audio dropout detected'), dropoutInfo);
    
    const recovery = this.audioDropoutHandler.handleDropout(dropoutInfo);
    
    if (recovery.requiresUserAction) {
      this.userMessageSystem.showMessage({
        type: 'warning',
        title: 'Audio Performance Issue',
        message: recovery.userMessage,
        actions: recovery.actions
      });
    }
    
    // Apply automatic recovery
    if (recovery.automaticActions) {
      recovery.automaticActions.forEach(action => {
        this.executeRecoveryAction(action);
      });
    }
  }

  /**
   * Handle memory exhaustion
   * @param {Object} memoryInfo 
   */
  handleMemoryExhaustion(memoryInfo) {
    this.recordError('memory_exhaustion', new Error('Memory exhausted'), memoryInfo);
    
    const protection = this.memoryProtection.handleExhaustion(memoryInfo);
    
    this.userMessageSystem.showMessage({
      type: 'error',
      title: 'Memory Limit Reached',
      message: 'Reducing quality to free memory. Consider simplifying your project.',
      duration: 10000
    });
    
    // Execute protection measures
    protection.actions.forEach(action => {
      this.executeRecoveryAction(action);
    });
    
    this.systemState.health = 'degraded';
  }

  /**
   * Handle global JavaScript errors
   * @param {Error} error 
   * @param {Event} event 
   */
  handleGlobalError(error, event) {
    this.recordError('global_error', error, { event });
    
    // Determine severity
    const severity = this.assessErrorSeverity(error);
    
    if (severity === 'critical') {
      this.handleCriticalError(error);
    } else {
      this.handleNonCriticalError(error);
    }
  }

  /**
   * Handle unhandled promise rejections
   * @param {any} reason 
   * @param {Event} event 
   */
  handleUnhandledPromise(reason, event) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    this.recordError('unhandled_promise', error, { event });
    
    // Most promise rejections are non-critical
    this.handleNonCriticalError(error);
  }

  /**
   * Handle audio context state changes
   * @param {string} state 
   */
  handleAudioContextChange(state) {
    if (state === 'suspended') {
      this.userMessageSystem.showMessage({
        type: 'info',
        title: 'Audio Suspended',
        message: 'Click anywhere to resume audio playback.',
        persistent: true,
        onClick: () => {
          Tone.start();
        }
      });
    } else if (state === 'interrupted') {
      this.userMessageSystem.showMessage({
        type: 'warning',
        title: 'Audio Interrupted',
        message: 'Audio was interrupted by another application.',
        duration: 5000
      });
    }
  }

  /**
   * Handle critical errors
   * @param {Error} error 
   */
  handleCriticalError(error) {
    this.systemState.health = 'critical';
    
    this.userMessageSystem.showMessage({
      type: 'error',
      title: 'Critical Error',
      message: 'A serious error occurred. The application may be unstable.',
      persistent: true,
      actions: [
        {
          text: 'Reload Page',
          action: () => window.location.reload()
        },
        {
          text: 'Report Bug',
          action: () => this.openBugReport(error)
        }
      ]
    });
    
    // Emergency cleanup
    this.executeEmergencyCleanup();
  }

  /**
   * Handle non-critical errors
   * @param {Error} error 
   */
  handleNonCriticalError(error) {
    // Only show message if error is user-relevant
    if (this.isUserRelevantError(error)) {
      this.userMessageSystem.showMessage({
        type: 'warning',
        title: 'Minor Issue',
        message: this.getUserFriendlyMessage(error),
        duration: 5000
      });
    }
    
    // Log for debugging
    console.warn('Non-critical error:', error);
  }

  /**
   * Assess error severity
   * @param {Error} error 
   * @returns {string}
   */
  assessErrorSeverity(error) {
    // Critical patterns
    const criticalPatterns = [
      /out of memory/i,
      /maximum call stack/i,
      /cannot read property.*undefined/i,
      /webgl.*context.*lost/i
    ];
    
    for (const pattern of criticalPatterns) {
      if (pattern.test(error.message)) {
        return 'critical';
      }
    }
    
    return 'minor';
  }

  /**
   * Check if error is user-relevant
   * @param {Error} error 
   * @returns {boolean}
   */
  isUserRelevantError(error) {
    // Errors that users should be aware of
    const userRelevantPatterns = [
      /sample.*not.*found/i,
      /network.*error/i,
      /permission.*denied/i,
      /quota.*exceeded/i
    ];
    
    return userRelevantPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Get user-friendly error message
   * @param {Error} error 
   * @returns {string}
   */
  getUserFriendlyMessage(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('sample') && message.includes('not found')) {
      return 'A sound file could not be loaded. Using a substitute sound.';
    }
    
    if (message.includes('network')) {
      return 'Network connection issue. Some features may not work properly.';
    }
    
    if (message.includes('permission')) {
      return 'Permission denied. Please check your browser settings.';
    }
    
    if (message.includes('quota')) {
      return 'Storage limit exceeded. Consider clearing browser data.';
    }
    
    return 'A minor issue occurred, but the application should continue working.';
  }

  /**
   * Execute recovery action
   * @param {Object} action 
   */
  executeRecoveryAction(action) {
    try {
      switch (action.type) {
        case 'reduce_quality':
          this.reduceQuality(action.amount);
          break;
          
        case 'free_memory':
          this.freeMemory(action.amount);
          break;
          
        case 'restart_audio':
          this.restartAudio();
          break;
          
        case 'clear_cache':
          this.clearCache();
          break;
          
        default:
          console.warn('Unknown recovery action:', action.type);
      }
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
    }
  }

  /**
   * Execute emergency cleanup
   */
  executeEmergencyCleanup() {
    try {
      // Stop all audio
      if (Tone.Transport) {
        Tone.Transport.stop();
      }
      
      // Clear all scheduled events
      if (Tone.Transport && Tone.Transport.cancel) {
        Tone.Transport.cancel();
      }
      
      // Dispose all global objects
      if (Tone.dispose) {
        Tone.dispose();
      }
      
      // Clear memory
      this.clearCache();
      
    } catch (cleanupError) {
      console.error('Emergency cleanup failed:', cleanupError);
    }
  }

  /**
   * Record error for analysis
   * @param {string} type 
   * @param {Error} error 
   * @param {Object} context 
   */
  recordError(type, error, context = {}) {
    const errorRecord = {
      type,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.systemState.errorHistory.push(errorRecord);
    this.systemState.lastError = errorRecord;
    
    // Trim history
    if (this.systemState.errorHistory.length > 100) {
      this.systemState.errorHistory.shift();
    }
    
    // Report to monitoring
    this.errorMonitor.recordError(errorRecord);
  }

  /**
   * Create silent sample fallback
   * @returns {Object}
   */
  createSilentSample() {
    const buffer = new AudioBuffer({
      numberOfChannels: 2,
      length: 48000, // 1 second at 48kHz
      sampleRate: 48000
    });
    
    return new Tone.ToneAudioBuffer(buffer);
  }

  /**
   * Reduce quality to save resources
   * @param {number} amount 
   */
  reduceQuality(amount) {
    // Implementation would reduce various quality settings
    if (this.onQualityReduction) {
      this.onQualityReduction(amount);
    }
  }

  /**
   * Free memory
   * @param {number} amount 
   */
  freeMemory(amount) {
    // Implementation would free memory
    if (this.onMemoryFree) {
      this.onMemoryFree(amount);
    }
  }

  /**
   * Restart audio system
   */
  async restartAudio() {
    try {
      await Tone.start();
      if (this.onAudioRestart) {
        this.onAudioRestart();
      }
    } catch (error) {
      console.error('Audio restart failed:', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    // Implementation would clear various caches
    if (this.onCacheClear) {
      this.onCacheClear();
    }
  }

  /**
   * Open bug report
   * @param {Error} error 
   */
  openBugReport(error) {
    const bugData = {
      error: {
        message: error.message,
        stack: error.stack
      },
      systemState: this.systemState,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    // In real implementation, would open bug report form
    console.log('Bug report data:', bugData);
  }

  /**
   * Get system health status
   * @returns {Object}
   */
  getSystemHealth() {
    return {
      ...this.systemState,
      errorRate: this.calculateErrorRate(),
      recoverySuccess: this.calculateRecoverySuccess()
    };
  }

  /**
   * Calculate error rate
   * @returns {number}
   */
  calculateErrorRate() {
    const recentErrors = this.systemState.errorHistory.filter(
      error => Date.now() - error.timestamp < 60000 // Last minute
    );
    
    return recentErrors.length;
  }

  /**
   * Calculate recovery success rate
   * @returns {number}
   */
  calculateRecoverySuccess() {
    // Simplified calculation
    const totalErrors = this.systemState.errorHistory.length;
    const successfulRecoveries = this.systemState.recoveryCount;
    
    return totalErrors > 0 ? successfulRecoveries / totalErrors : 1;
  }

  /**
   * Dispose
   */
  dispose() {
    this.errorMonitor.stop();
    this.registry.dispose();
  }
}

/**
 * Sample error handler
 */
class SampleErrorHandler {
  constructor() {
    this.registry = new DisposalRegistry('sample-error-handler');
    
    // Fallback samples
    this.fallbackSamples = new Map();
    this.loadFallbackSamples();
  }

  /**
   * Load fallback samples
   */
  async loadFallbackSamples() {
    // Create basic waveform samples as fallbacks
    const sampleRate = 48000;
    const duration = 1; // 1 second
    const length = sampleRate * duration;
    
    // Sine wave
    const sineBuffer = new AudioBuffer({
      numberOfChannels: 1,
      length,
      sampleRate
    });
    
    const sineData = sineBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      sineData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
    }
    
    this.fallbackSamples.set('sine', new Tone.ToneAudioBuffer(sineBuffer));
    
    // Square wave
    const squareBuffer = new AudioBuffer({
      numberOfChannels: 1,
      length,
      sampleRate
    });
    
    const squareData = squareBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      squareData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) > 0 ? 0.3 : -0.3;
    }
    
    this.fallbackSamples.set('square', new Tone.ToneAudioBuffer(squareBuffer));
  }

  /**
   * Load sample with error handling
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async loadSample(samplePath, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const buffer = new Tone.ToneAudioBuffer(samplePath);
        await new Promise((resolve, reject) => {
          buffer.onload = resolve;
          buffer.onerror = reject;
        });
        
        return buffer;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Get fallback sample
   * @param {string} type 
   * @returns {Object}
   */
  getFallbackSample(type = 'sine') {
    return this.fallbackSamples.get(type) || this.fallbackSamples.get('sine');
  }

  dispose() {
    this.fallbackSamples.forEach(sample => {
      if (sample.dispose) {
        sample.dispose();
      }
    });
    
    this.fallbackSamples.clear();
    this.registry.dispose();
  }
}

/**
 * Audio dropout handler
 */
class AudioDropoutHandler {
  constructor() {
    this.registry = new DisposalRegistry('audio-dropout-handler');
    
    // Dropout detection
    this.lastAudioTime = 0;
    this.dropoutThreshold = 0.1; // 100ms
    this.dropoutCount = 0;
  }

  /**
   * Handle audio dropout
   * @param {Object} dropoutInfo 
   * @returns {Object}
   */
  handleDropout(dropoutInfo) {
    this.dropoutCount++;
    
    const { duration, severity } = dropoutInfo;
    
    if (severity === 'minor') {
      return {
        requiresUserAction: false,
        automaticActions: [
          { type: 'reduce_quality', amount: 0.1 }
        ]
      };
    } else if (severity === 'major') {
      return {
        requiresUserAction: true,
        userMessage: 'Audio performance is poor. Consider closing other applications or reducing quality.',
        actions: [
          {
            text: 'Reduce Quality',
            action: () => ({ type: 'reduce_quality', amount: 0.3 })
          },
          {
            text: 'Restart Audio',
            action: () => ({ type: 'restart_audio' })
          }
        ],
        automaticActions: [
          { type: 'reduce_quality', amount: 0.2 }
        ]
      };
    } else {
      return {
        requiresUserAction: true,
        userMessage: 'Severe audio problems detected. Consider restarting the application.',
        actions: [
          {
            text: 'Emergency Reset',
            action: () => ({ type: 'emergency_reset' })
          }
        ]
      };
    }
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Memory protection system
 */
class MemoryProtection {
  constructor() {
    this.registry = new DisposalRegistry('memory-protection');
    
    this.memoryLimit = 500 * 1024 * 1024; // 500MB
    this.warningThreshold = 0.8;
    this.criticalThreshold = 0.95;
  }

  /**
   * Handle memory exhaustion
   * @param {Object} memoryInfo 
   * @returns {Object}
   */
  handleExhaustion(memoryInfo) {
    const usageRatio = memoryInfo.used / this.memoryLimit;
    
    if (usageRatio > this.criticalThreshold) {
      return {
        actions: [
          { type: 'clear_cache' },
          { type: 'reduce_quality', amount: 0.5 },
          { type: 'free_memory', amount: this.memoryLimit * 0.3 }
        ]
      };
    } else if (usageRatio > this.warningThreshold) {
      return {
        actions: [
          { type: 'reduce_quality', amount: 0.2 },
          { type: 'free_memory', amount: this.memoryLimit * 0.1 }
        ]
      };
    }
    
    return { actions: [] };
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * User message system
 */
class UserMessageSystem {
  constructor() {
    this.registry = new DisposalRegistry('user-message-system');
    
    this.messages = new Map();
    this.messageId = 0;
  }

  /**
   * Show message to user
   * @param {Object} message 
   * @returns {number}
   */
  showMessage(message) {
    const id = ++this.messageId;
    
    const messageData = {
      id,
      type: message.type || 'info',
      title: message.title || 'Notice',
      message: message.message || '',
      duration: message.duration || 0,
      persistent: message.persistent || false,
      actions: message.actions || [],
      onClick: message.onClick,
      timestamp: Date.now()
    };
    
    this.messages.set(id, messageData);
    
    // Auto-dismiss if duration is set
    if (messageData.duration > 0) {
      setTimeout(() => {
        this.dismissMessage(id);
      }, messageData.duration);
    }
    
    // Notify UI
    if (this.onMessageShow) {
      this.onMessageShow(messageData);
    }
    
    return id;
  }

  /**
   * Dismiss message
   * @param {number} messageId 
   */
  dismissMessage(messageId) {
    const message = this.messages.get(messageId);
    if (message) {
      this.messages.delete(messageId);
      
      if (this.onMessageDismiss) {
        this.onMessageDismiss(message);
      }
    }
  }

  /**
   * Get active messages
   * @returns {Array}
   */
  getActiveMessages() {
    return Array.from(this.messages.values());
  }

  dispose() {
    this.messages.clear();
    this.registry.dispose();
  }
}

/**
 * Recovery strategies
 */
class RecoveryStrategies {
  constructor() {
    this.registry = new DisposalRegistry('recovery-strategies');
  }

  /**
   * Recover from sample loading error
   * @param {Error} error 
   * @param {string} samplePath 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async recoverSample(error, samplePath, options) {
    // Strategy 1: Try alternative URL formats
    const alternatives = this.generateAlternativeURLs(samplePath);
    
    for (const altUrl of alternatives) {
      try {
        const buffer = new Tone.ToneAudioBuffer(altUrl);
        await new Promise((resolve, reject) => {
          buffer.onload = resolve;
          buffer.onerror = reject;
        });
        
        return {
          success: true,
          sample: buffer,
          fallbackUsed: `Alternative URL: ${altUrl}`
        };
      } catch (altError) {
        continue;
      }
    }
    
    // Strategy 2: Use similar samples
    const similarSample = await this.findSimilarSample(samplePath);
    if (similarSample) {
      return {
        success: true,
        sample: similarSample.buffer,
        fallbackUsed: `Similar sample: ${similarSample.name}`
      };
    }
    
    // Strategy 3: Generate synthetic equivalent
    const synthetic = await this.generateSyntheticSample(samplePath);
    if (synthetic) {
      return {
        success: true,
        sample: synthetic,
        fallbackUsed: 'Synthetic generation'
      };
    }
    
    return { success: false };
  }

  /**
   * Generate alternative URLs
   * @param {string} originalUrl 
   * @returns {Array}
   */
  generateAlternativeURLs(originalUrl) {
    const alternatives = [];
    
    // Try different file extensions
    const extensions = ['.wav', '.mp3', '.ogg', '.m4a'];
    const baseName = originalUrl.replace(/\.[^.]+$/, '');
    
    extensions.forEach(ext => {
      if (!originalUrl.endsWith(ext)) {
        alternatives.push(baseName + ext);
      }
    });
    
    // Try different quality versions
    alternatives.push(originalUrl.replace('hq', 'lq'));
    alternatives.push(originalUrl.replace('24bit', '16bit'));
    
    return alternatives;
  }

  /**
   * Find similar sample
   * @param {string} samplePath 
   * @returns {Promise<Object|null>}
   */
  async findSimilarSample(samplePath) {
    // Simple similarity matching based on filename
    // In real implementation, would use more sophisticated matching
    return null;
  }

  /**
   * Generate synthetic sample
   * @param {string} samplePath 
   * @returns {Promise<Object|null>}
   */
  async generateSyntheticSample(samplePath) {
    // Analyze filename to determine what to generate
    const filename = samplePath.split('/').pop().toLowerCase();
    
    if (filename.includes('kick') || filename.includes('bass')) {
      return this.generateKickDrum();
    } else if (filename.includes('snare')) {
      return this.generateSnare();
    } else if (filename.includes('hihat')) {
      return this.generateHihat();
    }
    
    return null;
  }

  /**
   * Generate kick drum
   * @returns {Object}
   */
  generateKickDrum() {
    const sampleRate = 48000;
    const duration = 0.5;
    const length = sampleRate * duration;
    
    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length,
      sampleRate
    });
    
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 60 * Math.exp(-t * 10); // Pitch envelope
      const amp = Math.exp(-t * 8); // Amplitude envelope
      data[i] = Math.sin(2 * Math.PI * freq * t) * amp * 0.5;
    }
    
    return new Tone.ToneAudioBuffer(buffer);
  }

  /**
   * Generate snare
   * @returns {Object}
   */
  generateSnare() {
    const sampleRate = 48000;
    const duration = 0.2;
    const length = sampleRate * duration;
    
    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length,
      sampleRate
    });
    
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() - 0.5) * 2;
      const tone = Math.sin(2 * Math.PI * 200 * t);
      const amp = Math.exp(-t * 15);
      data[i] = (noise * 0.7 + tone * 0.3) * amp * 0.3;
    }
    
    return new Tone.ToneAudioBuffer(buffer);
  }

  /**
   * Generate hihat
   * @returns {Object}
   */
  generateHihat() {
    const sampleRate = 48000;
    const duration = 0.1;
    const length = sampleRate * duration;
    
    const buffer = new AudioBuffer({
      numberOfChannels: 1,
      length,
      sampleRate
    });
    
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() - 0.5) * 2;
      const highpass = noise * (1 - Math.exp(-t * 100)); // High-pass effect
      const amp = Math.exp(-t * 20);
      data[i] = highpass * amp * 0.2;
    }
    
    return new Tone.ToneAudioBuffer(buffer);
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Error monitor
 */
class ErrorMonitor {
  constructor() {
    this.registry = new DisposalRegistry('error-monitor');
    
    this.isMonitoring = false;
    this.errorCount = 0;
    this.errorTypes = new Map();
  }

  /**
   * Start monitoring
   */
  start() {
    this.isMonitoring = true;
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
  }

  /**
   * Record error
   * @param {Object} errorRecord 
   */
  recordError(errorRecord) {
    if (!this.isMonitoring) return;
    
    this.errorCount++;
    
    const count = this.errorTypes.get(errorRecord.type) || 0;
    this.errorTypes.set(errorRecord.type, count + 1);
  }

  /**
   * Get monitoring statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalErrors: this.errorCount,
      errorsByType: Object.fromEntries(this.errorTypes),
      isMonitoring: this.isMonitoring
    };
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createRobustErrorRecovery() {
  return new RobustErrorRecovery();
}