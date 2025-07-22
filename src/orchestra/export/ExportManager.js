import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * ExportManager - Professional export options for orchestral projects
 * Handles multi-track export, high-resolution audio, MIDI, and MusicXML
 */
export class ExportManager {
  constructor() {
    this.registry = new DisposalRegistry('export-manager');
    
    // Export engines
    this.audioExporter = new AudioExporter();
    this.registry.register(this.audioExporter);
    
    this.midiExporter = new MIDIExporter();
    this.registry.register(this.midiExporter);
    
    this.musicXMLExporter = new MusicXMLExporter();
    this.registry.register(this.musicXMLExporter);
    
    this.stemExporter = new StemExporter();
    this.registry.register(this.stemExporter);
    
    // Export queue
    this.exportQueue = [];
    this.isExporting = false;
  }

  /**
   * Export full mix
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<Blob>}
   */
  async exportFullMix(project, options = {}) {
    const {
      format = 'wav',
      sampleRate = 48000,
      bitDepth = 24,
      normalize = true,
      dither = true
    } = options;
    
    // Prepare audio
    const audioData = await this.audioExporter.renderFullMix(project, {
      sampleRate,
      bitDepth,
      normalize,
      dither
    });
    
    // Encode to format
    return this.audioExporter.encode(audioData, format);
  }

  /**
   * Export stems (multi-track)
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<Map>}
   */
  async exportStems(project, options = {}) {
    const {
      format = 'wav',
      sampleRate = 48000,
      bitDepth = 24,
      grouping = 'section', // 'section', 'instrument', 'custom'
      customGroups = null
    } = options;
    
    // Determine stem groups
    const stemGroups = this.stemExporter.determineStemGroups(project, grouping, customGroups);
    
    // Render each stem
    const stems = new Map();
    
    for (const [groupName, tracks] of stemGroups) {
      const stemData = await this.stemExporter.renderStem(project, tracks, {
        sampleRate,
        bitDepth
      });
      
      const encoded = await this.audioExporter.encode(stemData, format);
      stems.set(groupName, encoded);
    }
    
    return stems;
  }

  /**
   * Export MIDI
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<Blob>}
   */
  async exportMIDI(project, options = {}) {
    const {
      format = 1, // 0 = single track, 1 = multi-track, 2 = multi-song
      includeTempoMap = true,
      includeProgramChanges = true,
      includeControllers = true,
      includeMarkers = true
    } = options;
    
    const midiData = this.midiExporter.createMIDIFile(project, {
      format,
      includeTempoMap,
      includeProgramChanges,
      includeControllers,
      includeMarkers
    });
    
    return new Blob([midiData], { type: 'audio/midi' });
  }

  /**
   * Export MusicXML
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<Blob>}
   */
  async exportMusicXML(project, options = {}) {
    const {
      parts = 'all', // 'all', 'score', or array of part IDs
      includeLayout = true,
      includeDynamics = true,
      includeArticulations = true,
      compressed = false // .mxl format
    } = options;
    
    const xml = this.musicXMLExporter.createMusicXML(project, {
      parts,
      includeLayout,
      includeDynamics,
      includeArticulations
    });
    
    if (compressed) {
      return this.musicXMLExporter.compressToMXL(xml);
    }
    
    return new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
  }

  /**
   * Export project bundle
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<Blob>}
   */
  async exportProjectBundle(project, options = {}) {
    const {
      includeAudio = true,
      includeStems = false,
      includeMIDI = true,
      includeMusicXML = true,
      includeProjectFile = true
    } = options;
    
    const bundle = new ProjectBundle();
    
    // Add project file
    if (includeProjectFile) {
      bundle.addFile('project.json', JSON.stringify(project, null, 2));
    }
    
    // Add audio
    if (includeAudio) {
      const audio = await this.exportFullMix(project);
      bundle.addFile('audio/full_mix.wav', audio);
    }
    
    // Add stems
    if (includeStems) {
      const stems = await this.exportStems(project);
      stems.forEach((blob, name) => {
        bundle.addFile(`audio/stems/${name}.wav`, blob);
      });
    }
    
    // Add MIDI
    if (includeMIDI) {
      const midi = await this.exportMIDI(project);
      bundle.addFile('midi/project.mid', midi);
    }
    
    // Add MusicXML
    if (includeMusicXML) {
      const musicxml = await this.exportMusicXML(project);
      bundle.addFile('notation/score.xml', musicxml);
    }
    
    // Create zip
    return bundle.createZip();
  }

