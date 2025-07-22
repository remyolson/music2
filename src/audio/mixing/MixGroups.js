import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { BusProcessor } from './BusProcessor.js';
import { ParallelProcessor } from './ParallelProcessor.js';

/**
 * MixGroups - Advanced mix group management
 * Handles VCA groups, DCA control, and mix scenes
 */
export class MixGroups {
  constructor() {
    this.registry = new DisposalRegistry('mix-groups');
    
    // Bus processor
    this.busProcessor = new BusProcessor();
    this.registry.register(this.busProcessor);
    
    // VCA groups (Volume Control Automation)
    this.vcaGroups = new Map();
    
    // DCA groups (Digitally Controlled Amplifier)
    this.dcaGroups = new Map();
    
    // Mix scenes
    this.scenes = new Map();
    this.currentScene = null;
    
    // Group assignments
    this.channelAssignments = new Map();
    
    // Initialize default groups
    this.initializeDefaultGroups();
    
    // Output
    this.output = this.busProcessor.output;
  }

  /**
   * Initialize default VCA/DCA groups
   */
  initializeDefaultGroups() {
    // VCA Groups
    this.createVCAGroup('drums', {
      color: '#FF5722',
      channels: ['kick', 'snare', 'hihat', 'toms', 'overheads']
    });
    
    this.createVCAGroup('strings', {
      color: '#4CAF50',
      channels: ['violins1', 'violins2', 'violas', 'cellos', 'basses']
    });
    
    this.createVCAGroup('brass', {
      color: '#FFC107',
      channels: ['trumpets', 'trombones', 'frenchHorns', 'tubas']
    });
    
    this.createVCAGroup('woodwinds', {
      color: '#2196F3',
      channels: ['flutes', 'oboes', 'clarinets', 'bassoons']
    });
    
    // DCA Groups (for send control)
    this.createDCAGroup('reverbSends', {
      type: 'send',
      destination: 'reverb',
      channels: ['vocals', 'strings', 'brass']
    });
    
    this.createDCAGroup('delaySends', {
      type: 'send',
      destination: 'delay',
      channels: ['vocals', 'guitars', 'keys']
    });
  }

  /**
   * Create VCA group
   * @param {string} name 
   * @param {Object} config 
   */
  createVCAGroup(name, config = {}) {
    if (this.vcaGroups.has(name)) {
      console.warn(`VCA group '${name}' already exists`);
      return;
    }
    
    const group = {
      name,
      level: 0,
      mute: false,
      solo: false,
      color: config.color || '#666',
      channels: new Set(config.channels || []),
      automation: null,
      enabled: true
    };
    
    this.vcaGroups.set(name, group);
    
    // Apply to existing channels
    this.updateVCAGroup(name);
    
    return group;
  }

  /**
   * Create DCA group
   * @param {string} name 
   * @param {Object} config 
   */
  createDCAGroup(name, config = {}) {
    if (this.dcaGroups.has(name)) {
      console.warn(`DCA group '${name}' already exists`);
      return;
    }
    
    const group = {
      name,
      type: config.type || 'fader', // 'fader', 'send', 'pan'
      level: 0,
      destination: config.destination,
      channels: new Set(config.channels || []),
      enabled: true
    };
    
    this.dcaGroups.set(name, group);
    
    // Apply to existing channels
    this.updateDCAGroup(name);
    
    return group;
  }

  /**
   * Add channel to group
   * @param {string} channelName 
   * @param {string} groupName 
   * @param {string} groupType 'vca' or 'dca'
   */
  addChannelToGroup(channelName, groupName, groupType = 'vca') {
    const groups = groupType === 'vca' ? this.vcaGroups : this.dcaGroups;
    const group = groups.get(groupName);
    
    if (!group) {
      console.warn(`${groupType.toUpperCase()} group '${groupName}' not found`);
      return;
    }
    
    group.channels.add(channelName);
    
    // Update assignments
    if (!this.channelAssignments.has(channelName)) {
      this.channelAssignments.set(channelName, {
        vca: new Set(),
        dca: new Set()
      });
    }
    
    this.channelAssignments.get(channelName)[groupType].add(groupName);
    
    // Apply group settings
    if (groupType === 'vca') {
      this.updateVCAGroup(groupName);
    } else {
      this.updateDCAGroup(groupName);
    }
  }

