/**
 * Collections Store
 *
 * Manages collections and requests with reactive persistence to localStorage.
 * Provides CRUD operations and automatic saving.
 */

import { computed, nextTick } from 'vue'
import { useCollectionsStorage } from '../composables/useStorage.js'
import {
  createCollection,
  createItem,
  createRequest,
  generateId
} from '../models/types.js'
import { createLogger } from '../core/logger.js'

// Global collections store
let collectionsStore = null

export function useCollections() {
  if (!collectionsStore) {
    collectionsStore = createCollectionsStore()
  }
  return collectionsStore
}

function createCollectionsStore() {
  const logger = createLogger('collections')
  const { data: collections } = useCollectionsStorage()

  // Computed getters
  const allCollections = computed(() => {
    const colls = collections.value || []
    logger.debug('allCollections computed - raw collections.value:', colls)
    logger.debug('allCollections computed - is array:', Array.isArray(colls))
    // Filter out any invalid collections
    const filtered = colls.filter(collection => collection && collection.info && collection.info.id)
    logger.debug('allCollections computed - filtered result:', filtered.length, 'items')
    return filtered
  })

  const totalRequests = computed(() => {
    return allCollections.value.reduce((total, collection) => {
      return total + (collection.item?.length || 0)
    }, 0)
  })

  // Collection operations
  const createNewCollection = (name = 'New Collection') => {
    logger.info('Creating collection with name:', name)
    const collection = createCollection(name)
    logger.debug('Created collection object:', collection)

    if (!collections.value) {
      collections.value = []
    }

    collections.value.push(collection)
    logger.info('Collections array after push - length:', collections.value.length)
    logger.debug('Full collections array:', collections.value)

    return collection
  }

  const getCollection = (id) => {
    return collections.value.find(c => c.info.id === id)
  }

  const updateCollection = (id, updates) => {
    const collection = getCollection(id)
    if (collection) {
      Object.assign(collection.info, updates)
    }
    return collection
  }

  const deleteCollection = (id) => {
    const index = collections.value.findIndex(c => c.info.id === id)
    if (index > -1) {
      collections.value.splice(index, 1)
      return true
    }
    return false
  }

  const duplicateCollection = (id) => {
    const original = getCollection(id)
    if (original) {
      const duplicate = JSON.parse(JSON.stringify(original))
      duplicate.info.id = generateId()
      duplicate.info.name = `${original.info.name} Copy`

      // Generate new IDs for all items
      duplicate.item = duplicate.item.map(item => ({
        ...item,
        id: generateId()
      }))

      collections.value.push(duplicate)
      return duplicate
    }
    return null
  }

  // Request/Item operations
  const addRequestToCollection = (collectionId, request = null) => {
    const collection = getCollection(collectionId)
    if (collection) {
      const item = createItem({
        name: 'New Request',
        request: request || createRequest()
      })
      collection.item.push(item)
      return item
    }
    return null
  }

  const getRequest = (collectionId, requestId) => {
    const collection = getCollection(collectionId)
    if (collection) {
      return collection.item.find(item => item.id === requestId)
    }
    return null
  }

  const updateRequest = (collectionId, requestId, updates) => {
    const request = getRequest(collectionId, requestId)
    if (request) {
      if (updates.name !== undefined) {
        request.name = updates.name
      }
      if (updates.request) {
        Object.assign(request.request, updates.request)
      }
    }
    return request
  }

  const deleteRequest = (collectionId, requestId) => {
    const collection = getCollection(collectionId)
    if (collection) {
      const index = collection.item.findIndex(item => item.id === requestId)
      if (index > -1) {
        collection.item.splice(index, 1)
        return true
      }
    }
    return false
  }

  const duplicateRequest = (collectionId, requestId) => {
    const original = getRequest(collectionId, requestId)
    if (original) {
      const duplicate = JSON.parse(JSON.stringify(original))
      duplicate.id = generateId()
      duplicate.name = `${original.name} Copy`

      const collection = getCollection(collectionId)
      if (collection) {
        collection.item.push(duplicate)
        return duplicate
      }
    }
    return null
  }

  const moveRequest = (fromCollectionId, toCollectionId, requestId) => {
    const fromCollection = getCollection(fromCollectionId)
    const toCollection = getCollection(toCollectionId)

    if (fromCollection && toCollection) {
      const requestIndex = fromCollection.item.findIndex(item => item.id === requestId)
      if (requestIndex > -1) {
        const [request] = fromCollection.item.splice(requestIndex, 1)
        toCollection.item.push(request)
        return request
      }
    }
    return null
  }

  // Search and filtering
  const searchRequests = (query) => {
    const results = []
    const searchTerm = query.toLowerCase()

    collections.value.forEach(collection => {
      collection.item.forEach(item => {
        const matchesName = item.name.toLowerCase().includes(searchTerm)
        const matchesUrl = item.request.url.raw?.toLowerCase().includes(searchTerm)
        const matchesMethod = item.request.method.toLowerCase().includes(searchTerm)

        if (matchesName || matchesUrl || matchesMethod) {
          results.push({
            collection: collection.info,
            item
          })
        }
      })
    })

    return results
  }

  const getRequestsByMethod = (method) => {
    const results = []

    collections.value.forEach(collection => {
      collection.item.forEach(item => {
        if (item.request.method === method) {
          results.push({
            collection: collection.info,
            item
          })
        }
      })
    })

    return results
  }

  // Import/Export operations
  const exportCollection = (id) => {
    const collection = getCollection(id)
    if (collection) {
      return {
        ...collection,
        _postman_exported_at: new Date().toISOString(),
        _postman_exported_using: 'ToastMan'
      }
    }
    return null
  }

  const importCollection = (collectionData) => {
    try {
      // Validate basic structure
      if (!collectionData.info || !collectionData.info.name) {
        throw new Error('Invalid collection format')
      }

      // Generate new ID to avoid conflicts
      const imported = JSON.parse(JSON.stringify(collectionData))
      imported.info.id = generateId()
      imported.info.name = `${imported.info.name} (Imported)`

      // Generate new IDs for all items
      if (imported.item) {
        imported.item = imported.item.map(item => ({
          ...item,
          id: generateId()
        }))
      }

      collections.value.push(imported)
      return imported
    } catch (error) {
      logger.error('Failed to import collection:', error)
      throw error
    }
  }

  // Initialize with default collection if empty
  const initializeDefaultData = async () => {
    await nextTick()

    if (!collections.value || collections.value.length === 0) {
      const defaultCollection = createNewCollection('My Collection')
      addRequestToCollection(defaultCollection.info.id, createRequest({
        method: 'GET',
        url: 'https://api.example.com/users'
      }))
    }
  }

  // Initialize default data if needed (async to allow localStorage to load first)
  logger.info('Collections store initialized, current data length:', collections.value?.length || 0)

  // Call async initialization to create default data only if no collections exist
  initializeDefaultData()

  return {
    // Reactive data
    collections: allCollections,
    totalRequests,

    // Collection operations
    createCollection: createNewCollection,
    getCollection,
    updateCollection,
    deleteCollection,
    duplicateCollection,

    // Request operations
    addRequest: addRequestToCollection,
    getRequest,
    updateRequest,
    deleteRequest,
    duplicateRequest,
    moveRequest,

    // Search and filtering
    searchRequests,
    getRequestsByMethod,

    // Import/Export
    exportCollection,
    importCollection,

    // Utilities
    initializeDefaultData
  }
}