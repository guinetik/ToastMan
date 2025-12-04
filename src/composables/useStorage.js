/**
 * Storage Provider Composable
 *
 * Provides reactive localStorage operations with automatic persistence
 * and event-driven updates across the application.
 */

import { ref, watch, toRaw } from 'vue'
import { createLogger } from '../core/logger.js'

const STORAGE_KEYS = {
  COLLECTIONS: 'toastman_collections',
  ENVIRONMENTS: 'toastman_environments',
  SETTINGS: 'toastman_settings',
  ACTIVE_ENVIRONMENT: 'toastman_active_environment',
  TABS: 'toastman_tabs',
  CONVERSATIONS: 'toastman_conversations'
}

// Global event emitter for storage changes
const storageEvents = new EventTarget()

/**
 * Safely parse JSON from localStorage
 */
function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    const logger = createLogger('storage')
    logger.warn('Failed to parse JSON from localStorage:', error)
    return fallback
  }
}

/**
 * Safely stringify JSON for localStorage
 */
function safeJsonStringify(value) {
  try {
    return JSON.stringify(toRaw(value))
  } catch (error) {
    const logger = createLogger('storage')
    logger.error('Failed to stringify JSON for localStorage:', error)
    return null
  }
}

/**
 * Core reactive storage composable
 */
export function useStorage(key, defaultValue = null, options = {}) {
  const logger = createLogger('storage')
  const {
    immediate = true,
    deep = true,
    debounce = 100
  } = options

  // Create reactive reference
  const storedValue = safeJsonParse(localStorage.getItem(key), defaultValue)
  const data = ref(storedValue)

  // Debounced save function
  let saveTimeout = null
  const save = () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      const stringified = safeJsonStringify(data.value)
      if (stringified !== null) {
        logger.debug(`Saving to ${key}`, data.value)
        localStorage.setItem(key, stringified)
        logger.info(`Saved to localStorage - key=${key}, size=${stringified.length}`)

        // Emit storage change event
        storageEvents.dispatchEvent(new CustomEvent('storage-change', {
          detail: { key, value: data.value }
        }))
      } else {
        logger.error(`Failed to stringify data for ${key}`)
      }
    }, debounce)
  }

  // Watch for changes and auto-save
  if (immediate) {
    watch(data, save, { deep })
  }

  // Listen for storage events from other tabs/windows
  const handleStorageChange = (event) => {
    if (event.key === key && event.newValue !== null) {
      const newValue = safeJsonParse(event.newValue, defaultValue)
      data.value = newValue
    }
  }

  window.addEventListener('storage', handleStorageChange)

  // Listen for internal storage events
  const handleInternalStorageChange = (event) => {
    if (event.detail.key === key) {
      // Don't update if it's the same reference (avoid loops)
      if (event.detail.value !== data.value) {
        data.value = event.detail.value
      }
    }
  }

  storageEvents.addEventListener('storage-change', handleInternalStorageChange)

  // Cleanup function
  const cleanup = () => {
    clearTimeout(saveTimeout)
    window.removeEventListener('storage', handleStorageChange)
    storageEvents.removeEventListener('storage-change', handleInternalStorageChange)
  }

  return {
    data,
    save: () => save(),
    cleanup,
    key
  }
}

/**
 * Collections storage
 */
export function useCollectionsStorage() {
  const storage = useStorage(STORAGE_KEYS.COLLECTIONS, [])

  // Ensure data is always an array
  if (!Array.isArray(storage.data.value)) {
    storage.data.value = []
  }

  return storage
}

/**
 * Environments storage
 */
export function useEnvironmentsStorage() {
  const storage = useStorage(STORAGE_KEYS.ENVIRONMENTS, [])

  // Ensure data is always an array
  if (!Array.isArray(storage.data.value)) {
    storage.data.value = []
  }

  return storage
}

/**
 * Settings storage
 */
export function useSettingsStorage() {
  return useStorage(STORAGE_KEYS.SETTINGS, {
    proxy: {
      enabled: false,
      protocol: 'http',
      host: '',
      port: '',
      username: '',
      password: '',
      excludeList: ''
    },
    certificates: [],
    theme: 'dark',
    autoSave: true,
    requestTimeout: 30000,
    followRedirects: true,
    maxRedirects: 10
  })
}

/**
 * Active environment storage
 */
export function useActiveEnvironmentStorage() {
  return useStorage(STORAGE_KEYS.ACTIVE_ENVIRONMENT, null)
}

/**
 * Tabs storage
 */
export function useTabsStorage() {
  const storage = useStorage(STORAGE_KEYS.TABS, [])

  // Ensure data is always an array
  if (!Array.isArray(storage.data.value)) {
    storage.data.value = []
  }

  return storage
}

/**
 * Conversations storage
 */
export function useConversationsStorage() {
  const storage = useStorage(STORAGE_KEYS.CONVERSATIONS, [])

  // Ensure data is always an array
  if (!Array.isArray(storage.data.value)) {
    storage.data.value = []
  }

  return storage
}

/**
 * Utility to clear all ToastMan data
 */
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })

  // Emit clear event
  storageEvents.dispatchEvent(new CustomEvent('storage-clear'))
}

/**
 * Export all data for backup
 */
export function exportAllData() {
  const data = {}

  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key)
    if (value) {
      data[name.toLowerCase()] = safeJsonParse(value)
    }
  })

  return {
    ...data,
    exportedAt: new Date().toISOString(),
    exportedBy: 'ToastMan',
    version: '1.0.0'
  }
}

/**
 * Import data from backup
 */
export function importAllData(importData) {
  try {
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const dataKey = name.toLowerCase()
      if (importData[dataKey]) {
        const stringified = safeJsonStringify(importData[dataKey])
        if (stringified) {
          localStorage.setItem(key, stringified)
        }
      }
    })

    // Emit import event
    storageEvents.dispatchEvent(new CustomEvent('storage-import', {
      detail: importData
    }))

    return true
  } catch (error) {
    const logger = createLogger('storage')
    logger.error('Failed to import data:', error)
    return false
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats() {
  const stats = {
    total: 0,
    byKey: {}
  }

  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key)
    const size = value ? new Blob([value]).size : 0
    stats.byKey[name] = size
    stats.total += size
  })

  return stats
}