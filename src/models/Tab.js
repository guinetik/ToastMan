import { BaseModel } from './BaseModel.js'

/**
 * Tab types
 */
export const TAB_TYPES = ['request', 'collection', 'environment', 'settings', 'welcome']

/**
 * Tab state
 */
export const TAB_STATES = ['idle', 'loading', 'sending', 'success', 'error']

/**
 * Tab model for UI state management
 */
export class Tab extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    type: { type: 'string', enum: TAB_TYPES, default: 'request' },
    name: { type: 'string', default: 'New Request' },
    state: { type: 'string', enum: TAB_STATES, default: 'idle' },
    active: { type: 'boolean', default: false },
    pinned: { type: 'boolean', default: false },
    saved: { type: 'boolean', default: false },
    modified: { type: 'boolean', default: false },
    requestId: { type: 'string', default: null },
    collectionId: { type: 'string', default: null },
    environmentId: { type: 'string', default: null },
    method: { type: 'string', default: 'GET' },
    url: { type: 'string', default: '' },
    temporaryData: { type: 'object', default: null },
    response: { type: 'object', default: null },
    history: { type: 'array', default: [] },
    position: { type: 'number', default: 0 },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    lastAccessedAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    // Normalize ID fields to strings
    if (data.id && typeof data.id !== 'string') {
      data.id = String(data.id)
    }
    if (data.requestId && typeof data.requestId !== 'string' && data.requestId !== null) {
      data.requestId = String(data.requestId)
    }
    if (data.collectionId && typeof data.collectionId !== 'string' && data.collectionId !== null) {
      data.collectionId = String(data.collectionId)
    }
    if (data.environmentId && typeof data.environmentId !== 'string' && data.environmentId !== null) {
      data.environmentId = String(data.environmentId)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }
    if (data.updatedAt && typeof data.updatedAt !== 'string') {
      data.updatedAt = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : String(data.updatedAt)
    }
    if (data.lastAccessedAt && typeof data.lastAccessedAt !== 'string') {
      data.lastAccessedAt = data.lastAccessedAt instanceof Date ? data.lastAccessedAt.toISOString() : String(data.lastAccessedAt)
    }

    super(data)
    this.validateTab()
  }

  validateTab() {
    if (this.type === 'request' && !this.requestId && !this.temporaryData) {
      this.temporaryData = {
        method: this.method || 'GET',
        url: this.url || '',
        headers: [],
        body: null,
        auth: null
      }
    }

    if (this.pinned && this.type === 'request' && !this.saved) {
      throw new Error('Cannot pin an unsaved request tab')
    }
  }

  /**
   * Mark tab as active
   */
  activate() {
    this.active = true
    this.lastAccessedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Mark tab as inactive
   */
  deactivate() {
    this.active = false
    return this
  }

  /**
   * Toggle pinned state
   */
  togglePin() {
    if (!this.pinned && !this.saved) {
      throw new Error('Cannot pin an unsaved tab')
    }
    this.pinned = !this.pinned
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Update tab state
   */
  setState(state) {
    if (!TAB_STATES.includes(state)) {
      throw new Error(`Invalid tab state: ${state}`)
    }
    this.state = state
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Mark tab as modified
   */
  markModified() {
    this.modified = true
    this.saved = false
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Mark tab as saved
   */
  markSaved(requestId = null, collectionId = null) {
    this.saved = true
    this.modified = false
    if (requestId) this.requestId = requestId
    if (collectionId) this.collectionId = collectionId
    this.temporaryData = null
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Update temporary data
   */
  updateTemporaryData(data) {
    if (!this.temporaryData) {
      this.temporaryData = {}
    }
    Object.assign(this.temporaryData, data)
    this.markModified()
    return this
  }

  /**
   * Set response data
   */
  setResponse(response) {
    this.response = response
    this.state = response.error ? 'error' : 'success'
    this.addToHistory(response)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Clear response data
   */
  clearResponse() {
    this.response = null
    this.state = 'idle'
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Add response to history
   */
  addToHistory(response) {
    const historyEntry = {
      id: BaseModel.generateId(),
      timestamp: BaseModel.getTimestamp(),
      method: this.method,
      url: this.url,
      status: response.status,
      time: response.time,
      size: response.size
    }

    this.history.unshift(historyEntry)

    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20)
    }

    return this
  }

  /**
   * Get history entry
   */
  getHistoryEntry(id) {
    return this.history.find(h => h.id === id)
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = []
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Update tab name from request details
   */
  updateName(name = null) {
    if (name) {
      this.name = name
    } else if (this.url) {
      try {
        const urlObj = new URL(this.url.startsWith('http') ? this.url : `https://${this.url}`)
        this.name = `${this.method} ${urlObj.hostname}${urlObj.pathname}`
      } catch {
        this.name = `${this.method} ${this.url.substring(0, 30)}...`
      }
    } else {
      this.name = `${this.method} New Request`
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Check if tab can be closed
   */
  canClose() {
    if (this.pinned) return false
    if (this.state === 'sending') return false
    if (this.modified && !this.saved) return 'unsaved'
    return true
  }

  /**
   * Get tab icon based on type and state
   */
  getIcon() {
    if (this.type === 'collection') return '📁'
    if (this.type === 'environment') return '🌍'
    if (this.type === 'settings') return '⚙️'
    if (this.type === 'welcome') return '👋'

    const methodIcons = {
      GET: '🔵',
      POST: '🟢',
      PUT: '🟡',
      PATCH: '🟠',
      DELETE: '🔴',
      HEAD: '⚫',
      OPTIONS: '🟣'
    }

    return methodIcons[this.method] || '⚪'
  }

  /**
   * Export tab state (for session persistence)
   */
  exportState() {
    const state = {
      id: this.id,
      type: this.type,
      name: this.name,
      requestId: this.requestId,
      collectionId: this.collectionId,
      environmentId: this.environmentId,
      method: this.method,
      url: this.url,
      pinned: this.pinned,
      saved: this.saved,
      modified: this.modified,
      position: this.position
    }

    if (!this.saved && this.temporaryData) {
      state.temporaryData = this.temporaryData
    }

    return state
  }

  /**
   * Create tab from exported state
   */
  static fromExportedState(state) {
    return new Tab(state)
  }
}