/**
 * Conversation Model
 *
 * Represents a chat-style conversation thread for an API request.
 * Each conversation is tied to a request from a collection and contains
 * a history of request/response message pairs.
 */

import { generateId } from './types.js'

/**
 * Message types in a conversation
 */
export const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response'
}

/**
 * Create a new conversation message
 * @param {object} options - Message options
 * @param {string} options.type - 'request' or 'response'
 * @param {object} options.data - Request or response data
 * @returns {object}
 */
export function createConversationMessage({
  type,
  data
} = {}) {
  return {
    id: generateId(),
    type,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create a request message
 * @param {object} request - Postman-style request object
 * @param {string} curlString - The cURL representation
 * @returns {object}
 */
export function createRequestMessage(request, curlString = '') {
  return createConversationMessage({
    type: MESSAGE_TYPES.REQUEST,
    data: {
      request,
      curl: curlString
    }
  })
}

/**
 * Create a response message
 * @param {object} response - Response data
 * @returns {object}
 */
export function createResponseMessage(response) {
  return createConversationMessage({
    type: MESSAGE_TYPES.RESPONSE,
    data: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers || {},
      body: response.body,
      time: response.time,
      size: response.size,
      error: response.error || null,
      success: response.success !== false
    }
  })
}

/**
 * Create a new conversation
 * @param {object} options - Conversation options
 * @param {string} options.name - Display name
 * @param {string} options.requestId - ID of the request in the collection
 * @param {string} options.collectionId - ID of the collection
 * @param {string} options.folderId - ID of the folder (optional)
 * @param {object} options.initialRequest - Initial request data (optional)
 * @returns {object}
 */
export function createConversation({
  name = 'New Conversation',
  requestId = null,
  collectionId = null,
  folderId = null,
  initialRequest = null
} = {}) {
  const conversation = {
    id: generateId(),
    name,
    requestId,
    collectionId,
    folderId,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return conversation
}

/**
 * Add a message to a conversation
 * @param {object} conversation - The conversation object
 * @param {object} message - The message to add
 * @returns {object} The updated conversation
 */
export function addMessageToConversation(conversation, message) {
  conversation.messages.push(message)
  conversation.updatedAt = new Date().toISOString()
  return conversation
}

/**
 * Get the last request message from a conversation
 * @param {object} conversation - The conversation object
 * @returns {object|null}
 */
export function getLastRequestMessage(conversation) {
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    if (conversation.messages[i].type === MESSAGE_TYPES.REQUEST) {
      return conversation.messages[i]
    }
  }
  return null
}

/**
 * Get the last response message from a conversation
 * @param {object} conversation - The conversation object
 * @returns {object|null}
 */
export function getLastResponseMessage(conversation) {
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    if (conversation.messages[i].type === MESSAGE_TYPES.RESPONSE) {
      return conversation.messages[i]
    }
  }
  return null
}

/**
 * Clear all messages from a conversation
 * @param {object} conversation - The conversation object
 * @returns {object} The updated conversation
 */
export function clearConversation(conversation) {
  conversation.messages = []
  conversation.updatedAt = new Date().toISOString()
  return conversation
}

export default {
  MESSAGE_TYPES,
  createConversation,
  createConversationMessage,
  createRequestMessage,
  createResponseMessage,
  addMessageToConversation,
  getLastRequestMessage,
  getLastResponseMessage,
  clearConversation
}
