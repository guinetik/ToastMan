/**
 * Tabs Store
 *
 * Manages request tabs in the UI with reactive persistence to localStorage.
 * Handles tab creation, switching, closing, and synchronization with collections.
 */

import { computed, watch, nextTick } from 'vue'
import { useTabsStorage } from '../composables/useStorage.js'
import { useCollections } from './useCollections.js'
import { useMobileView } from '../composables/useMobileView.js'
import { createTab, generateId } from '../models/types.js'
import { createLogger } from '../core/logger.js'

// Global tabs store
let tabsStore = null

export function useTabs() {
  if (!tabsStore) {
    tabsStore = createTabsStore()
  }
  return tabsStore
}

function createTabsStore() {
  const logger = createLogger('tabs')
  const { data: tabs } = useTabsStorage()
  const collections = useCollections()
  const { showComposer, isMobile } = useMobileView()

  // Computed getters
  const allTabs = computed(() => tabs.value || [])

  const activeTab = computed(() => {
    return allTabs.value.find(tab => tab.active)
  })

  const activeTabs = computed(() => {
    return allTabs.value.filter(tab => !tab.closed)
  })

  const unsavedTabs = computed(() => {
    return allTabs.value.filter(tab => !tab.saved && tab.modified)
  })

  // Tab operations
  const createNewTab = ({
    itemId = null,
    collectionId = null,
    conversationId = null,
    name = 'New Request',
    method = 'GET'
  } = {}) => {
    // Deactivate all other tabs
    allTabs.value.forEach(tab => {
      tab.active = false
    })

    const tab = createTab({ itemId, collectionId, conversationId, name, method })
    tab.active = true
    tabs.value.push(tab)

    return tab
  }

  const openRequestInTab = (collectionId, requestId) => {
    const collection = collections.getCollection(collectionId)
    const request = collections.getRequest(collectionId, requestId)

    if (!collection || !request) {
      logger.warn('Collection or request not found - collection:', !!collection, 'request:', !!request)
      return null
    }

    // Debug logging for request structure
    logger.debug('Opening request with structure:', {
      requestId,
      requestName: request.name,
      hasNestedRequest: !!request.request,
      requestMethod: request.request?.method || request.method,
      requestStructure: Object.keys(request)
    })

    // Check if tab already exists for this request
    const existingTab = allTabs.value.find(tab =>
      tab.itemId === requestId && tab.collectionId === collectionId
    )

    if (existingTab) {
      setActiveTab(existingTab.id)
      // Switch to composer view on mobile when opening a request
      if (isMobile()) {
        showComposer()
      }
      return existingTab
    }

    // Create new tab with safe property access
    const tab = createNewTab({
      itemId: requestId,
      collectionId,
      name: request.name || 'Unnamed Request',
      method: request.request?.method || request.method || 'GET'
    })

    // Switch to composer view on mobile when opening a request
    if (isMobile()) {
      showComposer()
    }

    return tab
  }

  const getTab = (tabId) => {
    return allTabs.value.find(tab => tab.id === tabId)
  }

  const setActiveTab = (tabId) => {
    allTabs.value.forEach(tab => {
      tab.active = tab.id === tabId
    })
  }

  const updateTab = (tabId, updates) => {
    const tab = getTab(tabId)
    if (tab) {
      Object.assign(tab, updates)

      // Mark as modified if it has a linked request
      if (tab.itemId && updates.name !== undefined) {
        tab.modified = true
      }
    }
    return tab
  }

  const closeTab = (tabId) => {
    const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return false

    const tab = tabs.value[tabIndex]
    const wasActive = tab.active

    // Remove tab
    tabs.value.splice(tabIndex, 1)

    // If we closed the active tab and there are other tabs, activate another one
    if (wasActive && tabs.value.length > 0) {
      const nextTab = tabs.value[Math.max(0, tabIndex - 1)]
      setActiveTab(nextTab.id)
    }
    // Allow having zero tabs - don't auto-create a new one

    return true
  }

  const closeAllTabs = () => {
    tabs.value.length = 0
    // Allow having zero tabs
  }

  const closeOtherTabs = (keepTabId) => {
    const keepTab = getTab(keepTabId)
    if (keepTab) {
      tabs.value.length = 0
      tabs.value.push(keepTab)
      setActiveTab(keepTabId)
    }
  }

  const duplicateTab = (tabId) => {
    const original = getTab(tabId)
    if (original) {
      const duplicate = createNewTab({
        itemId: original.itemId,
        collectionId: original.collectionId,
        name: `${original.name} Copy`,
        method: original.method
      })
      duplicate.saved = false
      duplicate.modified = true
      return duplicate
    }
    return null
  }

  // Tab state management
  const markTabAsSaved = (tabId) => {
    const tab = getTab(tabId)
    if (tab) {
      tab.saved = true
      tab.modified = false
    }
  }

  const markTabAsModified = (tabId) => {
    const tab = getTab(tabId)
    if (tab) {
      tab.modified = true
    }
  }

  const syncTabWithRequest = (tabId) => {
    const tab = getTab(tabId)
    if (tab && tab.itemId && tab.collectionId) {
      const request = collections.getRequest(tab.collectionId, tab.itemId)
      if (request) {
        tab.name = request.name
        tab.method = request.request?.method || request.method || 'GET'
        tab.saved = true
        tab.modified = false
      }
    }
  }

  // Tab navigation
  const getNextTab = (currentTabId) => {
    const currentIndex = allTabs.value.findIndex(tab => tab.id === currentTabId)
    if (currentIndex >= 0 && currentIndex < allTabs.value.length - 1) {
      return allTabs.value[currentIndex + 1]
    }
    return null
  }

  const getPreviousTab = (currentTabId) => {
    const currentIndex = allTabs.value.findIndex(tab => tab.id === currentTabId)
    if (currentIndex > 0) {
      return allTabs.value[currentIndex - 1]
    }
    return null
  }

  const moveTab = (tabId, newIndex) => {
    const currentIndex = allTabs.value.findIndex(tab => tab.id === tabId)
    if (currentIndex >= 0 && newIndex >= 0 && newIndex < allTabs.value.length) {
      const [tab] = allTabs.value.splice(currentIndex, 1)
      allTabs.value.splice(newIndex, 0, tab)
    }
  }

  // Tab persistence and cleanup
  const saveTabToCollection = (tabId) => {
    const tab = getTab(tabId)
    if (!tab) return null

    if (tab.itemId && tab.collectionId) {
      // Update existing request
      collections.updateRequest(tab.collectionId, tab.itemId, {
        name: tab.name
      })
      markTabAsSaved(tabId)
      return { action: 'updated', tab }
    } else {
      // Create new request
      let targetCollectionId = tab.collectionId

      // If no collection specified, use the first available or create one
      if (!targetCollectionId) {
        if (collections.collections.value.length === 0) {
          const newCollection = collections.createCollection('My Collection')
          targetCollectionId = newCollection.info.id
        } else {
          targetCollectionId = collections.collections.value[0].info.id
        }
      }

      const newRequest = collections.addRequest(targetCollectionId)
      if (newRequest) {
        collections.updateRequest(targetCollectionId, newRequest.id, {
          name: tab.name
        })

        // Link tab to the new request
        tab.itemId = newRequest.id
        tab.collectionId = targetCollectionId
        markTabAsSaved(tabId)

        return { action: 'created', tab, request: newRequest }
      }
    }

    return null
  }

  const saveAllTabs = () => {
    const results = []
    unsavedTabs.value.forEach(tab => {
      const result = saveTabToCollection(tab.id)
      if (result) {
        results.push(result)
      }
    })
    return results
  }

  // Clean up tabs that reference deleted requests/collections
  const cleanupOrphanedTabs = () => {
    const orphanedTabs = []

    allTabs.value.forEach(tab => {
      if (tab.itemId && tab.collectionId) {
        const collection = collections.getCollection(tab.collectionId)
        if (!collection) {
          orphanedTabs.push(tab.id)
          return
        }

        const request = collections.getRequest(tab.collectionId, tab.itemId)
        if (!request) {
          orphanedTabs.push(tab.id)
        }
      }
    })

    // Remove orphaned tabs
    orphanedTabs.forEach(tabId => {
      closeTab(tabId)
    })

    return orphanedTabs.length
  }

  // Watch for collection changes and sync tabs
  watch(() => collections.collections.value, () => {
    nextTick(() => {
      // Sync tabs with their linked requests
      allTabs.value.forEach(tab => {
        if (tab.itemId && tab.collectionId) {
          syncTabWithRequest(tab.id)
        }
      })

      // Clean up orphaned tabs
      cleanupOrphanedTabs()
    })
  }, { deep: true })

  // Initialize with default tab if empty
  const initializeDefaultData = async () => {
    await nextTick()

    if (allTabs.value.length === 0) {
      logger.info('Creating initial tab...')
      const tab = createNewTab({
        name: 'New Request',
        method: 'GET'
      })
      logger.info('Created initial tab with ID:', tab.id)
    } else {
      // Ensure at least one tab is active
      if (!activeTab.value && allTabs.value.length > 0) {
        setActiveTab(allTabs.value[0].id)
      }
    }
  }

  // Initialize default data immediately
  logger.info('Tabs store initialized, current tab count:', allTabs.value.length)
  // Don't auto-create a tab - let the UI show empty state

  return {
    // Reactive data
    tabs: allTabs,
    activeTab,
    activeTabs,
    unsavedTabs,

    // Tab operations
    createTab: createNewTab,
    openRequest: openRequestInTab,
    getTab,
    setActiveTab,
    updateTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    duplicateTab,

    // Tab state
    markTabAsSaved,
    markTabAsModified,
    syncTabWithRequest,

    // Tab navigation
    getNextTab,
    getPreviousTab,
    moveTab,

    // Persistence
    saveTab: saveTabToCollection,
    saveAllTabs,
    cleanupOrphanedTabs,

    // Utilities
    initializeDefaultData
  }
}