  /**
   * Export for specific DAW
   * @param {Object} project 
   * @param {string} daw 
   * @param {Object} options 
   * @returns {Promise<Blob>}
   */
  async exportForDAW(project, daw, options = {}) {
    const dawPresets = {
      'logic': {
        audioFormat: 'wav',
        sampleRate: 48000,
        bitDepth: 24,
        stemGrouping: 'instrument',
        midiFormat: 1
      },
      'protools': {
        audioFormat: 'wav',
        sampleRate: 48000,
        bitDepth: 24,
        stemGrouping: 'section',
        includeAAF: true
      },
      'cubase': {
        audioFormat: 'wav',
        sampleRate: 44100,
        bitDepth: 24,
        stemGrouping: 'instrument',
        midiFormat: 1,
        includeExpressionMaps: true
      },
      'reaper': {
        audioFormat: 'wav',
        sampleRate: 48000,
        bitDepth: 24,
        stemGrouping: 'custom',
        includeRPP: true
      }
    };
    
    const preset = dawPresets[daw.toLowerCase()] || dawPresets['logic'];
    const exportOptions = { ...preset, ...options };
    
    // Create DAW-specific bundle
    const bundle = new ProjectBundle();
    
    // Export stems with DAW naming convention
    const stems = await this.exportStems(project, exportOptions);
    stems.forEach((blob, name) => {
      const dawName = this.getDAWTrackName(name, daw);
      bundle.addFile(`Audio Files/${dawName}.wav`, blob);
    });
    
    // Export MIDI
    const midi = await this.exportMIDI(project, {
      format: exportOptions.midiFormat
    });
    bundle.addFile('MIDI Files/project.mid', midi);
    
    // Add DAW-specific files
    if (exportOptions.includeAAF) {
      const aaf = await this.createAAF(project, stems);
      bundle.addFile('project.aaf', aaf);
    }
    
    if (exportOptions.includeRPP) {
      const rpp = this.createReaperProject(project, stems);
      bundle.addFile('project.rpp', rpp);
    }
    
    return bundle.createZip();
  }

  /**
   * Get DAW-specific track name
   * @param {string} name 
   * @param {string} daw 
   * @returns {string}
   */
  getDAWTrackName(name, daw) {
    // DAW-specific naming conventions
    const conventions = {
      'logic': name => name.replace(/\s+/g, '_'),
      'protools': name => name.substring(0, 31), // 31 char limit
      'cubase': name => name,
      'reaper': name => name
    };
    
    const convention = conventions[daw.toLowerCase()] || (n => n);
    return convention(name);
  }

  /**
   * Create AAF file for Pro Tools
   * @param {Object} project 
   * @param {Map} stems 
   * @returns {Promise<Blob>}
   */
  async createAAF(project, stems) {
    // Simplified AAF creation
    // Real implementation would use proper AAF library
    const aafData = {
      version: '1.0',
      project: project.title,
      tracks: Array.from(stems.keys()),
      sampleRate: 48000,
      bitDepth: 24
    };
    
    return new Blob([JSON.stringify(aafData)], { type: 'application/octet-stream' });
  }

  /**
   * Create Reaper project file
   * @param {Object} project 
   * @param {Map} stems 
   * @returns {Blob}
   */
  createReaperProject(project, stems) {
    let rpp = '<REAPER_PROJECT 0.1 "6.0" 1234567890\n';
    rpp += `  TEMPO ${project.tempo} 4 4\n`;
    
    // Add tracks
    let trackIndex = 0;
    stems.forEach((blob, name) => {
      rpp += '  <TRACK\n';
      rpp += `    NAME "${name}"\n`;
      rpp += `    TRACKID ${trackIndex++}\n`;
      rpp += '    <ITEM\n';
      rpp += `      POSITION 0\n`;
      rpp += `      LENGTH ${project.duration || 240}\n`;
      rpp += `      <SOURCE WAVE\n`;
      rpp += `        FILE "Audio Files/${name}.wav"\n`;
      rpp += '      >\n';
      rpp += '    >\n';
      rpp += '  >\n';
    });
    
    rpp += '>\n';
    
    return new Blob([rpp], { type: 'text/plain' });
  }

