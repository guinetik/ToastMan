import { BaseController } from '../BaseController.js'
import { UISettings } from '../../models/Settings.js'

/**
 * Controller for UI Settings tab
 */
export class UISettingsController extends BaseController {
  constructor() {
    super('ui-settings')

    this.createState({
      settings: null,
      errors: {}
    })
  }

  /**
   * Initialize with settings data
   */
  init(uiSettings) {
    super.init()
    this.state.settings = uiSettings || new UISettings()
  }

  /**
   * Update UI settings
   */
  updateSettings(updates) {
    Object.assign(this.state.settings, updates)
    this.clearErrors()
    this.applyUIChanges(updates)
    this.logger.debug('Updated UI settings:', updates)
    this.emit('settingsChanged', this.state.settings)
  }

  /**
   * Apply UI changes immediately
   */
  applyUIChanges(updates) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement

      if (updates.theme) {
        if (updates.theme === 'auto') {
          // Use system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
        } else {
          root.setAttribute('data-theme', updates.theme)
        }
      }

      if (updates.fontSize) {
        root.style.setProperty('--font-size-base', `${updates.fontSize}px`)
      }

      if (updates.fontFamily) {
        root.style.setProperty('--font-family-mono', updates.fontFamily)
      }
    }
  }

  /**
   * Validate UI settings
   */
  validate() {
    this.clearErrors()

    if (this.state.settings.fontSize < 10 || this.state.settings.fontSize > 24) {
      this.setError('fontSize', 'Font size must be between 10 and 24 pixels')
    }

    if (this.state.settings.sidebarWidth < 15 || this.state.settings.sidebarWidth > 50) {
      this.setError('sidebarWidth', 'Sidebar width must be between 15% and 50%')
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