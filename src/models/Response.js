import { BaseModel } from './BaseModel.js'

/**
 * Response status categories
 */
export const STATUS_CATEGORIES = {
  informational: { min: 100, max: 199, color: 'blue' },
  success: { min: 200, max: 299, color: 'green' },
  redirection: { min: 300, max: 399, color: 'orange' },
  clientError: { min: 400, max: 499, color: 'yellow' },
  serverError: { min: 500, max: 599, color: 'red' }
}

/**
 * Response cookie model
 */
export class ResponseCookie extends BaseModel {
  static schema = {
    name: { type: 'string', required: true },
    value: { type: 'string', default: '' },
    domain: { type: 'string', default: '' },
    path: { type: 'string', default: '/' },
    expires: { type: 'string', default: null },
    httpOnly: { type: 'boolean', default: false },
    secure: { type: 'boolean', default: false },
    sameSite: { type: 'string', enum: ['Strict', 'Lax', 'None', ''], default: '' }
  }

  isExpired() {
    if (!this.expires) return false
    return new Date(this.expires) < new Date()
  }

  toString() {
    let cookieString = `${this.name}=${this.value}`
    if (this.domain) cookieString += `; Domain=${this.domain}`
    if (this.path) cookieString += `; Path=${this.path}`
    if (this.expires) cookieString += `; Expires=${this.expires}`
    if (this.httpOnly) cookieString += '; HttpOnly'
    if (this.secure) cookieString += '; Secure'
    if (this.sameSite) cookieString += `; SameSite=${this.sameSite}`
    return cookieString
  }
}

/**
 * Response timing model
 */
export class ResponseTiming extends BaseModel {
  static schema = {
    start: { type: 'number', default: 0 },
    socketOpen: { type: 'number', default: 0 },
    dnsLookup: { type: 'number', default: 0 },
    tcpConnection: { type: 'number', default: 0 },
    tlsHandshake: { type: 'number', default: 0 },
    firstByte: { type: 'number', default: 0 },
    download: { type: 'number', default: 0 },
    total: { type: 'number', default: 0 }
  }

  getPhases() {
    return {
      dns: this.dnsLookup,
      tcp: this.tcpConnection - this.dnsLookup,
      tls: this.tlsHandshake - this.tcpConnection,
      request: this.firstByte - (this.tlsHandshake || this.tcpConnection),
      response: this.download - this.firstByte,
      total: this.total
    }
  }
}

/**
 * Response size model
 */
export class ResponseSize extends BaseModel {
  static schema = {
    headers: { type: 'number', default: 0 },
    body: { type: 'number', default: 0 },
    total: { type: 'number', default: 0 },
    compressed: { type: 'number', default: 0 },
    uncompressed: { type: 'number', default: 0 }
  }

  getFormattedSize(bytes = this.total) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  getCompressionRatio() {
    if (this.uncompressed === 0) return 0
    return Math.round((1 - this.compressed / this.uncompressed) * 100)
  }
}

/**
 * Response assertion result
 */
export class AssertionResult extends BaseModel {
  static schema = {
    name: { type: 'string', required: true },
    passed: { type: 'boolean', required: true },
    error: { type: 'string', default: null },
    expected: { type: 'string', default: null },
    actual: { type: 'string', default: null }
  }
}

/**
 * Main Response model
 */
