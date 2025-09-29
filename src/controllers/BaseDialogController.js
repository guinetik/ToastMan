import { BaseController } from './BaseController.js'

/**
 * Base controller for dialog components
 */
export class BaseDialogController extends BaseController {
  constructor(name) {
    super(name)

    this.createState({
      visible: false,
      loading: false,
      errors: {},
      formData: {}
    })

    // Initialize form data
    this.resetFormData()
  }

  /**
   * Open dialog
   */
  open(data = {}) {
    this.state.visible = true
    this.state.errors = {}
    this.state.loading = false

    if (data && Object.keys(data).length > 0) {
      this.state.formData = { ...data }
    } else {
      this.resetFormData()
    }

    this.logger.debug(`${this.name} dialog opened`)
    this.emit('opened', data)
  }

  /**
   * Close dialog
   */
  close() {
    this.state.visible = false
    this.state.errors = {}
    this.state.loading = false
    this.resetFormData()

    this.logger.debug(`${this.name} dialog closed`)
    this.emit('closed')
  }

  /**
   * Reset form data - override in subclasses
   */
  resetFormData() {
    this.state.formData = {}
  }

  /**
   * Validate form data
   */
  validateForm() {
    this.state.errors = {}
    return true
  }

  /**
   * Submit dialog
   */
  async submit() {
    if (!this.validateForm()) {
      this.logger.warn('Form validation failed')
      return { success: false, errors: this.state.errors }
    }

    this.state.loading = true

    const result = await this.executeAsync(async () => {
      const data = await this.processSubmit(this.state.formData)
      this.logger.info(`${this.name} dialog submitted successfully`)
      return data
    }, `Failed to submit ${this.name} dialog`)

    this.state.loading = false

    if (result.success) {
      this.emit('submitted', result.data)
      this.close()
    } else {
      this.handleSubmitError(result.error)
    }

    return result
  }

  /**
   * Process submit - override in subclasses
   */
  async processSubmit(formData) {
    return formData
  }

  /**
   * Handle submit error
   */
  handleSubmitError(error) {
    if (error.validationErrors) {
      this.state.errors = error.validationErrors
    } else {
      this.state.errors = {
        general: error.message || 'An error occurred'
      }
    }

    this.logger.error('Submit error:', error)
    this.emit('submitError', error)
  }

  /**
   * Cancel dialog
   */
  cancel() {
    if (this.state.loading) {
      this.logger.warn('Cannot cancel while loading')
      return
    }

    this.logger.debug(`${this.name} dialog cancelled`)
    this.emit('cancelled')
    this.close()
  }

  /**
   * Set field error
   */
  setFieldError(field, error) {
    this.state.errors[field] = error
  }

  /**
   * Clear field error
   */
  clearFieldError(field) {
    delete this.state.errors[field]
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.state.errors = {}
  }

  /**
   * Update form field
   */
  updateFormField(field, value) {
    this.state.formData[field] = value
    this.clearFieldError(field)
  }

  /**
   * Check if form has errors
   */
  hasErrors() {
    return Object.keys(this.state.errors).length > 0
  }

  /**
   * Check if dialog is visible
   */
  isVisible() {
    return this.state.visible
  }

  /**
   * Check if dialog is loading
   */
  isLoading() {
    return this.state.loading
  }

  /**
   * Confirm before closing (for unsaved changes)
   */
  async confirmClose() {
    if (this.hasUnsavedChanges()) {
      return new Promise(resolve => {
        this.emit('confirmClose', { resolve })
      })
    }
    return true
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    return false
  }
}