/**
 * Conversations Store
 *
 * Manages chat-style conversation sessions for API requests.
 * Conversations are persisted to localStorage for history.
 */

import { ref, computed } from 'vue'
import {
  createConversation,
  createRequestMessage,
  createResponseMessage,
  createValidationMessage,
  createScriptResultsMessage,
  createConsoleLogMessage,
  createEnvChangeMessage,
  createAiUserMessage,
  createAiAssistantMessage,
  addMessageToConversation,
  MESSAGE_TYPES
} from '../models/Conversation.js'
import { createLogger } from '../core/logger.js'
import { useConversationsStorage } from '../composables/useStorage.js'

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

  // State - persisted to localStorage via useStorage
  const conversationsStorage = useConversationsStorage()
  const conversations = conversationsStorage.data
  const activeConversationId = ref(null)

  console.log('[useConversations] Store created, initial conversations:', conversations.value)

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

    // Force Vue reactivity by reassigning the array
    console.log('CREATE CONVERSATION - Before reassign, count:', conversations.value.length)
    conversations.value = [...conversations.value]
    console.log('CREATE CONVERSATION - After reassign, calling save...')
    conversationsStorage.save()

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

    logger.debug('Before adding message - conversation ID:', conversation.id, 'messages count:', conversation.messages.length)

    const message = createRequestMessage(request, curlString)
    addMessageToConversation(conversation, message)

    logger.debug('After adding message - messages count:', conversation.messages.length)
    logger.debug('Request message added:', message.id)

    // Force Vue reactivity by reassigning the array - this WILL trigger the watcher
    console.log('BEFORE REASSIGN - conversations count:', conversations.value.length)
    console.log('BEFORE REASSIGN - conversation messages:', conversation.messages.length)
    conversations.value = [...conversations.value]
    console.log('AFTER REASSIGN - conversations.value:', conversations.value)

    // Manually save to ensure persistence
    console.log('Calling conversationsStorage.save() manually...')
    conversationsStorage.save()

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

    // Force Vue reactivity by reassigning the array
    console.log('ADD RESPONSE - calling save...')
    conversations.value = [...conversations.value]
    conversationsStorage.save()

    return message
  }

  /**
   * Add a validation error message to the active conversation
   * @param {Array} errors - Array of validation errors from cURL validator
   * @param {string} curlInput - The original cURL input
   * @returns {object|null} The created message
   */
  const addValidationError = (errors, curlInput = '') => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add validation error to')
      return null
    }

    const message = createValidationMessage(errors, curlInput)
    addMessageToConversation(conversation, message)

    logger.debug('Validation error message added:', message.id)
    return message
  }

  /**
   * Add script results message to the active conversation
   * @param {object} scriptResult - The script execution result from PostmanScriptRunner
   * @returns {object|null} The created message
   */
  const addScriptResults = (scriptResult) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add script results to')
      return null
    }

    // Only add if there are tests or an error
    if (!scriptResult.tests?.length && !scriptResult.error) {
      return null
    }

    const message = createScriptResultsMessage(scriptResult)
    addMessageToConversation(conversation, message)

    logger.debug('Script results message added:', message.id)
    return message
  }

  /**
   * Add console log message to the active conversation
   * @param {Array} logs - Array of console log entries
   * @returns {object|null} The created message
   */
  const addConsoleLogs = (logs) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add console logs to')
      return null
    }

    // Only add if there are logs
    if (!logs?.length) {
      return null
    }

    const message = createConsoleLogMessage(logs)
    addMessageToConversation(conversation, message)

    logger.debug('Console log message added:', message.id)
    return message
  }

  /**
   * Add environment change message to the active conversation
   * @param {Array} changes - Array of env changes
   * @param {string} environmentName - Name of the active environment
   * @param {boolean} hasActiveEnvironment - Whether there was an active environment
   * @returns {object|null} The created message
   */
  const addEnvChanges = (changes, environmentName = '', hasActiveEnvironment = true) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add env changes to')
      return null
    }

    // Only add if there are changes
    if (!changes?.length) {
      return null
    }

    const message = createEnvChangeMessage(changes, environmentName, hasActiveEnvironment)
    addMessageToConversation(conversation, message)

    logger.debug('Environment change message added:', message.id)
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

      // Force Vue reactivity by reassigning the array
      console.log('CLEAR CONVERSATION - calling save...')
      conversations.value = [...conversations.value]
      conversationsStorage.save()
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

      // Force Vue reactivity by reassigning the array
      console.log('DELETE CONVERSATION - calling save...')
      conversations.value = [...conversations.value]
      conversationsStorage.save()
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
      logger.debug('Conversation name updated:', conversationId, name)

      // Force Vue reactivity by reassigning the array
      console.log('UPDATE CONVERSATION NAME - calling save...')
      conversations.value = [...conversations.value]
      conversationsStorage.save()
    }
  }

  /**
   * Update conversation metadata (requestId, collectionId, folderId)
   * @param {string} conversationId - The conversation ID
   * @param {object} updates - Object with fields to update
   */
  const updateConversation = (conversationId, updates) => {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      if ('requestId' in updates) conversation.requestId = updates.requestId
      if ('collectionId' in updates) conversation.collectionId = updates.collectionId
      if ('folderId' in updates) conversation.folderId = updates.folderId
      if ('name' in updates) conversation.name = updates.name
      conversation.updatedAt = new Date().toISOString()
      logger.debug('Conversation updated:', conversationId, updates)

      // Force Vue reactivity by reassigning the array
      console.log('UPDATE CONVERSATION - updates:', updates)
      console.log('UPDATE CONVERSATION - calling save...')
      conversations.value = [...conversations.value]
      conversationsStorage.save()
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

  /**
   * Add an AI user query message to the active conversation
   * @param {string} query - The user's natural language query
   * @returns {object|null} The created message
   */
  const addAiUserMessage = (query) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add AI user message to')
      return null
    }

    const message = createAiUserMessage(query)
    addMessageToConversation(conversation, message)

    logger.debug('AI user message added:', message.id)

    // Force Vue reactivity by reassigning the array
    console.log('ADD AI USER MESSAGE - calling save...')
    conversations.value = [...conversations.value]
    conversationsStorage.save()

    return message
  }

  /**
   * Add an AI assistant response message to the active conversation
   * @param {string} command - The generated cURL command
   * @param {string} guidance - Optional guidance text
   * @param {string} model - The model used for generation
   * @param {number} inferenceTime - Time taken to generate (ms)
   * @returns {object|null} The created message
   */
  const addAiAssistantMessage = (command, guidance = '', model = '', inferenceTime = 0) => {
    const conversation = activeConversation.value
    if (!conversation) {
      logger.warn('No active conversation to add AI assistant message to')
      return null
    }

    const message = createAiAssistantMessage(command, guidance, model, inferenceTime)
    addMessageToConversation(conversation, message)

    logger.debug('AI assistant message added:', message.id)

    // Force Vue reactivity by reassigning the array
    console.log('ADD AI ASSISTANT MESSAGE - calling save...')
    conversations.value = [...conversations.value]
    conversationsStorage.save()

    return message
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
    addValidationError,
    addScriptResults,
    addConsoleLogs,
    addEnvChanges,
    addAiUserMessage,
    addAiAssistantMessage,
    clearActiveConversation,
    deleteConversation,
    getConversationByRequest,
    updateConversationName,
    updateConversation,
    getSortedConversations,
    closeActiveConversation
  }
}

export default useConversations
