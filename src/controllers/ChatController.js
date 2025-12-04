/**
 * Chat Controller
 *
 * Orchestrates the chat interface interactions including:
 * - Managing the composer state (cURL vs Visual mode)
 * - Sending requests and handling responses
 * - Syncing between cURL and visual form representations
 */

import { ref, computed, watch } from 'vue'
import { BaseController } from './BaseController.js'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useConversations } from '../stores/useConversations.js'
import { useVariableInterpolation } from '../composables/useVariableInterpolation.js'
import { FetchHttpClient } from '../core/http/FetchHttpClient.js'
import { curlToRequest, validateCurlInput } from '../utils/curlParser.js'
import { requestToCurl, requestToDisplay } from '../utils/curlGenerator.js'
import { createRequest, createKeyValue, createRequestBody, createUrl } from '../models/types.js'

export class ChatController extends BaseController {
  constructor() {
    super('ChatController')

    // Store instances
    this.collectionsStore = useCollections()
    this.environmentsStore = useEnvironments()
    this.conversationsStore = useConversations()

    // Composables
    this.variableInterpolation = useVariableInterpolation()

    // HTTP client
    this.httpClient = new FetchHttpClient()

    this.init()
  }

  init() {
    super.init()

    this.createState({
      // Composer mode: 'curl' or 'visual'
      composerMode: 'curl',

      // cURL input
      curlInput: '',

      // Visual form state
      method: 'GET',
      url: '',
      headers: [],
      params: [],
      body: {
        mode: 'none',
        raw: '',
        formData: [],
        urlEncoded: []
      },

      // Active visual tab (headers, body, params)
      activeVisualTab: 'params',

      // Request state
      isLoading: false,
      requestError: null,

      // Current request context (from collection)
      currentRequestId: null,
      currentCollectionId: null,
      currentFolderId: null
    })

    // Computed for HTTP methods
    this.createComputed('httpMethods', () => [
      'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
    ])

    // Watch for mode changes to sync state
    this.createWatcher(
      () => this.state.composerMode,
      (newMode, oldMode) => {
        if (oldMode === 'curl' && newMode === 'visual') {
          this.syncCurlToVisual()
        } else if (oldMode === 'visual' && newMode === 'curl') {
          this.syncVisualToCurl()
        }
      }
    )
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
      'DELETE': 'var(--color-delete)'
    }
    return colors[method] || 'var(--color-text-secondary)'
  }

  /**
   * Set composer mode
   */
  setComposerMode(mode) {
    if (mode === 'curl' || mode === 'visual') {
      this.state.composerMode = mode
    }
  }

  /**
   * Set active visual tab
   */
  setActiveVisualTab(tab) {
    this.state.activeVisualTab = tab
  }

  /**
   * Sync cURL input to visual form
   */
  syncCurlToVisual() {
    if (!this.state.curlInput.trim()) return

    try {
      const request = curlToRequest(this.state.curlInput)

      this.state.method = request.method || 'GET'
      this.state.url = request.url?.raw || ''

      // Convert headers
      this.state.headers = (request.header || []).map(h => ({
        ...h,
        id: h.id || Date.now() + Math.random()
      }))

      // Extract query params from URL
      if (request.url?.query) {
        this.state.params = request.url.query.map(p => ({
          ...p,
          id: p.id || Date.now() + Math.random()
        }))
      }

      // Body
      if (request.body) {
        this.state.body = {
          mode: request.body.mode || 'none',
          raw: request.body.raw || '',
          formData: request.body.formdata || request.body.formData || [],
          urlEncoded: request.body.urlencoded || request.body.urlEncoded || []
        }
      }

      this.logger.debug('Synced cURL to visual')
    } catch (error) {
      this.logger.error('Failed to sync cURL to visual:', error)
    }
  }

  /**
   * Sync visual form to cURL input
   */
  syncVisualToCurl() {
    const request = this.buildRequestFromVisual()
    this.state.curlInput = requestToCurl(request)
    this.logger.debug('Synced visual to cURL')
  }

  /**
   * Build a Postman request object from visual form state
   */
  buildRequestFromVisual() {
    const urlObj = createUrl(this.state.url)

    // Add query params to URL
    urlObj.query = this.state.params
      .filter(p => p.enabled !== false && p.key)
      .map(p => createKeyValue(p.key, p.value, p.enabled))

    const body = createRequestBody(this.state.body.mode)
    if (this.state.body.mode === 'raw') {
      body.raw = this.state.body.raw
      body.options = { raw: { language: 'json' } }
    } else if (this.state.body.mode === 'formdata') {
      body.formdata = this.state.body.formData
    } else if (this.state.body.mode === 'urlencoded') {
      body.urlencoded = this.state.body.urlEncoded
    }

    return {
      method: this.state.method,
      url: urlObj,
      header: this.state.headers.filter(h => h.enabled !== false && h.key),
      body
    }
  }

  /**
   * Load a request from a collection into the composer
   */
  loadRequest(collectionId, requestId, folderId = null) {
    const requestItem = this.collectionsStore.getRequest(collectionId, requestId)
    if (!requestItem) {
      this.logger.warn('Request not found:', requestId)
      return
    }

    this.state.currentRequestId = requestId
    this.state.currentCollectionId = collectionId
    this.state.currentFolderId = folderId

    const request = requestItem.request
    if (!request) return

    // Update visual form
    this.state.method = request.method || 'GET'
    this.state.url = request.url?.raw || ''

    // Headers
    this.state.headers = (request.header || []).map(h => ({
      key: h.key || '',
      value: h.value || '',
      enabled: h.enabled !== false,
      id: h.id || Date.now() + Math.random()
    }))

    // Query params
    if (request.url?.query) {
      this.state.params = request.url.query.map(p => ({
        key: p.key || '',
        value: p.value || '',
        enabled: p.enabled !== false,
        id: p.id || Date.now() + Math.random()
      }))
    } else {
      this.state.params = []
    }

    // Body
    if (request.body) {
      this.state.body = {
        mode: request.body.mode || 'none',
        raw: request.body.raw || '',
        formData: request.body.formdata || request.body.formData || [],
        urlEncoded: request.body.urlencoded || request.body.urlEncoded || []
      }
    } else {
      this.state.body = { mode: 'none', raw: '', formData: [], urlEncoded: [] }
    }

    // Generate cURL
    this.syncVisualToCurl()

    // Open/create conversation
    this.conversationsStore.openConversation({
      name: requestItem.name || 'Request',
      requestId,
      collectionId,
      folderId
    })

    this.logger.info('Loaded request:', requestItem.name)
  }

  /**
   * Set the cURL input directly
   */
  setCurlInput(value) {
    this.state.curlInput = value
  }

  /**
   * Update visual form field
   */
  updateField(field, value) {
    if (field in this.state) {
      this.state[field] = value
    }
  }

  /**
   * Add a header
   */
  addHeader() {
    this.state.headers.push({
      key: '',
      value: '',
      enabled: true,
      id: Date.now()
    })
  }

  /**
   * Remove a header
   */
  removeHeader(index) {
    this.state.headers.splice(index, 1)
  }

  /**
   * Add a param
   */
  addParam() {
    this.state.params.push({
      key: '',
      value: '',
      enabled: true,
      id: Date.now()
    })
  }

  /**
   * Remove a param
   */
  removeParam(index) {
    this.state.params.splice(index, 1)
  }

  /**
   * Send the current request
   */
  async sendRequest() {
    if (this.state.isLoading) {
      this.logger.warn('Request already in progress')
      return
    }

    this.state.isLoading = true
    this.state.requestError = null

    try {
      // Build request from current state
      let request
      if (this.state.composerMode === 'curl') {
        // Sync curl to visual first
        this.syncCurlToVisual()
        request = this.buildRequestFromVisual()
      } else {
        request = this.buildRequestFromVisual()
      }

      // Generate cURL for message display
      const curlString = requestToCurl(request)

      // Add request message to conversation
      this.conversationsStore.addRequest(request, curlString)

      // Interpolate variables
      const interpolatedUrl = this.variableInterpolation.interpolateText(request.url?.raw || '')
      const interpolatedHeaders = (request.header || []).map(h => ({
        ...h,
        key: this.variableInterpolation.interpolateText(h.key || ''),
        value: this.variableInterpolation.interpolateText(h.value || '')
      }))

      // Interpolate query parameters
      const interpolatedParams = (request.url?.query || []).map(p => ({
        ...p,
        key: this.variableInterpolation.interpolateText(p.key || ''),
        value: this.variableInterpolation.interpolateText(p.value || '')
      }))

      let interpolatedBody = null
      if (request.body?.mode === 'raw') {
        interpolatedBody = this.variableInterpolation.interpolateText(request.body.raw)
      } else if (request.body?.mode === 'formdata') {
        interpolatedBody = (request.body.formdata || []).map(item => ({
          ...item,
          key: this.variableInterpolation.interpolateText(item.key || ''),
          value: this.variableInterpolation.interpolateText(item.value || '')
        }))
      } else if (request.body?.mode === 'urlencoded') {
        interpolatedBody = (request.body.urlencoded || []).map(item => ({
          ...item,
          key: this.variableInterpolation.interpolateText(item.key || ''),
          value: this.variableInterpolation.interpolateText(item.value || '')
        }))
      }

      this.logger.debug('Sending request:', {
        method: request.method,
        url: interpolatedUrl,
        params: interpolatedParams
      })

      // Send HTTP request
      const response = await this.httpClient.send({
        method: request.method,
        url: interpolatedUrl,
        params: interpolatedParams,
        headers: interpolatedHeaders,
        body: interpolatedBody,
        bodyType: request.body?.mode
      })

      // Add response message to conversation
      this.conversationsStore.addResponse(response)

      // Auto-save to collection if linked
      if (this.state.currentRequestId && this.state.currentCollectionId) {
        this.saveToCollection()
      }

      this.logger.info('Request completed:', response.status)

    } catch (error) {
      this.logger.error('Request failed:', error)
      this.state.requestError = error.message

      // Add error response to conversation
      this.conversationsStore.addResponse({
        status: 0,
        statusText: 'Error',
        error: error.message,
        success: false,
        time: 0,
        size: 0
      })
    } finally {
      this.state.isLoading = false
    }
  }

  /**
   * Save current request state to collection
   */
  saveToCollection() {
    if (!this.state.currentRequestId || !this.state.currentCollectionId) {
      this.logger.warn('No collection context to save to')
      return
    }

    const request = this.buildRequestFromVisual()

    this.collectionsStore.updateRequest(
      this.state.currentCollectionId,
      this.state.currentRequestId,
      { request }
    )

    this.logger.debug('Request saved to collection')
  }

  /**
   * Clear the composer
   */
  clearComposer() {
    this.state.curlInput = ''
    this.state.method = 'GET'
    this.state.url = ''
    this.state.headers = []
    this.state.params = []
    this.state.body = { mode: 'none', raw: '', formData: [], urlEncoded: [] }
    this.state.requestError = null
  }

  /**
   * Create a new request (not linked to collection)
   */
  newRequest() {
    this.clearComposer()
    this.state.currentRequestId = null
    this.state.currentCollectionId = null
    this.state.currentFolderId = null

    // Create a new conversation
    this.conversationsStore.createNewConversation({
      name: 'New Request'
    })
  }

  /**
   * Format response time for display
   */
  formatTime(ms) {
    if (!ms && ms !== 0) return 'N/A'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  /**
   * Format response size for display
   */
  formatSize(bytes) {
    if (!bytes && bytes !== 0) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
