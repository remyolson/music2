import * as Tone from 'tone';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';
import { createInstrument } from '../../audio/instruments/InstrumentFactory.js';
import { MixGroups } from '../../audio/mixing/MixGroups.js';

/**
 * OrchestraTemplate - Standard orchestra setup templates
 * Provides pre-configured orchestral ensembles
 */
export class OrchestraTemplate {
  constructor(type = 'full') {
    this.registry = new DisposalRegistry('orchestra-template');
    this.type = type;
    
    // Sections
    this.sections = new Map();
    this.instruments = new Map();
    
    // Mix groups
    this.mixGroups = new MixGroups();
    this.registry.register(this.mixGroups);
    
    // Template configurations
    this.templates = this.defineTemplates();
    
    // Load the specified template
    this.loadTemplate(type);
    
    // Output
    this.output = this.mixGroups.output;
  }

  /**
   * Define available orchestra templates
   */
  defineTemplates() {
    return {
      // Full Symphony Orchestra (80+ instruments)
      full: {
        name: 'Full Symphony Orchestra',
        sections: {
          strings: {
            'violin1': { count: 16, pan: -0.3, distance: 2 },
            'violin2': { count: 14, pan: 0.3, distance: 2 },
            'viola': { count: 12, pan: -0.1, distance: 2.5 },
            'cello': { count: 10, pan: 0.2, distance: 3 },
            'bass': { count: 8, pan: 0.5, distance: 3.5 }
          },
          woodwinds: {
            'flute': { count: 3, pan: -0.4, distance: 3 },
            'oboe': { count: 3, pan: -0.2, distance: 3 },
            'clarinet': { count: 3, pan: 0.2, distance: 3 },
            'bassoon': { count: 3, pan: 0.4, distance: 3 },
            'piccolo': { count: 1, pan: -0.5, distance: 3 },
            'englishHorn': { count: 1, pan: -0.15, distance: 3 },
            'bassClarinet': { count: 1, pan: 0.25, distance: 3 },
            'contrabassoon': { count: 1, pan: 0.45, distance: 3 }
          },
          brass: {
            'frenchHorn': { count: 4, pan: -0.6, distance: 4 },
            'trumpet': { count: 3, pan: -0.3, distance: 4 },
            'trombone': { count: 3, pan: 0.3, distance: 4 },
            'tuba': { count: 1, pan: 0.6, distance: 4 }
          },
          percussion: {
            'timpani': { count: 1, pan: 0, distance: 5 },
            'snare': { count: 1, pan: -0.7, distance: 5 },
            'bassDrum': { count: 1, pan: 0.7, distance: 5 },
            'cymbals': { count: 1, pan: 0.5, distance: 5 },
            'triangle': { count: 1, pan: -0.5, distance: 5 },
            'glockenspiel': { count: 1, pan: -0.3, distance: 4.5 },
            'xylophone': { count: 1, pan: 0.3, distance: 4.5 },
            'tubularBells': { count: 1, pan: 0, distance: 5.5 }
          },
          keyboards: {
            'harp': { count: 2, pan: -0.8, distance: 3.5 },
            'celesta': { count: 1, pan: 0.8, distance: 3.5 },
            'piano': { count: 1, pan: 0, distance: 3 }
          }
        }
      },
      
      // Chamber Orchestra (30-40 instruments)
      chamber: {
        name: 'Chamber Orchestra',
        sections: {
          strings: {
            'violin1': { count: 6, pan: -0.3, distance: 1.5 },
            'violin2': { count: 5, pan: 0.3, distance: 1.5 },
            'viola': { count: 4, pan: -0.1, distance: 2 },
            'cello': { count: 3, pan: 0.2, distance: 2.5 },
            'bass': { count: 2, pan: 0.5, distance: 3 }
          },
          woodwinds: {
            'flute': { count: 2, pan: -0.4, distance: 2.5 },
            'oboe': { count: 2, pan: -0.2, distance: 2.5 },
            'clarinet': { count: 2, pan: 0.2, distance: 2.5 },
            'bassoon': { count: 2, pan: 0.4, distance: 2.5 }
          },
          brass: {
            'frenchHorn': { count: 2, pan: -0.5, distance: 3 },
            'trumpet': { count: 2, pan: 0, distance: 3 }
          },
          keyboards: {
            'harpsichord': { count: 1, pan: 0, distance: 2 }
          }
        }
      },
      
      // String Orchestra
      strings: {
        name: 'String Orchestra',
        sections: {
          strings: {
            'violin1': { count: 12, pan: -0.4, distance: 2 },
            'violin2': { count: 10, pan: 0.4, distance: 2 },
            'viola': { count: 8, pan: -0.2, distance: 2.5 },
            'cello': { count: 6, pan: 0.2, distance: 3 },
            'bass': { count: 4, pan: 0.6, distance: 3.5 }
          }
        }
      },
      
      // Jazz Big Band
      bigband: {
        name: 'Jazz Big Band',
        sections: {
          saxophones: {
            'altoSax1': { count: 1, pan: -0.4, distance: 2 },
            'altoSax2': { count: 1, pan: -0.2, distance: 2 },
            'tenorSax1': { count: 1, pan: 0.2, distance: 2 },
            'tenorSax2': { count: 1, pan: 0.4, distance: 2 },
            'baritoneSax': { count: 1, pan: 0, distance: 2.5 }
          },
          trumpets: {
            'trumpet1': { count: 1, pan: -0.5, distance: 3 },
            'trumpet2': { count: 1, pan: -0.25, distance: 3 },
            'trumpet3': { count: 1, pan: 0, distance: 3 },
            'trumpet4': { count: 1, pan: 0.25, distance: 3 }
          },
          trombones: {
            'trombone1': { count: 1, pan: -0.3, distance: 3.5 },
            'trombone2': { count: 1, pan: -0.1, distance: 3.5 },
            'trombone3': { count: 1, pan: 0.1, distance: 3.5 },
            'bassTrombone': { count: 1, pan: 0.3, distance: 3.5 }
          },
          rhythm: {
            'piano': { count: 1, pan: -0.6, distance: 2 },
            'guitar': { count: 1, pan: 0.6, distance: 2 },
            'bass': { count: 1, pan: 0.1, distance: 2 },
            'drums': { count: 1, pan: 0, distance: 2.5 }
          }
        }
      },
      
      // Solo with Orchestra
      concerto: {
        name: 'Concerto Setup',
        sections: {
          soloist: {
            'piano': { count: 1, pan: 0, distance: 1 }
          },
          strings: {
            'violin1': { count: 8, pan: -0.4, distance: 2.5 },
            'violin2': { count: 6, pan: 0.4, distance: 2.5 },
            'viola': { count: 4, pan: -0.2, distance: 3 },
            'cello': { count: 3, pan: 0.2, distance: 3.5 },
            'bass': { count: 2, pan: 0.6, distance: 4 }
          },
          woodwinds: {
            'flute': { count: 2, pan: -0.5, distance: 3.5 },
            'oboe': { count: 2, pan: -0.3, distance: 3.5 },
            'clarinet': { count: 2, pan: 0.3, distance: 3.5 },
            'bassoon': { count: 2, pan: 0.5, distance: 3.5 }
          },
          brass: {
            'frenchHorn': { count: 2, pan: -0.6, distance: 4 },
            'trumpet': { count: 2, pan: 0.6, distance: 4 }
          }
        }
      }
    };
  }

