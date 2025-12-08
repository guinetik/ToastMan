/**
 * Storage Provider Composable
 *
 * Provides reactive localStorage operations with automatic persistence
 * and event-driven updates across the application.
 */

import { ref, watch, toRaw, nextTick } from 'vue'
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

  // Flag to prevent circular updates when receiving storage events
  let isUpdatingFromEvent = false

  // Debounced save function
  let saveTimeout = null
  const save = () => {
    // Skip save if this change came from a storage event (prevents circular updates)
    if (isUpdatingFromEvent) {
      console.log(`[useStorage] Skipping save for ${key} - isUpdatingFromEvent=true`)
      return
    }

    console.log(`[useStorage] Save triggered for ${key}`)
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      console.log(`[useStorage] Executing save for ${key} after ${debounce}ms debounce`)
      console.log(`[useStorage] Data to save:`, data.value)
      const stringified = safeJsonStringify(data.value)
      if (stringified !== null) {
        console.log(`[useStorage] Stringified length: ${stringified.length}`)
        localStorage.setItem(key, stringified)
        console.log(`[useStorage] ✅ SAVED to localStorage - key=${key}`)

        // Emit storage change event
        storageEvents.dispatchEvent(new CustomEvent('storage-change', {
          detail: { key, value: data.value }
        }))
      } else {
        console.error(`[useStorage] ❌ Failed to stringify data for ${key}`)
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
      // Set flag to prevent circular save
      isUpdatingFromEvent = true
      data.value = newValue
      nextTick(() => { isUpdatingFromEvent = false })
    }
  }

  window.addEventListener('storage', handleStorageChange)

  // Listen for internal storage events (from same tab)
  // We need to update our ref when another instance of useStorage for the same key updates
  const handleInternalStorageChange = (event) => {
    if (event.detail.key === key) {
      // Only update if the value is different (prevents circular updates)
      const currentStringified = safeJsonStringify(data.value)
      const newStringified = safeJsonStringify(event.detail.value)
      if (currentStringified !== newStringified) {
        isUpdatingFromEvent = true
        data.value = event.detail.value
        nextTick(() => { isUpdatingFromEvent = false })
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
 * Settings storage with schema migration support
 * Merges defaults with stored values to ensure new fields are always present
 */
export function useSettingsStorage() {
  const defaults = {
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
    editorThemeDark: 'gob',         // Editor theme for dark mode
    editorThemeLight: 'textmate',   // Editor theme for light mode
    autoSave: true,
    requestTimeout: 30000,
    followRedirects: true,
    maxRedirects: 10,
    fontSize: 14,
    fontFamily: 'monospace',
    sidebarWidth: 25,
    responseViewMode: 'pretty',
    requestViewMode: 'params',
    showLineNumbers: true,
    wordWrap: false,
    minimap: false,
    autoComplete: true
  }

  const storage = useStorage(STORAGE_KEYS.SETTINGS, defaults)

  // Merge defaults with stored values to ensure new fields exist
  if (storage.data.value) {
    const merged = { ...defaults, ...storage.data.value }
    // Also merge nested proxy object
    if (storage.data.value.proxy) {
      merged.proxy = { ...defaults.proxy, ...storage.data.value.proxy }
    }
    // Only update if there are missing fields
    if (JSON.stringify(merged) !== JSON.stringify(storage.data.value)) {
      storage.data.value = merged
    }
  }

  return storage
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

  // Reset aiController singleton state to prevent stale loading flags
  // Use dynamic import to avoid circular dependencies
  import('../controllers/AiController.js').then(module => {
    const aiController = module.default
    if (aiController && aiController.resetState) {
      aiController.resetState()
    }
  }).catch(err => {
    console.warn('Failed to reset AI controller:', err)
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