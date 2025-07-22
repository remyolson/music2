import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * MultiStaffComposition - Multi-staff score management
 * Handles grand staff, orchestral scores, and transposing instruments
 */
export class MultiStaffComposition {
  constructor() {
    this.registry = new DisposalRegistry('multi-staff-composition');
    
    // Score structure
    this.score = {
      title: '',
      composer: '',
      tempo: 120,
      timeSignature: [4, 4],
      keySignature: 'C',
      measures: []
    };
    
    // Staves
    this.staves = new Map();
    this.staffGroups = new Map();
    
    // Transposing instrument definitions
    this.transposingInstruments = this.defineTransposingInstruments();
    
    // Layout engine
    this.layoutEngine = new ScoreLayoutEngine();
    this.registry.register(this.layoutEngine);
    
    // Playback engine
    this.playbackEngine = new ScorePlaybackEngine();
    this.registry.register(this.playbackEngine);
    
    // Part extraction
    this.partExtractor = new PartExtractor();
    this.registry.register(this.partExtractor);
  }

  /**
   * Define transposing instruments
   */
  defineTransposingInstruments() {
    return {
      // Woodwinds
      piccolo: { transposition: 12, clef: 'treble' },
      englishHorn: { transposition: -7, clef: 'treble' },
      clarinetBb: { transposition: -2, clef: 'treble' },
      clarinetA: { transposition: -3, clef: 'treble' },
      clarinetEb: { transposition: 3, clef: 'treble' },
      bassClarinet: { transposition: -14, clef: 'treble' },
      altoSax: { transposition: -9, clef: 'treble' },
      tenorSax: { transposition: -14, clef: 'treble' },
      baritoneSax: { transposition: -21, clef: 'treble' },
      
      // Brass
      frenchHorn: { transposition: -7, clef: 'treble' },
      trumpetBb: { transposition: -2, clef: 'treble' },
      trumpetC: { transposition: 0, clef: 'treble' },
      trumpetD: { transposition: 2, clef: 'treble' },
      
      // Strings (for historical scores)
      violinScordatura: { transposition: 0, clef: 'treble', special: true }
    };
  }

  /**
   * Create a staff
   * @param {string} id 
   * @param {Object} config 
   */
  createStaff(id, config = {}) {
    const staff = {
      id,
      name: config.name || id,
      instrument: config.instrument || 'piano',
      clef: config.clef || 'treble',
      transposing: config.transposing || false,
      transposition: config.transposition || 0,
      brackets: config.brackets || [],
      measures: [],
      visible: true,
      muted: false,
      solo: false
    };
    
    // Handle transposing instruments
    if (this.transposingInstruments[config.instrument]) {
      const transposeInfo = this.transposingInstruments[config.instrument];
      staff.transposing = true;
      staff.transposition = transposeInfo.transposition;
      staff.clef = transposeInfo.clef || staff.clef;
    }
    
    this.staves.set(id, staff);
    
    // Initialize measures
    this.initializeStaffMeasures(staff);
    
    return staff;
  }

  /**
   * Create staff group (e.g., piano grand staff)
   * @param {string} groupId 
   * @param {Array} staffIds 
   * @param {Object} config 
   */
  createStaffGroup(groupId, staffIds, config = {}) {
    const group = {
      id: groupId,
      name: config.name || groupId,
      type: config.type || 'bracket', // 'bracket', 'brace', 'none'
      staves: staffIds,
      visible: true
    };
    
    this.staffGroups.set(groupId, group);
    
    // Apply grouping to staves
    staffIds.forEach(staffId => {
      const staff = this.staves.get(staffId);
      if (staff) {
        staff.group = groupId;
      }
    });
    
    return group;
  }

  /**
   * Create grand staff for piano
   * @param {string} id 
   * @param {Object} config 
   */
  createGrandStaff(id = 'piano', config = {}) {
    // Create treble and bass staves
    const trebleStaff = this.createStaff(`${id}_treble`, {
      name: config.name ? `${config.name} (R.H.)` : 'Piano (R.H.)',
      instrument: 'piano',
      clef: 'treble',
      ...config
    });
    
    const bassStaff = this.createStaff(`${id}_bass`, {
      name: config.name ? `${config.name} (L.H.)` : 'Piano (L.H.)',
      instrument: 'piano',
      clef: 'bass',
      ...config
    });
    
    // Create group with brace
    const group = this.createStaffGroup(id, [trebleStaff.id, bassStaff.id], {
      name: config.name || 'Piano',
      type: 'brace'
    });
    
    return {
      group,
      treble: trebleStaff,
      bass: bassStaff
    };
  }