  /**
   * Load a template
   * @param {string} type 
   */
  loadTemplate(type) {
    const template = this.templates[type];
    if (!template) {
      console.warn(`Unknown template type: ${type}`);
      return;
    }
    
    // Clear existing
    this.clearOrchestra();
    
    // Create sections and instruments
    Object.entries(template.sections).forEach(([sectionName, instruments]) => {
      this.createSection(sectionName, instruments);
    });
    
    // Set up spatial positioning
    this.setupSpatialPositioning();
    
    // Configure mix groups
    this.configureMixGroups();
    
    // Apply template-specific settings
    this.applyTemplateSettings(type);
  }

  /**
   * Create a section with instruments
   * @param {string} sectionName 
   * @param {Object} instruments 
   */
  createSection(sectionName, instruments) {
    const section = {
      name: sectionName,
      instruments: new Map(),
      bus: this.mixGroups.busProcessor.buses.get(sectionName) || 
           this.mixGroups.busProcessor.createBus(sectionName, {
             type: 'group',
             processing: ['eq', 'compressor', 'reverb'],
             sends: [{ bus: 'master', level: 0 }]
           })
    };
    
    // Create instruments
    Object.entries(instruments).forEach(([instrumentName, config]) => {
      const players = [];
      
      // Create multiple instances for sections
      for (let i = 0; i < config.count; i++) {
        const player = this.createOrchestraInstrument(instrumentName, {
          ...config,
          index: i,
          sectionSize: config.count
        });
        
        if (player) {
          players.push(player);
          
          // Route to section bus
          this.mixGroups.busProcessor.routeToBus(
            player.output, 
            sectionName,
            {
              gain: this.calculatePlayerGain(i, config.count),
              pan: this.calculatePlayerPan(config.pan, i, config.count)
            }
          );
        }
      }
      
      section.instruments.set(instrumentName, {
        players,
        config
      });
    });
    
    this.sections.set(sectionName, section);
  }

