import { ref, computed } from 'vue'
import { BaseController } from './BaseController.js'
import { Request, RequestBody, RequestAuth, RequestUrl, KeyValue, HTTP_METHODS, BODY_MODES } from '../models/Request.js'
import { Response, ResponseTiming, ResponseSize } from '../models/Response.js'
import { Tab } from '../models/Tab.js'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useTabs } from '../stores/useTabs.js'
import { useVariableInterpolation } from '../composables/useVariableInterpolation.js'
import { HttpClientFactory } from '../core/http/HttpClient.js'
import '../core/http/FetchHttpClient.js' // Register FetchHttpClient

/**
 * Controller for RequestTabs component
 * Handles all business logic for request tabs management, HTTP requests, and data manipulation
 */
export class RequestTabsController extends BaseController {
  constructor() {
    super('RequestTabsController')

    // Store instances
    this.collectionsStore = useCollections()
    this.environmentsStore = useEnvironments()
    this.tabsStore = useTabs()

    // Composables
    this.variableInterpolation = useVariableInterpolation()

    // HTTP client
    this.httpClient = HttpClientFactory.create('fetch')

    // Initialize state
    this.init()
  }

  /**
   * Initialize controller state
   */
  init() {
    super.init()

    // Create reactive state
    this.createState({
      // Current request form data
      currentUrl: '',
      currentMethod: 'GET',
      currentHeaders: [],
      currentParams: [],
      currentBody: {
        mode: 'none',
        raw: '',
        formData: [],
        urlEncoded: [],
        binary: null
      },

      // Response data
      responseData: null,
      isLoading: false,
      requestError: null,

      // UI state
      activeRequestTab: 'params',
      activeResponseTab: 'body',
      viewMode: 'request',
      hasResponse: false,

      // Save dialog state
      showSaveDialog: false,
      pendingSaveName: ''
    })

    // Create computed properties
    this.createComputed('tabs', () => {
      const tabsData = this.tabsStore.tabs.value
      return Array.isArray(tabsData) ? tabsData : []
    })

    this.createComputed('activeTab', () => {
      return this.tabsStore.activeTab.value
    })

    this.createComputed('currentRequest', () => {
      const activeTab = this.getComputed('activeTab')
      if (activeTab?.itemId && activeTab?.collectionId) {
        return this.collectionsStore.getRequest(activeTab.collectionId, activeTab.itemId)
      }
      return null
    })

    // Watch for active tab changes
    this.createWatcher(
      () => this.getComputed('activeTab'),
      (newTab) => {
        if (newTab) {
          this.loadRequestData()
        }
      },
      { immediate: true }
    )

    // Auto-save when form data changes
    this.createWatcher(
      () => [
        this.state.currentUrl,
        this.state.currentMethod,
        this.state.currentHeaders,
        this.state.currentParams,
        this.state.currentBody
      ],
      () => {
        this.saveRequestData()
      },
      { deep: true }
    )
  }

  /**
   * Get HTTP methods list
   */
  getHttpMethods() {
    return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  }

  /**
   * Get method color for UI styling
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
   * Tab management methods
   */
  addNewTab() {
    this.tabsStore.createTab()
  }

  closeTab(tabId) {
    this.tabsStore.closeTab(tabId)
  }

  setActiveTab(tabId) {
    this.tabsStore.setActiveTab(tabId)
  }

  /**
   * Load request data from current request into form
   */
  loadRequestData() {
    // Reset view mode and response status for new/different tabs
    this.state.hasResponse = false
    this.state.viewMode = 'request'

    const currentRequest = this.getComputed('currentRequest')

    if (currentRequest && currentRequest.request) {
      const request = currentRequest.request

      // Extract URL - handle both object and string formats
      if (request.url) {
        if (typeof request.url === 'string') {
          this.state.currentUrl = request.url
        } else if (request.url.raw) {
          this.state.currentUrl = request.url.raw
        } else {
          this.state.currentUrl = ''
        }
      } else {
        this.state.currentUrl = ''
      }

      // Extract method
      this.state.currentMethod = request.method || 'GET'

      // Extract headers
      this.state.currentHeaders = [...(request.header || request.headers || [])]

      // Extract query parameters
      if (request.url && request.url.query) {
        this.state.currentParams = [...request.url.query]
      } else {
        this.state.currentParams = []
      }

      // Extract body
      if (request.body) {
        this.state.currentBody = {
          mode: request.body.mode || 'none',
          raw: request.body.raw || '',
          formData: request.body.formData || request.body.formdata || [],
          urlEncoded: request.body.urlEncoded || request.body.urlencoded || [],
          binary: request.body.binary || null
        }
      } else {
        this.state.currentBody = {
          mode: 'none',
          raw: '',
          formData: [],
          urlEncoded: [],
          binary: null
        }
      }
    } else if (currentRequest) {
      // Handle legacy format where request data might be directly on currentRequest
      this.logger.warn('Request has unexpected structure, attempting fallback', currentRequest)
      this.state.currentUrl = currentRequest.url || ''
      this.state.currentMethod = currentRequest.method || 'GET'
      this.state.currentHeaders = currentRequest.headers || currentRequest.header || []
      this.state.currentParams = []
      this.state.currentBody = {
        mode: 'none',
        raw: currentRequest.body || '',
        formData: [],
        urlEncoded: [],
        binary: null
      }
    } else {
      // New request defaults
      this.state.currentUrl = ''
      this.state.currentMethod = 'GET'
      this.state.currentHeaders = [{ key: 'Content-Type', value: 'application/json', enabled: true, id: Date.now() }]
      this.state.currentParams = []
      this.state.currentBody = {
        mode: 'none',
        raw: '',
        formData: [],
        urlEncoded: [],
        binary: null
      }
    }
  }

