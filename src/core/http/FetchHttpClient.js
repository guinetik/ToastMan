import { HttpClient, HttpResponse, HttpClientFactory } from './HttpClient.js'
import { Logger } from '../logger.js'

/**
 * Fetch API based HTTP Client
 * Implements HttpClient using the browser's Fetch API
 *
 * Limitations:
 * - Proxy: Cannot be configured directly (requires browser settings or extension)
 * - Certificates: Cannot be configured directly (handled by browser)
 * - CORS: Subject to browser CORS policy
 */
export class FetchHttpClient extends HttpClient {
  constructor(options = {}) {
    super(options)

    // Initialize logger
    this.logger = new Logger({ prefix: 'FetchHttpClient', level: 'debug' })

    // Check if running in browser environment
    if (typeof window === 'undefined' || !window.fetch) {
      throw new Error('FetchHttpClient requires browser environment with Fetch API')
    }
  }

  /**
   * Execute HTTP request using Fetch API
   * @param {Object} config - Request configuration
   * @returns {Promise<HttpResponse>} - Response object
   */
  async execute(config) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

    try {
      // Build fetch options
      const fetchOptions = {
        method: config.method,
        headers: config.headersObj,
        signal: controller.signal,
        credentials: 'include', // Include cookies
        mode: 'cors' // Enable CORS
      }

      // Add body if not GET/HEAD
      if (!['GET', 'HEAD'].includes(config.method.toUpperCase())) {
        fetchOptions.body = this.prepareBody(config.body, config.bodyType, config.headersObj)
      }

      // Make the request
      const response = await fetch(config.fullUrl, fetchOptions)

      // Clear timeout
      clearTimeout(timeoutId)

      // Parse response
      const responseData = await this.parseResponse(response)

      // Calculate response size
      const size = this.calculateSize(responseData)

      // Build HTTP response
      return new HttpResponse({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        body: responseData.body,
        size,
        error: response.ok ? null : `${response.status} ${response.statusText}`
      })

    } catch (error) {
      clearTimeout(timeoutId)

      // Handle different error types
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.options.timeout}ms`)
      } else if (error.message.includes('Failed to fetch')) {
        // CORS or network error
        throw new Error('Network error - Check CORS policy or network connection')
      } else {
        throw error
      }
    }
  }

  /**
   * Prepare request body based on type
   * @param {any} body - Raw body data
   * @param {string} bodyType - Body type (raw, form-data, etc.)
   * @param {Object} headers - Request headers
   * @returns {any} - Prepared body for fetch
   */
  prepareBody(body, bodyType, headers) {
    if (!body) return null

    switch (bodyType) {
      case 'raw':
        // For raw, check if it's JSON and set content-type if not already set
        if (this.isJSON(body) && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json'
        }
        return body

      case 'form-data':
        // Create FormData object
        const formData = new FormData()
        if (typeof body === 'object' && !Array.isArray(body)) {
          Object.entries(body).forEach(([key, value]) => {
            formData.append(key, value)
          })
        }
        // Don't set Content-Type for FormData, let browser set it with boundary
        delete headers['Content-Type']
        return formData

      case 'x-www-form-urlencoded':
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        if (typeof body === 'object' && !Array.isArray(body)) {
          return new URLSearchParams(body).toString()
        }
        return body

      case 'binary':
        // For file uploads
        headers['Content-Type'] = 'application/octet-stream'
        return body

      case 'graphql':
        headers['Content-Type'] = 'application/json'
        return JSON.stringify(body)

      default:
        return body
    }
  }

  /**
   * Parse response based on content type
   * @param {Response} response - Fetch API response
   * @returns {Promise<Object>} - Parsed response data
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type') || ''
    let body = null
    let bodyText = ''

    try {
      // Always try to get the text first
      bodyText = await response.text()

      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(bodyText)
        } catch (e) {
          // Invalid JSON, return as text
          body = bodyText
        }
      } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        body = bodyText
      } else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
        body = bodyText // Could parse XML if needed
      } else if (contentType.includes('image/')) {
        // For images, we'd need to handle differently
        // Could convert to base64 or blob URL
        body = `[Binary image data - ${bodyText.length} bytes]`
      } else {
        // Default to text
        body = bodyText
      }
    } catch (error) {
      this.logger.error('Error parsing response:', error)
      body = null
    }

    return { body, bodyText }
  }

  /**
   * Parse headers from Headers object
   * @param {Headers} headers - Fetch API Headers object
   * @returns {Object} - Headers as plain object
   */
  parseHeaders(headers) {
    const headersObj = {}
    headers.forEach((value, key) => {
      headersObj[key] = value
    })
    return headersObj
  }

  /**
   * Calculate response size
   * @param {Object} responseData - Response data
   * @returns {number} - Size in bytes
   */
  calculateSize(responseData) {
    if (!responseData.bodyText) return 0

    // Calculate size in bytes (UTF-8)
    return new Blob([responseData.bodyText]).size
  }

  /**
   * Check if string is valid JSON
   * @param {string} str - String to check
   * @returns {boolean} - True if valid JSON
   */
  isJSON(str) {
    try {
      JSON.parse(str)
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Override setProxy to show warning
   */
  setProxy(proxyConfig) {
    super.setProxy(proxyConfig)
    this.logger.warn('Direct proxy configuration is not supported in browsers. Consider using a browser extension or backend proxy.')
  }

  /**
   * Override addCertificate to show warning
   */
  addCertificate(certificate) {
    super.addCertificate(certificate)
    this.logger.warn('Client certificates cannot be configured via JavaScript. The browser will handle certificate selection.')
  }
}

// Register FetchHttpClient with factory
HttpClientFactory.register('fetch', FetchHttpClient)