  /**
   * Create an orchestra instrument
   * @param {string} instrumentName 
   * @param {Object} config 
   * @returns {Object}
   */
  createOrchestraInstrument(instrumentName, config) {
    // Map orchestra names to instrument types
    const instrumentMap = {
      'violin1': 'orchestralStrings',
      'violin2': 'orchestralStrings',
      'viola': 'orchestralStrings',
      'cello': 'orchestralStrings',
      'bass': 'orchestralStrings',
      'flute': 'orchestralWinds',
      'piccolo': 'orchestralWinds',
      'oboe': 'orchestralWinds',
      'englishHorn': 'orchestralWinds',
      'clarinet': 'orchestralWinds',
      'bassClarinet': 'orchestralWinds',
      'bassoon': 'orchestralWinds',
      'contrabassoon': 'orchestralWinds',
      'frenchHorn': 'orchestralBrass',
      'trumpet': 'orchestralBrass',
      'trombone': 'orchestralBrass',
      'tuba': 'orchestralBrass',
      'timpani': 'timpani',
      'harp': 'harp',
      'piano': 'naturalPiano',
      'harpsichord': 'harpsichord',
      'celesta': 'celesta',
      // Jazz instruments
      'altoSax1': 'altoSax',
      'altoSax2': 'altoSax',
      'tenorSax1': 'tenorSax',
      'tenorSax2': 'tenorSax',
      'baritoneSax': 'baritoneSax',
      'guitar': 'jazzGuitar',
      'drums': 'drums'
    };
    
    const instrumentType = instrumentMap[instrumentName] || instrumentName;
    
    try {
      const instrument = createInstrument(instrumentType, {
        orchestralConfig: {
          section: instrumentName,
          playerIndex: config.index,
          sectionSize: config.sectionSize,
          spatialPosition: {
            pan: config.pan,
            distance: config.distance
          }
        }
      });
      
      this.registry.register(instrument);
      return instrument;
      
    } catch (error) {
      console.warn(`Failed to create instrument ${instrumentName}:`, error);
      return null;
    }
  }

  /**
   * Calculate player gain based on section position
   * @param {number} index 
   * @param {number} total 
   * @returns {number}
   */
  calculatePlayerGain(index, total) {
    // Slightly reduce gain for larger sections
    const sectionReduction = Math.min(0, -3 * Math.log10(total));
    
    // Slight variation per player
    const variation = (Math.random() - 0.5) * 0.5;
    
    return sectionReduction + variation;
  }

  /**
   * Calculate player pan within section
   * @param {number} basePan 
   * @param {number} index 
   * @param {number} total 
   * @returns {number}
   */
  calculatePlayerPan(basePan, index, total) {
    if (total === 1) return basePan;
    
    // Spread players across stereo field within section
    const spread = 0.2; // Maximum spread within section
    const position = (index / (total - 1)) - 0.5; // -0.5 to 0.5
    
    return basePan + (position * spread);
  }

  /**
   * Set up spatial positioning
   */
  setupSpatialPositioning() {
    // Configure reverb sends based on distance
    this.sections.forEach((section, sectionName) => {
      section.instruments.forEach((instrumentData, instrumentName) => {
        const config = instrumentData.config;
        const reverbLevel = -20 + (config.distance * 4); // More distant = more reverb
        
        // Set reverb send
        this.mixGroups.busProcessor.connectSend(sectionName, 'reverb', reverbLevel);
      });
    });
  }

  /**
   * Configure mix groups
   */
  configureMixGroups() {
    // Create VCA groups for sections
    this.sections.forEach((section, sectionName) => {
      this.mixGroups.createVCAGroup(sectionName, {
        channels: Array.from(section.instruments.keys())
      });
    });
    
    // Create master VCA groups
    if (this.type === 'full' || this.type === 'chamber') {
      this.mixGroups.createVCAGroup('orchestra', {
        channels: Array.from(this.sections.keys())
      });
    }
  }