  /**
   * Save current form data back to the request
   */
  saveRequestData() {
    const activeTab = this.getComputed('activeTab')
    if (activeTab) {
      // Update tab info
      this.tabsStore.updateTab(activeTab.id, {
        name: this.state.currentUrl ? `${this.state.currentMethod} ${this.state.currentUrl}` : 'New Request',
        method: this.state.currentMethod
      })

      // If linked to a request, update the actual request data
      if (activeTab.itemId && activeTab.collectionId) {
        this.collectionsStore.updateRequest(activeTab.collectionId, activeTab.itemId, {
          request: {
            method: this.state.currentMethod,
            url: {
              raw: this.state.currentUrl,
              query: this.state.currentParams.filter(p => p.key)
            },
            header: this.state.currentHeaders.filter(h => h.key),
            body: this.state.currentBody
          }
        })
      }
    }
  }

  /**
   * Parameter management
   */
  addParam() {
    this.state.currentParams.push({ key: '', value: '', enabled: true, id: Date.now() })
  }

  removeParam(index) {
    this.state.currentParams.splice(index, 1)
  }

  /**
   * Header management
   */
  addHeader() {
    this.state.currentHeaders.push({ key: '', value: '', enabled: true, id: Date.now() })
  }

  removeHeader(index) {
    this.state.currentHeaders.splice(index, 1)
  }

  /**
   * Request saving
   */
  saveRequest() {
    const activeTab = this.getComputed('activeTab')
    if (activeTab) {
      this.state.pendingSaveName = activeTab.name || 'New Request'
      this.state.showSaveDialog = true
    }
  }

  async handleSaveRequest({ collectionId, requestName, isNewCollection }) {
    const activeTab = this.getComputed('activeTab')
    if (activeTab) {
      // First update the tab name
      this.tabsStore.updateTab(activeTab.id, { name: requestName })

      // If this is a new request (no itemId), add it to the collection
      if (!activeTab.itemId) {
        const newRequest = this.collectionsStore.addRequest(collectionId, {
          method: this.state.currentMethod,
          url: { raw: this.state.currentUrl },
          header: this.state.currentHeaders.filter(h => h.enabled && h.key),
          body: this.state.currentBody
        })

        // Link the tab to the new request
        this.tabsStore.updateTab(activeTab.id, {
          itemId: newRequest.id,
          collectionId: collectionId,
          saved: true,
          modified: false
        })

        // Update the request name
        this.collectionsStore.updateRequest(collectionId, newRequest.id, { name: requestName })
      } else {
        // Update existing request
        this.collectionsStore.updateRequest(activeTab.collectionId, activeTab.itemId, {
          name: requestName,
          request: {
            method: this.state.currentMethod,
            url: { raw: this.state.currentUrl },
            header: this.state.currentHeaders.filter(h => h.enabled && h.key),
            body: this.state.currentBody
          }
        })

        this.tabsStore.markTabAsSaved(activeTab.id)
      }
      this.state.showSaveDialog = false
    }
  }