  /**
   * Remove channel from group
   * @param {string} channelName 
   * @param {string} groupName 
   * @param {string} groupType 
   */
  removeChannelFromGroup(channelName, groupName, groupType = 'vca') {
    const groups = groupType === 'vca' ? this.vcaGroups : this.dcaGroups;
    const group = groups.get(groupName);
    
    if (!group) return;
    
    group.channels.delete(channelName);
    
    const assignments = this.channelAssignments.get(channelName);
    if (assignments) {
      assignments[groupType].delete(groupName);
    }
  }

  /**
   * Set VCA group level
   * @param {string} groupName 
   * @param {number} level in dB
   */
  setVCAGroupLevel(groupName, level) {
    const group = this.vcaGroups.get(groupName);
    if (!group) return;
    
    group.level = level;
    this.updateVCAGroup(groupName);
  }

  /**
   * Set VCA group mute
   * @param {string} groupName 
   * @param {boolean} mute 
   */
  setVCAGroupMute(groupName, mute) {
    const group = this.vcaGroups.get(groupName);
    if (!group) return;
    
    group.mute = mute;
    this.updateVCAGroup(groupName);
  }

  /**
   * Set VCA group solo
   * @param {string} groupName 
   * @param {boolean} solo 
   */
  setVCAGroupSolo(groupName, solo) {
    const group = this.vcaGroups.get(groupName);
    if (!group) return;
    
    group.solo = solo;
    
    // Handle solo logic
    const anySoloed = Array.from(this.vcaGroups.values()).some(g => g.solo);
    
    this.vcaGroups.forEach((g, name) => {
      if (anySoloed) {
        g.enabled = g.solo;
      } else {
        g.enabled = true;
      }
    });
    
    // Update all groups
    this.vcaGroups.forEach((g, name) => this.updateVCAGroup(name));
  }

  /**
   * Update VCA group
   * @param {string} groupName 
   */
  updateVCAGroup(groupName) {
    const group = this.vcaGroups.get(groupName);
    if (!group) return;
    
    // Calculate effective level
    let effectiveLevel = group.level;
    let effectiveMute = group.mute || !group.enabled;
    
    // Apply to all channels in group
    group.channels.forEach(channelName => {
      // Get all VCA groups this channel belongs to
      const assignments = this.channelAssignments.get(channelName);
      if (!assignments) return;
      
      // Sum VCA contributions
      let totalVCALevel = 0;
      let anyMuted = false;
      
      assignments.vca.forEach(vcaName => {
        const vca = this.vcaGroups.get(vcaName);
        if (vca) {
          totalVCALevel += vca.level;
          if (vca.mute || !vca.enabled) {
            anyMuted = true;
          }
        }
      });
      
      // Apply to bus (this would need channel reference in real implementation)
      // For now, we'll use bus names
      if (this.busProcessor.buses.has(channelName)) {
        this.busProcessor.setBusLevel(channelName, totalVCALevel);
        this.busProcessor.setBusMute(channelName, anyMuted);
      }
    });
  }

  /**
   * Set DCA group level
   * @param {string} groupName 
   * @param {number} level 
   */
  setDCAGroupLevel(groupName, level) {
    const group = this.dcaGroups.get(groupName);
    if (!group) return;
    
    group.level = level;
    this.updateDCAGroup(groupName);
  }

  /**
   * Update DCA group
   * @param {string} groupName 
   */
  updateDCAGroup(groupName) {
    const group = this.dcaGroups.get(groupName);
    if (!group) return;
    
    // Apply to all channels in group
    group.channels.forEach(channelName => {
      if (group.type === 'send' && group.destination) {
        // Update send level
        // This would need proper channel/send references
        console.log(`Update send from ${channelName} to ${group.destination}: ${group.level}dB`);
      } else if (group.type === 'fader') {
        // Update fader offset
        const currentLevel = this.busProcessor.getBusParameters(channelName)?.level || 0;
        this.busProcessor.setBusLevel(channelName, currentLevel + group.level);
      }
    });
  }

