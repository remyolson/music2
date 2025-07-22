import { DisposalRegistry } from '../../utils/DisposalRegistry.js';

/**
 * UIUXEnhancementSystem - Enhanced user interface and experience improvements
 * Includes instrument selection, visual feedback, customizable layouts, and keyboard shortcuts
 */
export class UIUXEnhancementSystem {
  constructor() {
    this.registry = new DisposalRegistry('ui-ux-enhancement-system');
    
    // UI Components
    this.instrumentSelector = new InstrumentSelector();
    this.registry.register(this.instrumentSelector);
    
    this.visualFeedback = new VisualFeedback();
    this.registry.register(this.visualFeedback);
    
    this.layoutManager = new LayoutManager();
    this.registry.register(this.layoutManager);
    
    this.keyboardShortcuts = new KeyboardShortcuts();
    this.registry.register(this.keyboardShortcuts);
    
    this.themeManager = new ThemeManager();
    this.registry.register(this.themeManager);
    
    this.accessibilityManager = new AccessibilityManager();
    this.registry.register(this.accessibilityManager);
    
    // Initialize UI
    this.initializeUI();
  }

  /**
   * Initialize UI enhancements
   */
  initializeUI() {
    // Load user preferences
    this.loadUserPreferences();
    
    // Initialize components
    this.instrumentSelector.initialize();
    this.visualFeedback.initialize();
    this.layoutManager.initialize();
    this.keyboardShortcuts.initialize();
    this.themeManager.initialize();
    this.accessibilityManager.initialize();
    
    // Set up responsive design
    this.setupResponsiveDesign();
    
    // Initialize accessibility features
    this.setupAccessibility();
  }

  /**
   * Load user preferences from storage
   */
  loadUserPreferences() {
    try {
      const preferences = localStorage.getItem('music2-preferences');
      if (preferences) {
        this.preferences = JSON.parse(preferences);
      } else {
        this.preferences = this.getDefaultPreferences();
      }
    } catch (error) {
      console.warn('Could not load preferences, using defaults:', error);
      this.preferences = this.getDefaultPreferences();
    }
  }

  /**
   * Get default preferences
   * @returns {Object}
   */
  getDefaultPreferences() {
    return {
      theme: 'dark',
      layout: 'standard',
      keyboardShortcuts: true,
      visualFeedback: {
        effects: true,
        animations: true,
        particles: false
      },
      accessibility: {
        screenReader: false,
        highContrast: false,
        reducedMotion: false,
        largeText: false
      },
      performance: {
        reducedAnimations: false,
        simpleEffects: false
      }
    };
  }

  /**
   * Save user preferences
   */
  saveUserPreferences() {
    try {
      localStorage.setItem('music2-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Could not save preferences:', error);
    }
  }

  /**
   * Set up responsive design
   */
  setupResponsiveDesign() {
    // Media query listeners
    const mediaQueries = {
      mobile: window.matchMedia('(max-width: 768px)'),
      tablet: window.matchMedia('(max-width: 1024px)'),
      desktop: window.matchMedia('(min-width: 1025px)')
    };
    
    Object.entries(mediaQueries).forEach(([size, query]) => {
      query.addListener(() => this.handleViewportChange(size, query.matches));
      
      // Initial call
      if (query.matches) {
        this.handleViewportChange(size, true);
      }
    });
  }

  /**
   * Handle viewport changes
   * @param {string} size 
   * @param {boolean} matches 
   */
  handleViewportChange(size, matches) {
    if (matches) {
      this.currentViewport = size;
      this.layoutManager.adaptToViewport(size);
      this.instrumentSelector.adaptToViewport(size);
      
      // Adjust performance settings for mobile
      if (size === 'mobile') {
        this.optimizeForMobile();
      }
    }
  }

  /**
   * Optimize interface for mobile devices
   */
  optimizeForMobile() {
    // Reduce visual effects
    this.visualFeedback.setPerformanceMode('mobile');
    
    // Simplify layout
    this.layoutManager.setMobileLayout();
    
    // Adjust touch targets
    this.adjustTouchTargets();
  }

  /**
   * Adjust touch targets for mobile
   */
  adjustTouchTargets() {
    const buttons = document.querySelectorAll('button, .clickable');
    buttons.forEach(button => {
      if (this.currentViewport === 'mobile') {
        button.style.minHeight = '44px';
        button.style.minWidth = '44px';
        button.style.padding = '12px';
      }
    });
  }

  /**
   * Set up accessibility features
   */
  setupAccessibility() {
    // Keyboard navigation
    this.setupKeyboardNavigation();
    
    // Screen reader support
    this.setupScreenReaderSupport();
    
    // Focus management
    this.setupFocusManagement();
    
    // Color contrast
    this.setupColorContrast();
  }

