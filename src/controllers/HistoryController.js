import { computed } from 'vue'
import { BaseController } from './BaseController.js'
import { useTabs } from '../stores/useTabs.js'
import { useConversations } from '../stores/useConversations.js'

/**
 * Controller for Session History functionality
 *
 * Displays conversation sessions from the conversations store.
 * Sessions are persisted automatically via useStorage.
 */
export class HistoryController extends BaseController {
  constructor() {
    super('history')

    // Initialize stores
    this.tabsStore = useTabs()
    this.conversationsStore = useConversations()

    this.createState({
      // Sessions are derived from conversations store
      // We keep a local reference for filtering/searching
      filterMethod: null,
      searchQuery: ''
    })
  }

  init() {
    super.init()
    this.logger.debug('History controller initialized')
  }

  /**
   * Get all sessions sorted by most recent
   * Filters out empty sessions (no messages)
   */
  getSessions() {
    return this.conversationsStore.getSortedConversations()
      .filter(conv => conv.messages && conv.messages.length > 0)
  }

  /**
   * Get session summary for display
   * Extracts method, url, message count from conversation
   */
  getSessionSummary(conversation) {
    const messages = conversation.messages || []
    const requestMessages = messages.filter(m => m.type === 'request')
    const lastRequest = requestMessages[requestMessages.length - 1]

    let method = 'GET'
    let url = conversation.name || 'Request'

    if (lastRequest?.data?.request) {
      method = lastRequest.data.request.method || 'GET'
      url = lastRequest.data.request.url?.raw || conversation.name || 'Request'
    }

    return {
      id: conversation.id,
      name: conversation.name,
      method,
      url,
      messageCount: messages.length,
      requestCount: requestMessages.length,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt
    }
  }

  /**
   * Open a session in a new tab (or focus existing tab)
   */
  openSession(sessionId) {
    const conversation = this.conversationsStore.conversations.value
      .find(c => c.id === sessionId)

    if (!conversation) {
      this.logger.warn('Session not found:', sessionId)
      return
    }

    // Check if a tab with this conversationId already exists
    const existingTab = this.tabsStore.tabs.value.find(
      tab => tab.conversationId === sessionId
    )

    if (existingTab) {
      // Just activate the existing tab
      this.tabsStore.setActiveTab(existingTab.id)
      this.conversationsStore.setActiveConversation(sessionId)
      this.logger.info('Focused existing tab for session:', sessionId)
      this.emit('sessionOpened', { sessionId, tabId: existingTab.id })
      return
    }

    const summary = this.getSessionSummary(conversation)

    // Create a new tab for this session
    const newTab = this.tabsStore.createTab({
      name: summary.name || `${summary.method} Request`,
      method: summary.method,
      conversationId: sessionId
    })

    // Set this conversation as active
    this.conversationsStore.setActiveConversation(sessionId)

    this.logger.info('Opened session in new tab:', sessionId)
    this.emit('sessionOpened', { sessionId, tabId: newTab.id })
  }

  /**
   * Clear all session history
   */
  clearHistory() {
    const conversations = this.conversationsStore.conversations.value
    // Remove all conversations
    conversations.splice(0, conversations.length)

    this.logger.info('Cleared all sessions')
    this.emit('historyCleared')
  }

  /**
   * Remove a specific session
   */
  removeSession(sessionId) {
    this.conversationsStore.deleteConversation(sessionId)
    this.logger.debug('Removed session:', sessionId)
    this.emit('sessionRemoved', sessionId)
  }

  /**
   * Filter sessions by method
   */
  filterByMethod(method) {
    const sessions = this.getSessions()
    if (!method) return sessions

    return sessions.filter(conv => {
      const summary = this.getSessionSummary(conv)
      return summary.method === method
    })
  }

  /**
   * Search sessions by name or URL
   */
  searchSessions(query) {
    const sessions = this.getSessions()
    if (!query) return sessions

    const lowerQuery = query.toLowerCase()
    return sessions.filter(conv => {
      const summary = this.getSessionSummary(conv)
      return (
        summary.name?.toLowerCase().includes(lowerQuery) ||
        summary.url?.toLowerCase().includes(lowerQuery) ||
        summary.method?.toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * Get history statistics
   */
  getHistoryStats() {
    const sessions = this.getSessions()
    const methods = {}
    let totalMessages = 0

    sessions.forEach(conv => {
      const summary = this.getSessionSummary(conv)
      methods[summary.method] = (methods[summary.method] || 0) + 1
      totalMessages += summary.messageCount
    })

    return {
      totalSessions: sessions.length,
      totalMessages,
      methods
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
    } else if (diff < 172800000) {
      return 'Yesterday'
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}d ago`
    } else {
      return date.toLocaleDateString()
    }
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
    this.dispose()
  }
}
