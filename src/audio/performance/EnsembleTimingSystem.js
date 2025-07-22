import { update as updateState } from '../../state.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * EnsembleTimingSystem - Coordinates timing between multiple instruments
 * Creates realistic ensemble interactions and timing relationships
 */
export class EnsembleTimingSystem {
  constructor() {
    this.registry = new DisposalRegistry('ensemble-timing');
    
    // Ensemble settings
    this.enabled = true;
    this.ensembleSize = 'quartet'; // 'solo', 'duet', 'trio', 'quartet', 'ensemble', 'orchestra'
    this.tightness = 0.8; // 0-1, how tight the ensemble plays together
    
    // Instrument roles and relationships
    this.instrumentRoles = new Map();
    this.timingRelationships = new Map();
    this.initializeRoles();
    
    // Section timing (for orchestral arrangements)
    this.sectionTiming = {
      strings: {
        violins1: 0,
        violins2: 0.002,
        violas: 0.003,
        cellos: 0.004,
        basses: 0.005
      },
      woodwinds: {
        piccolo: -0.002,
        flutes: 0,
        oboes: 0.001,
        clarinets: 0.002,
        bassoons: 0.003
      },
      brass: {
        trumpets: 0.002,
        horns: 0.004,
        trombones: 0.005,
        tubas: 0.006
      },
      percussion: {
        timpani: 0,
        snare: -0.001,
        cymbals: 0.001,
        mallets: -0.002
      }
    };
    
    // Musical role timing
    this.roleBasedTiming = {
      lead: -0.002,      // Lead slightly ahead
      harmony: 0.002,    // Harmony slightly behind
      bass: 0.004,       // Bass anchors behind
      rhythm: 0.001,     // Rhythm section together
      countermelody: 0,  // With the beat
      percussion: -0.001 // Percussion drives
    };
    
    // Interaction patterns
    this.interactionPatterns = new Map();
    this.initializeInteractionPatterns();
    
    // Communication delays (how instruments respond to each other)
    this.communicationDelays = {
      immediate: 0,
      reactive: 0.05,      // 50ms reaction time
      following: 0.1,      // 100ms following
      callResponse: 0.2    // 200ms for call and response
    };
    
    // Ensemble cohesion factors
    this.cohesionFactors = {
      rehearsed: 0.95,     // Well-rehearsed ensemble
      sightReading: 0.7,   // First time playing together
      jamming: 0.8,        // Informal jamming
      professional: 0.9,   // Professional ensemble
      student: 0.6         // Student ensemble
    };
    
    // Dynamic response (how ensemble responds to dynamic changes)
    this.dynamicResponse = {
      unanimous: 1.0,      // All change together
      staggered: 0.5,      // Gradual change through ensemble
      leader: 0.3          // Follow the leader
    };
    
    // Tempo stability
    this.tempoStability = {
      rock: 0.95,          // Very stable
      classical: 0.9,      // Quite stable
      jazz: 0.8,           // Some flexibility
      rubato: 0.6          // Very flexible
    };
    
    // Active instruments tracking
    this.activeInstruments = new Map();
    this.ensembleState = {
      currentTempo: 120,
      tempoFluctuation: 0,
      dynamicLevel: 0.7,
      musicalTension: 0.5
    };
  }

  /**
   * Initialize instrument roles
   */
  initializeRoles() {
    // Jazz combo roles
    this.instrumentRoles.set('jazz-combo', {
      piano: 'harmony',
      bass: 'bass',
      drums: 'rhythm',
      saxophone: 'lead',
      trumpet: 'lead',
      guitar: 'harmony'
    });
    
    // Rock band roles
    this.instrumentRoles.set('rock-band', {
      guitar: 'lead',
      bass: 'bass',
      drums: 'rhythm',
      keys: 'harmony',
      vocals: 'lead'
    });
    
    // String quartet roles
    this.instrumentRoles.set('string-quartet', {
      violin1: 'lead',
      violin2: 'harmony',
      viola: 'harmony',
      cello: 'bass'
    });
    
    // Orchestra roles
    this.instrumentRoles.set('orchestra', {
      violins1: 'lead',
      violins2: 'harmony',
      violas: 'harmony',
      cellos: 'bass',
      basses: 'bass',
      flutes: 'lead',
      oboes: 'countermelody',
      clarinets: 'harmony',
      bassoons: 'bass',
      trumpets: 'lead',
      horns: 'harmony',
      trombones: 'bass',
      timpani: 'rhythm'
    });
  }

