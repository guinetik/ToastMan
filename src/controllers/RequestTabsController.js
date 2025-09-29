import { ref, computed } from 'vue'
import { BaseController } from './BaseController.js'
import { Request, RequestBody, RequestAuth, RequestUrl, KeyValue, HTTP_METHODS, BODY_MODES } from '../models/Request.js'
import { Response, ResponseTiming, ResponseSize } from '../models/Response.js'
import { Tab } from '../models/Tab.js'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useTabs } from '../stores/useTabs.js'

/**
 * Controller for RequestTabs component
 */
export class RequestTabsController extends BaseController {
  constructor() {
    super('request-tabs')

    this.createState({
      activeRequestTab: 'params',
      activeResponseTab: 'body',
      isLoading: false,
      currentRequest: null,
      currentResponse: null,
      formData: {
        url: '',
        method: 'GET',
        headers: [],
        params: [],
        body: '',
        bodyType: 'raw',
        auth: null
      },
      responseViewMode: 'pretty',
      requestTimeout: 30000
    })

    // Initialize stores after state is created
    this.collectionsStore = useCollections()
    this.environmentsStore = useEnvironments()
    this.tabsStore = useTabs()
  }

  init() {
    super.init()

    this.tabs = this.createComputed('tabs', () => {
      if (!this.tabsStore) return []

      const tabsData = this.tabsStore.tabs
      const actualTabs = tabsData?.value || tabsData
      const tabs = Array.isArray(actualTabs) ? actualTabs : []

      return tabs.map(t => {
        try {
          return new Tab(t)
        } catch (error) {
          this.logger.error('Failed to parse tab:', error)
          return t
        }
      })
    })

    this.activeTab = this.createComputed('activeTab', () => {
      if (!this.tabsStore) return null

      const active = this.tabsStore.activeTab
      const actualActive = active?.value || active
      if (!actualActive) return null

      try {
        return new Tab(actualActive)
      } catch (error) {
        this.logger.error('Failed to parse active tab:', error)
        return actualActive
      }
    })

    this.currentRequestData = this.createComputed('currentRequestData', () => {
      const tab = this.getComputed('activeTab')
      if (!tab || !this.collectionsStore) return null

      if (tab.requestId && tab.collectionId) {
        const requestData = this.collectionsStore.getRequest(tab.collectionId, tab.requestId)
        if (requestData?.request) {
          try {
            return new Request(requestData.request)
          } catch (error) {
            this.logger.error('Failed to parse request:', error)
            return requestData.request
          }
        }
      }

      if (tab.temporaryData) {
        try {
          return new Request(tab.temporaryData)
        } catch (error) {
          this.logger.error('Failed to parse temporary request data:', error)
          return null
        }
      }

      return null
    })

    this.createWatcher(
      () => this.getComputed('activeTab'),
      (newTab) => {
        if (newTab) {
          this.loadRequestData()
        }
      },
      { immediate: true }
    )

    this.createWatcher(
      () => this.getComputed('currentRequestData'),
      () => {
        this.loadRequestData()
      }
    )
  }

  /**
   * Get available HTTP methods
   */
  getHttpMethods() {
    return HTTP_METHODS
  }

  /**
   * Get available body modes
   */
  getBodyModes() {
    return BODY_MODES
  }

  /**
   * Load request data into form
   */
  loadRequestData() {
    const request = this.getComputed('currentRequestData')

    if (request) {
      this.state.formData.url = request.getUrlString()
      this.state.formData.method = request.method
      this.state.formData.headers = [...(request.header || [])]
      this.state.formData.params = request.url?.query ? [...request.url.query] : []
      this.state.formData.auth = request.auth ? { ...request.auth } : null

      if (request.body) {
        this.state.formData.bodyType = request.body.mode || 'raw'
        this.state.formData.body = request.body.raw || ''
      } else {
        this.state.formData.bodyType = 'raw'
        this.state.formData.body = ''
      }
    } else {
      this.resetFormData()
    }

    this.logger.debug('Loaded request data into form')
  }

  /**
   * Reset form data to defaults
   */
  resetFormData() {
    this.state.formData = {
      url: '',
      method: 'GET',
      headers: [new KeyValue({ key: 'Content-Type', value: 'application/json', enabled: true }).toJSON()],
      params: [],
      body: '',
      bodyType: 'raw',
      auth: null
    }
  }