  /**
   * Initialize staff measures
   * @param {Object} staff 
   */
  initializeStaffMeasures(staff) {
    const measureCount = this.score.measures.length || 32; // Default 32 measures
    
    staff.measures = [];
    for (let i = 0; i < measureCount; i++) {
      staff.measures.push({
        number: i + 1,
        timeSignature: this.score.timeSignature,
        keySignature: this.score.keySignature,
        tempo: this.score.tempo,
        notes: [],
        dynamics: [],
        articulations: [],
        expressions: []
      });
    }
  }

  /**
   * Add note to staff
   * @param {string} staffId 
   * @param {Object} note 
   */
  addNote(staffId, note) {
    const staff = this.staves.get(staffId);
    if (!staff) return;
    
    const measureIndex = this.getMeasureIndex(note.time);
    if (measureIndex < 0 || measureIndex >= staff.measures.length) return;
    
    // Apply transposition for display
    const displayNote = { ...note };
    if (staff.transposing) {
      displayNote.displayPitch = note.pitch;
      displayNote.soundingPitch = note.pitch + staff.transposition;
    } else {
      displayNote.displayPitch = note.pitch;
      displayNote.soundingPitch = note.pitch;
    }
    
    staff.measures[measureIndex].notes.push(displayNote);
    
    // Sort notes by time
    staff.measures[measureIndex].notes.sort((a, b) => a.time - b.time);
  }

  /**
   * Get measure index from time
   * @param {number} time 
   * @returns {number}
   */
  getMeasureIndex(time) {
    const beatsPerMeasure = this.score.timeSignature[0];
    const beatDuration = 60 / this.score.tempo;
    const measureDuration = beatsPerMeasure * beatDuration;
    
    return Math.floor(time / measureDuration);
  }

  /**
   * Set tempo change
   * @param {number} measure 
   * @param {number} tempo 
   * @param {Object} options 
   */
  setTempoChange(measure, tempo, options = {}) {
    const {
      type = 'immediate', // 'immediate', 'gradual'
      duration = 0,
      curve = 'linear'
    } = options;
    
    if (!this.score.tempoChanges) {
      this.score.tempoChanges = [];
    }
    
    this.score.tempoChanges.push({
      measure,
      tempo,
      type,
      duration,
      curve
    });
    
    // Apply to all staves
    this.staves.forEach(staff => {
      if (staff.measures[measure - 1]) {
        staff.measures[measure - 1].tempo = tempo;
        staff.measures[measure - 1].tempoChange = { type, duration, curve };
      }
    });
  }

  /**
   * Add rehearsal mark
   * @param {number} measure 
   * @param {string} mark 
   */
  addRehearsalMark(measure, mark) {
    if (!this.score.rehearsalMarks) {
      this.score.rehearsalMarks = [];
    }
    
    this.score.rehearsalMarks.push({
      measure,
      mark,
      id: `rehearsal_${mark}`
    });
    
    // Add to all staves
    this.staves.forEach(staff => {
      if (staff.measures[measure - 1]) {
        staff.measures[measure - 1].rehearsalMark = mark;
      }
    });
  }

  /**
   * Create conductor score
   * @returns {Object}
   */
  createConductorScore() {
    const conductorScore = {
      ...this.score,
      staves: [],
      groups: []
    };
    
    // Order staves by orchestral convention
    const staffOrder = [
      'piccolo', 'flute', 'oboe', 'englishHorn', 'clarinet', 'bassoon',
      'frenchHorn', 'trumpet', 'trombone', 'tuba',
      'timpani', 'percussion',
      'harp', 'piano',
      'violin1', 'violin2', 'viola', 'cello', 'bass'
    ];
    
    // Collect and order staves
    const orderedStaves = [];
    staffOrder.forEach(instrumentType => {
      this.staves.forEach(staff => {
        if (staff.instrument.includes(instrumentType)) {
          orderedStaves.push(staff);
        }
      });
    });
    
    // Add any remaining staves
    this.staves.forEach(staff => {
      if (!orderedStaves.includes(staff)) {
        orderedStaves.push(staff);
      }
    });
    
    conductorScore.staves = orderedStaves;
    conductorScore.groups = Array.from(this.staffGroups.values());
    
    return conductorScore;
  }

