import { BaseController } from './BaseController.js'
import { ChatController } from './ChatController.js'
import { useConversations } from '../stores/useConversations.js'
import { useCollections } from '../stores/useCollections.js'
import { useTabs } from '../stores/useTabs.js'

/**
 * ChatViewController
 *
 * View controller for ChatView component.
 * Handles view-specific business logic including:
 * - Save to collection operations
 * - Dialog state management
 * - Tab and conversation linkage
 * - View mode coordination
 *
 * Follows MVC pattern by keeping business logic out of Vue components.
 * Wraps ChatController for request/response logic.
 */
export class ChatViewController extends BaseController {
  constructor() {
    super('ChatViewController')

    // Create the underlying chat controller
    this.chatController = new ChatController()

    // Store instances
    this.conversationsStore = useConversations()
    this.collectionsStore = useCollections()
    this.tabsStore = useTabs()

    this.init()
  }

  /**
   * Initialize controller state
   */
  init() {
    super.init()

    // Create reactive state for view-specific functionality
    this.createState({
      // Dialog state
      showSaveDialog: false,
      pendingRequestName: '',

      // View mode (split, conversation, composer)
      viewMode: 'split',

      // Composer mode (curl, visual, script, ai)
      composerMode: 'curl',

      // Maximized response state
      maximizedResponse: null
    })

    // Proxy chat controller events
    this.chatController.on('error', (data) => {
      this.emit('error', data)
    })
  }

  /**
   * Get the underlying chat controller
   * @returns {ChatController}
   */
  getChatController() {
    return this.chatController
  }

  /**
   * Initialize view mode from active tab
   * Should be called by component on mount
   */
  initializeViewMode() {
    const activeTab = this.tabsStore.activeTab?.value || this.tabsStore.activeTab
    if (activeTab?.viewMode) {
      this.state.viewMode = activeTab.viewMode
      this.logger.debug('Initialized view mode from tab', { viewMode: activeTab.viewMode })
    } else if (activeTab) {
      // Tab doesn't have viewMode set yet, initialize it with default
      this.state.viewMode = 'split'
      this.tabsStore.updateTab(activeTab.id, { viewMode: 'split' })
      this.logger.debug('Initialized tab with default view mode')
    }
  }

  /**
   * Set view mode and persist to tab
   * @param {string} mode - View mode (split, conversation, composer)
   */
  setViewMode(mode) {
    if (!['split', 'conversation', 'composer'].includes(mode)) {
      this.logger.warn('Invalid view mode', { mode })
      return
    }

    const oldMode = this.state.viewMode
    this.state.viewMode = mode

    // Persist to active tab
    const activeTab = this.tabsStore.activeTab?.value || this.tabsStore.activeTab
    if (activeTab) {
      this.tabsStore.updateTab(activeTab.id, { viewMode: mode })
    }

    this.logger.debug('View mode changed', { from: oldMode, to: mode })
    this.emit('viewModeChanged', { oldMode, newMode: mode })
  }

  /**
   * Toggle view mode through the cycle: split -> conversation -> composer -> split
   */
  toggleViewMode() {
    const currentMode = this.state.viewMode

    if (currentMode === 'split') {
      this.setViewMode('conversation')
    } else if (currentMode === 'conversation') {
      this.setViewMode('composer')
    } else {
      this.setViewMode('split')
    }
  }

  /**
   * Set composer mode
   * @param {string} mode - Composer mode (curl, visual, script, ai)
   */
  setComposerMode(mode) {
    this.state.composerMode = mode
    this.chatController.setComposerMode(mode)
    this.logger.debug('Composer mode changed', { mode })
  }

  /**
   * Handle sending a request
   * Resets composer mode and switches view if needed
   */
  async handleSend() {
    try {
      await this.chatController.sendRequest()

      // Reset composer to curl mode (smaller size) after sending
      this.setComposerMode('curl')

      // If we're in composer-only mode, switch to split view to see the response
      if (this.state.viewMode === 'composer') {
        this.logger.debug('Switching from composer-only to split view after sending')
        this.setViewMode('split')
      }
    } catch (error) {
      this.logger.error('Failed to send request', error)
      this.emit('error', { message: 'Failed to send request', error })
    }
  }