export class Response extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    requestId: { type: 'string', default: null },
    status: { type: 'number', default: 0 },
    statusText: { type: 'string', default: '' },
    headers: { type: 'object', default: {} },
    cookies: { type: 'array', default: [] },
    body: { type: 'string', default: '' },
    bodyType: { type: 'string', enum: ['text', 'json', 'xml', 'html', 'binary', 'image'], default: 'text' },
    timing: { type: ResponseTiming, default: () => new ResponseTiming() },
    size: { type: ResponseSize, default: () => new ResponseSize() },
    redirects: { type: 'array', default: [] },
    assertions: { type: 'array', default: [] },
    error: { type: 'object', default: null },
    raw: { type: 'string', default: '' },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    // Normalize ID fields to strings
    if (data.id && typeof data.id !== 'string') {
      data.id = String(data.id)
    }
    if (data.requestId && typeof data.requestId !== 'string' && data.requestId !== null) {
      data.requestId = String(data.requestId)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }

    if (data.timing && !(data.timing instanceof ResponseTiming)) {
      data.timing = new ResponseTiming(data.timing)
    }

    if (data.size && !(data.size instanceof ResponseSize)) {
      data.size = new ResponseSize(data.size)
    }

    if (data.cookies) {
      data.cookies = data.cookies.map(c =>
        c instanceof ResponseCookie ? c.toJSON() : new ResponseCookie(c).toJSON()
      )
    }

    if (data.assertions) {
      data.assertions = data.assertions.map(a =>
        a instanceof AssertionResult ? a.toJSON() : new AssertionResult(a).toJSON()
      )
    }

    super(data)
  }

  /**
   * Get status category
   */
  getStatusCategory() {
    for (const [category, range] of Object.entries(STATUS_CATEGORIES)) {
      if (this.status >= range.min && this.status <= range.max) {
        return { name: category, ...range }
      }
    }
    return { name: 'unknown', color: 'gray' }
  }

  /**
   * Check if response is successful
   */
  isSuccess() {
    return this.status >= 200 && this.status < 300
  }

  /**
   * Check if response is an error
   */
  isError() {
    return this.status >= 400 || this.error !== null
  }

  /**
   * Get header value (case-insensitive)
   */
  getHeader(name) {
    const lowerName = name.toLowerCase()
    for (const [key, value] of Object.entries(this.headers)) {
      if (key.toLowerCase() === lowerName) {
        return value
      }
    }
    return null
  }

  /**
   * Get content type
   */
  getContentType() {
    const contentType = this.getHeader('content-type')
    if (!contentType) return 'text/plain'
    return contentType.split(';')[0].trim()
  }

  /**
   * Detect body type from content type
   */
  detectBodyType() {
    const contentType = this.getContentType()

    if (contentType.includes('json')) return 'json'
    if (contentType.includes('xml')) return 'xml'
    if (contentType.includes('html')) return 'html'
    if (contentType.includes('image')) return 'image'
    if (contentType.includes('octet-stream')) return 'binary'
    if (contentType.includes('pdf')) return 'binary'

    return 'text'
  }

  /**
   * Get parsed body based on type
   */
  getParsedBody() {
    if (!this.body) return null

    try {
      switch (this.bodyType) {
        case 'json':
          return JSON.parse(this.body)
        case 'xml':
        case 'html':
          return this.body
        case 'binary':
        case 'image':
          return `[Binary data: ${this.size.getFormattedSize()}]`
        default:
          return this.body
      }
    } catch (error) {
      return this.body
    }
  }

  /**
   * Format body for display
   */
  getFormattedBody() {
    if (!this.body) return ''

    try {
      if (this.bodyType === 'json') {
        return JSON.stringify(JSON.parse(this.body), null, 2)
      }
      return this.body
    } catch {
      return this.body
    }
  }

  /**
   * Add cookie
   */
  addCookie(cookie) {
    const c = cookie instanceof ResponseCookie ? cookie.toJSON() : new ResponseCookie(cookie).toJSON()
    this.cookies.push(c)
    return this
  }

  /**
   * Get cookie by name
   */
  getCookie(name) {
    return this.cookies.find(c => c.name === name)
  }

  /**
   * Add assertion result
   */
  addAssertion(result) {
    const a = result instanceof AssertionResult ? result.toJSON() : new AssertionResult(result).toJSON()
    this.assertions.push(a)
    return this
  }

  /**
   * Check if all assertions passed
   */
  allAssertionsPassed() {
    return this.assertions.every(a => a.passed)
  }

  /**
   * Get failed assertions
   */
  getFailedAssertions() {
    return this.assertions.filter(a => !a.passed)
  }

  /**
   * Set error
   */
  setError(error) {
    this.error = {
      message: error.message || String(error),
      code: error.code || 'UNKNOWN',
      stack: error.stack || null,
      timestamp: BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Create response from axios response
   */
  static fromAxiosResponse(axiosResponse) {
    const response = new Response({
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: axiosResponse.headers,
      body: typeof axiosResponse.data === 'object'
        ? JSON.stringify(axiosResponse.data)
        : String(axiosResponse.data)
    })

    response.bodyType = response.detectBodyType()

    if (axiosResponse.headers['set-cookie']) {
      const cookies = Array.isArray(axiosResponse.headers['set-cookie'])
        ? axiosResponse.headers['set-cookie']
        : [axiosResponse.headers['set-cookie']]

      cookies.forEach(cookieString => {
        response.addCookie(Response.parseCookieString(cookieString))
      })
    }

    return response
  }

  /**
   * Parse cookie string to cookie object
   */
  static parseCookieString(cookieString) {
    const parts = cookieString.split(';').map(p => p.trim())
    const [nameValue, ...attributes] = parts
    const [name, value] = nameValue.split('=')

    const cookie = { name, value: value || '' }

    attributes.forEach(attr => {
      const [key, val] = attr.split('=')
      const lowerKey = key.toLowerCase()

      switch (lowerKey) {
        case 'domain':
          cookie.domain = val
          break
        case 'path':
          cookie.path = val
          break
        case 'expires':
          cookie.expires = val
          break
        case 'httponly':
          cookie.httpOnly = true
          break
        case 'secure':
          cookie.secure = true
          break
        case 'samesite':
          cookie.sameSite = val
          break
      }
    })

    return new ResponseCookie(cookie)
  }

  /**
   * Export response summary
   */
  exportSummary() {
    return {
      id: this.id,
      status: this.status,
      statusText: this.statusText,
      time: this.timing.total,
      size: this.size.getFormattedSize(),
      assertionsPassed: this.allAssertionsPassed(),
      error: this.error ? this.error.message : null,
      createdAt: this.createdAt
    }
  }
}