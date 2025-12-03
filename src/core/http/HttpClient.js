/**
 * Abstract HttpClient class
 * Defines the interface for all HTTP client implementations
 */
export class HttpClient {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 5,
      ...options
    }

    // Proxy configuration (may require backend or browser extension)
    this.proxy = null

    // Client certificates (may require backend or browser extension)
    this.certificates = []

    // Request/response interceptors
    this.interceptors = {
      request: [],
      response: []
    }
  }

  /**
   * Configure proxy settings
   * @param {Object} proxyConfig - Proxy configuration
   * @param {boolean} proxyConfig.enabled - Whether proxy is enabled
   * @param {string} proxyConfig.protocol - http, https, socks5
   * @param {string} proxyConfig.host - Proxy host
   * @param {number} proxyConfig.port - Proxy port
   * @param {Object} proxyConfig.auth - Authentication credentials
   */
  setProxy(proxyConfig) {
    this.proxy = proxyConfig
  }

  /**
   * Add client certificate for specific domains
   * @param {Object} certificate - Certificate configuration
   * @param {string} certificate.domain - Domain pattern (e.g., *.example.com)
   * @param {string} certificate.cert - Certificate data or path
   * @param {string} certificate.key - Private key data or path
   * @param {string} certificate.passphrase - Passphrase for encrypted keys
   */
  addCertificate(certificate) {
    this.certificates.push(certificate)
  }

  /**
   * Add request interceptor
   * @param {Function} interceptor - Function to process request before sending
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor)
  }

  /**
   * Add response interceptor
   * @param {Function} interceptor - Function to process response after receiving
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor)
  }

  /**
   * Apply request interceptors
   * @param {Object} config - Request configuration
   * @returns {Object} - Modified request configuration
   */
  async applyRequestInterceptors(config) {
    let modifiedConfig = { ...config }
    for (const interceptor of this.interceptors.request) {
      modifiedConfig = await interceptor(modifiedConfig)
    }
    return modifiedConfig
  }

  /**
   * Apply response interceptors
   * @param {Object} response - Response object
   * @returns {Object} - Modified response
   */
  async applyResponseInterceptors(response) {
    let modifiedResponse = response
    for (const interceptor of this.interceptors.response) {
      modifiedResponse = await interceptor(modifiedResponse)
    }
    return modifiedResponse
  }

  /**
   * Build full URL with query parameters
   * @param {string} url - Base URL
   * @param {Array} params - Query parameters [{key, value, enabled}]
   * @returns {string} - Full URL with query string
   */
  buildUrl(url, params = []) {
    const enabledParams = params.filter(p => p.enabled && p.key)
    if (enabledParams.length === 0) return url

    const queryString = enabledParams
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
      .join('&')

    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${queryString}`
  }

  /**
   * Build headers object
   * @param {Array} headers - Headers array [{key, value, enabled}]
   * @returns {Object} - Headers object
   */
  buildHeaders(headers = []) {
    const headersObj = {}
    headers
      .filter(h => h.enabled && h.key)
      .forEach(h => {
        headersObj[h.key] = h.value || ''
      })
    return headersObj
  }

  /**
   * Execute HTTP request - MUST BE IMPLEMENTED BY SUBCLASSES
   * @param {Object} config - Request configuration
   * @param {string} config.method - HTTP method
   * @param {string} config.url - Request URL
   * @param {Array} config.params - Query parameters
   * @param {Array} config.headers - Request headers
   * @param {any} config.body - Request body
   * @param {string} config.bodyType - Body type (raw, form-data, etc.)
   * @returns {Promise<HttpResponse>} - Response object
   */
  async execute(config) {
    throw new Error('execute() must be implemented by subclass')
  }

  /**
   * Send HTTP request with full configuration
   * @param {Object} config - Request configuration
   * @returns {Promise<HttpResponse>} - Response object
   */
  async send(config) {
    // Track timing
    const startTime = performance.now()

    try {
      // Apply request interceptors
      const modifiedConfig = await this.applyRequestInterceptors(config)

      // Build full URL with params
      modifiedConfig.fullUrl = this.buildUrl(modifiedConfig.url, modifiedConfig.params)

      // Build headers object
      modifiedConfig.headersObj = this.buildHeaders(modifiedConfig.headers)

      // Execute the request (implemented by subclass)
      const response = await this.execute(modifiedConfig)

      // Add timing information
      response.time = performance.now() - startTime

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(response)

      return finalResponse
    } catch (error) {
      // Create error response
      const errorResponse = {
        success: false,
        error: error.message,
        status: error.status || 0,
        statusText: error.statusText || 'Network Error',
        time: performance.now() - startTime,
        headers: {},
        body: null,
        size: 0
      }

      // Apply response interceptors even for errors
      return this.applyResponseInterceptors(errorResponse)
    }
  }
}

/**
 * Standard HTTP Response format
 */
export class HttpResponse {
  constructor({
    success = true,
    status = 200,
    statusText = 'OK',
    headers = {},
    body = null,
    size = 0,
    time = 0,
    error = null
  }) {
    this.success = success
    this.status = status
    this.statusText = statusText
    this.headers = headers
    this.body = body
    this.size = size
    this.time = time
    this.error = error
  }
}

/**
 * HTTP Client Factory
 */
export class HttpClientFactory {
  static clients = new Map()

  /**
   * Register a client implementation
   * @param {string} name - Client name
   * @param {Class} ClientClass - Client class constructor
   */
  static register(name, ClientClass) {
    this.clients.set(name, ClientClass)
  }

  /**
   * Create a client instance
   * @param {string} name - Client name
   * @param {Object} options - Client options
   * @returns {HttpClient} - Client instance
   */
  static create(name = 'fetch', options = {}) {
    const ClientClass = this.clients.get(name)
    if (!ClientClass) {
      throw new Error(`Unknown HTTP client: ${name}`)
    }
    return new ClientClass(options)
  }
}