  /**
   * Save form data to request
   */
  async saveRequestData() {
    const tab = this.getComputed('activeTab')
    if (!tab) return { success: false, error: 'No active tab' }

    const result = await this.executeAsync(async () => {
      const requestData = this.buildRequestFromForm()
      const validation = this.validate(Request, requestData)

      if (!validation.valid) {
        throw new Error(validation.error)
      }

      if (tab.requestId && tab.collectionId) {
        this.collectionsStore.updateRequest(tab.collectionId, tab.requestId, requestData)
      } else {
        this.tabsStore.updateTab(tab.id, {
          temporaryData: requestData,
          modified: true,
          name: this.generateTabName(requestData.method, requestData.url),
          method: requestData.method,
          url: requestData.url
        })
      }

      this.logger.info('Saved request data')
      return requestData
    }, 'Failed to save request data')

    if (result.success) {
      this.emit('requestSaved', result.data)
    }

    return result
  }

  /**
   * Build request object from form data
   */
  buildRequestFromForm() {
    const url = RequestUrl.fromString(this.state.formData.url)

    if (this.state.formData.params.length > 0) {
      url.query = this.state.formData.params.filter(p => p.enabled)
    }

    const request = {
      method: this.state.formData.method,
      url: url.toJSON(),
      header: this.state.formData.headers.filter(h => h.enabled),
      body: null,
      auth: this.state.formData.auth
    }

    if (this.state.formData.bodyType !== 'none' && this.state.formData.body) {
      request.body = RequestBody.createRaw(this.state.formData.body, 'json').toJSON()
    }

    return request
  }

  /**
   * Send request
   */
  async sendRequest() {
    const result = await this.executeAsync(async () => {
      this.state.isLoading = true
      this.emit('requestStarted')

      await this.saveRequestData()

      const requestData = this.buildRequestFromForm()
      const request = new Request(requestData)

      const environment = this.environmentsStore.activeEnvironment
      let processedUrl = request.getUrlString()

      if (environment) {
        const env = new Environment(environment)
        processedUrl = env.replaceVariables(processedUrl)

        request.header = request.header.map(h => ({
          ...h,
          value: env.replaceVariables(h.value)
        }))

        if (request.body?.raw) {
          request.body.raw = env.replaceVariables(request.body.raw)
        }
      }

      this.logger.info(`Sending ${request.method} request to ${processedUrl}`)

      const mockResponse = await this.mockHttpRequest(request, processedUrl)

      const response = new Response(mockResponse)
      this.state.currentResponse = response

      const tab = this.getComputed('activeTab')
      if (tab) {
        this.tabsStore.updateTab(tab.id, {
          response: response.toJSON(),
          state: response.isError() ? 'error' : 'success'
        })
      }

      if (this.sidebarController) {
        this.sidebarController.addToHistory(request, response)
      }

      this.logger.info(`Request completed with status ${response.status}`)
      return response
    }, 'Request failed')

    this.state.isLoading = false

    if (result.success) {
      this.emit('requestCompleted', result.data)
    } else {
      this.emit('requestFailed', result.error)
    }

    return result
  }

  /**
   * Mock HTTP request (replace with actual HTTP client later)
   */
  async mockHttpRequest(request, url) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    const isError = Math.random() < 0.1

    if (isError) {
      throw new Error('Network error: Connection refused')
    }