  /**
   * Create automation for VCA group
   * @param {string} groupName 
   * @param {Object} automation 
   */
  createVCAAutomation(groupName, automation) {
    const group = this.vcaGroups.get(groupName);
    if (!group) return;
    
    const auto = new VCAAutomation(groupName, automation);
    this.registry.register(auto);
    
    group.automation = auto;
    
    // Start automation
    auto.start((value) => {
      this.setVCAGroupLevel(groupName, value);
    });
    
    return auto;
  }

  /**
   * Save current mix as scene
   * @param {string} sceneName 
   */
  saveScene(sceneName) {
    const scene = {
      name: sceneName,
      timestamp: Date.now(),
      busSnapshot: this.busProcessor.createSnapshot(),
      vcaGroups: {},
      dcaGroups: {}
    };
    
    // Save VCA states
    this.vcaGroups.forEach((group, name) => {
      scene.vcaGroups[name] = {
        level: group.level,
        mute: group.mute,
        solo: group.solo
      };
    });
    
    // Save DCA states
    this.dcaGroups.forEach((group, name) => {
      scene.dcaGroups[name] = {
        level: group.level
      };
    });
    
    this.scenes.set(sceneName, scene);
    
    return scene;
  }

  /**
   * Recall scene
   * @param {string} sceneName 
   * @param {number} fadeTime in seconds
   */
  recallScene(sceneName, fadeTime = 0) {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      console.warn(`Scene '${sceneName}' not found`);
      return;
    }
    
    this.currentScene = sceneName;
    
