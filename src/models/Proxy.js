import { BaseModel } from './BaseModel.js'

/**
 * Proxy protocols
 */
export const PROXY_PROTOCOLS = ['http', 'https', 'socks4', 'socks5']

/**
 * Proxy authentication types
 */
export const PROXY_AUTH_TYPES = ['none', 'basic', 'ntlm']

/**
 * Proxy model for network configuration
 */
export class Proxy extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', default: 'Default Proxy' },
    enabled: { type: 'boolean', default: false },
    protocol: { type: 'string', enum: PROXY_PROTOCOLS, default: 'http' },
    host: { type: 'string', default: '' },
    port: { type: 'number', default: 8080, validator: (v) => v > 0 && v <= 65535 },
    auth: { type: 'object', default: null },
    excludeList: { type: 'array', default: [] },
    includeList: { type: 'array', default: [] },
    useSystemProxy: { type: 'boolean', default: false },
    tunneling: { type: 'boolean', default: false },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    // Normalize ID field to string
    if (data.id && typeof data.id !== 'string') {
      data.id = String(data.id)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }
    if (data.updatedAt && typeof data.updatedAt !== 'string') {
      data.updatedAt = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : String(data.updatedAt)
    }

    if (data.auth && !(data.auth instanceof ProxyAuth)) {
      data.auth = new ProxyAuth(data.auth).toJSON()
    }

    super(data)
    this.validateProxy()
  }

  validateProxy() {
    if (this.enabled && !this.useSystemProxy) {
      if (!this.host) {
        throw new Error('Proxy host is required when proxy is enabled')
      }

      if (!this.isValidHost(this.host)) {
        throw new Error(`Invalid proxy host: ${this.host}`)
      }
    }

    if (this.protocol.startsWith('socks') && this.auth && this.auth.type === 'ntlm') {
      throw new Error('NTLM authentication is not supported for SOCKS proxies')
    }
  }

  /**
   * Validate host format
   */
  isValidHost(host) {
    if (!host) return false

    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/
    const localhostRegex = /^localhost$/

    return domainRegex.test(host) || ipRegex.test(host) || ipv6Regex.test(host) || localhostRegex.test(host)
  }

  /**
   * Set proxy authentication
   */
  setAuthentication(username, password, type = 'basic') {
    this.auth = new ProxyAuth({ type, username, password }).toJSON()
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Remove proxy authentication
   */
  removeAuthentication() {
    this.auth = null
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Add host to exclude list
   */
  addExcludedHost(host) {
    if (!this.excludeList.includes(host)) {
      this.excludeList.push(host)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Remove host from exclude list
   */
  removeExcludedHost(host) {
    const index = this.excludeList.indexOf(host)
    if (index > -1) {
      this.excludeList.splice(index, 1)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Add host to include list (only these will use proxy)
   */
  addIncludedHost(host) {
    if (!this.includeList.includes(host)) {
      this.includeList.push(host)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Remove host from include list
   */
  removeIncludedHost(host) {
    const index = this.includeList.indexOf(host)
    if (index > -1) {
      this.includeList.splice(index, 1)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Check if a host should use this proxy
   */
  shouldUseProxy(host) {
    if (!this.enabled) return false
    if (!host) return false

    const normalizedHost = host.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]

    if (this.includeList.length > 0) {
      return this.matchesHostList(normalizedHost, this.includeList)
    }

    if (this.excludeList.length > 0) {
      return !this.matchesHostList(normalizedHost, this.excludeList)
    }

    return true
  }

  /**
   * Check if host matches any pattern in the list
   */
  matchesHostList(host, list) {
    return list.some(pattern => {
      const normalizedPattern = pattern.toLowerCase()

      if (normalizedPattern === host) return true

      if (normalizedPattern.startsWith('*.')) {
        const domain = normalizedPattern.substring(2)
        return host.endsWith(domain)
      }

      if (normalizedPattern.includes('*')) {
        const regex = new RegExp('^' + normalizedPattern.replace(/\*/g, '.*') + '$')
        return regex.test(host)
      }

      return false
    })
  }

  /**
   * Get proxy URL string
   */
  getProxyUrl() {
    if (!this.enabled || !this.host) return null

    let url = `${this.protocol}://`

    if (this.auth) {
      const auth = new ProxyAuth(this.auth)
      if (auth.username && auth.password) {
        url += `${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.password)}@`
      }
    }

    url += `${this.host}:${this.port}`
    return url
  }

  /**
   * Get proxy configuration for HTTP client
   */
  getClientConfig() {
    if (!this.enabled) return null

    const config = {
      protocol: this.protocol,
      host: this.host,
      port: this.port
    }

    if (this.auth) {
      const auth = new ProxyAuth(this.auth)
      config.auth = auth.getAuthHeader()
    }

    if (this.tunneling) {
      config.tunnel = true
    }

    return config
  }

  /**
   * Create proxy from URL string
   */
  static fromUrl(proxyUrl) {
    try {
      const url = new URL(proxyUrl)
      const proxy = new Proxy({
        protocol: url.protocol.replace(':', ''),
        host: url.hostname,
        port: parseInt(url.port) || 8080,
        enabled: true
      })

      if (url.username && url.password) {
        proxy.setAuthentication(
          decodeURIComponent(url.username),
          decodeURIComponent(url.password)
        )
      }

      return proxy
    } catch (error) {
      throw new Error(`Invalid proxy URL: ${error.message}`)
    }
  }
}

/**
 * Proxy authentication model
 */
export class ProxyAuth extends BaseModel {
  static schema = {
    type: { type: 'string', enum: PROXY_AUTH_TYPES, default: 'basic' },
    username: { type: 'string', default: '' },
    password: { type: 'string', default: '' },
    domain: { type: 'string', default: '' },
    workstation: { type: 'string', default: '' }
  }

  /**
   * Get authorization header value
   */
  getAuthHeader() {
    if (this.type === 'none' || !this.username || !this.password) {
      return null
    }

    switch (this.type) {
      case 'basic':
        const credentials = `${this.username}:${this.password}`
        return `Basic ${Buffer.from(credentials).toString('base64')}`

      case 'ntlm':
        return {
          username: this.username,
          password: this.password,
          domain: this.domain || '',
          workstation: this.workstation || ''
        }

      default:
        return null
    }
  }

  /**
   * Export auth (without sensitive data)
   */
  exportSafe() {
    return {
      type: this.type,
      username: this.username,
      password: '[REDACTED]',
      domain: this.domain,
      workstation: this.workstation
    }
  }
}