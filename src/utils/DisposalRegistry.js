/**
 * Disposal Registry for managing object lifecycle and preventing memory leaks
 */
export class DisposalRegistry {
  constructor(name = 'default') {
    this.name = name;
    this.disposables = new Set();
    this.disposeCallbacks = new WeakMap();
    this.disposed = false;
  }

  /**
   * Register a disposable object
   * @param {Object} disposable - Object to track
   * @param {Function|string} disposeMethod - Disposal method or method name
   * @returns {Object} The disposable object for chaining
   */
  register(disposable, disposeMethod = 'dispose') {
    if (this.disposed) {
      throw new Error(`Registry ${this.name} has already been disposed`);
    }

    if (!disposable) {return disposable;}

    this.disposables.add(disposable);

    // Store custom dispose method if provided
    if (typeof disposeMethod === 'function') {
      this.disposeCallbacks.set(disposable, disposeMethod);
    } else if (typeof disposeMethod === 'string' && disposeMethod !== 'dispose') {
      this.disposeCallbacks.set(disposable, () => {
        if (typeof disposable[disposeMethod] === 'function') {
          disposable[disposeMethod]();
        }
      });
    }

    return disposable;
  }

  /**
   * Register multiple disposables at once
   * @param {Array} disposables - Array of disposable objects
   * @returns {Array} The disposables array for chaining
   */
  registerAll(disposables) {
    disposables.forEach(d => this.register(d));
    return disposables;
  }

  /**
   * Register an event listener with automatic cleanup
   * @param {EventTarget} target - Event target
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  registerListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);

    // Create a disposable that removes the listener
    const disposable = {
      dispose: () => target.removeEventListener(event, handler, options)
    };

    this.register(disposable);
    return disposable;
  }

  /**
   * Register a timer with automatic cleanup
   * @param {Function} callback - Timer callback
   * @param {number} delay - Delay in milliseconds
   * @param {boolean} isInterval - Whether it's an interval (true) or timeout (false)
   */
  registerTimer(callback, delay, isInterval = false) {
    const id = isInterval ?
      setInterval(callback, delay) :
      setTimeout(callback, delay);

    const disposable = {
      dispose: () => {
        if (isInterval) {
          clearInterval(id);
        } else {
          clearTimeout(id);
        }
      }
    };

    this.register(disposable);
    return disposable;
  }

  /**
   * Create a child registry
   * Child registries are automatically disposed when parent is disposed
   */
  createChild(name) {
    const child = new DisposalRegistry(`${this.name}.${name}`);
    this.register(child);
    return child;
  }

  /**
   * Dispose a specific object and remove it from tracking
   */
  disposeOne(disposable) {
    if (!this.disposables.has(disposable)) {return;}

    try {
      // Try custom dispose callback first
      const customDispose = this.disposeCallbacks.get(disposable);
      if (customDispose) {
        customDispose();
      } else if (typeof disposable.dispose === 'function') {
        disposable.dispose();
      } else if (typeof disposable.disconnect === 'function') {
        disposable.disconnect();
      } else if (typeof disposable.close === 'function') {
        disposable.close();
      } else if (typeof disposable.stop === 'function') {
        disposable.stop();
      }
    } catch (error) {
      console.error(`Error disposing object in registry ${this.name}:`, error);
    }

    this.disposables.delete(disposable);
    this.disposeCallbacks.delete(disposable);
  }

  /**
   * Dispose all registered objects
   */
  dispose() {
    if (this.disposed) {return;}

    // Convert to array to avoid iterator invalidation
    const disposableArray = Array.from(this.disposables);

    // Dispose in reverse order (LIFO)
    for (let i = disposableArray.length - 1; i >= 0; i--) {
      this.disposeOne(disposableArray[i]);
    }

    this.disposables.clear();
    this.disposed = true;
  }

  /**
   * Get the number of tracked disposables
   */
  get size() {
    return this.disposables.size;
  }

  /**
   * Check if registry has been disposed
   */
  isDisposed() {
    return this.disposed;
  }
}

/**
 * Global registry for app-wide resources
 */
export const globalRegistry = new DisposalRegistry('global');

/**
 * Create a scoped registry that auto-disposes
 * @param {string} name - Registry name
 * @param {Function} callback - Function to execute with the registry
 */
export async function withRegistry(name, callback) {
  const registry = new DisposalRegistry(name);
  try {
    return await callback(registry);
  } finally {
    registry.dispose();
  }
}

// Dispose global registry on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalRegistry.dispose();
  });
}