  /**
   * Initialize interaction patterns
   */
  initializeInteractionPatterns() {
    // Call and response
    this.interactionPatterns.set('call-response', {
      timing: 'sequential',
      overlap: 0,
      responseDelay: 0.1,
      dynamics: 'matching'
    });
    
    // Counterpoint
    this.interactionPatterns.set('counterpoint', {
      timing: 'independent',
      overlap: 0.9,
      responseDelay: 0,
      dynamics: 'complementary'
    });
    
    // Unison
    this.interactionPatterns.set('unison', {
      timing: 'synchronized',
      overlap: 1.0,
      responseDelay: 0,
      dynamics: 'matching'
    });
    
    // Accompaniment
    this.interactionPatterns.set('accompaniment', {
      timing: 'supporting',
      overlap: 0.5,
      responseDelay: 0.002,
      dynamics: 'subordinate'
    });
    
    // Trading (jazz)
    this.interactionPatterns.set('trading', {
      timing: 'alternating',
      overlap: 0.1,
      responseDelay: 0.05,
      dynamics: 'conversational'
    });
  }

  /**
   * Register an instrument in the ensemble
   * @param {string} instrumentId 
   * @param {Object} config 
   */
  registerInstrument(instrumentId, config = {}) {
    const {
      type = 'piano',
      role = 'harmony',
      section = null,
      skill = 'professional'
    } = config;
    
    this.activeInstruments.set(instrumentId, {
      type,
      role,
      section,
      skill,
      timingOffset: 0,
      dynamicOffset: 0,
      lastEventTime: 0
    });
    
    // Update ensemble configuration
    this.updateEnsembleConfiguration();
  }

  /**
   * Process ensemble timing for a note event
   * @param {Object} noteEvent 
   * @param {string} instrumentId 
   * @param {Object} context 
   * @returns {Object} Processed note event
   */
  processEnsembleEvent(noteEvent, instrumentId, context = {}) {
    if (!this.enabled) return noteEvent;
    
    const instrument = this.activeInstruments.get(instrumentId);
    if (!instrument) return noteEvent;
    
    const {
      musicalContext = 'playing',
      interaction = null,
      isLeading = false,
      isFollowing = false,
      targetInstrument = null
    } = context;
    
    // Calculate base timing offset
    let timingOffset = this.calculateBaseOffset(instrument, context);
    
    // Apply role-based timing
    timingOffset += this.getRoleBasedTiming(instrument.role, isLeading);
    
    // Apply section timing (for orchestral instruments)
    if (instrument.section) {
      timingOffset += this.getSectionTiming(instrument.type, instrument.section);
    }
    
    // Apply interaction patterns
    if (interaction) {
      timingOffset += this.applyInteractionPattern(
        interaction, 
        instrumentId, 
        targetInstrument,
        noteEvent.time
      );
    }
    
    // Apply ensemble tightness
    timingOffset = this.applyEnsembleTightness(timingOffset, instrument.skill);
    
    // Apply musical context
    timingOffset = this.applyMusicalContext(timingOffset, musicalContext, context);
    
    // Update instrument state
    instrument.lastEventTime = noteEvent.time;
    instrument.timingOffset = timingOffset;
    
    return {
      ...noteEvent,
      time: noteEvent.time + timingOffset,
      ensembleTiming: timingOffset,
      ensembleRole: instrument.role
    };
  }

  /**
   * Calculate base timing offset
   * @param {Object} instrument 
   * @param {Object} context 
   * @returns {number}
   */
  calculateBaseOffset(instrument, context) {
    let offset = 0;
    
    // Skill-based variation
    const skillFactors = {
      student: 0.015,
      amateur: 0.01,
      semipro: 0.005,
      professional: 0.002,
      virtuoso: 0.001
    };
    
    const skillVariation = skillFactors[instrument.skill] || 0.005;
    offset += (Math.random() - 0.5) * skillVariation;
    
    // Ensemble size affects timing spread
    const sizeFactors = {
      solo: 0,
      duet: 0.002,
      trio: 0.003,
      quartet: 0.004,
      ensemble: 0.006,
      orchestra: 0.01
    };
    
    offset += sizeFactors[this.ensembleSize] || 0;
    
    return offset;
  }