  /**
   * Handle saving the current request
   * If already linked to a collection, updates it
   * Otherwise, shows dialog to choose collection
   * @returns {Promise<void>}
   */
  async handleSave() {
    this.logger.info('Save initiated', {
      currentRequestId: this.chatController.state.currentRequestId,
      currentCollectionId: this.chatController.state.currentCollectionId
    })

    try {
      const chatState = this.chatController.state

      // If already linked to a collection, directly save
      if (chatState.currentRequestId && chatState.currentCollectionId) {
        this.logger.debug('Updating existing request in collection')
        this.chatController.saveToCollection()
        this.emit('saveSuccess', { message: 'Request updated in collection' })
        return { success: true, message: 'Request updated in collection' }
      } else {
        // Show dialog to choose collection
        const activeConversation = this.conversationsStore.activeConversation.value
        const defaultName = activeConversation?.name || 'New Request'

        this.logger.debug('Showing save dialog', { defaultName })
        this.state.pendingRequestName = defaultName
        this.state.showSaveDialog = true

        return { success: true, showDialog: true }
      }
    } catch (error) {
      this.logger.error('Failed to save request', error)
      this.emit('error', { message: 'Failed to save request', error })
      return { success: false, error: error.message }
    }
  }

  /**
   * Close the save dialog
   */
  closeSaveDialog() {
    this.state.showSaveDialog = false
    this.state.pendingRequestName = ''
    this.logger.debug('Save dialog closed')
  }