  /**
   * Queue export job
   * @param {Object} job 
   */
  queueExport(job) {
    this.exportQueue.push(job);
    
    if (!this.isExporting) {
      this.processQueue();
    }
  }

  /**
   * Process export queue
   */
  async processQueue() {
    if (this.exportQueue.length === 0) {
      this.isExporting = false;
      return;
    }
    
    this.isExporting = true;
    const job = this.exportQueue.shift();
    
    try {
      const result = await this.executeExport(job);
      
      if (job.onComplete) {
        job.onComplete(result);
      }
    } catch (error) {
      if (job.onError) {
        job.onError(error);
      }
    }
    
    // Process next
    this.processQueue();
  }

  /**
   * Execute export job
   * @param {Object} job 
   * @returns {Promise<any>}
   */
  async executeExport(job) {
    switch (job.type) {
      case 'fullMix':
        return this.exportFullMix(job.project, job.options);
      case 'stems':
        return this.exportStems(job.project, job.options);
      case 'midi':
        return this.exportMIDI(job.project, job.options);
      case 'musicxml':
        return this.exportMusicXML(job.project, job.options);
      case 'bundle':
        return this.exportProjectBundle(job.project, job.options);
      case 'daw':
        return this.exportForDAW(job.project, job.daw, job.options);
      default:
        throw new Error(`Unknown export type: ${job.type}`);
    }
  }

  /**
   * Dispose
   */
  dispose() {
    this.exportQueue = [];
    this.isExporting = false;
    this.registry.dispose();
  }
}

/**
 * Audio exporter
 */
class AudioExporter {
  constructor() {
    this.registry = new DisposalRegistry('audio-exporter');
    
    // Offline context for rendering
    this.offlineContext = null;
  }

  /**
   * Render full mix
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Promise<AudioBuffer>}
   */
  async renderFullMix(project, options) {
    const { sampleRate, bitDepth, normalize, dither } = options;
    const duration = project.duration || 240; // Default 4 minutes
    
    // Create offline context
    this.offlineContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    
    // Recreate entire project in offline context
    await this.recreateProject(project, this.offlineContext);
    
    // Render
    const audioBuffer = await this.offlineContext.startRendering();
    
    // Post-process
    let processedBuffer = audioBuffer;
    
    if (normalize) {
      processedBuffer = this.normalize(processedBuffer);
    }
    
    if (dither && bitDepth < 24) {
      processedBuffer = this.applyDither(processedBuffer, bitDepth);
    }
    
    return processedBuffer;
  }

  /**
   * Recreate project in offline context
   * @param {Object} project 
   * @param {OfflineAudioContext} context 
   */
  async recreateProject(project, context) {
    // This would recreate all instruments, effects, and automation
    // in the offline context for rendering
    // Simplified for demonstration
  }

