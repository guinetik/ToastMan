import { BaseController } from './BaseController.js'

/**
 * Controller for RequestAuthEditor component
 * Handles authentication configuration state and logic
 */
export class RequestAuthEditorController extends BaseController {
  constructor() {
    super('RequestAuthEditorController')
    this.init()
  }

  /**
   * Initialize controller state
   */
  init() {
    super.init()

    // Create reactive state
    this.createState({
      // Current auth type
      currentAuthType: 'none',

      // Bearer token config
      bearerToken: '',

      // Basic auth config
      basicUsername: '',
      basicPassword: '',

      // API Key config
      apiKeyName: 'X-API-Key',
      apiKeyValue: '',
      apiKeyLocation: 'header',

      // Full auth value (the model value)
      authValue: {
        type: 'none',
        bearer: { token: '' },
        basic: { username: '', password: '' },
        apikey: { key: 'X-API-Key', value: '', in: 'header' }
      }
    })
  }

  /**
   * Get available auth types
   */
  getAuthTypes() {
    return [
      { value: 'none', label: 'No Auth', description: 'No authentication' },
      { value: 'bearer', label: 'Bearer Token', description: 'JWT, OAuth access tokens' },
      { value: 'basic', label: 'Basic Auth', description: 'Username and password' },
      { value: 'apikey', label: 'API Key', description: 'Custom header or query param' }
    ]
  }

  /**
   * Get API key location options
   */
  getApiKeyLocations() {
    return [
      { value: 'header', label: 'Header' },
      { value: 'query', label: 'Query Param' }
    ]
  }

  /**
   * Initialize from model value
   */
  initializeFromModel(modelValue) {
    if (!modelValue || !modelValue.type) {
      this.resetToDefaults()
      return
    }

    // Set current type
    this.state.currentAuthType = modelValue.type || 'none'
    this.state.authValue = { ...modelValue }

    // Set type-specific values
    if (modelValue.bearer) {
      this.state.bearerToken = modelValue.bearer.token || ''
    }

    if (modelValue.basic) {
      this.state.basicUsername = modelValue.basic.username || ''
      this.state.basicPassword = modelValue.basic.password || ''
    }

    if (modelValue.apikey) {
      this.state.apiKeyName = modelValue.apikey.key || 'X-API-Key'
      this.state.apiKeyValue = modelValue.apikey.value || ''
      this.state.apiKeyLocation = modelValue.apikey.in || 'header'
    }

    this.logger.debug('Initialized from model:', modelValue)
  }

  /**
   * Reset to default values
   */
  resetToDefaults() {
    this.state.currentAuthType = 'none'
    this.state.bearerToken = ''
    this.state.basicUsername = ''
    this.state.basicPassword = ''
    this.state.apiKeyName = 'X-API-Key'
    this.state.apiKeyValue = ''
    this.state.apiKeyLocation = 'header'
    this.state.authValue = {
      type: 'none',
      bearer: { token: '' },
      basic: { username: '', password: '' },
      apikey: { key: 'X-API-Key', value: '', in: 'header' }
    }
  }

  /**
   * Update auth value and emit changes
   */
  updateAuth(updates) {
    const newValue = { ...this.state.authValue, ...updates }
    this.state.authValue = newValue
    this.emit('update:modelValue', newValue)
    this.logger.debug('Updated auth:', newValue)
  }

  /**
   * Change auth type
   */
  changeAuthType(type) {
    this.state.currentAuthType = type
    this.updateAuth({ type })
  }

  /**
   * Update bearer token
   */
  updateBearerToken(token) {
    this.state.bearerToken = token
    this.updateAuth({
      bearer: { token }
    })
  }

  /**
   * Update basic auth username
   */
  updateBasicUsername(username) {
    this.state.basicUsername = username
    this.updateAuth({
      basic: {
        username,
        password: this.state.basicPassword
      }
    })
  }

  /**
   * Update basic auth password
   */
  updateBasicPassword(password) {
    this.state.basicPassword = password
    this.updateAuth({
      basic: {
        username: this.state.basicUsername,
        password
      }
    })
  }

  /**
   * Update API key name
   */
  updateApiKeyName(key) {
    this.state.apiKeyName = key
    this.updateAuth({
      apikey: {
        key,
        value: this.state.apiKeyValue,
        in: this.state.apiKeyLocation
      }
    })
  }

  /**
   * Update API key value
   */
  updateApiKeyValue(value) {
    this.state.apiKeyValue = value
    this.updateAuth({
      apikey: {
        key: this.state.apiKeyName,
        value,
        in: this.state.apiKeyLocation
      }
    })
  }

  /**
   * Update API key location (header or query)
   */
  updateApiKeyLocation(location) {
    this.state.apiKeyLocation = location
    this.updateAuth({
      apikey: {
        key: this.state.apiKeyName,
        value: this.state.apiKeyValue,
        in: location
      }
    })
  }

  /**
   * Check if current auth is configured (non-empty)
   */
  isAuthConfigured() {
    const type = this.state.currentAuthType
    if (type === 'none') return false

    switch (type) {
      case 'bearer':
        return !!this.state.bearerToken
      case 'basic':
        return !!this.state.basicUsername
      case 'apikey':
        return !!this.state.apiKeyName && !!this.state.apiKeyValue
      default:
        return false
    }
  }

  /**
   * Get a human-readable auth summary
   */
  getAuthSummary() {
    const type = this.state.currentAuthType
    switch (type) {
      case 'none':
        return null
      case 'bearer':
        return this.state.bearerToken
          ? `Bearer ${this.state.bearerToken.substring(0, 20)}...`
          : null
      case 'basic':
        return this.state.basicUsername
          ? `Basic (${this.state.basicUsername})`
          : null
      case 'apikey':
        return this.state.apiKeyName && this.state.apiKeyValue
          ? `${this.state.apiKeyName} (${this.state.apiKeyLocation})`
          : null
      default:
        return null
    }
  }

  /**
   * Get the cURL representation hint for current auth
   */
  getCurlHint() {
    const type = this.state.currentAuthType
    switch (type) {
      case 'bearer':
        return '-H \'Authorization: Bearer <token>\''
      case 'basic':
        return '-u \'<username>:<password>\''
      case 'apikey':
        if (this.state.apiKeyLocation === 'query') {
          return `?${this.state.apiKeyName || 'api_key'}=<value>`
        }
        return `-H '${this.state.apiKeyName || 'X-API-Key'}: <value>'`
      default:
        return null
    }
  }

  /**
   * Reset auth to no auth
   */
  reset() {
    this.resetToDefaults()
    this.emit('update:modelValue', this.state.authValue)
  }
}
