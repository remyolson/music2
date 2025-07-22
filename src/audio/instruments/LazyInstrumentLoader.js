/**
 * Lazy Instrument Loader - Loads instruments on demand to improve performance
 */
import * as Tone from 'tone';
import { createInstrument } from './InstrumentFactory.js';
import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * Cache for loaded instrument definitions
 */
const instrumentCache = new Map();
const loadingPromises = new Map();
const cacheRegistry = new DisposalRegistry('instrumentCache');

/**
 * Instrument loader configurations
 * Only includes definitions that exist
 */
const INSTRUMENT_LOADERS = {
  synth_lead: () => import('./definitions/synthLead.js'),
  piano: () => import('./definitions/piano.js'),
  drums_kit: () => import('./definitions/drumsKit.js')
};

/**
 * Preload commonly used instruments
 */
export async function preloadCommonInstruments() {
  const commonInstruments = ['synth_lead', 'piano', 'drums_kit'];
  
  await Promise.all(
    commonInstruments.map(type => loadInstrumentDefinition(type))
  );
}

/**
 * Load instrument definition lazily
 * @param {string} type - Instrument type
 * @returns {Promise<Object>} Instrument definition
 */
export async function loadInstrumentDefinition(type) {
  // Return cached definition if available
  if (instrumentCache.has(type)) {
    return instrumentCache.get(type);
  }
  
  // Return existing loading promise if already loading
  if (loadingPromises.has(type)) {
    return loadingPromises.get(type);
  }
  
  // Check if we have a loader for this instrument
  const loader = INSTRUMENT_LOADERS[type];
  if (!loader) {
    // Fall back to default definition
    return { type, useFactory: true };
  }
  
  // Start loading
  const loadingPromise = loader()
    .then(module => {
      const definition = module.default;
      instrumentCache.set(type, definition);
      loadingPromises.delete(type);
      return definition;
    })
    .catch(error => {
      console.warn(`Failed to load instrument definition for ${type}:`, error);
      loadingPromises.delete(type);
      // Fall back to factory method
      return { type, useFactory: true };
    });
  
  loadingPromises.set(type, loadingPromise);
  return loadingPromise;
}

/**
 * Create instrument with lazy loading
 * @param {string} type - Instrument type
 * @param {Object} settings - Instrument settings
 * @returns {Promise<Tone.Instrument>} The created instrument
 */
export async function createInstrumentLazy(type, settings = {}) {
  const definition = await loadInstrumentDefinition(type);
  
  if (definition.useFactory) {
    // Use the existing factory method
    return createInstrument(type, settings);
  }
  
  // Use the loaded definition to create the instrument
  return definition.create(settings);
}

/**
 * Clear instrument cache
 */
export function clearInstrumentCache() {
  instrumentCache.clear();
  loadingPromises.clear();
  cacheRegistry.dispose();
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    cached: instrumentCache.size,
    loading: loadingPromises.size,
    types: Array.from(instrumentCache.keys())
  };
}

// Dispose cache on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', clearInstrumentCache);
}