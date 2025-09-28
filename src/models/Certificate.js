import { BaseModel } from './BaseModel.js'

/**
 * Certificate types
 */
export const CERT_TYPES = ['client', 'ca', 'server']
export const KEY_FORMATS = ['pem', 'der', 'pfx', 'p12']

/**
 * Certificate model for SSL/TLS configuration
 */
export class Certificate extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', required: true },
    type: { type: 'string', enum: CERT_TYPES, default: 'client' },
    host: { type: 'string', default: '' },
    port: { type: 'number', default: 443, validator: (v) => v > 0 && v <= 65535 },
    cert: { type: 'object', default: null },
    key: { type: 'object', default: null },
    ca: { type: 'object', default: null },
    passphrase: { type: 'string', default: '' },
    pfx: { type: 'object', default: null },
    enabled: { type: 'boolean', default: true },
    verifyHost: { type: 'boolean', default: true },
    verifyExpiry: { type: 'boolean', default: true },
    rejectUnauthorized: { type: 'boolean', default: true },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    expiresAt: { type: 'string', default: null }
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
    if (data.expiresAt && typeof data.expiresAt !== 'string' && data.expiresAt !== null) {
      data.expiresAt = data.expiresAt instanceof Date ? data.expiresAt.toISOString() : String(data.expiresAt)
    }

    super(data)
    this.validateCertificate()
  }

  validateCertificate() {
    if (this.type === 'client') {
      if (!this.pfx && (!this.cert || !this.key)) {
        throw new Error('Client certificate requires either PFX/P12 or both cert and key files')
      }
    }

    if (this.type === 'ca' && !this.ca) {
      throw new Error('CA certificate requires a CA file')
    }

    if (this.host && !this.isValidHostPattern(this.host)) {
      throw new Error(`Invalid host pattern: ${this.host}`)
    }
  }

  /**
   * Check if host pattern is valid (supports wildcards)
   */
  isValidHostPattern(pattern) {
    if (!pattern) return false

    const wildcardRegex = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    const localhostRegex = /^localhost(:\d+)?$/

    return wildcardRegex.test(pattern) || ipRegex.test(pattern) || localhostRegex.test(pattern)
  }

  /**
   * Check if certificate matches a given host
   */
  matchesHost(host) {
    if (!this.host) return true
    if (this.host === host) return true

    if (this.host.startsWith('*.')) {
      const domain = this.host.substring(2)
      return host.endsWith(domain) || host === domain.substring(1)
    }

    const hostWithoutPort = host.split(':')[0]
    const patternWithoutPort = this.host.split(':')[0]

    return hostWithoutPort === patternWithoutPort
  }

  /**
   * Set certificate from file content
   */
  setCertificate(content, format = 'pem') {
    this.cert = {
      content: content,
      format: format,
      encoding: format === 'pem' ? 'utf8' : 'base64'
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Set private key from file content
   */
  setPrivateKey(content, format = 'pem', passphrase = '') {
    this.key = {
      content: content,
      format: format,
      encoding: format === 'pem' ? 'utf8' : 'base64'
    }
    if (passphrase) {
      this.passphrase = passphrase
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Set CA certificate from file content
   */
  setCACertificate(content, format = 'pem') {
    this.ca = {
      content: content,
      format: format,
      encoding: format === 'pem' ? 'utf8' : 'base64'
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Set PFX/P12 from file content
   */
  setPFX(content, passphrase = '') {
    this.pfx = {
      content: content,
      encoding: 'base64'
    }
    if (passphrase) {
      this.passphrase = passphrase
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Check if certificate is expired
   */
  isExpired() {
    if (!this.expiresAt) return false
    return new Date(this.expiresAt) < new Date()
  }

  /**
   * Get certificate options for HTTP client
   */
  getClientOptions() {
    const options = {
      rejectUnauthorized: this.rejectUnauthorized
    }

    if (this.pfx) {
      options.pfx = Buffer.from(this.pfx.content, this.pfx.encoding || 'base64')
      if (this.passphrase) {
        options.passphrase = this.passphrase
      }
    } else {
      if (this.cert) {
        options.cert = this.cert.encoding === 'base64'
          ? Buffer.from(this.cert.content, 'base64')
          : this.cert.content
      }

      if (this.key) {
        options.key = this.key.encoding === 'base64'
          ? Buffer.from(this.key.content, 'base64')
          : this.key.content

        if (this.passphrase) {
          options.passphrase = this.passphrase
        }
      }
    }

    if (this.ca) {
      options.ca = this.ca.encoding === 'base64'
        ? Buffer.from(this.ca.content, 'base64')
        : this.ca.content
    }

    return options
  }

  /**
   * Export certificate (without sensitive data)
   */
  exportSafe() {
    const exported = this.toJSON()

    if (exported.cert) {
      exported.cert = { ...exported.cert, content: '[REDACTED]' }
    }
    if (exported.key) {
      exported.key = { ...exported.key, content: '[REDACTED]' }
    }
    if (exported.ca) {
      exported.ca = { ...exported.ca, content: '[REDACTED]' }
    }
    if (exported.pfx) {
      exported.pfx = { ...exported.pfx, content: '[REDACTED]' }
    }
    if (exported.passphrase) {
      exported.passphrase = '[REDACTED]'
    }

    return exported
  }

  /**
   * Create a self-signed certificate config (for testing)
   */
  static createSelfSigned(host = 'localhost') {
    return new Certificate({
      name: `Self-signed for ${host}`,
      type: 'server',
      host: host,
      rejectUnauthorized: false,
      verifyHost: false,
      verifyExpiry: false
    })
  }
}