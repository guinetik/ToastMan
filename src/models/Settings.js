import { BaseModel } from './BaseModel.js'
import { Proxy } from './Proxy.js'
import { Certificate } from './Certificate.js'
import { AiSettings } from './AiSettings.js'

/**
 * Request settings configuration
 */
export class RequestSettings extends BaseModel {
  static schema = {
    timeout: { type: 'number', default: 30000, validator: (v) => v > 0 && v <= 300000 },
    followRedirects: { type: 'boolean', default: true },
    maxRedirects: { type: 'number', default: 10, validator: (v) => v >= 0 && v <= 50 },
    validateSSL: { type: 'boolean', default: true },
    encoding: { type: 'string', enum: ['auto', 'utf8', 'ascii', 'base64'], default: 'auto' },
    keepAlive: { type: 'boolean', default: true },
    cookieJar: { type: 'boolean', default: true }
  }
}

/**
 * UI settings configuration
 */
export class UISettings extends BaseModel {
  static schema = {
    theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'dark' },
    editorThemeDark: { type: 'string', default: 'gob' },      // ACE editor theme for dark mode
    editorThemeLight: { type: 'string', default: 'textmate' }, // ACE editor theme for light mode
    fontSize: { type: 'number', default: 14, validator: (v) => v >= 10 && v <= 24 },
    fontFamily: { type: 'string', default: 'monospace' },
    sidebarWidth: { type: 'number', default: 25, validator: (v) => v >= 15 && v <= 50 },
    responseViewMode: { type: 'string', enum: ['pretty', 'raw', 'preview'], default: 'pretty' },
    requestViewMode: { type: 'string', enum: ['params', 'headers', 'body', 'auth'], default: 'params' },
    showLineNumbers: { type: 'boolean', default: true },
    wordWrap: { type: 'boolean', default: false },
    minimap: { type: 'boolean', default: false },
    autoComplete: { type: 'boolean', default: true }
  }
}

/**
 * General app settings
 */
export class GeneralSettings extends BaseModel {
  static schema = {
    autoSave: { type: 'boolean', default: true },
    autoSaveInterval: { type: 'number', default: 30000, validator: (v) => v >= 10000 },
    confirmOnDelete: { type: 'boolean', default: true },
    confirmOnClose: { type: 'boolean', default: true },
    language: { type: 'string', enum: ['en', 'es', 'fr', 'de', 'zh', 'ja'], default: 'en' },
    maxHistoryItems: { type: 'number', default: 100, validator: (v) => v >= 0 && v <= 1000 },
    enableTelemetry: { type: 'boolean', default: false },
    checkForUpdates: { type: 'boolean', default: true },
    enableNotifications: { type: 'boolean', default: true },
    logLevel: { type: 'string', enum: ['error', 'warn', 'info', 'debug'], default: 'info' }
  }
}

/**
 * Shortcut key binding
 */
export class KeyBinding extends BaseModel {
  static schema = {
    action: { type: 'string', required: true },
    keys: { type: 'array', required: true },
    description: { type: 'string', default: '' },
    enabled: { type: 'boolean', default: true }
  }
}

/**
 * Main Settings model
 */
export class Settings extends BaseModel {
  static schema = {
    id: { type: 'string', default: 'app-settings' },
    general: { type: GeneralSettings, default: () => new GeneralSettings() },
    request: { type: RequestSettings, default: () => new RequestSettings() },
    ui: { type: UISettings, default: () => new UISettings() },
    ai: { type: AiSettings, default: () => new AiSettings() },
    proxy: { type: Proxy, default: () => new Proxy() },
    certificates: { type: 'array', default: [] },
    keyBindings: { type: 'array', default: () => Settings.getDefaultKeyBindings() },
    workspacePath: { type: 'string', default: '' },
    recentFiles: { type: 'array', default: [] },
    ignoredHosts: { type: 'array', default: [] },
    customHeaders: { type: 'array', default: [] },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    version: { type: 'string', default: '1.0.0' }
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

    if (data.general && !(data.general instanceof GeneralSettings)) {
      data.general = new GeneralSettings(data.general)
    }

    if (data.request && !(data.request instanceof RequestSettings)) {
      data.request = new RequestSettings(data.request)
    }

    if (data.ui && !(data.ui instanceof UISettings)) {
      data.ui = new UISettings(data.ui)
    }

    if (data.ai && !(data.ai instanceof AiSettings)) {
      data.ai = new AiSettings(data.ai)
    }

    if (data.proxy && !(data.proxy instanceof Proxy)) {
      data.proxy = new Proxy(data.proxy)
    }

    if (data.certificates) {
      data.certificates = data.certificates.map(cert =>
        cert instanceof Certificate ? cert.toJSON() : new Certificate(cert).toJSON()
      )
    }

    super(data)
  }