  /**
   * Apply template-specific settings
   * @param {string} type 
   */
  applyTemplateSettings(type) {
    switch (type) {
      case 'full':
        // Full orchestra settings
        this.mixGroups.busProcessor.setBusProcessing('master', 'reverb', {
          type: 'hall',
          preset: 'large',
          wet: 0.25
        });
        break;
        
      case 'chamber':
        // Chamber orchestra settings
        this.mixGroups.busProcessor.setBusProcessing('master', 'reverb', {
          type: 'chamber',
          preset: 'medium',
          wet: 0.2
        });
        break;
        
      case 'strings':
        // String orchestra settings
        this.mixGroups.busProcessor.setBusProcessing('strings', 'eq', {
          highShelf: { freq: 12000, gain: 2 },
          lowShelf: { freq: 100, gain: -2 }
        });
        break;
        
      case 'bigband':
        // Jazz big band settings
        this.mixGroups.busProcessor.setBusProcessing('master', 'compressor', {
          threshold: -12,
          ratio: 3,
          attack: 0.01,
          release: 0.1
        });
        break;
        
      case 'concerto':
        // Concerto settings - highlight soloist
        this.mixGroups.busProcessor.setBusLevel('soloist', 3);
        this.mixGroups.busProcessor.setBusProcessing('soloist', 'reverb', {
          wet: 0.15
        });
        break;
    }
  }

  /**
   * Clear existing orchestra
   */
  clearOrchestra() {
    this.sections.forEach(section => {
      section.instruments.forEach(instrumentData => {
        instrumentData.players.forEach(player => {
          if (player && player.dispose) {
            player.dispose();
          }
        });
      });
    });
    
    this.sections.clear();
    this.instruments.clear();
  }

  /**
   * Get instrument by name
   * @param {string} sectionName 
   * @param {string} instrumentName 
   * @param {number} playerIndex 
   * @returns {Object}
   */
  getInstrument(sectionName, instrumentName, playerIndex = 0) {
    const section = this.sections.get(sectionName);
    if (!section) return null;
    
    const instrumentData = section.instruments.get(instrumentName);
    if (!instrumentData) return null;
    
    return instrumentData.players[playerIndex] || null;
  }

  /**
   * Get all instruments in a section
   * @param {string} sectionName 
   * @returns {Array}
   */
  getSectionInstruments(sectionName) {
    const section = this.sections.get(sectionName);
    if (!section) return [];
    
    const instruments = [];
    section.instruments.forEach((instrumentData, name) => {
      instruments.push({
        name,
        players: instrumentData.players,
        config: instrumentData.config
      });
    });
    
    return instruments;
  }

  /**
   * Set section level
   * @param {string} sectionName 
   * @param {number} level in dB
   */
  setSectionLevel(sectionName, level) {
    this.mixGroups.busProcessor.setBusLevel(sectionName, level);
  }

  /**
   * Mute/unmute section
   * @param {string} sectionName 
   * @param {boolean} mute 
   */
  setSectionMute(sectionName, mute) {
    this.mixGroups.busProcessor.setBusMute(sectionName, mute);
  }

  /**
   * Solo section
   * @param {string} sectionName 
   * @param {boolean} solo 
   */
  setSectionSolo(sectionName, solo) {
    this.mixGroups.busProcessor.setBusSolo(sectionName, solo);
  }

  /**
   * Get template info
   * @returns {Object}
   */
  getTemplateInfo() {
    const info = {
      type: this.type,
      name: this.templates[this.type]?.name || 'Unknown',
      sections: {},
      totalInstruments: 0
    };
    
    this.sections.forEach((section, sectionName) => {
      info.sections[sectionName] = {
        instruments: {}
      };
      
      section.instruments.forEach((instrumentData, instrumentName) => {
        info.sections[sectionName].instruments[instrumentName] = {
          count: instrumentData.players.length,
          ...instrumentData.config
        };
        info.totalInstruments += instrumentData.players.length;
      });
    });
    
    return info;
  }

  /**
   * Save orchestra state
   * @returns {Object}
   */
  saveState() {
    return {
      template: this.type,
      mixState: this.mixGroups.createSnapshot(),
      sectionStates: {}
    };
  }

  /**
   * Load orchestra state
   * @param {Object} state 
   */
  loadState(state) {
    if (state.template !== this.type) {
      this.loadTemplate(state.template);
    }
    
    if (state.mixState) {
      this.mixGroups.recallSnapshot(state.mixState);
    }
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
    this.clearOrchestra();
    this.registry.dispose();
  }
}

// Factory function
export function createOrchestraTemplate(type = 'full') {
  return new OrchestraTemplate(type);
}