  /**
   * Set up keyboard navigation
   */
  setupKeyboardNavigation() {
    // Tab order
    this.setupTabOrder();
    
    // Arrow key navigation
    this.setupArrowKeyNavigation();
    
    // Escape key handling
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
  }

  /**
   * Set up tab order
   */
  setupTabOrder() {
    const focusableElements = document.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element, index) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }

  /**
   * Set up arrow key navigation
   */
  setupArrowKeyNavigation() {
    document.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowKeyNavigation(event);
      }
    });
  }

  /**
   * Handle arrow key navigation
   * @param {KeyboardEvent} event 
   */
  handleArrowKeyNavigation(event) {
    const currentElement = document.activeElement;
    const navigationGroup = currentElement.closest('[data-navigation-group]');
    
    if (navigationGroup) {
      const elements = Array.from(
        navigationGroup.querySelectorAll('[tabindex]:not([tabindex="-1"])')
      );
      
      const currentIndex = elements.indexOf(currentElement);
      let nextIndex;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          nextIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
          break;
      }
      
      if (nextIndex !== undefined && elements[nextIndex]) {
        elements[nextIndex].focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Handle escape key
   */
  handleEscapeKey() {
    // Close modals
    const modals = document.querySelectorAll('.modal.active, .dropdown.open');
    modals.forEach(modal => {
      modal.classList.remove('active', 'open');
    });
    
    // Return focus to trigger
    const lastFocusedElement = this.lastFocusedElement;
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  /**
   * Set up screen reader support
   */
  setupScreenReaderSupport() {
    // Add ARIA labels
    this.addAriaLabels();
    
    // Add live regions
    this.setupLiveRegions();
    
    // Add landmarks
    this.addLandmarks();
  }

  /**
   * Add ARIA labels
   */
  addAriaLabels() {
    // Instrument controls
    const instrumentControls = document.querySelectorAll('.instrument-control');
    instrumentControls.forEach((control, index) => {
      if (!control.hasAttribute('aria-label')) {
        control.setAttribute('aria-label', `Instrument control ${index + 1}`);
      }
    });
    
    // Effect controls
    const effectControls = document.querySelectorAll('.effect-control');
    effectControls.forEach((control, index) => {
      if (!control.hasAttribute('aria-label')) {
        const effectName = control.dataset.effect || 'effect';
        control.setAttribute('aria-label', `${effectName} control`);
      }
    });
  }

  /**
   * Set up live regions
   */
  setupLiveRegions() {
    // Create live region for status updates
    if (!document.getElementById('status-live-region')) {
      const liveRegion = document.createElement('div');
      liveRegion.id = 'status-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
  }

  /**
   * Add landmarks
   */
  addLandmarks() {
    // Main content area
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !mainContent.hasAttribute('role')) {
      mainContent.setAttribute('role', 'main');
    }
    
    // Navigation areas
    const navElements = document.querySelectorAll('nav, .navigation');
    navElements.forEach(nav => {
      if (!nav.hasAttribute('role')) {
        nav.setAttribute('role', 'navigation');
      }
    });
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Track focus changes
    document.addEventListener('focusin', (event) => {
      this.lastFocusedElement = event.target;
    });
    
    // Focus trapping for modals
    this.setupFocusTrapping();
  }

  /**
   * Set up focus trapping
   */
  setupFocusTrapping() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          this.trapFocus(event, modal);
        }
      }
    });
  }

  /**
   * Trap focus within element
   * @param {KeyboardEvent} event 
   * @param {Element} element 
   */
  trapFocus(event, element) {
    const focusableElements = element.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  /**
   * Set up color contrast
   */
  setupColorContrast() {
    if (this.preferences.accessibility.highContrast) {
      this.enableHighContrast();
    }
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast() {
    document.body.classList.add('high-contrast');
  }

  /**
   * Disable high contrast mode
   */
  disableHighContrast() {
    document.body.classList.remove('high-contrast');
  }

  /**
   * Announce status to screen readers
   * @param {string} message 
   */
  announceStatus(message) {
    const liveRegion = document.getElementById('status-live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Update preferences
   * @param {Object} newPreferences 
   */
  updatePreferences(newPreferences) {
    Object.assign(this.preferences, newPreferences);
    this.saveUserPreferences();
    
    // Apply changes immediately
    this.applyPreferences();
  }

  /**
   * Apply preferences
   */
  applyPreferences() {
    // Theme
    this.themeManager.setTheme(this.preferences.theme);
    
    // Layout
    this.layoutManager.setLayout(this.preferences.layout);
    
    // Visual feedback
    this.visualFeedback.updateSettings(this.preferences.visualFeedback);
    
    // Accessibility
    this.accessibilityManager.updateSettings(this.preferences.accessibility);
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return {
      preferences: this.preferences,
      viewport: this.currentViewport,
      theme: this.themeManager.getCurrentTheme(),
      layout: this.layoutManager.getCurrentLayout()
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
 * Instrument selector with enhanced UI
 */
class InstrumentSelector {
  constructor() {
    this.registry = new DisposalRegistry('instrument-selector');
    
    this.categories = {
      strings: ['violin', 'viola', 'cello', 'double-bass', 'harp'],
      woodwinds: ['flute', 'piccolo', 'oboe', 'english-horn', 'clarinet', 'bassoon'],
      brass: ['french-horn', 'trumpet', 'trombone', 'tuba'],
      percussion: ['timpani', 'snare-drum', 'bass-drum', 'cymbals', 'xylophone'],
      keyboards: ['piano', 'organ', 'harpsichord', 'celesta']
    };
    
    this.selectedInstruments = [];
    this.searchTerm = '';
    this.currentCategory = 'all';
  }

  /**
   * Initialize instrument selector
   */
  initialize() {
    this.createSelectorUI();
    this.setupEventHandlers();
    this.loadFavorites();
  }

  /**
   * Create selector UI
   */
  createSelectorUI() {
    const container = document.createElement('div');
    container.className = 'instrument-selector';
    container.innerHTML = `
      <div class="selector-header">
        <h3>Instruments</h3>
        <input type="search" placeholder="Search instruments..." class="instrument-search">
      </div>
      
      <div class="selector-categories">
        <button class="category-btn active" data-category="all">All</button>
        <button class="category-btn" data-category="strings">Strings</button>
        <button class="category-btn" data-category="woodwinds">Woodwinds</button>
        <button class="category-btn" data-category="brass">Brass</button>
        <button class="category-btn" data-category="percussion">Percussion</button>
        <button class="category-btn" data-category="keyboards">Keyboards</button>
      </div>
      
      <div class="selector-content">
        <div class="favorites-section">
          <h4>Favorites</h4>
          <div class="favorites-list"></div>
        </div>
        
        <div class="instruments-grid"></div>
      </div>
    `;
    
    // Insert into DOM
    const targetContainer = document.querySelector('.instrument-panel') || document.body;
    targetContainer.appendChild(container);
    
    this.container = container;
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Search input
    const searchInput = this.container.querySelector('.instrument-search');
    searchInput.addEventListener('input', (event) => {
      this.searchTerm = event.target.value.toLowerCase();
      this.updateInstrumentList();
    });
    
    // Category buttons
    const categoryButtons = this.container.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.selectCategory(button.dataset.category);
        
        // Update active state
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
  }

  /**
   * Select category
   * @param {string} category 
   */
  selectCategory(category) {
    this.currentCategory = category;
    this.updateInstrumentList();
  }

  /**
   * Update instrument list
   */
  updateInstrumentList() {
    const grid = this.container.querySelector('.instruments-grid');
    grid.innerHTML = '';
    
    const instruments = this.getFilteredInstruments();
    
    instruments.forEach(instrument => {
      const item = this.createInstrumentItem(instrument);
      grid.appendChild(item);
    });
  }

  /**
   * Get filtered instruments
   * @returns {Array}
   */
  getFilteredInstruments() {
    let instruments = [];
    
    if (this.currentCategory === 'all') {
      instruments = Object.values(this.categories).flat();
    } else {
      instruments = this.categories[this.currentCategory] || [];
    }
    
    // Apply search filter
    if (this.searchTerm) {
      instruments = instruments.filter(instrument => 
        instrument.toLowerCase().includes(this.searchTerm)
      );
    }
    
    return instruments;
  }

  /**
   * Create instrument item
   * @param {string} instrument 
   * @returns {Element}
   */
  createInstrumentItem(instrument) {
    const item = document.createElement('div');
    item.className = 'instrument-item';
    item.dataset.instrument = instrument;
    
    const isSelected = this.selectedInstruments.includes(instrument);
    const isFavorite = this.isFavorite(instrument);
    
    item.innerHTML = `
      <div class="instrument-icon">
        <img src="/images/instruments/${instrument}.svg" alt="${instrument}" loading="lazy">
      </div>
      <div class="instrument-name">${this.formatInstrumentName(instrument)}</div>
      <div class="instrument-actions">
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" aria-label="Toggle favorite">
          ♥
        </button>
        <button class="select-btn ${isSelected ? 'selected' : ''}" aria-label="Select instrument">
          ${isSelected ? '✓' : '+'}
        </button>
      </div>
    `;
    
    // Event handlers
    const favoriteBtn = item.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleFavorite(instrument);
    });
    
    const selectBtn = item.querySelector('.select-btn');
    selectBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleSelection(instrument);
    });
    
    // Double-click to add
    item.addEventListener('dblclick', () => {
      this.addInstrument(instrument);
    });
    
    return item;
  }

  /**
   * Format instrument name
   * @param {string} instrument 
   * @returns {string}
   */
  formatInstrumentName(instrument) {
    return instrument
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Toggle favorite
   * @param {string} instrument 
   */
  toggleFavorite(instrument) {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(instrument);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(instrument);
    }
    
    this.saveFavorites(favorites);
    this.updateFavoritesList();
    this.updateInstrumentList();
  }

  /**
   * Toggle selection
   * @param {string} instrument 
   */
  toggleSelection(instrument) {
    const index = this.selectedInstruments.indexOf(instrument);
    
    if (index > -1) {
      this.selectedInstruments.splice(index, 1);
    } else {
      this.selectedInstruments.push(instrument);
    }
    
    this.updateInstrumentList();
    
    // Notify listeners
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedInstruments);
    }
  }

  /**
   * Add instrument to composition
   * @param {string} instrument 
   */
  addInstrument(instrument) {
    if (this.onInstrumentAdd) {
      this.onInstrumentAdd(instrument);
    }
  }

  /**
   * Check if instrument is favorite
   * @param {string} instrument 
   * @returns {boolean}
   */
  isFavorite(instrument) {
    return this.getFavorites().includes(instrument);
  }

  /**
   * Get favorites from storage
   * @returns {Array}
   */
  getFavorites() {
    try {
      const favorites = localStorage.getItem('music2-favorite-instruments');
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save favorites to storage
   * @param {Array} favorites 
   */
  saveFavorites(favorites) {
    try {
      localStorage.setItem('music2-favorite-instruments', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Could not save favorites:', error);
    }
  }

  /**
   * Load favorites
   */
  loadFavorites() {
    this.updateFavoritesList();
  }

  /**
   * Update favorites list
   */
  updateFavoritesList() {
    const favoritesList = this.container.querySelector('.favorites-list');
    const favorites = this.getFavorites();
    
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="no-favorites">No favorites yet</p>';
      return;
    }
    
    favorites.forEach(instrument => {
      const item = document.createElement('div');
      item.className = 'favorite-item';
      item.textContent = this.formatInstrumentName(instrument);
      
      item.addEventListener('click', () => {
        this.addInstrument(instrument);
      });
      
      favoritesList.appendChild(item);
    });
  }

  /**
   * Adapt to viewport
   * @param {string} viewport 
   */
  adaptToViewport(viewport) {
    if (viewport === 'mobile') {
      this.container.classList.add('mobile-layout');
    } else {
      this.container.classList.remove('mobile-layout');
    }
  }

  dispose() {
    if (this.container) {
      this.container.remove();
    }
    this.registry.dispose();
  }
}

/**
 * Visual feedback system
 */
class VisualFeedback {
  constructor() {
    this.registry = new DisposalRegistry('visual-feedback');
    
    this.settings = {
      effects: true,
      animations: true,
      particles: false
    };
    
    this.performanceMode = 'normal';
  }

  /**
   * Initialize visual feedback
   */
  initialize() {
    this.createFeedbackContainer();
    this.setupEffectProcessing();
  }

  /**
   * Create feedback container
   */
  createFeedbackContainer() {
    const container = document.createElement('div');
    container.className = 'visual-feedback-container';
    container.innerHTML = `
      <canvas class="effects-canvas"></canvas>
      <div class="particles-container"></div>
      <div class="status-indicators"></div>
    `;
    
    document.body.appendChild(container);
    this.container = container;
    
    // Initialize canvas
    this.canvas = container.querySelector('.effects-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    // Resize handler
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas
   */
  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  /**
   * Set up effect processing visualization
   */
  setupEffectProcessing() {
    // Create visualizers for different effects
    this.visualizers = {
      reverb: new ReverbVisualizer(this.ctx),
      compressor: new CompressorVisualizer(this.ctx),
      eq: new EQVisualizer(this.ctx),
      delay: new DelayVisualizer(this.ctx)
    };
    
    // Register visualizers
    Object.values(this.visualizers).forEach(visualizer => {
      this.registry.register(visualizer);
    });
  }

  /**
   * Show effect processing
   * @param {string} effectType 
   * @param {Object} parameters 
   */
  showEffectProcessing(effectType, parameters) {
    if (!this.settings.effects) return;
    
    const visualizer = this.visualizers[effectType];
    if (visualizer) {
      visualizer.visualize(parameters);
    }
  }

  /**
   * Show status indicator
   * @param {string} type 
   * @param {string} message 
   * @param {number} duration 
   */
  showStatusIndicator(type, message, duration = 3000) {
    const indicator = document.createElement('div');
    indicator.className = `status-indicator ${type}`;
    indicator.textContent = message;
    
    const container = this.container.querySelector('.status-indicators');
    container.appendChild(indicator);
    
    // Animate in
    requestAnimationFrame(() => {
      indicator.classList.add('active');
    });
    
    // Remove after duration
    setTimeout(() => {
      indicator.classList.remove('active');
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, duration);
  }

  /**
   * Create particle effect
   * @param {Object} options 
   */
  createParticleEffect(options = {}) {
    if (!this.settings.particles || this.performanceMode === 'mobile') return;
    
    const {
      x = 0,
      y = 0,
      count = 10,
      color = '#ffffff',
      size = 2,
      velocity = 1
    } = options;
    
    const container = this.container.querySelector('.particles-container');
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
      `;
      
      container.appendChild(particle);
      
      // Animate particle
      this.animateParticle(particle, velocity);
    }
  }

  /**
   * Animate particle
   * @param {Element} particle 
   * @param {number} velocity 
   */
  animateParticle(particle, velocity) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 100 + 50;
    
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance;
    
    particle.animate([
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: 1
      },
      {
        transform: `translate(${targetX}px, ${targetY}px) scale(0)`,
        opacity: 0
      }
    ], {
      duration: 1000 / velocity,
      easing: 'ease-out'
    }).finished.then(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    });
  }

  /**
   * Update settings
   * @param {Object} newSettings 
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    
    // Apply settings
    this.container.classList.toggle('effects-disabled', !this.settings.effects);
    this.container.classList.toggle('animations-disabled', !this.settings.animations);
    this.container.classList.toggle('particles-disabled', !this.settings.particles);
  }

  /**
   * Set performance mode
   * @param {string} mode 
   */
  setPerformanceMode(mode) {
    this.performanceMode = mode;
    
    if (mode === 'mobile') {
      // Disable expensive effects on mobile
      this.updateSettings({
        effects: false,
        animations: false,
        particles: false
      });
    }
  }

  dispose() {
    if (this.container) {
      this.container.remove();
    }
    this.registry.dispose();
  }
}

/**
 * Layout manager for customizable layouts
 */
class LayoutManager {
  constructor() {
    this.registry = new DisposalRegistry('layout-manager');
    
    this.layouts = {
      standard: 'Standard Layout',
      compact: 'Compact Layout',
      minimal: 'Minimal Layout',
      orchestral: 'Orchestral Layout'
    };
    
    this.currentLayout = 'standard';
  }

  /**
   * Initialize layout manager
   */
  initialize() {
    this.loadLayout();
    this.createLayoutSwitcher();
  }

  /**
   * Load saved layout
   */
  loadLayout() {
    try {
      const saved = localStorage.getItem('music2-layout');
      if (saved && this.layouts[saved]) {
        this.currentLayout = saved;
      }
    } catch {
      // Use default
    }
    
    this.applyLayout(this.currentLayout);
  }

  /**
   * Create layout switcher
   */
  createLayoutSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'layout-switcher';
    switcher.innerHTML = `
      <select class="layout-select">
        ${Object.entries(this.layouts).map(([key, name]) => 
          `<option value="${key}" ${key === this.currentLayout ? 'selected' : ''}>${name}</option>`
        ).join('')}
      </select>
    `;
    
    const select = switcher.querySelector('.layout-select');
    select.addEventListener('change', (event) => {
      this.setLayout(event.target.value);
    });
    
    // Insert into UI
    const targetContainer = document.querySelector('.layout-controls') || document.body;
    targetContainer.appendChild(switcher);
  }

  /**
   * Set layout
   * @param {string} layoutName 
   */
  setLayout(layoutName) {
    if (!this.layouts[layoutName]) return;
    
    this.currentLayout = layoutName;
    this.applyLayout(layoutName);
    this.saveLayout();
  }

  /**
   * Apply layout
   * @param {string} layoutName 
   */
  applyLayout(layoutName) {
    // Remove existing layout classes
    Object.keys(this.layouts).forEach(layout => {
      document.body.classList.remove(`layout-${layout}`);
    });
    
    // Add new layout class
    document.body.classList.add(`layout-${layoutName}`);
    
    // Layout-specific adjustments
    switch (layoutName) {
      case 'compact':
        this.applyCompactLayout();
        break;
      case 'minimal':
        this.applyMinimalLayout();
        break;
      case 'orchestral':
        this.applyOrchestralLayout();
        break;
      default:
        this.applyStandardLayout();
    }
  }

  /**
   * Apply standard layout
   */
  applyStandardLayout() {
    // Default layout with all panels visible
  }

  /**
   * Apply compact layout
   */
  applyCompactLayout() {
    // Reduce spacing and padding
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
      panel.style.padding = '8px';
      panel.style.margin = '4px';
    });
  }

  /**
   * Apply minimal layout
   */
  applyMinimalLayout() {
    // Hide non-essential UI elements
    const nonEssential = document.querySelectorAll('.optional, .decorative');
    nonEssential.forEach(element => {
      element.style.display = 'none';
    });
  }

  /**
   * Apply orchestral layout
   */
  applyOrchestralLayout() {
    // Optimize for orchestral composition
    const scoreArea = document.querySelector('.score-area');
    if (scoreArea) {
      scoreArea.style.flex = '2';
    }
  }

  /**
   * Adapt to viewport
   * @param {string} viewport 
   */
  adaptToViewport(viewport) {
    document.body.classList.remove('viewport-mobile', 'viewport-tablet', 'viewport-desktop');
    document.body.classList.add(`viewport-${viewport}`);
  }

  /**
   * Set mobile layout
   */
  setMobileLayout() {
    // Stack panels vertically on mobile
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
      panel.style.width = '100%';
      panel.style.marginBottom = '10px';
    });
  }

  /**
   * Save layout
   */
  saveLayout() {
    try {
      localStorage.setItem('music2-layout', this.currentLayout);
    } catch (error) {
      console.warn('Could not save layout:', error);
    }
  }

  /**
   * Get current layout
   * @returns {string}
   */
  getCurrentLayout() {
    return this.currentLayout;
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Keyboard shortcuts manager
 */
class KeyboardShortcuts {
  constructor() {
    this.registry = new DisposalRegistry('keyboard-shortcuts');
    
    this.shortcuts = {
      // Playback
      ' ': { action: 'togglePlayback', description: 'Play/Pause' },
      'Escape': { action: 'stop', description: 'Stop' },
      'ArrowLeft': { action: 'rewind', description: 'Rewind' },
      'ArrowRight': { action: 'fastForward', description: 'Fast Forward' },
      
      // File operations
      'ctrl+n': { action: 'newProject', description: 'New Project' },
      'ctrl+o': { action: 'openProject', description: 'Open Project' },
      'ctrl+s': { action: 'saveProject', description: 'Save Project' },
      'ctrl+shift+s': { action: 'saveAs', description: 'Save As' },
      
      // Edit operations
      'ctrl+z': { action: 'undo', description: 'Undo' },
      'ctrl+y': { action: 'redo', description: 'Redo' },
      'ctrl+c': { action: 'copy', description: 'Copy' },
      'ctrl+v': { action: 'paste', description: 'Paste' },
      'Delete': { action: 'delete', description: 'Delete' },
      
      // Tools
      'Tab': { action: 'switchTool', description: 'Switch Tool' },
      '1': { action: 'selectTool1', description: 'Select Tool 1' },
      '2': { action: 'selectTool2', description: 'Select Tool 2' },
      '3': { action: 'selectTool3', description: 'Select Tool 3' },
      
      // View
      'ctrl+1': { action: 'zoomIn', description: 'Zoom In' },
      'ctrl+2': { action: 'zoomOut', description: 'Zoom Out' },
      'ctrl+0': { action: 'resetZoom', description: 'Reset Zoom' },
      
      // Help
      'F1': { action: 'showHelp', description: 'Show Help' },
      'ctrl+/': { action: 'showShortcuts', description: 'Show Shortcuts' }
    };
    
    this.enabled = true;
  }

  /**
   * Initialize keyboard shortcuts
   */
  initialize() {
    this.setupEventListeners();
    this.createShortcutDisplay();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    document.addEventListener('keydown', (event) => {
      if (!this.enabled) return;
      
      // Don't trigger shortcuts when typing in inputs
      if (this.isTypingContext(event.target)) return;
      
      const key = this.getKeyString(event);
      const shortcut = this.shortcuts[key];
      
      if (shortcut) {
        event.preventDefault();
        this.executeAction(shortcut.action, event);
      }
    });
  }

  /**
   * Check if user is typing
   * @param {Element} target 
   * @returns {boolean}
   */
  isTypingContext(target) {
    const typingElements = ['input', 'textarea', 'select'];
    return typingElements.includes(target.tagName.toLowerCase()) ||
           target.contentEditable === 'true';
  }

  /**
   * Get key string from event
   * @param {KeyboardEvent} event 
   * @returns {string}
   */
  getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    
    parts.push(event.key);
    
    return parts.join('+').toLowerCase();
  }

  /**
   * Execute action
   * @param {string} action 
   * @param {KeyboardEvent} event 
   */
  executeAction(action, event) {
    if (this.onAction) {
      this.onAction(action, event);
    }
    
    // Show feedback
    this.showActionFeedback(action);
  }

  /**
   * Show action feedback
   * @param {string} action 
   */
  showActionFeedback(action) {
    const shortcut = Object.values(this.shortcuts).find(s => s.action === action);
    if (shortcut) {
      // Brief visual feedback
      const feedback = document.createElement('div');
      feedback.className = 'shortcut-feedback';
      feedback.textContent = shortcut.description;
      
      document.body.appendChild(feedback);
      
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 1000);
    }
  }

  /**
   * Create shortcut display
   */
  createShortcutDisplay() {
    const display = document.createElement('div');
    display.className = 'shortcuts-display';
    display.style.display = 'none';
    
    const content = Object.entries(this.shortcuts).map(([key, shortcut]) => 
      `<div class="shortcut-item">
        <span class="shortcut-key">${this.formatKey(key)}</span>
        <span class="shortcut-desc">${shortcut.description}</span>
      </div>`
    ).join('');
    
    display.innerHTML = `
      <div class="shortcuts-modal">
        <div class="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="shortcuts-content">
          ${content}
        </div>
      </div>
    `;
    
    // Event handlers
    const closeBtn = display.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      this.hideShortcuts();
    });
    
    display.addEventListener('click', (event) => {
      if (event.target === display) {
        this.hideShortcuts();
      }
    });
    
    document.body.appendChild(display);
    this.shortcutDisplay = display;
  }

  /**
   * Format key for display
   * @param {string} key 
   * @returns {string}
   */
  formatKey(key) {
    return key
      .split('+')
      .map(part => {
        switch (part) {
          case 'ctrl': return 'Ctrl';
          case 'shift': return 'Shift';
          case 'alt': return 'Alt';
          case ' ': return 'Space';
          default: return part.toUpperCase();
        }
      })
      .join(' + ');
  }

  /**
   * Show shortcuts
   */
  showShortcuts() {
    if (this.shortcutDisplay) {
      this.shortcutDisplay.style.display = 'flex';
    }
  }

  /**
   * Hide shortcuts
   */
  hideShortcuts() {
    if (this.shortcutDisplay) {
      this.shortcutDisplay.style.display = 'none';
    }
  }

  /**
   * Enable shortcuts
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable shortcuts
   */
  disable() {
    this.enabled = false;
  }

  dispose() {
    if (this.shortcutDisplay) {
      this.shortcutDisplay.remove();
    }
    this.registry.dispose();
  }
}

/**
 * Theme manager
 */
class ThemeManager {
  constructor() {
    this.registry = new DisposalRegistry('theme-manager');
    
    this.themes = {
      light: 'Light Theme',
      dark: 'Dark Theme',
      blue: 'Blue Theme',
      green: 'Green Theme'
    };
    
    this.currentTheme = 'dark';
  }

  /**
   * Initialize theme manager
   */
  initialize() {
    this.loadTheme();
    this.detectSystemPreference();
  }

  /**
   * Load saved theme
   */
  loadTheme() {
    try {
      const saved = localStorage.getItem('music2-theme');
      if (saved && this.themes[saved]) {
        this.currentTheme = saved;
      }
    } catch {
      // Use default
    }
    
    this.applyTheme(this.currentTheme);
  }

  /**
   * Detect system preference
   */
  detectSystemPreference() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Use system preference if no saved theme
      if (!localStorage.getItem('music2-theme')) {
        this.currentTheme = darkModeQuery.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
      
      // Listen for changes
      darkModeQuery.addListener((event) => {
        if (!localStorage.getItem('music2-theme')) {
          this.setTheme(event.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Set theme
   * @param {string} themeName 
   */
  setTheme(themeName) {
    if (!this.themes[themeName]) return;
    
    this.currentTheme = themeName;
    this.applyTheme(themeName);
    this.saveTheme();
  }

  /**
   * Apply theme
   * @param {string} themeName 
   */
  applyTheme(themeName) {
    // Remove existing theme classes
    Object.keys(this.themes).forEach(theme => {
      document.body.classList.remove(`theme-${theme}`);
    });
    
    // Add new theme class
    document.body.classList.add(`theme-${themeName}`);
  }

  /**
   * Save theme
   */
  saveTheme() {
    try {
      localStorage.setItem('music2-theme', this.currentTheme);
    } catch (error) {
      console.warn('Could not save theme:', error);
    }
  }

  /**
   * Get current theme
   * @returns {string}
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  dispose() {
    this.registry.dispose();
  }
}

/**
 * Accessibility manager
 */
class AccessibilityManager {
  constructor() {
    this.registry = new DisposalRegistry('accessibility-manager');
    
    this.settings = {
      screenReader: false,
      highContrast: false,
      reducedMotion: false,
      largeText: false
    };
  }

  /**
   * Initialize accessibility manager
   */
  initialize() {
    this.detectSystemPreferences();
    this.loadSettings();
    this.applySettings();
  }

  /**
   * Detect system accessibility preferences
   */
  detectSystemPreferences() {
    if (window.matchMedia) {
      // Reduced motion
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reducedMotionQuery.matches) {
        this.settings.reducedMotion = true;
      }
      
      // High contrast
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      if (highContrastQuery.matches) {
        this.settings.highContrast = true;
      }
    }
  }

  /**
   * Load accessibility settings
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('music2-accessibility');
      if (saved) {
        Object.assign(this.settings, JSON.parse(saved));
      }
    } catch {
      // Use defaults
    }
  }

  /**
   * Update settings
   * @param {Object} newSettings 
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.applySettings();
    this.saveSettings();
  }

  /**
   * Apply accessibility settings
   */
  applySettings() {
    // High contrast
    document.body.classList.toggle('high-contrast', this.settings.highContrast);
    
    // Reduced motion
    document.body.classList.toggle('reduced-motion', this.settings.reducedMotion);
    
    // Large text
    document.body.classList.toggle('large-text', this.settings.largeText);
    
    // Screen reader
    if (this.settings.screenReader) {
      this.enhanceForScreenReader();
    }
  }

  /**
   * Enhance for screen reader
   */
  enhanceForScreenReader() {
    // Add more descriptive labels
    const buttons = document.querySelectorAll('button:not([aria-label])');
    buttons.forEach((button, index) => {
      if (!button.textContent.trim()) {
        button.setAttribute('aria-label', `Button ${index + 1}`);
      }
    });
    
    // Add role descriptions
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      if (!slider.hasAttribute('aria-label')) {
        const label = slider.parentElement.querySelector('label') ||
                     slider.previousElementSibling;
        if (label) {
          slider.setAttribute('aria-label', label.textContent + ' slider');
        }
      }
    });
  }

  /**
   * Save accessibility settings
   */
  saveSettings() {
    try {
      localStorage.setItem('music2-accessibility', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Could not save accessibility settings:', error);
    }
  }

  dispose() {
    this.registry.dispose();
  }
}

// Visualization classes for effects
class ReverbVisualizer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  visualize(parameters) {
    // Visualize reverb with expanding circles
    const { roomSize, decay } = parameters;
    
    const centerX = this.ctx.canvas.width / 2;
    const centerY = this.ctx.canvas.height / 2;
    
    this.ctx.globalAlpha = 0.3;
    this.ctx.strokeStyle = '#4CAF50';
    this.ctx.lineWidth = 2;
    
    for (let i = 0; i < 5; i++) {
      const radius = (roomSize * 100) + (i * 20);
      const alpha = Math.max(0, 1 - (i * 0.2) - (1 - decay));
      
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  dispose() {
    // Cleanup if needed
  }
}

class CompressorVisualizer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  visualize(parameters) {
    // Visualize compressor with dynamic bars
    const { threshold, ratio, attack, release } = parameters;
    
    this.ctx.fillStyle = '#FF9800';
    
    const barWidth = 20;
    const spacing = 5;
    const startX = 50;
    
    // Draw bars representing compression
    for (let i = 0; i < 10; i++) {
      const height = Math.random() * 100;
      const compressedHeight = height > threshold ? 
        threshold + ((height - threshold) / ratio) : height;
      
      this.ctx.fillRect(
        startX + i * (barWidth + spacing),
        200 - compressedHeight,
        barWidth,
        compressedHeight
      );
    }
  }

  dispose() {
    // Cleanup if needed
  }
}

class EQVisualizer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  visualize(parameters) {
    // Visualize EQ with frequency curve
    const { low, mid, high } = parameters;
    
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, 150);
    
    // Draw EQ curve
    const width = this.ctx.canvas.width;
    for (let x = 0; x < width; x++) {
      const freq = x / width;
      let gain = 0;
      
      if (freq < 0.33) {
        gain = low * 50;
      } else if (freq < 0.66) {
        gain = mid * 50;
      } else {
        gain = high * 50;
      }
      
      this.ctx.lineTo(x, 150 - gain);
    }
    
    this.ctx.stroke();
  }

  dispose() {
    // Cleanup if needed
  }
}

class DelayVisualizer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  visualize(parameters) {
    // Visualize delay with echoing dots
    const { delayTime, feedback } = parameters;
    
    const x = 100;
    const y = 150;
    const maxEchoes = Math.floor(feedback * 10);
    
    for (let i = 0; i <= maxEchoes; i++) {
      const echoX = x + (i * delayTime * 200);
      const alpha = Math.max(0, 1 - (i * 0.1));
      const size = Math.max(2, 10 - i);
      
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#9C27B0';
      
      this.ctx.beginPath();
      this.ctx.arc(echoX, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  dispose() {
    // Cleanup if needed
  }
}

// Factory function
export function createUIUXEnhancementSystem() {
  return new UIUXEnhancementSystem();
}