    if (fadeTime > 0) {
      // Animated recall
      this.animateSceneRecall(scene, fadeTime);
    } else {
      // Instant recall
      this.applyScene(scene);
    }
  }

  /**
   * Apply scene instantly
   * @param {Object} scene 
   */
  applyScene(scene) {
    // Recall bus snapshot
    this.busProcessor.recallSnapshot(scene.busSnapshot);
    
    // Recall VCA groups
    Object.entries(scene.vcaGroups).forEach(([name, state]) => {
      const group = this.vcaGroups.get(name);
      if (group) {
        group.level = state.level;
        group.mute = state.mute;
        group.solo = state.solo;
        this.updateVCAGroup(name);
      }
    });
    
    // Recall DCA groups
    Object.entries(scene.dcaGroups).forEach(([name, state]) => {
      const group = this.dcaGroups.get(name);
      if (group) {
        group.level = state.level;
        this.updateDCAGroup(name);
      }
    });
  }

  /**
   * Animate scene recall
   * @param {Object} targetScene 
   * @param {number} fadeTime 
   */
  animateSceneRecall(targetScene, fadeTime) {
    const startTime = Tone.now();
    const startState = this.captureCurrentState();
    
    const animate = () => {
      const elapsed = Tone.now() - startTime;
      const progress = Math.min(elapsed / fadeTime, 1);
      
      // Interpolate values
      this.interpolateScenes(startState, targetScene, progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * Capture current state
   * @returns {Object}
   */
  captureCurrentState() {
    return {
      vcaGroups: {},
      dcaGroups: {}
    };
  }

  /**
   * Interpolate between scenes
   * @param {Object} start 
   * @param {Object} target 
   * @param {number} progress 
   */
  interpolateScenes(start, target, progress) {
    // Interpolate VCA levels
    Object.entries(target.vcaGroups).forEach(([name, targetState]) => {
      const group = this.vcaGroups.get(name);
      if (group) {
        const startLevel = start.vcaGroups[name]?.level || group.level;
        const newLevel = startLevel + (targetState.level - startLevel) * progress;
        this.setVCAGroupLevel(name, newLevel);
      }
    });
  }

  /**
   * Get all scenes
   * @returns {Array}
   */
  getScenes() {
    return Array.from(this.scenes.entries()).map(([name, scene]) => ({
      name,
      timestamp: scene.timestamp
    }));
  }

  /**
   * Delete scene
   * @param {string} sceneName 
   */
  deleteScene(sceneName) {
    this.scenes.delete(sceneName);
  }

  /**
   * Get group info
   * @returns {Object}
   */
  getGroupInfo() {
    return {
      vca: Array.from(this.vcaGroups.entries()).map(([name, group]) => ({
        name,
        level: group.level,
        mute: group.mute,
        solo: group.solo,
        color: group.color,
        channels: Array.from(group.channels),
        hasAutomation: !!group.automation
      })),
      dca: Array.from(this.dcaGroups.entries()).map(([name, group]) => ({
        name,
        type: group.type,
        level: group.level,
        destination: group.destination,
        channels: Array.from(group.channels)
      }))
    };
  }

  /**
   * Connect to destination
   * @param {Tone.ToneAudioNode} destination 
   */
  connect(destination) {
    this.output.connect(destination);
    return this;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.output.disconnect();
    return this;
  }

  /**
   * Dispose
   */
  dispose() {
    this.vcaGroups.forEach(group => {
      if (group.automation) {
        group.automation.dispose();
      }
    });
    this.vcaGroups.clear();
    this.dcaGroups.clear();
    this.scenes.clear();
    this.registry.dispose();
  }
}

/**
 * VCA Automation
 */
class VCAAutomation {
  constructor(name, config = {}) {
    this.registry = new DisposalRegistry(`vca-automation-${name}`);
    this.name = name;
    
    this.type = config.type || 'linear'; // 'linear', 'sine', 'exponential'
    this.min = config.min || -60;
    this.max = config.max || 12;
    this.period = config.period || 4; // seconds
    this.phase = config.phase || 0;
    
    this.running = false;
    this.callback = null;
    this.animationId = null;
  }

  /**
   * Start automation
   * @param {Function} callback 
   */
  start(callback) {
    this.callback = callback;
    this.running = true;
    this.startTime = Tone.now();
    
    const animate = () => {
      if (!this.running) return;
      
      const elapsed = Tone.now() - this.startTime;
      const value = this.calculateValue(elapsed);
      
      if (this.callback) {
        this.callback(value);
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Stop automation
   */
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Calculate value at time
   * @param {number} elapsed 
   * @returns {number}
   */
  calculateValue(elapsed) {
    const phase = (elapsed / this.period + this.phase) % 1;
    let normalized;
    
    switch (this.type) {
      case 'sine':
        normalized = (Math.sin(phase * Math.PI * 2) + 1) / 2;
        break;
        
      case 'exponential':
        normalized = Math.pow(phase, 2);
        break;
        
      case 'linear':
      default:
        normalized = phase;
        break;
    }
    
    return this.min + (this.max - this.min) * normalized;
  }

  /**
   * Dispose
   */
  dispose() {
    this.stop();
    this.registry.dispose();
  }
}

/**
 * Mix group presets
 */
export const mixGroupPresets = {
  orchestral: {
    vca: [
      { name: 'strings', channels: ['violins1', 'violins2', 'violas', 'cellos', 'basses'] },
      { name: 'brass', channels: ['trumpets', 'trombones', 'frenchHorns', 'tubas'] },
      { name: 'woodwinds', channels: ['flutes', 'oboes', 'clarinets', 'bassoons'] },
      { name: 'percussion', channels: ['timpani', 'percussion1', 'percussion2'] }
    ],
    dca: [
      { name: 'hallReverb', type: 'send', destination: 'reverb', channels: ['strings', 'brass', 'woodwinds'] },
      { name: 'closeReverb', type: 'send', destination: 'chamber', channels: ['percussion'] }
    ]
  },
  
  rockBand: {
    vca: [
      { name: 'drums', channels: ['kick', 'snare', 'toms', 'overheads'] },
      { name: 'guitars', channels: ['guitarL', 'guitarR', 'lead'] },
      { name: 'vocals', channels: ['leadVox', 'backing1', 'backing2'] },
      { name: 'rhythm', channels: ['bass', 'keys'] }
    ],
    dca: [
      { name: 'drumVerb', type: 'send', destination: 'plate', channels: ['snare', 'toms'] },
      { name: 'voxDelay', type: 'send', destination: 'delay', channels: ['leadVox'] }
    ]
  }
};

// Factory function
export function createMixGroups() {
  return new MixGroups();
}