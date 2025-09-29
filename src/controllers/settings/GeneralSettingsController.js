import { BaseController } from '../BaseController.js'
import { GeneralSettings } from '../../models/Settings.js'

/**
 * Controller for General Settings tab
 */
export class GeneralSettingsController extends BaseController {
  constructor() {
    super('general-settings')

    this.createState({
      settings: null,
      errors: {}
    })
  }

  /**
   * Initialize with settings data
   */
  init(generalSettings) {
    super.init()
    this.state.settings = generalSettings || new GeneralSettings()
  }

  /**
   * Update general settings
   */
  updateSettings(updates) {
    Object.assign(this.state.settings, updates)
    this.clearErrors()
    this.logger.debug('Updated general settings:', updates)
    this.emit('settingsChanged', this.state.settings)
  }

  /**
   * Validate general settings
   */
  validate() {
    this.clearErrors()

    if (this.state.settings.autoSaveInterval < 10000 || this.state.settings.autoSaveInterval > 300000) {
      this.setError('autoSaveInterval', 'Auto-save interval must be between 10 and 300 seconds')
    }

    if (this.state.settings.maxHistoryItems < 0 || this.state.settings.maxHistoryItems > 1000) {
      this.setError('maxHistoryItems', 'Max history items must be between 0 and 1000')
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