  /**
   * Normalize audio buffer
   * @param {AudioBuffer} buffer 
   * @returns {AudioBuffer}
   */
  normalize(buffer) {
    let maxValue = 0;
    
    // Find peak
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        maxValue = Math.max(maxValue, Math.abs(data[i]));
      }
    }
    
    // Apply normalization
    if (maxValue > 0) {
      const scale = 0.95 / maxValue; // Leave some headroom
      
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scale;
        }
      }
    }
    
    return buffer;
  }

  /**
   * Apply dither
   * @param {AudioBuffer} buffer 
   * @param {number} bitDepth 
   * @returns {AudioBuffer}
   */
  applyDither(buffer, bitDepth) {
    const amplitude = 1 / Math.pow(2, bitDepth);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        // Triangular dither
        const dither = (Math.random() - Math.random()) * amplitude;
        data[i] += dither;
      }
    }
    
    return buffer;
  }

  /**
   * Encode audio buffer to format
   * @param {AudioBuffer} buffer 
   * @param {string} format 
   * @returns {Promise<Blob>}
   */
  async encode(buffer, format) {
    switch (format.toLowerCase()) {
      case 'wav':
        return this.encodeWAV(buffer);
      case 'flac':
        return this.encodeFLAC(buffer);
      case 'mp3':
        return this.encodeMP3(buffer);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Encode to WAV
   * @param {AudioBuffer} buffer 
   * @returns {Blob}
   */
  encodeWAV(buffer) {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Interleave and write audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Encode to FLAC
   * @param {AudioBuffer} buffer 
   * @returns {Promise<Blob>}
   */
  async encodeFLAC(buffer) {
    // Would use libflac.js or similar
    throw new Error('FLAC encoding not implemented');
  }

  /**
   * Encode to MP3
   * @param {AudioBuffer} buffer 
   * @returns {Promise<Blob>}
   */
  async encodeMP3(buffer) {
    // Would use lamejs or similar
    throw new Error('MP3 encoding not implemented');
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * MIDI exporter
 */
class MIDIExporter {
  constructor() {
    this.registry = new DisposalRegistry('midi-exporter');
  }

  /**
   * Create MIDI file
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Uint8Array}
   */
  createMIDIFile(project, options) {
    const midi = {
      header: {
        format: options.format,
        numTracks: 0,
        ticksPerQuarter: 480
      },
      tracks: []
    };
    
    // Create tracks
    if (options.format === 0) {
      // Single track
      midi.tracks.push(this.createSingleTrack(project, options));
    } else {
      // Multi-track
      midi.tracks = this.createMultiTracks(project, options);
    }
    
    midi.header.numTracks = midi.tracks.length;
    
    // Encode to binary
    return this.encodeMIDI(midi);
  }

  /**
   * Create single track
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Array}
   */
  createSingleTrack(project, options) {
    const track = [];
    
    // Add tempo events
    if (options.includeTempoMap) {
      track.push(...this.createTempoEvents(project));
    }
    
    // Add all notes
    project.tracks.forEach((trackData, index) => {
      track.push(...this.createNoteEvents(trackData, index));
    });
    
    // Sort by time
    track.sort((a, b) => a.time - b.time);
    
    return track;
  }

  /**
   * Create multi tracks
   * @param {Object} project 
   * @param {Object} options 
   * @returns {Array}
   */
  createMultiTracks(project, options) {
    const tracks = [];
    
    // Tempo track
    if (options.includeTempoMap) {
      tracks.push(this.createTempoEvents(project));
    }
    
    // Instrument tracks
    project.tracks.forEach((trackData, index) => {
      const track = [];
      
      // Track name
      track.push({
        time: 0,
        type: 'meta',
        subtype: 'trackName',
        text: trackData.name
      });
      
      // Program change
      if (options.includeProgramChanges) {
        track.push({
          time: 0,
          type: 'channel',
          subtype: 'programChange',
          channel: index % 16,
          program: this.getInstrumentProgram(trackData.instrument)
        });
      }
      
      // Notes
      track.push(...this.createNoteEvents(trackData, index));
      
      tracks.push(track);
    });
    
    return tracks;
  }

  /**
   * Create tempo events
   * @param {Object} project 
   * @returns {Array}
   */
  createTempoEvents(project) {
    const events = [];
    
    // Initial tempo
    events.push({
      time: 0,
      type: 'meta',
      subtype: 'setTempo',
      microsecondsPerBeat: 60000000 / project.tempo
    });
    
    // Tempo changes
    if (project.tempoChanges) {
      project.tempoChanges.forEach(change => {
        events.push({
          time: this.measureToTicks(change.measure, project),
          type: 'meta',
          subtype: 'setTempo',
          microsecondsPerBeat: 60000000 / change.tempo
        });
      });
    }
    
    return events;
  }

  /**
   * Create note events
   * @param {Object} trackData 
   * @param {number} trackIndex 
   * @returns {Array}
   */
  createNoteEvents(trackData, trackIndex) {
    const events = [];
    const channel = trackIndex % 16;
    
    trackData.notes.forEach(note => {
      // Note on
      events.push({
        time: this.timeToTicks(note.time),
        type: 'channel',
        subtype: 'noteOn',
        channel,
        note: note.pitch,
        velocity: Math.round(note.velocity * 127)
      });
      
      // Note off
      events.push({
        time: this.timeToTicks(note.time + note.duration),
        type: 'channel',
        subtype: 'noteOff',
        channel,
        note: note.pitch,
        velocity: 0
      });
    });
    
    return events;
  }

  /**
   * Get MIDI program for instrument
   * @param {string} instrument 
   * @returns {number}
   */
  getInstrumentProgram(instrument) {
    const programMap = {
      'piano': 0,
      'violin': 40,
      'viola': 41,
      'cello': 42,
      'bass': 43,
      'flute': 73,
      'oboe': 68,
      'clarinet': 71,
      'bassoon': 70,
      'trumpet': 56,
      'frenchHorn': 60,
      'trombone': 57,
      'tuba': 58,
      'timpani': 47,
      'harp': 46
    };
    
    return programMap[instrument] || 0;
  }

  /**
   * Convert time to MIDI ticks
   * @param {number} time 
   * @returns {number}
   */
  timeToTicks(time) {
    // Assuming 120 BPM and 480 ticks per quarter
    return Math.round(time * 2 * 480);
  }

  /**
   * Convert measure to ticks
   * @param {number} measure 
   * @param {Object} project 
   * @returns {number}
   */
  measureToTicks(measure, project) {
    const beatsPerMeasure = project.timeSignature[0];
    const beats = (measure - 1) * beatsPerMeasure;
    return beats * 480;
  }

  /**
   * Encode MIDI to binary
   * @param {Object} midi 
   * @returns {Uint8Array}
   */
  encodeMIDI(midi) {
    // Simplified MIDI encoding
    // Real implementation would properly encode variable length quantities
    const chunks = [];
    
    // Header chunk
    chunks.push(new TextEncoder().encode('MThd'));
    chunks.push(new Uint8Array([0, 0, 0, 6])); // Header length
    chunks.push(new Uint8Array([0, midi.header.format]));
    chunks.push(new Uint8Array([0, midi.header.numTracks]));
    chunks.push(new Uint8Array([1, 0xe0])); // 480 ticks per quarter
    
    // Track chunks
    midi.tracks.forEach(track => {
      const trackData = this.encodeTrack(track);
      chunks.push(new TextEncoder().encode('MTrk'));
      chunks.push(this.encodeInt32(trackData.length));
      chunks.push(trackData);
    });
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    
    return result;
  }

  /**
   * Encode track
   * @param {Array} events 
   * @returns {Uint8Array}
   */
  encodeTrack(events) {
    // Simplified track encoding
    const bytes = [];
    let lastTime = 0;
    
    events.forEach(event => {
      // Delta time
      const deltaTime = event.time - lastTime;
      bytes.push(...this.encodeVariableLength(deltaTime));
      lastTime = event.time;
      
      // Event
      bytes.push(...this.encodeEvent(event));
    });
    
    // End of track
    bytes.push(0, 0xFF, 0x2F, 0);
    
    return new Uint8Array(bytes);
  }

  /**
   * Encode variable length value
   * @param {number} value 
   * @returns {Array}
   */
  encodeVariableLength(value) {
    const bytes = [];
    
    do {
      let byte = value & 0x7F;
      value >>= 7;
      if (bytes.length > 0) {
        byte |= 0x80;
      }
      bytes.unshift(byte);
    } while (value > 0);
    
    return bytes;
  }

  /**
   * Encode event
   * @param {Object} event 
   * @returns {Array}
   */
  encodeEvent(event) {
    const bytes = [];
    
    if (event.type === 'channel') {
      const status = {
        'noteOn': 0x90,
        'noteOff': 0x80,
        'programChange': 0xC0
      }[event.subtype] || 0x90;
      
      bytes.push(status | event.channel);
      
      if (event.subtype === 'programChange') {
        bytes.push(event.program);
      } else {
        bytes.push(event.note, event.velocity);
      }
    } else if (event.type === 'meta') {
      bytes.push(0xFF);
      
      if (event.subtype === 'setTempo') {
        bytes.push(0x51, 3);
        const tempo = event.microsecondsPerBeat;
        bytes.push((tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);
      } else if (event.subtype === 'trackName') {
        bytes.push(0x03);
        const name = new TextEncoder().encode(event.text);
        bytes.push(...this.encodeVariableLength(name.length));
        bytes.push(...name);
      }
    }
    
    return bytes;
  }

  /**
   * Encode 32-bit integer
   * @param {number} value 
   * @returns {Uint8Array}
   */
  encodeInt32(value) {
    return new Uint8Array([
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF
    ]);
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * MusicXML exporter
 */
class MusicXMLExporter {
  constructor() {
    this.registry = new DisposalRegistry('musicxml-exporter');
  }

  /**
   * Create MusicXML
   * @param {Object} project 
   * @param {Object} options 
   * @returns {string}
   */
  createMusicXML(project, options) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
    xml += '<score-partwise version="3.1">\n';
    
    // Work info
    xml += this.createWorkInfo(project);
    
    // Part list
    xml += this.createPartList(project, options);
    
    // Parts
    const parts = this.selectParts(project, options.parts);
    parts.forEach(part => {
      xml += this.createPart(part, project, options);
    });
    
    xml += '</score-partwise>\n';
    
    return xml;
  }

  /**
   * Create work info
   * @param {Object} project 
   * @returns {string}
   */
  createWorkInfo(project) {
    let xml = '  <work>\n';
    xml += `    <work-title>${this.escapeXML(project.title)}</work-title>\n`;
    xml += '  </work>\n';
    
    xml += '  <identification>\n';
    xml += '    <creator type="composer">' + this.escapeXML(project.composer) + '</creator>\n';
    xml += '    <encoding>\n';
    xml += '      <software>Music2</software>\n';
    xml += '      <encoding-date>' + new Date().toISOString().split('T')[0] + '</encoding-date>\n';
    xml += '    </encoding>\n';
    xml += '  </identification>\n';
    
    return xml;
  }

  /**
   * Create part list
   * @param {Object} project 
   * @param {Object} options 
   * @returns {string}
   */
  createPartList(project, options) {
    let xml = '  <part-list>\n';
    
    const parts = this.selectParts(project, options.parts);
    parts.forEach((part, index) => {
      xml += `    <score-part id="P${index + 1}">\n`;
      xml += `      <part-name>${this.escapeXML(part.name)}</part-name>\n`;
      
      if (part.instrument) {
        xml += '      <score-instrument id="P' + (index + 1) + '-I1">\n';
        xml += `        <instrument-name>${this.escapeXML(part.instrument)}</instrument-name>\n`;
        xml += '      </score-instrument>\n';
      }
      
      xml += '    </score-part>\n';
    });
    
    xml += '  </part-list>\n';
    
    return xml;
  }

  /**
   * Select parts to export
   * @param {Object} project 
   * @param {string|Array} selection 
   * @returns {Array}
   */
  selectParts(project, selection) {
    if (selection === 'all') {
      return project.parts || [];
    } else if (selection === 'score') {
      // Return condensed score
      return this.createCondensedScore(project);
    } else if (Array.isArray(selection)) {
      return project.parts.filter(part => selection.includes(part.id));
    }
    
    return project.parts || [];
  }

  /**
   * Create part
   * @param {Object} part 
   * @param {Object} project 
   * @param {Object} options 
   * @returns {string}
   */
  createPart(part, project, options) {
    let xml = `  <part id="${part.id}">\n`;
    
    part.measures.forEach((measure, index) => {
      xml += this.createMeasure(measure, index + 1, project, options);
    });
    
    xml += '  </part>\n';
    
    return xml;
  }

  /**
   * Create measure
   * @param {Object} measure 
   * @param {number} number 
   * @param {Object} project 
   * @param {Object} options 
   * @returns {string}
   */
  createMeasure(measure, number, project, options) {
    let xml = `    <measure number="${number}">\n`;
    
    // Attributes (first measure or when changed)
    if (number === 1 || this.hasAttributeChanges(measure)) {
      xml += '      <attributes>\n';
      xml += '        <divisions>480</divisions>\n'; // Divisions per quarter note
      
      if (measure.keySignature) {
        xml += this.createKeySignature(measure.keySignature);
      }
      
      if (measure.timeSignature) {
        xml += this.createTimeSignature(measure.timeSignature);
      }
      
      if (measure.clef) {
        xml += this.createClef(measure.clef);
      }
      
      xml += '      </attributes>\n';
    }
    
    // Tempo
    if (measure.tempo && (number === 1 || measure.tempoChange)) {
      xml += this.createTempo(measure.tempo);
    }
    
    // Notes
    measure.notes.forEach(note => {
      xml += this.createNote(note, options);
    });
    
    xml += '    </measure>\n';
    
    return xml;
  }

  /**
   * Create note
   * @param {Object} note 
   * @param {Object} options 
   * @returns {string}
   */
  createNote(note, options) {
    let xml = '      <note>\n';
    
    if (note.rest) {
      xml += '        <rest/>\n';
    } else {
      xml += '        <pitch>\n';
      xml += `          <step>${this.getStep(note.displayPitch || note.pitch)}</step>\n`;
      
      const alter = this.getAlter(note.displayPitch || note.pitch);
      if (alter !== 0) {
        xml += `          <alter>${alter}</alter>\n`;
      }
      
      xml += `          <octave>${this.getOctave(note.displayPitch || note.pitch)}</octave>\n`;
      xml += '        </pitch>\n';
    }
    
    xml += `        <duration>${this.noteDurationToTicks(note.duration)}</duration>\n`;
    xml += `        <type>${this.getNoteType(note.duration)}</type>\n`;
    
    // Dynamics
    if (options.includeDynamics && note.velocity !== undefined) {
      xml += this.createDynamics(note.velocity);
    }
    
    // Articulations
    if (options.includeArticulations && note.articulations) {
      xml += this.createArticulations(note.articulations);
    }
    
    xml += '      </note>\n';
    
    return xml;
  }

  /**
   * Get note step
   * @param {number} pitch 
   * @returns {string}
   */
  getStep(pitch) {
    const steps = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
    return steps[pitch % 12];
  }

  /**
   * Get alter value
   * @param {number} pitch 
   * @returns {number}
   */
  getAlter(pitch) {
    const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    return alters[pitch % 12];
  }

  /**
   * Get octave
   * @param {number} pitch 
   * @returns {number}
   */
  getOctave(pitch) {
    return Math.floor(pitch / 12) - 1;
  }

  /**
   * Convert note duration to ticks
   * @param {number} duration 
   * @returns {number}
   */
  noteDurationToTicks(duration) {
    // Assuming duration is in quarter notes
    return Math.round(duration * 480);
  }

  /**
   * Get note type
   * @param {number} duration 
   * @returns {string}
   */
  getNoteType(duration) {
    if (duration >= 4) return 'whole';
    if (duration >= 2) return 'half';
    if (duration >= 1) return 'quarter';
    if (duration >= 0.5) return 'eighth';
    if (duration >= 0.25) return '16th';
    return '32nd';
  }

  /**
   * Escape XML
   * @param {string} text 
   * @returns {string}
   */
  escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Check for attribute changes
   * @param {Object} measure 
   * @returns {boolean}
   */
  hasAttributeChanges(measure) {
    return measure.keySignatureChange || 
           measure.timeSignatureChange || 
           measure.clefChange;
  }

  /**
   * Create key signature
   * @param {string} key 
   * @returns {string}
   */
  createKeySignature(key) {
    const fifths = {
      'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
      'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6
    };
    
    return `        <key><fifths>${fifths[key] || 0}</fifths></key>\n`;
  }

  /**
   * Create time signature
   * @param {Array} timeSig 
   * @returns {string}
   */
  createTimeSignature(timeSig) {
    return `        <time><beats>${timeSig[0]}</beats><beat-type>${timeSig[1]}</beat-type></time>\n`;
  }

  /**
   * Create clef
   * @param {string} clef 
   * @returns {string}
   */
  createClef(clef) {
    const clefMap = {
      'treble': { sign: 'G', line: 2 },
      'bass': { sign: 'F', line: 4 },
      'alto': { sign: 'C', line: 3 },
      'tenor': { sign: 'C', line: 4 }
    };
    
    const clefInfo = clefMap[clef] || clefMap['treble'];
    return `        <clef><sign>${clefInfo.sign}</sign><line>${clefInfo.line}</line></clef>\n`;
  }

  /**
   * Create tempo marking
   * @param {number} tempo 
   * @returns {string}
   */
  createTempo(tempo) {
    let xml = '      <direction placement="above">\n';
    xml += '        <direction-type>\n';
    xml += `          <metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome>\n`;
    xml += '        </direction-type>\n';
    xml += '        <sound tempo="' + tempo + '"/>\n';
    xml += '      </direction>\n';
    
    return xml;
  }

  /**
   * Create dynamics
   * @param {number} velocity 
   * @returns {string}
   */
  createDynamics(velocity) {
    const dynamics = {
      0.125: 'ppp',
      0.25: 'pp',
      0.375: 'p',
      0.5: 'mp',
      0.625: 'mf',
      0.75: 'f',
      0.875: 'ff',
      1.0: 'fff'
    };
    
    let dynamic = 'mf';
    for (const [threshold, marking] of Object.entries(dynamics)) {
      if (velocity <= parseFloat(threshold)) {
        dynamic = marking;
        break;
      }
    }
    
    return `        <dynamics><${dynamic}/></dynamics>\n`;
  }

  /**
   * Create articulations
   * @param {Array} articulations 
   * @returns {string}
   */
  createArticulations(articulations) {
    let xml = '        <articulations>\n';
    
    articulations.forEach(articulation => {
      xml += `          <${articulation}/>\n`;
    });
    
    xml += '        </articulations>\n';
    
    return xml;
  }

  /**
   * Create condensed score
   * @param {Object} project 
   * @returns {Array}
   */
  createCondensedScore(project) {
    // Combine similar instruments into single staves
    const condensed = [];
    
    // Group by instrument family
    const families = {
      strings: ['violin1', 'violin2', 'viola', 'cello', 'bass'],
      woodwinds: ['flute', 'oboe', 'clarinet', 'bassoon'],
      brass: ['trumpet', 'frenchHorn', 'trombone', 'tuba']
    };
    
    // Create condensed parts
    // This is simplified - real implementation would intelligently combine parts
    
    return condensed;
  }

  /**
   * Compress to MXL format
   * @param {string} xml 
   * @returns {Promise<Blob>}
   */
  async compressToMXL(xml) {
    // Would use JSZip or similar to create compressed .mxl file
    // For now, return as-is
    return new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Stem exporter
 */
class StemExporter {
  constructor() {
    this.registry = new DisposalRegistry('stem-exporter');
  }

  /**
   * Determine stem groups
   * @param {Object} project 
   * @param {string} grouping 
   * @param {Object} customGroups 
   * @returns {Map}
   */
  determineStemGroups(project, grouping, customGroups) {
    const groups = new Map();
    
    switch (grouping) {
      case 'section':
        return this.groupBySection(project);
      case 'instrument':
        return this.groupByInstrument(project);
      case 'custom':
        return new Map(Object.entries(customGroups || {}));
      default:
        return this.groupBySection(project);
    }
  }

  /**
   * Group by section
   * @param {Object} project 
   * @returns {Map}
   */
  groupBySection(project) {
    const groups = new Map();
    
    const sections = {
      'Strings': ['violin1', 'violin2', 'viola', 'cello', 'bass'],
      'Woodwinds': ['flute', 'oboe', 'clarinet', 'bassoon'],
      'Brass': ['trumpet', 'frenchHorn', 'trombone', 'tuba'],
      'Percussion': ['timpani', 'percussion'],
      'Keys': ['piano', 'harp', 'celesta']
    };
    
    Object.entries(sections).forEach(([section, instruments]) => {
      const tracks = project.tracks.filter(track => 
        instruments.some(inst => track.instrument.includes(inst))
      );
      
      if (tracks.length > 0) {
        groups.set(section, tracks);
      }
    });
    
    return groups;
  }

  /**
   * Group by instrument
   * @param {Object} project 
   * @returns {Map}
   */
  groupByInstrument(project) {
    const groups = new Map();
    
    project.tracks.forEach(track => {
      groups.set(track.name, [track]);
    });
    
    return groups;
  }

  /**
   * Render stem
   * @param {Object} project 
   * @param {Array} tracks 
   * @param {Object} options 
   * @returns {Promise<AudioBuffer>}
   */
  async renderStem(project, tracks, options) {
    // Create offline context and render only specified tracks
    // This is simplified - real implementation would selectively render tracks
    const { sampleRate } = options;
    const duration = project.duration || 240;
    
    const offlineContext = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    
    // Render only specified tracks
    // ...
    
    return offlineContext.startRendering();
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Project bundle for creating zip files
 */
class ProjectBundle {
  constructor() {
    this.files = new Map();
  }

  /**
   * Add file to bundle
   * @param {string} path 
   * @param {Blob|string} content 
   */
  addFile(path, content) {
    this.files.set(path, content);
  }

  /**
   * Create zip file
   * @returns {Promise<Blob>}
   */
  async createZip() {
    // Would use JSZip or similar
    // For now, return a simple blob
    const parts = [];
    
    this.files.forEach((content, path) => {
      parts.push(`--- ${path} ---\n`);
      if (typeof content === 'string') {
        parts.push(content);
      } else {
        parts.push('[Binary Data]');
      }
      parts.push('\n\n');
    });
    
    return new Blob([parts.join('')], { type: 'application/zip' });
  }
}

// Factory function
export function createExportManager() {
  return new ExportManager();
}