    const statuses = [200, 201, 204, 400, 401, 404, 500]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    const mockResponse = {
      status,
      statusText: status < 300 ? 'OK' : status < 400 ? 'Redirect' : status < 500 ? 'Bad Request' : 'Server Error',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-length': '1234',
        'cache-control': 'no-cache',
        'date': new Date().toUTCString()
      },
      body: JSON.stringify({
        id: Math.floor(Math.random() * 1000),
        method: request.method,
        url: url,
        timestamp: new Date().toISOString(),
        message: `Mock response for ${request.method} ${url}`
      }, null, 2),
      bodyType: 'json',
      timing: new ResponseTiming({
        start: 0,
        dnsLookup: 10,
        tcpConnection: 25,
        tlsHandshake: 40,
        firstByte: 100,
        download: 245,
        total: 245
      }).toJSON(),
      size: new ResponseSize({
        headers: 256,
        body: 1234,
        total: 1490
      }).toJSON()
    }

    return mockResponse
  }

  /**
   * Cancel current request
   */
  cancelRequest() {
    if (this.state.isLoading) {
      this.state.isLoading = false
      this.logger.info('Request cancelled')
      this.emit('requestCancelled')
    }
  }

  /**
   * Add new tab
   */
  addNewTab() {
    const tab = this.tabsStore.createTab()
    this.logger.info('Created new tab:', tab.id)
    this.emit('tabCreated', tab)
  }

  /**
   * Close tab
   */
  async closeTab(tabId) {
    const tab = this.tabs.value?.find(t => t.id === tabId)

    if (tab && tab.modified && !tab.saved) {
      const confirmed = await this.confirmUnsavedChanges()
      if (!confirmed) return
    }

    this.tabsStore.closeTab(tabId)
    this.logger.info('Closed tab:', tabId)
    this.emit('tabClosed', tabId)
  }

  /**
   * Set active tab
   */
  setActiveTab(tabId) {
    this.tabsStore.setActiveTab(tabId)
    this.logger.info('Activated tab:', tabId)
    this.emit('tabActivated', tabId)
  }

  /**
   * Add header
   */
  addHeader(key = '', value = '', enabled = true) {
    const header = new KeyValue({ key, value, enabled }).toJSON()
    this.state.formData.headers.push(header)
    this.markModified()
  }

  /**
   * Remove header
   */
  removeHeader(index) {
    this.state.formData.headers.splice(index, 1)
    this.markModified()
  }

  /**
   * Update header
   */
  updateHeader(index, updates) {
    Object.assign(this.state.formData.headers[index], updates)
    this.markModified()
  }

  /**
   * Add query parameter
   */
  addParam(key = '', value = '', enabled = true) {
    const param = new KeyValue({ key, value, enabled }).toJSON()
    this.state.formData.params.push(param)
    this.markModified()
  }

  /**
   * Remove query parameter
   */
  removeParam(index) {
    this.state.formData.params.splice(index, 1)
    this.markModified()
  }

  /**
   * Update query parameter
   */
  updateParam(index, updates) {
    Object.assign(this.state.formData.params[index], updates)
    this.markModified()
  }

  /**
   * Update URL
   */
  updateUrl(url) {
    this.state.formData.url = url
    this.markModified()
  }

  /**
   * Update method
   */
  updateMethod(method) {
    this.state.formData.method = method
    this.markModified()
  }

  /**
   * Update body
   */
  updateBody(body) {
    this.state.formData.body = body
    this.markModified()
  }

  /**
   * Update body type
   */
  updateBodyType(bodyType) {
    this.state.formData.bodyType = bodyType
    this.markModified()
  }

  /**
   * Set authentication
   */
  setAuth(authType, credentials) {
    switch (authType) {
      case 'basic':
        this.state.formData.auth = RequestAuth.createBasic(credentials.username, credentials.password).toJSON()
        break
      case 'bearer':
        this.state.formData.auth = RequestAuth.createBearer(credentials.token).toJSON()
        break
      case 'apikey':
        this.state.formData.auth = RequestAuth.createApiKey(credentials.key, credentials.value, credentials.addTo).toJSON()
        break
      default:
        this.state.formData.auth = null
    }
    this.markModified()
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.state.formData.auth = null
    this.markModified()
  }

  /**
   * Mark current tab as modified
   */
  markModified() {
    const tab = this.getComputed('activeTab')
    if (tab) {
      this.tabsStore.updateTab(tab.id, { modified: true })
    }
  }

  /**
   * Generate tab name from request details
   */
  generateTabName(method, url) {
    if (!url) return `${method} New Request`

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `${method} ${urlObj.hostname}${urlObj.pathname}`
    } catch {
      return `${method} ${url.substring(0, 30)}...`
    }
  }

  /**
   * Confirm unsaved changes
   */
  async confirmUnsavedChanges() {
    return new Promise(resolve => {
      this.emit('confirmUnsavedChanges', { resolve })
    })
  }

  /**
   * Export response
   */
  exportResponse(format = 'json') {
    if (!this.state.currentResponse) {
      this.logger.warn('No response to export')
      return
    }

    const response = this.state.currentResponse

    let content
    let mimeType
    let filename

    switch (format) {
      case 'json':
        content = JSON.stringify(response.toJSON(), null, 2)
        mimeType = 'application/json'
        filename = 'response.json'
        break
      case 'raw':
        content = response.body
        mimeType = 'text/plain'
        filename = 'response.txt'
        break
      case 'headers':
        content = JSON.stringify(response.headers, null, 2)
        mimeType = 'application/json'
        filename = 'headers.json'
        break
      default:
        return
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    this.logger.info(`Exported response as ${format}`)
    this.emit('responseExported', format)
  }

  /**
   * Copy response to clipboard
   */
  async copyResponse() {
    if (!this.state.currentResponse) {
      this.logger.warn('No response to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(this.state.currentResponse.getFormattedBody())
      this.logger.info('Response copied to clipboard')
      this.emit('responseCopied')
    } catch (error) {
      this.logger.error('Failed to copy response:', error)
    }
  }

  /**
   * Set sidebar controller reference
   */
  setSidebarController(controller) {
    this.sidebarController = controller
  }
}