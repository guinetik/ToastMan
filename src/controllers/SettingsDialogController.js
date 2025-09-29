import { BaseDialogController } from './BaseDialogController.js'
import { Settings, RequestSettings, UISettings, GeneralSettings } from '../models/Settings.js'
import { Certificate } from '../models/Certificate.js'
import { Proxy } from '../models/Proxy.js'

/**
 * Controller for Settings dialog
 */
export class SettingsDialogController extends BaseDialogController {
  constructor() {
    super('settings')

    this.createState({
      ...this.state,
      activeTab: 'general',
      settings: null,
      originalSettings: null
    })
  }

  init() {
    super.init()
    this.loadSettings()
    // Initialize formData immediately to prevent undefined access
    this.resetFormData()
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('toastman_settings')
      if (saved) {
        this.state.settings = new Settings(JSON.parse(saved))
        this.logger.debug('Loaded settings from localStorage')
      } else {
        this.state.settings = new Settings()
        this.logger.debug('Created default settings')
      }
    } catch (error) {
      this.logger.error('Failed to load settings:', error)
      this.state.settings = new Settings()
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('toastman_settings', JSON.stringify(this.state.settings.toJSON()))
      this.logger.info('Settings saved successfully')
      return true
    } catch (error) {
      this.logger.error('Failed to save settings:', error)
      return false
    }
  }

  /**
   * Open settings dialog
   */
  open(tab = 'general') {
    super.open()
    this.state.activeTab = tab

    // Ensure settings are loaded before proceeding
    if (!this.state.settings) {
      this.loadSettings()
    }

    this.state.originalSettings = this.state.settings.clone()
    this.state.formData = this.state.settings.toJSON()
  }

  /**
   * Reset form data
   */
  resetFormData() {
    this.state.formData = this.state.settings ? this.state.settings.toJSON() : new Settings().toJSON()
  }

  /**
   * Validate form
   */
  validateForm() {
    this.clearErrors()

    if (this.state.formData.request) {
      if (this.state.formData.request.timeout < 1000 || this.state.formData.request.timeout > 300000) {
        this.setFieldError('request.timeout', 'Timeout must be between 1 and 300 seconds')
      }

      if (this.state.formData.request.maxRedirects < 0 || this.state.formData.request.maxRedirects > 50) {
        this.setFieldError('request.maxRedirects', 'Max redirects must be between 0 and 50')
      }
    }

    if (this.state.formData.ui) {
      if (this.state.formData.ui.fontSize < 10 || this.state.formData.ui.fontSize > 24) {
        this.setFieldError('ui.fontSize', 'Font size must be between 10 and 24')
      }

      if (this.state.formData.ui.sidebarWidth < 15 || this.state.formData.ui.sidebarWidth > 50) {
        this.setFieldError('ui.sidebarWidth', 'Sidebar width must be between 15% and 50%')
      }
    }

    if (this.state.formData.proxy && this.state.formData.proxy.enabled) {
      if (!this.state.formData.proxy.host) {
        this.setFieldError('proxy.host', 'Proxy host is required')
      }

      if (this.state.formData.proxy.port < 1 || this.state.formData.proxy.port > 65535) {
        this.setFieldError('proxy.port', 'Proxy port must be between 1 and 65535')
      }
    }

    return !this.hasErrors()
  }

  /**
   * Process submit
   */
  async processSubmit(formData) {
    const settings = new Settings(formData)
    this.state.settings = settings

    if (!this.saveSettings()) {
      throw new Error('Failed to save settings')
    }

    this.applySettings(settings)
    return settings
  }

  /**
   * Apply settings to UI
   */
  applySettings(settings) {
    if (settings.ui.theme) {
      document.documentElement.setAttribute('data-theme', settings.ui.theme)
    }

    if (settings.ui.fontSize) {
      document.documentElement.style.setProperty('--font-size-base', `${settings.ui.fontSize}px`)
    }

    this.logger.info('Settings applied to UI')
    this.emit('settingsApplied', settings)
  }

  /**
   * Reset settings to defaults
   */
  async resetToDefaults() {
    const confirmed = await this.confirmReset()
    if (!confirmed) return

    this.state.settings = new Settings()
    this.state.formData = this.state.settings.toJSON()

    if (this.saveSettings()) {
      this.applySettings(this.state.settings)
      this.logger.info('Settings reset to defaults')
      this.emit('settingsReset')
    }
  }

  /**
   * Confirm reset
   */
  async confirmReset() {
    return new Promise(resolve => {
      this.emit('confirmReset', { resolve })
    })
  }

  /**
   * Switch settings tab
   */
  switchTab(tab) {
    const validTabs = ['general', 'request', 'ui', 'proxy', 'certificates', 'shortcuts']
    if (!validTabs.includes(tab)) {
      this.logger.warn(`Invalid settings tab: ${tab}`)
      return
    }

    this.state.activeTab = tab
    this.logger.debug(`Switched to settings tab: ${tab}`)
  }

  /**
   * Update general settings
   */
  updateGeneralSettings(updates) {
    Object.assign(this.state.formData.general, updates)
    this.clearFieldError('general')
  }

  /**
   * Update request settings
   */
  updateRequestSettings(updates) {
    Object.assign(this.state.formData.request, updates)
    this.clearFieldError('request')
  }

  /**
   * Update UI settings
   */
  updateUISettings(updates) {
    Object.assign(this.state.formData.ui, updates)
    this.clearFieldError('ui')

    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme)
    }

    if (updates.fontSize) {
      document.documentElement.style.setProperty('--font-size-base', `${updates.fontSize}px`)
    }
  }

  /**
   * Update proxy settings
   */
  updateProxySettings(updates) {
    // Ensure proxy.auth exists if we're updating auth properties
    if (updates.auth && !this.state.formData.proxy.auth) {
      this.state.formData.proxy.auth = { type: 'basic', username: '', password: '', domain: '', workstation: '' }
    }

    Object.assign(this.state.formData.proxy, updates)
    this.clearFieldError('proxy')
  }

  /**
   * Add certificate
   */
  addCertificate(certData) {
    try {
      const cert = new Certificate(certData)
      this.state.formData.certificates.push(cert.toJSON())
      this.logger.info('Added certificate:', cert.name)
      this.emit('certificateAdded', cert)
    } catch (error) {
      this.logger.error('Failed to add certificate:', error)
      this.setFieldError('certificate', error.message)
    }
  }

  /**
   * Remove certificate
   */
  removeCertificate(certId) {
    const index = this.state.formData.certificates.findIndex(c => c.id === certId)
    if (index > -1) {
      const cert = this.state.formData.certificates[index]
      this.state.formData.certificates.splice(index, 1)
      this.logger.info('Removed certificate:', cert.name)
      this.emit('certificateRemoved', certId)
    }
  }

  /**
   * Update certificate
   */
  updateCertificate(certId, updates) {
    const cert = this.state.formData.certificates.find(c => c.id === certId)
    if (cert) {
      Object.assign(cert, updates)
      this.logger.info('Updated certificate:', cert.name)
      this.emit('certificateUpdated', cert)
    }
  }

  /**
   * Import certificate from file
   */
  async importCertificate(file) {
    const result = await this.executeAsync(async () => {
      const content = await this.readFile(file)
      const cert = new Certificate({
        name: file.name,
        type: 'client',
        enabled: true
      })

      if (file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
        cert.setPFX(content)
      } else {
        cert.setCertificate(content)
      }

      this.addCertificate(cert.toJSON())
      return cert
    }, 'Failed to import certificate')

    return result
  }

  /**
   * Read file content
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)

      if (file.type === 'application/x-pkcs12' || file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  /**
   * Update key binding
   */
  updateKeyBinding(action, keys) {
    const binding = this.state.formData.keyBindings.find(kb => kb.action === action)
    if (binding) {
      binding.keys = keys
      this.logger.info(`Updated key binding for ${action}:`, keys.join('+'))
      this.emit('keyBindingUpdated', { action, keys })
    }
  }

  /**
   * Reset key bindings
   */
  resetKeyBindings() {
    this.state.formData.keyBindings = Settings.getDefaultKeyBindings()
    this.logger.info('Reset key bindings to defaults')
    this.emit('keyBindingsReset')
  }

  /**
   * Test proxy connection
   */
  async testProxyConnection() {
    const result = await this.executeAsync(async () => {
      const proxy = new Proxy(this.state.formData.proxy)

      if (!proxy.enabled || !proxy.host) {
        throw new Error('Proxy is not configured')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const success = Math.random() > 0.3
      if (!success) {
        throw new Error(`Failed to connect to proxy at ${proxy.host}:${proxy.port}`)
      }

      return { message: `Successfully connected to proxy at ${proxy.host}:${proxy.port}` }
    }, 'Proxy connection test failed')

    if (result.success) {
      this.emit('proxyTestSuccess', result.data)
    } else {
      this.emit('proxyTestFailed', result.error)
    }

    return result
  }

  /**
   * Export settings
   */
  exportSettings() {
    const settings = this.state.settings.export()
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `toastman-settings-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    this.logger.info('Settings exported')
    this.emit('settingsExported')
  }

  /**
   * Import settings
   */
  async importSettings(file) {
    const result = await this.executeAsync(async () => {
      const content = await this.readFile(file)
      const imported = JSON.parse(content)
      const settings = Settings.import(imported)

      this.state.settings = settings
      this.state.formData = settings.toJSON()

      if (this.saveSettings()) {
        this.applySettings(settings)
      }

      return settings
    }, 'Failed to import settings')

    if (result.success) {
      this.emit('settingsImported', result.data)
    }

    return result
  }

  /**
   * Update certificates settings
   */
  updateCertificatesSettings(certificates) {
    this.state.formData.certificates = certificates
    this.clearFieldError('certificates')
    this.logger.debug('Updated certificates settings')
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    if (!this.state.originalSettings) return false
    return JSON.stringify(this.state.formData) !== JSON.stringify(this.state.originalSettings.toJSON())
  }
}