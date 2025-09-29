import { ref, markRaw } from 'vue'

// Global alert state
const alertState = ref({
  show: false,
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK',
  cancelText: null,
  showInput: false,
  inputPlaceholder: '',
  inputValue: '',
  resolve: null,
  reject: null
})

export function useAlert() {
  /**
   * Show an alert dialog
   * @param {Object} options - Alert configuration
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Alert message
   * @param {string} options.type - Alert type: 'info', 'warning', 'error', 'success'
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text (if null, only shows confirm)
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  const showAlert = (options) => {
    return new Promise((resolve, reject) => {
      alertState.value = {
        show: true,
        title: options.title || 'Alert',
        message: options.message || '',
        type: options.type || 'info',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || null,
        showInput: false,
        inputPlaceholder: '',
        inputValue: '',
        resolve: markRaw(resolve),
        reject: markRaw(reject)
      }
    })
  }

  /**
   * Show a confirmation dialog
   * @param {Object} options - Confirmation configuration
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Confirmation message
   * @param {string} options.type - Alert type: 'info', 'warning', 'error', 'success'
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  const showConfirm = (options) => {
    return new Promise((resolve, reject) => {
      alertState.value = {
        show: true,
        title: options.title || 'Confirm',
        message: options.message || '',
        type: options.type || 'warning',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        showInput: false,
        inputPlaceholder: '',
        inputValue: '',
        resolve: markRaw(resolve),
        reject: markRaw(reject)
      }
    })
  }

  /**
   * Show a prompt dialog with input field
   * @param {Object} options - Prompt configuration
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Prompt message
   * @param {string} options.placeholder - Input placeholder
   * @param {string} options.defaultValue - Default input value
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @returns {Promise<string|null>} - Input value if confirmed, null if cancelled
   */
  const showPrompt = (options) => {
    return new Promise((resolve, reject) => {
      alertState.value = {
        show: true,
        title: options.title || 'Input Required',
        message: options.message || '',
        type: 'info',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        showInput: true,
        inputPlaceholder: options.placeholder || '',
        inputValue: options.defaultValue || '',
        resolve: markRaw(resolve),
        reject: markRaw(reject)
      }
    })
  }

  /**
   * Handle alert confirmation
   * @param {any} value - The value returned (true for alerts/confirms, string for prompts)
   */
  const handleConfirm = (value) => {
    if (alertState.value.resolve) {
      alertState.value.resolve(value)
    }
    closeAlert()
  }

  /**
   * Handle alert cancellation
   */
  const handleCancel = () => {
    if (alertState.value.resolve) {
      alertState.value.resolve(alertState.value.showInput ? null : false)
    }
    closeAlert()
  }

  /**
   * Close the alert dialog
   */
  const closeAlert = () => {
    alertState.value.show = false
    alertState.value.resolve = null
    alertState.value.reject = null
  }

  /**
   * Convenience methods for common alert types
   */
  const alert = (message, title = 'Alert') => showAlert({ message, title, type: 'info' })
  const alertError = (message, title = 'Error') => showAlert({ message, title, type: 'error' })
  const alertWarning = (message, title = 'Warning') => showAlert({ message, title, type: 'warning' })
  const alertSuccess = (message, title = 'Success') => showAlert({ message, title, type: 'success' })

  const confirm = (message, title = 'Confirm') => showConfirm({ message, title, type: 'warning' })
  const confirmDelete = (message, title = 'Delete Confirmation') =>
    showConfirm({ message, title, type: 'error', confirmText: 'Delete', cancelText: 'Cancel' })

  const prompt = (message, defaultValue = '', title = 'Input Required') =>
    showPrompt({ message, defaultValue, title })

  return {
    // State
    alertState,

    // Core methods
    showAlert,
    showConfirm,
    showPrompt,
    handleConfirm,
    handleCancel,
    closeAlert,

    // Convenience methods
    alert,
    alertError,
    alertWarning,
    alertSuccess,
    confirm,
    confirmDelete,
    prompt
  }
}