  /**
   * Get role-based timing offset
   * @param {string} role 
   * @param {boolean} isLeading 
   * @returns {number}
   */
  getRoleBasedTiming(role, isLeading) {
    if (isLeading) {
      // Leaders push slightly ahead
      return -0.002;
    }
    
    return this.roleBasedTiming[role] || 0;
  }

  /**
   * Get section timing offset
   * @param {string} instrumentType 
   * @param {string} section 
   * @returns {number}
   */
  getSectionTiming(instrumentType, section) {
    // Find section family
    for (const [family, sections] of Object.entries(this.sectionTiming)) {
      if (sections[instrumentType]) {
        return sections[instrumentType];
      }
    }
    
    return 0;
  }

  /**
   * Apply interaction pattern
   * @param {string} pattern 
   * @param {string} instrumentId 
   * @param {string} targetId 
   * @param {number} eventTime 
   * @returns {number}
   */
  applyInteractionPattern(pattern, instrumentId, targetId, eventTime) {
    const interaction = this.interactionPatterns.get(pattern);
    if (!interaction) return 0;
    
    const targetInstrument = this.activeInstruments.get(targetId);
    if (!targetInstrument) return 0;
    
    let offset = 0;
    
    switch (interaction.timing) {
      case 'sequential':
        // Wait for target to finish
        if (targetInstrument.lastEventTime > eventTime - 0.1) {
          offset += interaction.responseDelay;
        }
        break;
        
      case 'synchronized':
        // Match target timing
        offset = targetInstrument.timingOffset;
        break;
        
      case 'supporting':
        // Slightly behind target
        offset = targetInstrument.timingOffset + interaction.responseDelay;
        break;
        
      case 'alternating':
        // Trade off with target
        const timeSinceTarget = eventTime - targetInstrument.lastEventTime;
        if (timeSinceTarget < 1) {
          offset += interaction.responseDelay;
        }
        break;
    }
    
    return offset;
  }

  /**
   * Apply ensemble tightness
   * @param {number} offset 
   * @param {string} skill 
   * @returns {number}
   */
  applyEnsembleTightness(offset, skill) {
    // Tighter ensembles have less variation
    const tightnessFactor = this.tightness;
    
    // Skill affects ability to play tight
    const skillMultipliers = {
      student: 0.6,
      amateur: 0.7,
      semipro: 0.85,
      professional: 0.95,
      virtuoso: 1.0
    };
    
    const skillMultiplier = skillMultipliers[skill] || 0.8;
    
    return offset * (1 - tightnessFactor * skillMultiplier);
  }

  /**
   * Apply musical context
   * @param {number} offset 
   * @param {string} context 
   * @param {Object} details 
   * @returns {number}
   */
  applyMusicalContext(offset, context, details) {
    switch (context) {
      case 'solo':
        // Solo passages have more freedom
        return offset * 1.5;
        
      case 'tutti':
        // Everyone together - tighter
        return offset * 0.5;
        
      case 'cadenza':
        // Free timing
        return offset * 2 + (Math.random() - 0.5) * 0.02;
        
      case 'ending':
        // Endings often slow and spread
        return offset + 0.005 * (details.measurePosition || 0);
        
      case 'accent':
        // Accents are placed precisely
        return offset * 0.3;
        
      default:
        return offset;
    }
  }

  /**
   * Update ensemble configuration
   */
  updateEnsembleConfiguration() {
    // Determine ensemble size
    const instrumentCount = this.activeInstruments.size;
    
    if (instrumentCount === 1) this.ensembleSize = 'solo';
    else if (instrumentCount === 2) this.ensembleSize = 'duet';
    else if (instrumentCount === 3) this.ensembleSize = 'trio';
    else if (instrumentCount === 4) this.ensembleSize = 'quartet';
    else if (instrumentCount <= 10) this.ensembleSize = 'ensemble';
    else this.ensembleSize = 'orchestra';
    
    // Update timing relationships
    this.updateTimingRelationships();
  }

