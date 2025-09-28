import { reactive, computed, watch, nextTick } from 'vue'
import { createLogger } from '../core/logger.js'

/**
 * Base Controller class
 * Provides common functionality for all controllers
 */
export class BaseController {
  constructor(name) {
    this.name = name
    this.logger = createLogger(name)
    this.state = reactive({})
    this.disposed = false
    this.watchers = []
    this.computedRefs = new Map()
    this.init()
  }

  /**
   * Initialize controller - override in subclasses
   */
  init() {
    this.logger.debug(`Initializing ${this.name} controller`)
  }

  /**
   * Create reactive state
   */
  createState(initialState) {
    Object.assign(this.state, initialState)
    return this.state
  }

  /**
   * Create computed property
   */
  createComputed(name, getter) {
    const computedRef = computed(getter.bind(this))
    this.computedRefs.set(name, computedRef)
    return computedRef
  }

  /**
   * Create watcher
   */
  createWatcher(source, callback, options = {}) {
    const unwatch = watch(source, callback.bind(this), options)
    this.watchers.push(unwatch)
    return unwatch
  }

  /**
   * Get computed value by name
   */
  getComputed(name) {
    const ref = this.computedRefs.get(name)
    return ref ? ref.value : undefined
  }

  /**
   * Emit event to UI components
   */
  emit(event, data) {
    if (this.disposed) {
      this.logger.warn(`Cannot emit event '${event}' on disposed controller`)
      return
    }

    this.logger.debug(`Emitting event: ${event}`, data)

    if (this.eventHandlers && this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data))
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = {}
    }

    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = []
    }

    this.eventHandlers[event].push(handler)

    return () => {
      const index = this.eventHandlers[event].indexOf(handler)
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1)
      }
    }
  }

  /**
   * Execute async operation with error handling
   */
  async executeAsync(operation, errorMessage = 'Operation failed') {
    try {
      this.logger.debug(`Executing async operation`)
      const result = await operation()
      return { success: true, data: result }
    } catch (error) {
      this.logger.error(errorMessage, error)
      this.emit('error', { message: errorMessage, error })
      return { success: false, error }
    }
  }

  /**
   * Validate data using model class
   */
  validate(ModelClass, data) {
    try {
      const instance = new ModelClass(data)
      return { valid: true, data: instance }
    } catch (error) {
      this.logger.error(`Validation failed for ${ModelClass.name}:`, error.message)
      return { valid: false, error: error.message }
    }
  }

  /**
   * Wait for next Vue tick
   */
  async nextTick() {
    await nextTick()
  }

  /**
   * Clean up controller
   */
  dispose() {
    this.logger.debug(`Disposing ${this.name} controller`)

    this.watchers.forEach(unwatch => unwatch())
    this.watchers = []

    this.computedRefs.clear()

    this.eventHandlers = null

    this.disposed = true
  }

  /**
   * Check if controller is disposed
   */
  isDisposed() {
    return this.disposed
  }

  /**
   * Generate a UUID v4
   * @returns {string}
   */
  static generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Instance method to generate ID
   * @returns {string}
   */
  generateId() {
    return BaseController.generateId()
  }
}