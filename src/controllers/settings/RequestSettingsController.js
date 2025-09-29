import { BaseController } from '../BaseController.js'
import { RequestSettings } from '../../models/Settings.js'

/**
 * Controller for Request Settings tab
 */
export class RequestSettingsController extends BaseController {
  constructor() {
    super('request-settings')

    this.createState({
      settings: null,
      errors: {}
    })
  }

  /**
   * Initialize with settings data
   */
  init(requestSettings) {
    super.init()
    this.state.settings = requestSettings || new RequestSettings()
  }

  /**
   * Update request settings
   */
  updateSettings(updates) {
    Object.assign(this.state.settings, updates)
    this.clearErrors()
    this.logger.debug('Updated request settings:', updates)
    this.emit('settingsChanged', this.state.settings)
  }

  /**
   * Validate request settings
   */
  validate() {
    this.clearErrors()

    if (this.state.settings.timeout < 1000 || this.state.settings.timeout > 300000) {
      this.setError('timeout', 'Timeout must be between 1 and 300 seconds')
    }

    if (this.state.settings.maxRedirects < 0 || this.state.settings.maxRedirects > 50) {
      this.setError('maxRedirects', 'Max redirects must be between 0 and 50')
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