  /**
   * Update timing relationships between instruments
   */
  updateTimingRelationships() {
    this.timingRelationships.clear();
    
    const instruments = Array.from(this.activeInstruments.entries());
    
    for (let i = 0; i < instruments.length; i++) {
      for (let j = i + 1; j < instruments.length; j++) {
        const [id1, inst1] = instruments[i];
        const [id2, inst2] = instruments[j];
        
        const relationship = this.calculateRelationship(inst1, inst2);
        this.timingRelationships.set(`${id1}-${id2}`, relationship);
      }
    }
  }

  /**
   * Calculate relationship between instruments
   * @param {Object} inst1 
   * @param {Object} inst2 
   * @returns {Object}
   */
  calculateRelationship(inst1, inst2) {
    const relationship = {
      timingOffset: 0,
      interaction: 'independent',
      priority: 'equal'
    };
    
    // Bass and drums lock together
    if ((inst1.role === 'bass' && inst2.role === 'rhythm') ||
        (inst1.role === 'rhythm' && inst2.role === 'bass')) {
      relationship.timingOffset = 0.001;
      relationship.interaction = 'locked';
    }
    
    // Lead and harmony relationship
    if ((inst1.role === 'lead' && inst2.role === 'harmony') ||
        (inst1.role === 'harmony' && inst2.role === 'lead')) {
      relationship.timingOffset = 0.003;
      relationship.interaction = 'supporting';
      relationship.priority = inst1.role === 'lead' ? 'first' : 'second';
    }
    
    // Section relationships (orchestra)
    if (inst1.section && inst2.section && inst1.section === inst2.section) {
      relationship.timingOffset = 0.002;
      relationship.interaction = 'section';
    }
    
    return relationship;
  }

  /**
   * Process tempo fluctuation
   * @param {number} currentTempo 
   * @param {Object} context 
   * @returns {number} Adjusted tempo
   */
  processTempoFluctuation(currentTempo, context = {}) {
    const {
      musicalMoment = 'normal',
      conductor = null,
      style = 'classical'
    } = context;
    
    // Base tempo stability from style
    const stability = this.tempoStability[style] || 0.9;
    
    // Natural tempo fluctuation
    let fluctuation = (Math.random() - 0.5) * (1 - stability) * 0.05;
    
    // Musical moments affect tempo
    switch (musicalMoment) {
      case 'climax':
        fluctuation += 0.02; // Slight rush at climax
        break;
      case 'ending':
        fluctuation -= 0.03; // Ritardando
        break;
      case 'transition':
        fluctuation *= 2; // More variation in transitions
        break;
    }
    
    // Conductor provides stability
    if (conductor) {
      fluctuation *= 0.5;
    }
    
    // Update ensemble state
    this.ensembleState.tempoFluctuation = fluctuation;
    
    return currentTempo * (1 + fluctuation);
  }

  /**
   * Coordinate dynamic changes
   * @param {number} targetDynamic 
   * @param {string} responseType 
   * @returns {Object} Dynamic change info
   */
  coordinateDynamicChange(targetDynamic, responseType = 'staggered') {
    const currentDynamic = this.ensembleState.dynamicLevel;
    const responseFactor = this.dynamicResponse[responseType] || 0.5;
    
    const changes = new Map();
    
    for (const [id, instrument] of this.activeInstruments) {
      let delay = 0;
      let rate = 1;
      
      switch (responseType) {
        case 'unanimous':
          // Everyone changes together
          delay = 0;
          rate = 1;
          break;
          
        case 'staggered':
          // Gradual change through ensemble
          delay = Math.random() * 0.2 * (1 - responseFactor);
          rate = 0.5 + Math.random() * 0.5;
          break;
          
        case 'leader':
          // Follow the leader
          if (instrument.role === 'lead') {
            delay = 0;
            rate = 1;
          } else {
            delay = 0.1 + Math.random() * 0.1;
            rate = 0.7;
          }
          break;
      }
      
      changes.set(id, {
        delay,
        rate,
        startDynamic: currentDynamic,
        targetDynamic
      });
    }
    
    this.ensembleState.dynamicLevel = targetDynamic;
    
    return changes;
  }