  /**
   * Extract individual part
   * @param {string} staffId 
   * @returns {Object}
   */
  extractPart(staffId) {
    const staff = this.staves.get(staffId);
    if (!staff) return null;
    
    return this.partExtractor.extractPart(staff, this.score);
  }

  /**
   * Create all parts
   * @returns {Map}
   */
  createAllParts() {
    const parts = new Map();
    
    this.staves.forEach(staff => {
      const part = this.extractPart(staff.id);
      if (part) {
        parts.set(staff.id, part);
      }
    });
    
    return parts;
  }

  /**
   * Prepare for playback
   * @returns {Object}
   */
  preparePlayback() {
    const playbackData = {
      tracks: new Map(),
      tempoMap: this.createTempoMap(),
      rehearsalMarks: this.score.rehearsalMarks || []
    };
    
    // Convert each staff to playback track
    this.staves.forEach(staff => {
      if (!staff.muted) {
        const track = this.playbackEngine.createTrack(staff);
        playbackData.tracks.set(staff.id, track);
      }
    });
    
    // Handle solo state
    const soloStaves = Array.from(this.staves.values()).filter(s => s.solo);
    if (soloStaves.length > 0) {
      // Mute all non-solo tracks
      playbackData.tracks.forEach((track, staffId) => {
        const staff = this.staves.get(staffId);
        if (!staff.solo) {
          track.muted = true;
        }
      });
    }
    
    return playbackData;
  }

  /**
   * Create tempo map
   * @returns {Array}
   */
  createTempoMap() {
    const tempoMap = [{
      time: 0,
      tempo: this.score.tempo,
      measure: 1
    }];
    
    if (this.score.tempoChanges) {
      this.score.tempoChanges.forEach(change => {
        const time = this.measureToTime(change.measure);
        
        if (change.type === 'immediate') {
          tempoMap.push({
            time,
            tempo: change.tempo,
            measure: change.measure
          });
        } else {
          // Gradual tempo change
          const startTime = time;
          const endTime = time + change.duration;
          const steps = Math.ceil(change.duration * 10); // 10 steps per second
          
          for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const currentTime = startTime + progress * change.duration;
            const currentTempo = this.interpolateTempo(
              tempoMap[tempoMap.length - 1].tempo,
              change.tempo,
              progress,
              change.curve
            );
            
            tempoMap.push({
              time: currentTime,
              tempo: currentTempo,
              measure: change.measure + progress * (change.duration / this.measureDuration())
            });
          }
        }
      });
    }
    