  static getDefaultKeyBindings() {
    return [
      new KeyBinding({ action: 'send_request', keys: ['ctrl', 'enter'], description: 'Send request' }).toJSON(),
      new KeyBinding({ action: 'save_request', keys: ['ctrl', 's'], description: 'Save request' }).toJSON(),
      new KeyBinding({ action: 'new_request', keys: ['ctrl', 'n'], description: 'New request' }).toJSON(),
      new KeyBinding({ action: 'new_collection', keys: ['ctrl', 'shift', 'n'], description: 'New collection' }).toJSON(),
      new KeyBinding({ action: 'duplicate_tab', keys: ['ctrl', 'd'], description: 'Duplicate tab' }).toJSON(),
      new KeyBinding({ action: 'close_tab', keys: ['ctrl', 'w'], description: 'Close tab' }).toJSON(),
      new KeyBinding({ action: 'next_tab', keys: ['ctrl', 'tab'], description: 'Next tab' }).toJSON(),
      new KeyBinding({ action: 'prev_tab', keys: ['ctrl', 'shift', 'tab'], description: 'Previous tab' }).toJSON(),
      new KeyBinding({ action: 'toggle_sidebar', keys: ['ctrl', 'b'], description: 'Toggle sidebar' }).toJSON(),
      new KeyBinding({ action: 'search', keys: ['ctrl', 'f'], description: 'Search' }).toJSON(),
      new KeyBinding({ action: 'settings', keys: ['ctrl', ','], description: 'Open settings' }).toJSON()
    ]
  }

  addCertificate(certificate) {
    const cert = certificate instanceof Certificate ? certificate.toJSON() : new Certificate(certificate).toJSON()
    this.certificates.push(cert)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeCertificate(certId) {
    this.certificates = this.certificates.filter(c => c.id !== certId)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  getCertificateForHost(host) {
    return this.certificates.find(cert => {
      const c = new Certificate(cert)
      return c.matchesHost(host) && c.enabled
    })
  }

  updateKeyBinding(action, keys) {
    const binding = this.keyBindings.find(kb => kb.action === action)
    if (binding) {
      binding.keys = keys
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  getKeyBinding(action) {
    const binding = this.keyBindings.find(kb => kb.action === action && kb.enabled)
    return binding ? binding.keys : null
  }

  addRecentFile(filePath) {
    this.recentFiles = this.recentFiles.filter(f => f !== filePath)
    this.recentFiles.unshift(filePath)

    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10)
    }

    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  addIgnoredHost(host) {
    if (!this.ignoredHosts.includes(host)) {
      this.ignoredHosts.push(host)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  removeIgnoredHost(host) {
    this.ignoredHosts = this.ignoredHosts.filter(h => h !== host)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  addCustomHeader(header) {
    this.customHeaders.push(header)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeCustomHeader(key) {
    this.customHeaders = this.customHeaders.filter(h => h.key !== key)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Reset settings to defaults
   */
  reset() {
    const defaults = new Settings()
    Object.assign(this, defaults)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  /**
   * Export settings for backup
   */
  export() {
    const exported = this.toJSON()
    exported.exportedAt = new Date().toISOString()
    exported.appVersion = this.version
    return exported
  }

  /**
   * Import settings from backup
   */
  static import(settingsData) {
    const settings = new Settings(settingsData)
    settings.updatedAt = BaseModel.getTimestamp()
    return settings
  }
}