  /**
   * Analyze ensemble cohesion
   * @param {Array} events 
   * @returns {Object}
   */
  analyzeEnsembleCohesion(events) {
    // Group events by instrument
    const instrumentEvents = new Map();
    
    for (const event of events) {
      if (!instrumentEvents.has(event.instrumentId)) {
        instrumentEvents.set(event.instrumentId, []);
      }
      instrumentEvents.get(event.instrumentId).push(event);
    }
    
    // Analyze timing relationships
    const timingAnalysis = this.analyzeTimingCohesion(instrumentEvents);
    const dynamicAnalysis = this.analyzeDynamicCohesion(instrumentEvents);
    const interactionAnalysis = this.analyzeInteractions(instrumentEvents);
    
    return {
      timing: timingAnalysis,
      dynamics: dynamicAnalysis,
      interactions: interactionAnalysis,
      overallCohesion: (timingAnalysis.score + dynamicAnalysis.score) / 2,
      suggestions: this.generateCohesionSuggestions(timingAnalysis, dynamicAnalysis)
    };
  }

  /**
   * Analyze timing cohesion
   * @param {Map} instrumentEvents 
   * @returns {Object}
   */
  analyzeTimingCohesion(instrumentEvents) {
    const analysis = {
      averageOffset: 0,
      consistency: 0,
      synchronization: 0,
      score: 0
    };
    
    // Calculate average timing offsets
    const offsets = [];
    
    for (const events of instrumentEvents.values()) {
      for (const event of events) {
        if (event.ensembleTiming) {
          offsets.push(event.ensembleTiming);
        }
      }
    }
    
    if (offsets.length > 0) {
      analysis.averageOffset = offsets.reduce((a, b) => a + b, 0) / offsets.length;
      
      // Calculate consistency (lower variance = better)
      const variance = this.calculateVariance(offsets);
      analysis.consistency = Math.max(0, 1 - variance * 100);
      
      // Calculate synchronization score
      analysis.synchronization = this.calculateSynchronization(instrumentEvents);
      
      // Overall score
      analysis.score = (analysis.consistency + analysis.synchronization) / 2;
    }
    
    return analysis;
  }

  /**
   * Analyze dynamic cohesion
   * @param {Map} instrumentEvents 
   * @returns {Object}
   */
  analyzeDynamicCohesion(instrumentEvents) {
    const analysis = {
      balance: 0,
      consistency: 0,
      expression: 0,
      score: 0
    };
    
    // Analyze dynamic balance and consistency
    const dynamics = [];
    
    for (const events of instrumentEvents.values()) {
      const instrumentDynamics = events.map(e => e.velocity || 0.7);
      dynamics.push(...instrumentDynamics);
    }
    
    if (dynamics.length > 0) {
      // Balance (how well distributed dynamics are)
      const avgDynamic = dynamics.reduce((a, b) => a + b, 0) / dynamics.length;
      analysis.balance = 1 - this.calculateVariance(dynamics);
      
      // Consistency within instruments
      let consistencySum = 0;
      let instrumentCount = 0;
      
      for (const events of instrumentEvents.values()) {
        if (events.length > 1) {
          const velocities = events.map(e => e.velocity || 0.7);
          consistencySum += 1 - this.calculateVariance(velocities);
          instrumentCount++;
        }
      }
      
      analysis.consistency = instrumentCount > 0 ? consistencySum / instrumentCount : 1;
      
      // Expression (dynamic range)
      const minDynamic = Math.min(...dynamics);
      const maxDynamic = Math.max(...dynamics);
      analysis.expression = (maxDynamic - minDynamic) / 0.8; // Normalize to expected range
      
      // Overall score
      analysis.score = (analysis.balance + analysis.consistency + analysis.expression) / 3;
    }
    
    return analysis;
  }

  /**
   * Analyze interactions between instruments
   * @param {Map} instrumentEvents 
   * @returns {Object}
   */
  analyzeInteractions(instrumentEvents) {
    const interactions = [];
    const instruments = Array.from(instrumentEvents.keys());
    
    // Look for call-and-response patterns
    for (let i = 0; i < instruments.length; i++) {
      for (let j = i + 1; j < instruments.length; j++) {
        const events1 = instrumentEvents.get(instruments[i]);
        const events2 = instrumentEvents.get(instruments[j]);
        
        const interaction = this.detectInteraction(events1, events2);
        if (interaction.type !== 'none') {
          interactions.push({
            instruments: [instruments[i], instruments[j]],
            ...interaction
          });
        }
      }
    }
    
    return interactions;
  }

