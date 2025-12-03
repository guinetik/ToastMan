import { ref, computed } from 'vue'
import { BaseController } from './BaseController.js'

/**
 * Controller for RequestBodyEditor component
 * Handles all business logic for request body management, form data, URL encoding, and file handling
 */
export class RequestBodyEditorController extends BaseController {
  constructor() {
    super('RequestBodyEditorController')

    // Initialize state
    this.init()
  }

  /**
   * Initialize controller state
   */
  init() {
    super.init()

    // Create reactive state
    this.createState({
      // Current body configuration
      currentBodyType: 'none',
      currentRawType: 'json',

      // Form data items
      formDataItems: [],

      // URL encoded items
      urlEncodedItems: [],

      // Binary file state
      selectedFile: null,

      // Body value (the actual model value)
      bodyValue: {
        mode: 'none',
        raw: '',
        formData: [],
        urlEncoded: [],
        binary: null
      }
    })

    // Create computed properties
    this.createComputed('rawContent', () => {
      return this.state.bodyValue.raw || ''
    })

    this.createComputed('currentRawMode', () => {
      const rawType = this.getRawTypes().find(t => t.value === this.state.currentRawType)
      return rawType?.mode || 'text'
    })
  }

  /**
   * Get available body types
   */
  getBodyTypes() {
    return [
      { value: 'none', label: 'None' },
      { value: 'raw', label: 'Raw' },
      { value: 'form-data', label: 'Form Data' },
      { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
      { value: 'binary', label: 'Binary' }
    ]
  }

  /**
   * Get available raw content types
   */
  getRawTypes() {
    return [
      { value: 'text', label: 'Text', mode: 'text' },
      { value: 'json', label: 'JSON', mode: 'json' },
      { value: 'xml', label: 'XML', mode: 'xml' },
      { value: 'html', label: 'HTML', mode: 'html' }
    ]
  }

  /**
   * Initialize from model value
   */
  initializeFromModel(modelValue) {
    if (!modelValue) {
      modelValue = {
        mode: 'none',
        raw: '',
        formData: [],
        urlEncoded: [],
        binary: null
      }
    }

    // Set state from model
    this.state.bodyValue = { ...modelValue }
    this.state.currentBodyType = modelValue.mode || 'none'
    this.state.formDataItems = [...(modelValue.formData || [])]
    this.state.urlEncodedItems = [...(modelValue.urlEncoded || [])]
    this.state.selectedFile = modelValue.binary

    this.logger.debug('Initialized from model:', modelValue)
  }

  /**
   * Update the body value and emit changes
   */
  updateBody(updates) {
    const newValue = { ...this.state.bodyValue, ...updates }
    this.state.bodyValue = newValue
    this.emit('update:modelValue', newValue)

    this.logger.debug('Updated body:', newValue)
  }

  /**
   * Change body type
   */
  changeBodyType(type) {
    this.state.currentBodyType = type
    this.updateBody({ mode: type })

    // Emit event for UI to handle (like focusing editor)
    if (type === 'raw') {
      this.emit('focusEditor')
    }
  }

  /**
   * Change raw content type
   */
  changeRawType(type) {
    this.state.currentRawType = type
    // The editor will automatically update its language mode via computed property
  }

  /**
   * Update raw content
   */
  updateRawContent(value) {
    this.updateBody({ raw: value })
  }

  /**
   * Form data management methods
   */
  addFormDataItem() {
    const newItem = {
      key: '',
      value: '',
      type: 'text',
      enabled: true,
      id: Date.now() // Add unique ID for better tracking
    }
    this.state.formDataItems.push(newItem)
    this.updateBody({ formData: this.state.formDataItems })
  }

  removeFormDataItem(index) {
    if (index >= 0 && index < this.state.formDataItems.length) {
      this.state.formDataItems.splice(index, 1)
      this.updateBody({ formData: this.state.formDataItems })
    }
  }

  updateFormDataItem(index, field, value) {
    if (index >= 0 && index < this.state.formDataItems.length && this.state.formDataItems[index]) {
      this.state.formDataItems[index][field] = value
      this.updateBody({ formData: this.state.formDataItems })
    }
  }

  /**
   * URL encoded data management methods
   */
  addUrlEncodedItem() {
    const newItem = {
      key: '',
      value: '',
      enabled: true,
      id: Date.now() // Add unique ID for better tracking
    }
    this.state.urlEncodedItems.push(newItem)
    this.updateBody({ urlEncoded: this.state.urlEncodedItems })
  }

  removeUrlEncodedItem(index) {
    if (index >= 0 && index < this.state.urlEncodedItems.length) {
      this.state.urlEncodedItems.splice(index, 1)
      this.updateBody({ urlEncoded: this.state.urlEncodedItems })
    }
  }

  updateUrlEncodedItem(index, field, value) {
    if (index >= 0 && index < this.state.urlEncodedItems.length && this.state.urlEncodedItems[index]) {
      this.state.urlEncodedItems[index][field] = value
      this.updateBody({ urlEncoded: this.state.urlEncodedItems })
    }
  }

  /**
   * Binary file management methods
   */
  handleFileSelect(file) {
    if (file) {
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        path: file.path || `file://${file.name}` // For display purposes
      }

      this.state.selectedFile = fileInfo
      this.updateBody({ binary: fileInfo })

      this.logger.debug('File selected:', fileInfo)
    }
  }

  removeFile() {
    this.state.selectedFile = null
    this.updateBody({ binary: null })

    // Emit event for UI to clear file input
    this.emit('clearFileInput')
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 KB'
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  /**
   * Validate form data items
   */
  validateFormData() {
    const errors = []

    this.state.formDataItems.forEach((item, index) => {
      if (item.enabled && !item.key) {
        errors.push(`Form data item ${index + 1} is missing a key`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate URL encoded items
   */
  validateUrlEncoded() {
    const errors = []

    this.state.urlEncodedItems.forEach((item, index) => {
      if (item.enabled && !item.key) {
        errors.push(`URL encoded item ${index + 1} is missing a key`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get content-type header suggestion based on current body type
   */
  getContentTypeHeader() {
    switch (this.state.currentBodyType) {
      case 'raw':
        switch (this.state.currentRawType) {
          case 'json': return 'application/json'
          case 'xml': return 'application/xml'
          case 'html': return 'text/html'
          case 'text': return 'text/plain'
          default: return 'text/plain'
        }
      case 'x-www-form-urlencoded':
        return 'application/x-www-form-urlencoded'
      case 'binary':
        return 'application/octet-stream'
      case 'form-data':
        return 'multipart/form-data' // Note: boundary will be set by HTTP client
      default:
        return null
    }
  }

  /**
   * Export current body configuration for debugging
   */
  exportConfiguration() {
    return {
      bodyType: this.state.currentBodyType,
      rawType: this.state.currentRawType,
      bodyValue: this.state.bodyValue,
      formDataCount: this.state.formDataItems.length,
      urlEncodedCount: this.state.urlEncodedItems.length,
      hasFile: !!this.state.selectedFile,
      contentTypeHeader: this.getContentTypeHeader()
    }
  }

  /**
   * Reset to default state
   */
  reset() {
    this.state.currentBodyType = 'none'
    this.state.currentRawType = 'json'
    this.state.formDataItems = []
    this.state.urlEncodedItems = []
    this.state.selectedFile = null
    this.state.bodyValue = {
      mode: 'none',
      raw: '',
      formData: [],
      urlEncoded: [],
      binary: null
    }

    this.emit('update:modelValue', this.state.bodyValue)
  }
}