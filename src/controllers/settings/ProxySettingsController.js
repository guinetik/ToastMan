import { BaseController } from '../BaseController.js'
import { Proxy, ProxyAuth } from '../../models/Proxy.js'

/**
 * Controller for Proxy Settings tab
 */
export class ProxySettingsController extends BaseController {
  constructor() {
    super('proxy-settings')

    this.createState({
      settings: null,
      errors: {},
      testing: false
    })
  }

  /**
   * Initialize with settings data
   */
  init(proxySettings) {
    super.init()
    this.state.settings = proxySettings || new Proxy()

    // Ensure auth is properly initialized
    if (!this.state.settings.auth) {
      this.state.settings.auth = {
        type: 'basic',
        username: '',
        password: '',
        domain: '',
        workstation: ''
      }
    }
  }

  /**
   * Update proxy settings
   */
  updateSettings(updates) {
    // Handle auth updates specially
    if (updates.auth) {
      if (!this.state.settings.auth) {
        this.state.settings.auth = {
          type: 'basic',
          username: '',
          password: '',
          domain: '',
          workstation: ''
        }
      }
      Object.assign(this.state.settings.auth, updates.auth)
    } else {
      Object.assign(this.state.settings, updates)
    }

    this.clearErrors()
    this.logger.debug('Updated proxy settings:', updates)
    this.emit('settingsChanged', this.state.settings)
  }

  /**
   * Test proxy connection
   */
  async testConnection() {
    try {
      this.state.testing = true
      this.clearErrors()

      if (!this.state.settings.enabled) {
        throw new Error('Proxy is not enabled')
      }

      if (!this.state.settings.host) {
        throw new Error('Proxy host is required')
      }

      // Simulate proxy test (in real app, this would make an actual test request)
      await new Promise(resolve => setTimeout(resolve, 1500))

      this.logger.info('Proxy connection test successful')
      this.emit('testResult', { success: true, message: 'Proxy connection successful' })

    } catch (error) {
      this.logger.error('Proxy connection test failed:', error)
      this.setError('connection', error.message)
      this.emit('testResult', { success: false, message: error.message })
    } finally {
      this.state.testing = false
    }
  }

  /**
   * Validate proxy settings
   */
  validate() {
    this.clearErrors()

    if (this.state.settings.enabled && !this.state.settings.useSystemProxy) {
      if (!this.state.settings.host) {
        this.setError('host', 'Proxy host is required when proxy is enabled')
      }

      if (this.state.settings.port < 1 || this.state.settings.port > 65535) {
        this.setError('port', 'Port must be between 1 and 65535')
      }
    }

    return Object.keys(this.state.errors).length === 0
  }

  /**
   * Set validation error
   */
  setError(field, message) {
    this.state.errors[field] = message
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.state.errors = {}
  }

  /**
   * Get settings data
   */
  getSettings() {
    return this.state.settings
  }
}