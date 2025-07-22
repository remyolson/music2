import * as Tone from 'tone';
import { state } from '../state.js';
import { DisposalRegistry } from '../utils/DisposalRegistry.js';

/**
 * MidiInputHandler - Manages WebMIDI input for the Music2 system
 * Provides MIDI keyboard input, controller mapping, and device management
 */
export class MidiInputHandler {
  constructor() {
    this.registry = new DisposalRegistry('midi-input');
    this.midiAccess = null;
    this.activeDevices = new Map();
    this.controllerMappings = new Map();
    this.noteCallbacks = new Set();
    this.controllerCallbacks = new Set();
    this.isInitialized = false;
    
    // Default velocity curve (can be customized per instrument)
    this.velocityCurve = 'linear';
    
    // Active notes tracking (for proper note-off handling)
    this.activeNotes = new Map();
    
    // MIDI channel filter (0 = omni, 1-16 = specific channel)
    this.channelFilter = 0;
    
    // Sustain pedal state
    this.sustainPedal = false;
    this.sustainedNotes = new Set();
  }

  /**
   * Initialize WebMIDI access
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      // Check for WebMIDI support
      if (!navigator.requestMIDIAccess) {
        console.warn('WebMIDI not supported in this browser');
        state.setState({ midiAvailable: false });
        return false;
      }
      
      // Request MIDI access
      this.midiAccess = await navigator.requestMIDIAccess();
      
      // Setup device monitoring
      this.midiAccess.onstatechange = this.handleDeviceChange.bind(this);
      
      // Initialize existing devices
      this.refreshDevices();
      
      this.isInitialized = true;
      state.setState({ 
        midiAvailable: true,
        midiDevices: Array.from(this.activeDevices.keys())
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      state.setState({ midiAvailable: false });
      return false;
    }
  }

  /**
   * Refresh connected MIDI devices
   */
  refreshDevices() {
    if (!this.midiAccess) return;
    
    // Clear existing devices
    this.activeDevices.forEach(device => {
      device.onmidimessage = null;
    });
    this.activeDevices.clear();
    
    // Add all available inputs
    for (const input of this.midiAccess.inputs.values()) {
      this.addDevice(input);
    }
    
    // Update state
    state.setState({ 
      midiDevices: Array.from(this.activeDevices.keys())
    });
  }

  /**
   * Add a MIDI input device
   * @param {MIDIInput} device 
   */
  addDevice(device) {
    if (this.activeDevices.has(device.id)) return;
    
    device.onmidimessage = this.handleMidiMessage.bind(this);
    this.activeDevices.set(device.id, device);
    
    console.log(`MIDI device connected: ${device.name}`);
  }

  /**
   * Remove a MIDI input device
   * @param {string} deviceId 
   */
  removeDevice(deviceId) {
    const device = this.activeDevices.get(deviceId);
    if (device) {
      device.onmidimessage = null;
      this.activeDevices.delete(deviceId);
      console.log(`MIDI device disconnected: ${device.name}`);
    }
  }

  /**
   * Handle device connection/disconnection
   * @param {MIDIConnectionEvent} event 
   */
  handleDeviceChange(event) {
    const device = event.port;
    
    if (device.type === 'input') {
      if (device.state === 'connected') {
        this.addDevice(device);
      } else if (device.state === 'disconnected') {
        this.removeDevice(device.id);
      }
    }
    
    // Update state
    state.setState({ 
      midiDevices: Array.from(this.activeDevices.keys())
    });
  }

  /**
   * Handle incoming MIDI messages
   * @param {MIDIMessageEvent} event 
   */
  handleMidiMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;
    const channel = (status & 0x0F) + 1;
    
    // Apply channel filter
    if (this.channelFilter > 0 && channel !== this.channelFilter) {
      return;
    }
    
