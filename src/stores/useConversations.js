/**
 * Conversations Store
 *
 * Manages chat-style conversation sessions for API requests.
 * Conversations are session-based (not persisted to localStorage).
 */

import { ref, computed } from 'vue'
import {
  createConversation,
  createRequestMessage,
  createResponseMessage,
  addMessageToConversation,
  MESSAGE_TYPES
} from '../models/Conversation.js'
import { createLogger } from '../core/logger.js'

// Singleton store instance
let conversationsStore = null

export function useConversations() {
  if (!conversationsStore) {
    conversationsStore = createConversationsStore()
  }
  return conversationsStore
}

function createConversationsStore() {
  const logger = createLogger('conversations')

  // State
  const conversations = ref([])
  const activeConversationId = ref(null)

  // Computed
  const activeConversation = computed(() => {
    if (!activeConversationId.value) return null
    return conversations.value.find(c => c.id === activeConversationId.value) || null
  })

  const activeMessages = computed(() => {
    return activeConversation.value?.messages || []
  })

  const hasActiveConversation = computed(() => {
    return !!activeConversation.value
  })

  const conversationCount = computed(() => {
    return conversations.value.length
  })

  // Actions

  /**
   * Create a new conversation for a request
   * @param {object} options - Conversation options
   * @returns {object} The new conversation
   */
  const createNewConversation = ({
    name = 'New Request',
    requestId = null,
    collectionId = null,
    folderId = null
  } = {}) => {
    logger.info('Creating new conversation:', { name, requestId, collectionId })

    const conversation = createConversation({
      name,
      requestId,
      collectionId,
      folderId
    })

    conversations.value.push(conversation)
    activeConversationId.value = conversation.id

    logger.debug('Conversation created:', conversation.id)
    return conversation
  }

  /**
   * Open or create a conversation for a specific request
   * @param {object} options - Request identifiers
   * @returns {object} The conversation
   */
  const openConversation = ({
    name,
    requestId,
    collectionId,
    folderId = null
  }) => {
    // Check if we already have a conversation for this request in this session
    const existing = conversations.value.find(
      c => c.requestId === requestId && c.collectionId === collectionId
    )

    if (existing) {
      logger.info('Opening existing conversation:', existing.id)
      activeConversationId.value = existing.id
      return existing
    }

    // Create a new conversation
    return createNewConversation({ name, requestId, collectionId, folderId })
  }

  /**
   * Set the active conversation
   * @param {string} conversationId - The conversation ID to activate
   */
  const setActiveConversation = (conversationId) => {
    const exists = conversations.value.some(c => c.id === conversationId)
    if (exists) {
      activeConversationId.value = conversationId
      logger.debug('Active conversation set:', conversationId)
    } else {
      logger.warn('Conversation not found:', conversationId)
    }
  }

  /**
   * Add a request message to the active conversation
   * @param {object} request - Postman-style request object
   * @param {string} curlString - The cURL representation
   * @returns {object|null} The created message
   */
  const addRequest = (request, curlString = '') => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add request to')
      return null
    }

    const message = createRequestMessage(request, curlString)
    addMessageToConversation(conversation, message)

    logger.debug('Request message added:', message.id)
    return message
  }

  /**
   * Add a response message to the active conversation
   * @param {object} response - Response data
   * @returns {object|null} The created message
   */
  const addResponse = (response) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add response to')
      return null
    }

    const message = createResponseMessage(response)
    addMessageToConversation(conversation, message)

    logger.debug('Response message added:', message.id)
    return message
  }

  /**
   * Clear messages from the active conversation
   */
  const clearActiveConversation = () => {
    const conversation = activeConversation.value
    if (conversation) {
      conversation.messages = []
      conversation.updatedAt = new Date().toISOString()
      logger.info('Conversation cleared:', conversation.id)
    }
  }

  /**
   * Delete a conversation
   * @param {string} conversationId - The conversation ID to delete
   */
  const deleteConversation = (conversationId) => {
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index > -1) {
      conversations.value.splice(index, 1)

      // If we deleted the active conversation, clear the active ID
      if (activeConversationId.value === conversationId) {
        activeConversationId.value = null
      }

      logger.info('Conversation deleted:', conversationId)
    }
  }

  /**
   * Get a conversation by its request ID
   * @param {string} requestId - The request ID
   * @param {string} collectionId - The collection ID
   * @returns {object|null}
   */
  const getConversationByRequest = (requestId, collectionId) => {
    return conversations.value.find(
      c => c.requestId === requestId && c.collectionId === collectionId
    ) || null
  }

  /**
   * Update conversation name
   * @param {string} conversationId - The conversation ID
   * @param {string} name - New name
   */
  const updateConversationName = (conversationId, name) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      conversation.name = name
      conversation.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Get all conversations sorted by last update
   * @returns {Array}
   */
  const getSortedConversations = () => {
    return [...conversations.value].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  }

  /**
   * Close the active conversation (without deleting)
   */
  const closeActiveConversation = () => {
    activeConversationId.value = null
    logger.debug('Active conversation closed')
  }

  return {
    // State (reactive)
    conversations,
    activeConversationId,

    // Computed
    activeConversation,
    activeMessages,
    hasActiveConversation,
    conversationCount,

    // Actions
    createNewConversation,
    openConversation,
    setActiveConversation,
    addRequest,
    addResponse,
    clearActiveConversation,
    deleteConversation,
    getConversationByRequest,
    updateConversationName,
    getSortedConversations,
    closeActiveConversation
  }
}

export default useConversations