  /**
   * Detect interaction between two instruments
   * @param {Array} events1 
   * @param {Array} events2 
   * @returns {Object}
   */
  detectInteraction(events1, events2) {
    // Simple interaction detection based on timing patterns
    const interaction = {
      type: 'none',
      strength: 0
    };
    
    // Check for alternating patterns (call-response)
    let alternating = 0;
    let overlapping = 0;
    
    for (const e1 of events1) {
      for (const e2 of events2) {
        const timeDiff = Math.abs(e1.time - e2.time);
        
        if (timeDiff < 0.1) {
          overlapping++;
        } else if (timeDiff > 0.1 && timeDiff < 0.5) {
          alternating++;
        }
      }
    }
    
    const total = events1.length * events2.length;
    
    if (alternating / total > 0.3) {
      interaction.type = 'call-response';
      interaction.strength = alternating / total;
    } else if (overlapping / total > 0.5) {
      interaction.type = 'unison';
      interaction.strength = overlapping / total;
    }
    
    return interaction;
  }

  /**
   * Calculate synchronization score
   * @param {Map} instrumentEvents 
   * @returns {number}
   */
  calculateSynchronization(instrumentEvents) {
    // Compare timing of simultaneous events
    let syncScore = 0;
    let comparisonCount = 0;
    
    const allEvents = [];
    for (const [instrumentId, events] of instrumentEvents) {
      for (const event of events) {
        allEvents.push({ ...event, instrumentId });
      }
    }
    
    // Sort by time
    allEvents.sort((a, b) => a.time - b.time);
    
    // Find events that should be together
    for (let i = 0; i < allEvents.length - 1; i++) {
      const timeDiff = allEvents[i + 1].time - allEvents[i].time;
      
      if (timeDiff < 0.05) {
        // These should be together
        const offset = Math.abs(allEvents[i].ensembleTiming - allEvents[i + 1].ensembleTiming);
        syncScore += Math.max(0, 1 - offset * 100);
        comparisonCount++;
      }
    }
    
    return comparisonCount > 0 ? syncScore / comparisonCount : 1;
  }

  /**
   * Generate cohesion suggestions
   * @param {Object} timingAnalysis 
   * @param {Object} dynamicAnalysis 
   * @returns {Array}
   */
  generateCohesionSuggestions(timingAnalysis, dynamicAnalysis) {
    const suggestions = [];
    
    if (timingAnalysis.consistency < 0.7) {
      suggestions.push({
        type: 'timing',
        message: 'Ensemble timing could be tighter. Consider increasing tightness parameter.',
        severity: 'medium'
      });
    }
    
    if (dynamicAnalysis.balance < 0.6) {
      suggestions.push({
        type: 'dynamics',
        message: 'Dynamic balance between instruments could be improved.',
        severity: 'medium'
      });
    }
    
    if (timingAnalysis.averageOffset > 0.01) {
      suggestions.push({
        type: 'timing',
        message: 'Overall ensemble is playing behind the beat. Consider reducing lag.',
        severity: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Calculate variance
   * @param {Array} values 
   * @returns {number}
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Set ensemble cohesion level
   * @param {string} level 
   */
  setCohesionLevel(level) {
    const factor = this.cohesionFactors[level] || 0.8;
    this.tightness = factor;
  }

  /**
   * Remove instrument from ensemble
   * @param {string} instrumentId 
   */
  removeInstrument(instrumentId) {
    this.activeInstruments.delete(instrumentId);
    this.updateEnsembleConfiguration();
  }

  /**
   * Reset ensemble
   */
  reset() {
    this.activeInstruments.clear();
    this.timingRelationships.clear();
    this.ensembleState = {
      currentTempo: 120,
      tempoFluctuation: 0,
      dynamicLevel: 0.7,
      musicalTension: 0.5
    };
  }

  /**
   * Clean up
   */
  dispose() {
    this.registry.dispose();
    this.reset();
  }
}

// Create singleton instance
export const ensembleTimingSystem = new EnsembleTimingSystem();