    return tempoMap;
  }

  /**
   * Convert measure to time
   * @param {number} measure 
   * @returns {number}
   */
  measureToTime(measure) {
    // Simplified - assumes constant tempo
    const measureDuration = this.measureDuration();
    return (measure - 1) * measureDuration;
  }

  /**
   * Get measure duration
   * @returns {number}
   */
  measureDuration() {
    const beatsPerMeasure = this.score.timeSignature[0];
    const beatDuration = 60 / this.score.tempo;
    return beatsPerMeasure * beatDuration;
  }

  /**
   * Interpolate tempo
   * @param {number} start 
   * @param {number} end 
   * @param {number} progress 
   * @param {string} curve 
   * @returns {number}
   */
  interpolateTempo(start, end, progress, curve) {
    switch (curve) {
      case 'exponential':
        return start + (end - start) * Math.pow(progress, 2);
      case 'logarithmic':
        return start + (end - start) * Math.sqrt(progress);
      case 'linear':
      default:
        return start + (end - start) * progress;
    }
  }

  /**
   * Toggle staff visibility
   * @param {string} staffId 
   * @param {boolean} visible 
   */
  setStaffVisibility(staffId, visible) {
    const staff = this.staves.get(staffId);
    if (staff) {
      staff.visible = visible;
    }
  }

  /**
   * Set staff mute
   * @param {string} staffId 
   * @param {boolean} mute 
   */
  setStaffMute(staffId, mute) {
    const staff = this.staves.get(staffId);
    if (staff) {
      staff.muted = mute;
    }
  }

  /**
   * Set staff solo
   * @param {string} staffId 
   * @param {boolean} solo 
   */
  setStaffSolo(staffId, solo) {
    const staff = this.staves.get(staffId);
    if (staff) {
      staff.solo = solo;
    }
  }

  /**
   * Get score info
   * @returns {Object}
   */
  getScoreInfo() {
    return {
      title: this.score.title,
      composer: this.score.composer,
      tempo: this.score.tempo,
      timeSignature: this.score.timeSignature,
      keySignature: this.score.keySignature,
      measureCount: this.score.measures.length,
      staffCount: this.staves.size,
      groups: Array.from(this.staffGroups.values()).map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        staves: g.staves
      }))
    };
  }

  /**
   * Dispose
   */
  dispose() {
    this.registry.dispose();
  }
}

/**
 * Score layout engine
 */
class ScoreLayoutEngine {
  constructor() {
    this.registry = new DisposalRegistry('score-layout-engine');
    
    // Layout settings
    this.settings = {
      pageWidth: 210, // A4 in mm
      pageHeight: 297,
      margins: { top: 20, bottom: 20, left: 15, right: 15 },
      staffHeight: 10,
      staffSpacing: 15,
      systemSpacing: 25,
      measuresPerSystem: 4
    };
  }

  /**
   * Layout score for display/printing
   * @param {Object} score 
   * @returns {Object}
   */
  layoutScore(score) {
    const layout = {
      pages: [],
      systems: [],
      staffPositions: new Map()
    };
    
    // Calculate available space
    const contentWidth = this.settings.pageWidth - 
                        this.settings.margins.left - 
                        this.settings.margins.right;
    const contentHeight = this.settings.pageHeight - 
                         this.settings.margins.top - 
                         this.settings.margins.bottom;
    
    // Layout systems
    const systems = this.createSystems(score, contentWidth);
    
    // Distribute systems across pages
    this.distributeSystemsToPages(systems, contentHeight, layout);
    
    return layout;
  }

  /**
   * Create systems
   * @param {Object} score 
   * @param {number} width 
   * @returns {Array}
   */
  createSystems(score, width) {
    const systems = [];
    const measureCount = score.measures?.length || 0;
    
    for (let i = 0; i < measureCount; i += this.settings.measuresPerSystem) {
      const system = {
        measures: [],
        staves: [],
        width,
        height: this.calculateSystemHeight(score)
      };
      
      // Add measures to system
      for (let j = 0; j < this.settings.measuresPerSystem && i + j < measureCount; j++) {
        system.measures.push(i + j + 1);
      }
      
      // Add staves
      score.staves.forEach(staff => {
        if (staff.visible) {
          system.staves.push({
            id: staff.id,
            measures: staff.measures.slice(i, i + this.settings.measuresPerSystem)
          });
        }
      });
      
      systems.push(system);
    }
    
    return systems;
  }

  /**
   * Calculate system height
   * @param {Object} score 
   * @returns {number}
   */
  calculateSystemHeight(score) {
    const visibleStaves = score.staves.filter(s => s.visible);
    const staffCount = visibleStaves.length;
    
    return staffCount * this.settings.staffHeight + 
           (staffCount - 1) * this.settings.staffSpacing;
  }