  /**
   * Send HTTP request
   */
  async sendRequest() {
    // Prevent multiple simultaneous requests
    if (this.state.isLoading) {
      this.logger.warn('Request already in progress, ignoring duplicate send request')
      return
    }

    // Clear previous errors but keep responseData until new response arrives
    this.state.requestError = null
    this.state.isLoading = true

    // Add a small delay to ensure loading state is visible
    await new Promise(resolve => setTimeout(resolve, 100))

    // Interpolate variables in URL, headers, params, and body
    const interpolatedUrl = this.variableInterpolation.interpolateText(this.state.currentUrl)
    const interpolatedHeaders = this.state.currentHeaders.map(header => ({
      ...header,
      key: this.variableInterpolation.interpolateText(header.key || ''),
      value: this.variableInterpolation.interpolateText(header.value || '')
    }))
    const interpolatedParams = this.state.currentParams.map(param => ({
      ...param,
      key: this.variableInterpolation.interpolateText(param.key || ''),
      value: this.variableInterpolation.interpolateText(param.value || '')
    }))

    // Interpolate body based on type
    let interpolatedBody = null
    if (this.state.currentBody.mode === 'raw') {
      interpolatedBody = this.variableInterpolation.interpolateText(this.state.currentBody.raw)
    } else if (this.state.currentBody.mode === 'form-data') {
      interpolatedBody = this.state.currentBody.formData.map(item => ({
        ...item,
        key: this.variableInterpolation.interpolateText(item.key || ''),
        value: this.variableInterpolation.interpolateText(item.value || '')
      }))
    } else if (this.state.currentBody.mode === 'x-www-form-urlencoded') {
      interpolatedBody = this.state.currentBody.urlEncoded.map(item => ({
        ...item,
        key: this.variableInterpolation.interpolateText(item.key || ''),
        value: this.variableInterpolation.interpolateText(item.value || '')
      }))
    } else if (this.state.currentBody.mode === 'binary') {
      interpolatedBody = this.state.currentBody.binary
    }

    const result = await this.executeAsync(async () => {
      // Log request details
      this.logger.debug('Sending HTTP request:', {
        method: this.state.currentMethod,
        url: interpolatedUrl,
        params: interpolatedParams.filter(p => p.enabled && p.key),
        headers: interpolatedHeaders.filter(h => h.enabled && h.key),
        bodyType: this.state.currentBody.mode
      })

      // Send the actual HTTP request
      return await this.httpClient.send({
        method: this.state.currentMethod,
        url: interpolatedUrl,
        params: interpolatedParams,
        headers: interpolatedHeaders,
        body: interpolatedBody,
        bodyType: this.state.currentBody.mode
      })
    }, 'HTTP request failed')

    if (result.success) {
      // Store response data
      this.state.responseData = result.data

      // Format response for display
      if (result.data.success || result.data.status) {
        // Set response received flag and show response view
        this.state.hasResponse = true
        this.state.viewMode = 'both' // Always switch to both view to show the response
      }
    } else {
      this.state.requestError = result.error.message || 'Request failed'

      // Still show response view to display error
      this.state.hasResponse = true
      this.state.viewMode = 'both'

      // Create error response object
      this.state.responseData = {
        success: false,
        status: 0,
        statusText: 'Error',
        error: result.error.message || 'Request failed',
        headers: {},
        body: null,
        time: 0
      }
    }

    this.state.isLoading = false
  }

  /**
   * View management
   */
  toggleView(mode) {
    this.state.viewMode = mode
  }

  getViewLabel(mode) {
    switch (mode) {
      case 'request': return '📝 Request Only'
      case 'response': return '📄 Response Only'
      case 'both': return '📑 Split View'
      default: return mode
    }
  }

  /**
   * UI state management
   */
  setActiveRequestTab(tab) {
    this.state.activeRequestTab = tab
  }

  setActiveResponseTab(tab) {
    this.state.activeResponseTab = tab
  }

  closeSaveDialog() {
    this.state.showSaveDialog = false
  }

  /**
   * Response formatting utilities
   */
  formatTime(milliseconds) {
    if (!milliseconds && milliseconds !== 0) return 'N/A'
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`
    return `${(milliseconds / 1000).toFixed(2)}s`
  }

  formatSize(bytes) {
    if (!bytes && bytes !== 0) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  formatResponseBody(body) {
    if (!body) return 'No response body'

    // If it's an object, pretty print it as JSON
    if (typeof body === 'object') {
      try {
        return JSON.stringify(body, null, 2)
      } catch (e) {
        return String(body)
      }
    }

    // If it's a string that looks like JSON, try to format it
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body)
        return JSON.stringify(parsed, null, 2)
      } catch (e) {
        // Not JSON, return as-is
        return body
      }
    }

    return String(body)
  }

  getStatusText(responseData) {
    if (!responseData) return 'Unknown'

    // If we have a valid statusText, use it
    if (responseData.statusText && responseData.statusText !== 'Network Error') {
      return responseData.statusText
    }

    // Map common status codes to text
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    }

    if (responseData.status && statusTexts[responseData.status]) {
      return statusTexts[responseData.status]
    }

    // If status is 0, it's likely a network error
    if (responseData.status === 0) {
      return 'Network Error'
    }

    // If we have an error but no status, show the error
    if (responseData.error && !responseData.status) {
      return 'Error'
    }

    // Default fallback
    return responseData.statusText || 'Unknown'
  }

  detectResponseLanguage(responseData) {
    if (!responseData) return 'plaintext'

    // Check content-type header first
    const contentType = responseData.headers?.['content-type'] || ''

    if (contentType.includes('application/json')) {
      return 'json'
    } else if (contentType.includes('text/html')) {
      return 'html'
    } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
      return 'xml'
    } else if (contentType.includes('text/css')) {
      return 'css'
    } else if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
      return 'javascript'
    }

    // Fallback to auto-detection based on content
    const body = this.formatResponseBody(responseData.body)

    // Try to detect JSON
    try {
      JSON.parse(body)
      return 'json'
    } catch (e) {
      // Not JSON
    }

    // Check for HTML/XML
    if (body.trim().startsWith('<') && body.includes('>')) {
      if (body.includes('<!DOCTYPE') || body.includes('<html')) {
        return 'html'
      }
      return 'xml'
    }

    return 'auto' // Let SyntaxHighlighter auto-detect
  }
}