    switch (command) {
      case 0x9: // Note On
        if (data2 > 0) {
          this.handleNoteOn(data1, data2, channel);
        } else {
          // Note On with velocity 0 = Note Off
          this.handleNoteOff(data1, channel);
        }
        break;
        
      case 0x8: // Note Off
        this.handleNoteOff(data1, channel);
        break;
        
      case 0xB: // Control Change
        this.handleControlChange(data1, data2, channel);
        break;
        
      case 0xE: // Pitch Bend
        this.handlePitchBend(data1, data2, channel);
        break;
        
      case 0xD: // Channel Aftertouch
        this.handleAftertouch(data1, channel);
        break;
        
      case 0xC: // Program Change
        this.handleProgramChange(data1, channel);
        break;
    }
  }

  /**
   * Handle Note On message
   * @param {number} note - MIDI note number (0-127)
   * @param {number} velocity - Velocity (0-127)
   * @param {number} channel - MIDI channel (1-16)
   */
  handleNoteOn(note, velocity, channel) {
    // Convert MIDI velocity to normalized value (0-1)
    const normalizedVelocity = this.applyVelocityCurve(velocity / 127);
    
    // Track active note
    const noteKey = `${note}-${channel}`;
    this.activeNotes.set(noteKey, {
      note,
      velocity: normalizedVelocity,
      channel,
      timestamp: Date.now()
    });
    
    // Notify callbacks
    this.noteCallbacks.forEach(callback => {
      callback({
        type: 'noteOn',
        note,
        velocity: normalizedVelocity,
        channel,
        midiVelocity: velocity
      });
    });
  }

  /**
   * Handle Note Off message
   * @param {number} note - MIDI note number (0-127)
   * @param {number} channel - MIDI channel (1-16)
   */
  handleNoteOff(note, channel) {
    const noteKey = `${note}-${channel}`;
    
    // If sustain pedal is on, add to sustained notes
    if (this.sustainPedal) {
      this.sustainedNotes.add(noteKey);
      return;
    }
    
    // Remove from active notes
    const activeNote = this.activeNotes.get(noteKey);
    if (activeNote) {
      this.activeNotes.delete(noteKey);
      
      // Notify callbacks
      this.noteCallbacks.forEach(callback => {
        callback({
          type: 'noteOff',
          note,
          channel
        });
      });
    }
  }

  /**
   * Handle Control Change message
   * @param {number} controller - Controller number (0-127)
   * @param {number} value - Controller value (0-127)
   * @param {number} channel - MIDI channel (1-16)
   */
  handleControlChange(controller, value, channel) {
    const normalizedValue = value / 127;
    
    // Handle special controllers
    switch (controller) {
      case 64: // Sustain Pedal
        this.handleSustainPedal(value > 63);
        break;
        
      case 1: // Modulation Wheel
        this.handleModulation(normalizedValue, channel);
        break;
        
      case 7: // Volume
        this.handleVolume(normalizedValue, channel);
        break;
        
      case 10: // Pan
        this.handlePan((value - 64) / 64, channel);
        break;
        
      case 11: // Expression
        this.handleExpression(normalizedValue, channel);
        break;
    }
    
    // Notify controller callbacks
    this.controllerCallbacks.forEach(callback => {
      callback({
        type: 'controller',
        controller,
        value: normalizedValue,
        rawValue: value,
        channel
      });
    });
  }

  /**
   * Handle sustain pedal
   * @param {boolean} pressed 
   */
  handleSustainPedal(pressed) {
    this.sustainPedal = pressed;
    
    if (!pressed) {
      // Release all sustained notes
      this.sustainedNotes.forEach(noteKey => {
        const [noteStr, channelStr] = noteKey.split('-');
        const note = parseInt(noteStr);
        const channel = parseInt(channelStr);
        
        // Check if note is still held
        if (!this.activeNotes.has(noteKey)) {
          this.handleNoteOff(note, channel);
        }
      });
      this.sustainedNotes.clear();
    }
    
    // Update state
    state.setState({ sustainPedal: pressed });
  }

  /**
   * Handle modulation wheel
   * @param {number} value - Normalized value (0-1)
   * @param {number} channel 
   */
  handleModulation(value, channel) {
    state.setState({ modulation: value });
  }

  /**
   * Handle volume controller
   * @param {number} value - Normalized value (0-1)
   * @param {number} channel 
   */
  handleVolume(value, channel) {
    state.setState({ midiVolume: value });
  }

  /**
   * Handle pan controller
   * @param {number} value - Normalized value (-1 to 1)
   * @param {number} channel 
   */
  handlePan(value, channel) {
    state.setState({ midiPan: value });
  }

  /**
   * Handle expression controller
   * @param {number} value - Normalized value (0-1)
   * @param {number} channel 
   */
  handleExpression(value, channel) {
    state.setState({ expression: value });
  }

  /**
   * Handle pitch bend
   * @param {number} lsb - Least significant byte
   * @param {number} msb - Most significant byte
   * @param {number} channel 
   */
  handlePitchBend(lsb, msb, channel) {
    // Convert to normalized value (-1 to 1)
    const value = ((msb << 7) | lsb) - 8192;
    const normalized = value / 8192;
    
    this.controllerCallbacks.forEach(callback => {
      callback({
        type: 'pitchBend',
        value: normalized,
        channel
      });
    });
    
    state.setState({ pitchBend: normalized });
  }

  /**
   * Handle channel aftertouch
   * @param {number} pressure - Pressure value (0-127)
   * @param {number} channel 
   */
  handleAftertouch(pressure, channel) {
    const normalized = pressure / 127;
    
    this.controllerCallbacks.forEach(callback => {
      callback({
        type: 'aftertouch',
        value: normalized,
        channel
      });
    });
    
    state.setState({ aftertouch: normalized });
  }

  /**
   * Handle program change
   * @param {number} program - Program number (0-127)
   * @param {number} channel 
   */
  handleProgramChange(program, channel) {
    this.controllerCallbacks.forEach(callback => {
      callback({
        type: 'programChange',
        program,
        channel
      });
    });
  }

  /**
   * Apply velocity curve transformation
   * @param {number} velocity - Normalized velocity (0-1)
   * @returns {number} Transformed velocity
   */
  applyVelocityCurve(velocity) {
    switch (this.velocityCurve) {
      case 'linear':
        return velocity;
        
      case 'exponential':
        return Math.pow(velocity, 2);
        
      case 'logarithmic':
        return Math.log(1 + velocity * 9) / Math.log(10);
        
      case 'soft':
        return Math.pow(velocity, 0.5);
        
      case 'hard':
        return Math.pow(velocity, 3);
        
      default:
        return velocity;
    }
  }

  /**
   * Register callback for note events
   * @param {Function} callback 
   */
  onNote(callback) {
    this.noteCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.noteCallbacks.delete(callback);
    };
  }

  /**
   * Register callback for controller events
   * @param {Function} callback 
   */
  onController(callback) {
    this.controllerCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.controllerCallbacks.delete(callback);
    };
  }

  /**
   * Set velocity curve type
   * @param {string} curve - Curve type (linear, exponential, logarithmic, soft, hard)
   */
  setVelocityCurve(curve) {
    this.velocityCurve = curve;
  }

  /**
   * Set MIDI channel filter
   * @param {number} channel - Channel (0 = omni, 1-16 = specific)
   */
  setChannelFilter(channel) {
    this.channelFilter = channel;
  }

  /**
   * Enable/disable a specific MIDI device
   * @param {string} deviceId 
   * @param {boolean} enabled 
   */
  setDeviceEnabled(deviceId, enabled) {
    const device = this.activeDevices.get(deviceId);
    if (device) {
      device.onmidimessage = enabled ? this.handleMidiMessage.bind(this) : null;
    }
  }

  /**
   * Get list of connected MIDI devices
   * @returns {Array} Device info
   */
  getDevices() {
    return Array.from(this.activeDevices.values()).map(device => ({
      id: device.id,
      name: device.name,
      manufacturer: device.manufacturer,
      state: device.state,
      connection: device.connection
    }));
  }

  /**
   * Clean up and dispose
   */
  dispose() {
    // Clear all callbacks
    this.noteCallbacks.clear();
    this.controllerCallbacks.clear();
    
    // Disconnect all devices
    this.activeDevices.forEach(device => {
      device.onmidimessage = null;
    });
    this.activeDevices.clear();
    
    // Clear MIDI access
    if (this.midiAccess) {
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
    
    // Clear active notes
    this.activeNotes.clear();
    this.sustainedNotes.clear();
    
    // Dispose registry
    this.registry.dispose();
    
    this.isInitialized = false;
  }
}

// Create singleton instance
export const midiInputHandler = new MidiInputHandler();