  /**
   * Distribute systems to pages
   * @param {Array} systems 
   * @param {number} pageHeight 
   * @param {Object} layout 
   */
  distributeSystemsToPages(systems, pageHeight, layout) {
    let currentPage = { systems: [], height: 0 };
    
    systems.forEach(system => {
      const systemTotalHeight = system.height + this.settings.systemSpacing;
      
      if (currentPage.height + systemTotalHeight > pageHeight) {
        // Start new page
        layout.pages.push(currentPage);
        currentPage = { systems: [], height: 0 };
      }
      
      currentPage.systems.push(system);
      currentPage.height += systemTotalHeight;
    });
    
    // Add last page
    if (currentPage.systems.length > 0) {
      layout.pages.push(currentPage);
    }
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Score playback engine
 */
class ScorePlaybackEngine {
  constructor() {
    this.registry = new DisposalRegistry('score-playback-engine');
  }

  /**
   * Create playback track from staff
   * @param {Object} staff 
   * @returns {Object}
   */
  createTrack(staff) {
    const track = {
      id: staff.id,
      name: staff.name,
      instrument: staff.instrument,
      notes: [],
      muted: staff.muted,
      volume: 0 // dB
    };
    
    // Collect all notes from measures
    staff.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach(note => {
        // Use sounding pitch for playback
        track.notes.push({
          ...note,
          pitch: note.soundingPitch || note.pitch,
          measure: measureIndex + 1
        });
      });
    });
    
    // Sort by time
    track.notes.sort((a, b) => a.time - b.time);
    
    return track;
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Part extractor
 */
class PartExtractor {
  constructor() {
    this.registry = new DisposalRegistry('part-extractor');
  }

  /**
   * Extract individual part
   * @param {Object} staff 
   * @param {Object} score 
   * @returns {Object}
   */
  extractPart(staff, score) {
    const part = {
      title: `${score.title} - ${staff.name}`,
      instrument: staff.name,
      composer: score.composer,
      tempo: score.tempo,
      timeSignature: score.timeSignature,
      keySignature: score.keySignature,
      measures: [],
      cues: []
    };
    
    // Copy measures
    part.measures = staff.measures.map(measure => ({
      ...measure,
      multiRests: 0 // Will be calculated
    }));
    
    // Calculate multi-rests
    this.calculateMultiRests(part);
    
    // Add cues from other instruments
    this.addCues(part, staff, score);
    
    // Add rehearsal marks
    if (score.rehearsalMarks) {
      part.rehearsalMarks = score.rehearsalMarks;
    }
    
    return part;
  }

  /**
   * Calculate multi-measure rests
   * @param {Object} part 
   */
  calculateMultiRests(part) {
    let restCount = 0;
    let restStart = -1;
    
    part.measures.forEach((measure, index) => {
      const hasNotes = measure.notes && measure.notes.length > 0;
      
      if (!hasNotes) {
        if (restStart === -1) {
          restStart = index;
        }
        restCount++;
      } else {
        if (restCount > 0) {
          // Mark multi-rest
          for (let i = restStart; i < restStart + restCount; i++) {
            part.measures[i].multiRests = restCount;
            part.measures[i].multiRestStart = i === restStart;
          }
          restCount = 0;
          restStart = -1;
        }
      }
    });
    
    // Handle trailing rests
    if (restCount > 0) {
      for (let i = restStart; i < restStart + restCount; i++) {
        part.measures[i].multiRests = restCount;
        part.measures[i].multiRestStart = i === restStart;
      }
    }
  }

  /**
   * Add cues from other instruments
   * @param {Object} part 
   * @param {Object} staff 
   * @param {Object} score 
   */
  addCues(part, staff, score) {
    // Find long rests where cues would be helpful
    part.measures.forEach((measure, index) => {
      if (measure.multiRests > 8) {
        // Look for prominent material in other parts
        const cue = this.findCueableMaterial(index, staff, score);
        if (cue) {
          part.cues.push({
            measure: index + 1,
            instrument: cue.instrument,
            notes: cue.notes,
            text: `${cue.instrument} cue`
          });
        }
      }
    });
  }

  /**
   * Find cueable material
   * @param {number} measureIndex 
   * @param {Object} currentStaff 
   * @param {Object} score 
   * @returns {Object|null}
   */
  findCueableMaterial(measureIndex, currentStaff, score) {
    // Look for melodic material in other instruments
    // This is simplified - real implementation would be more sophisticated
    return null;
  }

  dispose() {
    this.registry.dispose();
  }
}

// Factory function
export function createMultiStaffComposition() {
  return new MultiStaffComposition();
}