  /**
   * Handle saving a request to a new collection
   * @param {Object} data - Save dialog data
   * @param {string} data.collectionId - Target collection ID
   * @param {string} data.folderId - Optional folder ID
   * @param {string} data.requestName - Name for the request
   * @returns {Promise<Object>} Result with success status and saved request
   */
  async handleSaveToCollection(data) {
    this.logger.info('Saving to collection', {
      collectionId: data.collectionId,
      requestName: data.requestName
    })

    try {
      const requestName = data.requestName || 'New Request'

      // Build request object from current state
      const request = this.chatController.buildRequestFromVisual()

      // Build event array for scripts (Postman format)
      const event = this.buildPostmanEvents()

      // Add request to collection
      const savedRequest = this.collectionsStore.addRequest(
        data.collectionId,
        {
          name: requestName,
          request,
          event: event.length > 0 ? event : undefined
        },
        data.folderId
      )

      // Link the current view to the saved request
      this.linkToSavedRequest(savedRequest.id, data.collectionId, data.folderId)

      // Update conversation with collection info
      this.updateConversationLinkage(savedRequest.id, data.collectionId, data.folderId, requestName)

      // Update the active tab
      this.updateTabLinkage(savedRequest.id, data.collectionId, requestName, request.method)

      // Close dialog
      this.closeSaveDialog()

      const collectionName = this.collectionsStore.getCollection(data.collectionId)?.name || 'collection'
      const message = `Request saved to ${collectionName}`

      this.logger.info('Request saved successfully', { requestId: savedRequest.id })
      this.emit('saveSuccess', { message, requestId: savedRequest.id })

      return {
        success: true,
        message,
        requestId: savedRequest.id
      }
    } catch (error) {
      this.logger.error('Failed to save request to collection', error)
      this.emit('error', { message: 'Failed to save request to collection', error })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Builds Postman-format event array from pre/post request scripts
   * @returns {Array} Array of Postman event objects
   * @private
   */
  buildPostmanEvents() {
    const event = []
    const chatState = this.chatController.state

    if (chatState.script.preRequest?.trim()) {
      event.push({
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: chatState.script.preRequest.split('\n')
        }
      })
    }

    if (chatState.script.postRequest?.trim()) {
      event.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: chatState.script.postRequest.split('\n')
        }
      })
    }

    return event
  }

  /**
   * Links controller state to a saved request
   * @param {string} requestId - Saved request ID
   * @param {string} collectionId - Collection ID
   * @param {string|null} folderId - Optional folder ID
   * @private
   */
  linkToSavedRequest(requestId, collectionId, folderId) {
    const chatState = this.chatController.state
    chatState.currentRequestId = requestId
    chatState.currentCollectionId = collectionId
    chatState.currentFolderId = folderId || null
    this.logger.debug('Linked to saved request', { requestId, collectionId, folderId })
  }

  /**
   * Updates the active conversation with request linkage information
   * @param {string} requestId - Saved request ID
   * @param {string} collectionId - Collection ID
   * @param {string|null} folderId - Optional folder ID
   * @param {string} requestName - Request name
   * @private
   */
  updateConversationLinkage(requestId, collectionId, folderId, requestName) {
    const activeConversation = this.conversationsStore.activeConversation.value
    if (activeConversation) {
      this.conversationsStore.updateConversation(activeConversation.id, {
        name: requestName,
        requestId,
        collectionId,
        folderId
      })
      this.logger.debug('Updated conversation linkage', { conversationId: activeConversation.id })
    }
  }

  /**
   * Updates the active tab with request linkage information
   * @param {string} requestId - Saved request ID
   * @param {string} collectionId - Collection ID
   * @param {string} requestName - Request name
   * @param {string} method - HTTP method
   * @private
   */
  updateTabLinkage(requestId, collectionId, requestName, method) {
    const activeTab = this.tabsStore.activeTab?.value || this.tabsStore.activeTab
    if (activeTab) {
      this.tabsStore.updateTab(activeTab.id, {
        name: requestName,
        itemId: requestId,
        collectionId,
        method: method || 'GET'
      })
      this.tabsStore.markTabAsSaved(activeTab.id)
      this.logger.debug('Updated tab linkage', { tabId: activeTab.id })
    }
  }

  /**
   * Handle editing a request from conversation
   * @param {Object} message - Message object containing request data
   */
  handleEditRequest(message) {
    try {
      if (!message.data?.request) {
        this.logger.warn('Cannot edit request: no request data in message')
        return
      }

      const request = message.data.request
      const chatState = this.chatController.state

      // Load the request from the message back into the composer
      chatState.method = request.method || 'GET'
      chatState.url = request.url?.raw || ''
      chatState.headers = [...(request.header || [])]

      this.chatController.syncVisualToCurl()

      this.logger.debug('Request loaded into composer for editing', { method: chatState.method })
      this.emit('requestLoaded', { message })
    } catch (error) {
      this.logger.error('Failed to edit request', error)
      this.emit('error', { message: 'Failed to edit request', error })
    }
  }

  /**
   * Handle clearing the conversation
   */
  handleClear() {
    try {
      this.conversationsStore.clearActiveConversation()
      this.logger.info('Conversation cleared')
      this.emit('conversationCleared')
    } catch (error) {
      this.logger.error('Failed to clear conversation', error)
      this.emit('error', { message: 'Failed to clear conversation', error })
    }
  }

  /**
   * Handle loading a cURL command into composer
   * @param {string} curlCommand - The cURL command string
   */
  handleSendToComposer(curlCommand) {
    try {
      // Load the AI-generated cURL command into the composer
      this.chatController.setCurlInput(curlCommand)

      // Switch to cURL mode
      this.setComposerMode('curl')

      this.logger.info('AI-generated cURL loaded into composer')
      this.emit('curlLoaded', { curlCommand })
    } catch (error) {
      this.logger.error('Failed to load cURL into composer', error)
      this.emit('error', { message: 'Failed to load cURL into composer', error })
    }
  }

  /**
   * Handle maximizing a response
   * @param {Object} message - The message to maximize
   */
  handleMaximizeResponse(message) {
    this.state.maximizedResponse = message
    this.logger.debug('Response maximized')
    this.emit('responseMaximized', { message })
  }

  /**
   * Close the maximized response overlay
   */
  closeMaximized() {
    this.state.maximizedResponse = null
    this.logger.debug('Response minimized')
    this.emit('responseMinimized')
  }

  /**
   * Load a request from a collection
   * @param {string} collectionId - Collection ID
   * @param {string} requestId - Request ID
   * @param {string|null} folderId - Optional folder ID
   */
  loadRequest(collectionId, requestId, folderId = null) {
    try {
      this.logger.debug('Loading request', { collectionId, requestId, folderId })
      this.chatController.loadRequest(collectionId, requestId, folderId)
      this.emit('requestLoaded', { collectionId, requestId, folderId })
    } catch (error) {
      this.logger.error('Failed to load request', error)
      this.emit('error', { message: 'Failed to load request', error })
    }
  }

  /**
   * Create a new request
   */
  newRequest() {
    try {
      this.logger.debug('Creating new request')
      this.chatController.newRequest()
      this.emit('newRequest')
    } catch (error) {
      this.logger.error('Failed to create new request', error)
      this.emit('error', { message: 'Failed to create new request', error })
    }
  }

  /**
   * Load a session from history
   * @param {string} sessionId - Session/conversation ID
   */
  loadSession(sessionId) {
    try {
      this.logger.info('Loading session from history', { sessionId })
      this.chatController.loadSession(sessionId)
      this.emit('sessionLoaded', { sessionId })
    } catch (error) {
      this.logger.error('Failed to load session', error)
      this.emit('error', { message: 'Failed to load session', error })
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      controller: 'ChatViewController',
      chatControllerState: this.chatController?.state,
      viewState: this.state,
      validation: this.validateState()
    }
  }

  /**
   * Validate controller state
   */
  validateState() {
    const errors = []

    if (!this.chatController) {
      errors.push('Chat controller not initialized')
    }

    if (!this.conversationsStore) {
      errors.push('Conversations store not initialized')
    }

    if (!this.collectionsStore) {
      errors.push('Collections store not initialized')
    }

    if (!this.tabsStore) {
      errors.push('Tabs store not initialized')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.chatController) {
      this.chatController.dispose()
    }
    super.dispose()
    this.logger.info('ChatViewController disposed')
  }
}
