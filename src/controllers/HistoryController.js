import { BaseController } from './BaseController.js'
import { useTabs } from '../stores/useTabs.js'

/**
 * Controller for History functionality
 */
export class HistoryController extends BaseController {
  constructor() {
    super('history')

    this.createState({
      requestHistory: []
    })

    // Initialize stores after state is created
    this.tabsStore = useTabs()
  }

  init() {
    super.init()
    this.loadHistory()
  }

  /**
   * Add request to history
   */
  addToHistory(request, response) {
    const historyEntry = {
      id: BaseController.generateId(),
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.getUrlString(),
      status: response?.status,
      responseTime: response?.timing?.total,
      request: request.toJSON(),
      response: response?.exportSummary()
    }

    this.state.requestHistory.unshift(historyEntry)

    if (this.state.requestHistory.length > 100) {
      this.state.requestHistory = this.state.requestHistory.slice(0, 100)
    }

    this.saveHistory()
    this.logger.debug('Added to history:', historyEntry)
    this.emit('historyEntryAdded', historyEntry)
  }

  /**
   * Open history request
   */
  openHistoryRequest(entry) {
    const newTab = this.tabsStore.createTab({
      name: `${entry.method} ${entry.url}`,
      method: entry.method,
      url: entry.url,
      temporaryData: entry.request
    })

    this.logger.info('Opened history request in new tab:', newTab.id)
    this.emit('historyRequestOpened', entry)
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.state.requestHistory = []
    this.saveHistory()
    this.logger.info('Cleared request history')
    this.emit('historyCleared')
  }

  /**
   * Remove specific history entry
   */
  removeHistoryEntry(entryId) {
    const index = this.state.requestHistory.findIndex(entry => entry.id === entryId)
    if (index > -1) {
      const removed = this.state.requestHistory.splice(index, 1)[0]
      this.saveHistory()
      this.logger.debug('Removed history entry:', entryId)
      this.emit('historyEntryRemoved', removed)
    }
  }

  /**
   * Filter history by method
   */
  filterByMethod(method) {
    if (!method) return this.state.requestHistory
    return this.state.requestHistory.filter(entry => entry.method === method)
  }

  /**
   * Filter history by status code range
   */
  filterByStatus(statusRange) {
    if (!statusRange) return this.state.requestHistory

    return this.state.requestHistory.filter(entry => {
      if (!entry.status) return false

      switch (statusRange) {
        case 'success':
          return entry.status >= 200 && entry.status < 300
        case 'redirect':
          return entry.status >= 300 && entry.status < 400
        case 'error':
          return entry.status >= 400
        default:
          return true
      }
    })
  }

  /**
   * Search history by URL or name
   */
  searchHistory(query) {
    if (!query) return this.state.requestHistory

    const lowerQuery = query.toLowerCase()
    return this.state.requestHistory.filter(entry =>
      entry.url.toLowerCase().includes(lowerQuery) ||
      entry.method.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get history statistics
   */
  getHistoryStats() {
    const total = this.state.requestHistory.length
    const methods = {}
    const statuses = { success: 0, redirect: 0, error: 0 }
    let totalResponseTime = 0
    let responseTimeCount = 0

    this.state.requestHistory.forEach(entry => {
      // Count methods
      methods[entry.method] = (methods[entry.method] || 0) + 1

      // Count status types
      if (entry.status) {
        if (entry.status >= 200 && entry.status < 300) statuses.success++
        else if (entry.status >= 300 && entry.status < 400) statuses.redirect++
        else if (entry.status >= 400) statuses.error++
      }

      // Calculate average response time
      if (entry.responseTime) {
        totalResponseTime += entry.responseTime
        responseTimeCount++
      }
    })

    return {
      total,
      methods,
      statuses,
      averageResponseTime: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0
    }
  }

  /**
   * Export history to file
   */
  exportHistory() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: 'ToastMan',
      version: '1.0.0',
      history: this.state.requestHistory
    }

    this.logger.info('Exported history:', this.state.requestHistory.length, 'entries')
    this.emit('historyExported', exportData)
    return exportData
  }

  /**
   * Import history from file
   */
  importHistory(importData) {
    try {
      if (!importData.history || !Array.isArray(importData.history)) {
        throw new Error('Invalid history format')
      }

      // Merge with existing history, avoiding duplicates
      const existingIds = new Set(this.state.requestHistory.map(entry => entry.id))
      const newEntries = importData.history.filter(entry => !existingIds.has(entry.id))

      this.state.requestHistory = [...newEntries, ...this.state.requestHistory]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100) // Keep only the most recent 100 entries

      this.saveHistory()
      this.logger.info('Imported history:', newEntries.length, 'new entries')
      this.emit('historyImported', { imported: newEntries.length, total: this.state.requestHistory.length })

      return { success: true, imported: newEntries.length }
    } catch (error) {
      this.logger.error('Failed to import history:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Save history to localStorage
   */
  saveHistory() {
    try {
      localStorage.setItem('toastman_history', JSON.stringify(this.state.requestHistory))
    } catch (error) {
      this.logger.error('Failed to save history:', error)
    }
  }

  /**
   * Load history from localStorage
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('toastman_history')
      if (saved) {
        this.state.requestHistory = JSON.parse(saved)
        this.logger.debug('Loaded history:', this.state.requestHistory.length, 'entries')
      }
    } catch (error) {
      this.logger.error('Failed to load history:', error)
      this.state.requestHistory = []
    }
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) {
      return 'Just now'
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  /**
   * Get status class for styling
   */
  getStatusClass(status) {
    if (!status) return ''
    if (status >= 200 && status < 300) return 'success'
    if (status >= 300 && status < 400) return 'warning'
    if (status >= 400) return 'error'
    return ''
  }

  /**
   * Get method color for styling
   */
  getMethodColor(method) {
    const colors = {
      'GET': 'var(--color-get)',
      'POST': 'var(--color-post)',
      'PUT': 'var(--color-put)',
      'PATCH': 'var(--color-patch)',
      'DELETE': 'var(--color-delete)',
      'HEAD': 'var(--color-head)',
      'OPTIONS': 'var(--color-options)'
    }
    return colors[method] || 'var(--color-text-secondary)'
  }

  /**
   * Clean up on unmount
   */
  onUnmounted() {
    this.saveHistory()
    this.dispose()
  }
}