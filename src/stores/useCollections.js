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
import { PostmanAdapter } from '../adapters/PostmanAdapter.js'

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
      // Recursive search through folders
      const findRequest = (items) => {
        for (const item of items) {
          // Handle items without type field (legacy) or explicit request type
          if (item.id === requestId && (item.type === 'request' || (!item.type && item.request))) {
            return item
          }
          // If it's a folder, search its children
          if ((item.type === 'folder' || (!item.type && item.item)) && item.item) {
            const found = findRequest(item.item)
            if (found) return found
          }
        }
        return null
      }
      return findRequest(collection.item || [])
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
        // Deep merge request object to preserve nested properties
        deepMerge(request.request, updates.request)
      }
    }
    return request
  }

  /**
   * Deep merge source into target, modifying target in place
   * @param {Object} target - Target object to merge into
   * @param {Object} source - Source object to merge from
   */
  const deepMerge = (target, source) => {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceVal = source[key]
        const targetVal = target[key]

        // If both are plain objects, recursively merge
        if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
          deepMerge(targetVal, sourceVal)
        } else {
          // Otherwise, replace with source value
          target[key] = sourceVal
        }
      }
    }
  }

  /**
   * Check if value is a plain object (not array, null, etc.)
   */
  const isPlainObject = (val) => {
    return val !== null &&
           typeof val === 'object' &&
           !Array.isArray(val) &&
           Object.prototype.toString.call(val) === '[object Object]'
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
        const matchesUrl = item.request?.url?.raw?.toLowerCase().includes(searchTerm) || false
        const matchesMethod = (item.request?.method || item.method || '').toLowerCase().includes(searchTerm)

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
        if ((item.request?.method || item.method) === method) {
          results.push({
            collection: collection.info,
            item
          })
        }
      })
    })

    return results
  }

  // Folder operations
  const findItemInCollection = (collectionId, itemId) => {
    const collection = getCollection(collectionId)
    if (!collection) return null

    const findInItems = (items) => {
      for (const item of items) {
        if (item.id === itemId) {
          return { item, parent: items }
        }
        if (item.item && Array.isArray(item.item)) {
          const found = findInItems(item.item)
          if (found) return found
        }
      }
      return null
    }

    return findInItems(collection.item || [])
  }

  const addRequestToFolder = (collectionId, folderId, request = null) => {
    const folderResult = findItemInCollection(collectionId, folderId)
    if (folderResult && folderResult.item.item) {
      const item = createItem({
        name: 'New Request',
        request: request || createRequest()
      })
      folderResult.item.item.push(item)
      return item
    }
    return null
  }

  const addFolderToCollection = (collectionId, name = 'New Folder') => {
    const collection = getCollection(collectionId)
    if (collection) {
      const folder = {
        id: generateId(),
        name,
        type: 'folder',
        item: []
      }
      collection.item.push(folder)
      return folder
    }
    return null
  }

  const addFolderToFolder = (collectionId, parentFolderId, name = 'New Folder') => {
    const parentResult = findItemInCollection(collectionId, parentFolderId)
    if (parentResult && parentResult.item.item) {
      const folder = {
        id: generateId(),
        name,
        type: 'folder',
        item: []
      }
      parentResult.item.item.push(folder)
      return folder
    }
    return null
  }

  const renameFolder = (collectionId, folderId, newName) => {
    const folderResult = findItemInCollection(collectionId, folderId)
    if (folderResult) {
      folderResult.item.name = newName
      return folderResult.item
    }
    return null
  }

  const duplicateFolder = (collectionId, folderId) => {
    const folderResult = findItemInCollection(collectionId, folderId)
    if (folderResult) {
      const duplicate = JSON.parse(JSON.stringify(folderResult.item))

      // Generate new IDs for the folder and all its contents
      const regenerateIds = (item) => {
        item.id = generateId()
        if (item.item && Array.isArray(item.item)) {
          item.item.forEach(regenerateIds)
        }
      }

      regenerateIds(duplicate)
      duplicate.name = `${duplicate.name} Copy`

      folderResult.parent.push(duplicate)
      return duplicate
    }
    return null
  }

  const deleteFolder = (collectionId, folderId) => {
    const folderResult = findItemInCollection(collectionId, folderId)
    if (folderResult) {
      const index = folderResult.parent.indexOf(folderResult.item)
      if (index > -1) {
        folderResult.parent.splice(index, 1)
        return true
      }
    }
    return false
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

  /**
   * Import a Postman collection using the PostmanAdapter
   * @param {Object} collectionData - Raw Postman collection data
   * @param {Object} options - Import options
   * @param {boolean} options.appendImportedSuffix - Whether to append " (Imported)" to the name (default: true)
   * @returns {Object} - { collection, warnings, errors }
   */
  const importCollection = (collectionData, options = {}) => {
    const { appendImportedSuffix = true } = options

    try {
      logger.info('Importing collection using PostmanAdapter')

      // Use the PostmanAdapter for import
      const result = PostmanAdapter.import(collectionData)

      // Check for fatal errors
      if (result.errors.length > 0 && !result.collection) {
        const errorMessage = result.errors.map(e => e.message).join('; ')
        throw new Error(errorMessage)
      }

      const imported = result.collection

      // Optionally append "(Imported)" suffix to distinguish imported collections
      if (appendImportedSuffix) {
        imported.info.name = `${imported.info.name} (Imported)`
      }

      // Log warnings if any
      if (result.warnings.length > 0) {
        const summary = PostmanAdapter.summarizeWarnings(result.warnings)
        logger.info(`Collection imported with ${summary.total} warning(s):`, summary.byType)

        // Log each warning at debug level
        result.warnings.forEach(w => {
          logger.debug(`[${w.type}] ${w.message}`)
        })
      }

      // Add to collections
      collections.value.push(imported)
      logger.info('Successfully imported collection:', imported.info.name)

      // Return the result with warnings for UI to display
      return {
        collection: imported,
        warnings: result.warnings,
        errors: result.errors
      }
    } catch (error) {
      logger.error('Failed to import collection:', error)
      throw error
    }
  }

  /**
   * Export a collection to Postman format
   * @param {string} id - Collection ID
   * @returns {Object} - Postman-formatted collection
   */
  const exportCollectionToPostman = (id) => {
    const collection = getCollection(id)
    if (collection) {
      return PostmanAdapter.export(collection)
    }
    return null
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

  // Don't auto-create default collections - let users start with empty state
  // initializeDefaultData()

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

    // Folder operations
    addFolderToCollection,
    addRequestToFolder,
    addFolderToFolder,
    renameFolder,
    duplicateFolder,
    deleteFolder,

    // Search and filtering
    searchRequests,
    getRequestsByMethod,

    // Import/Export
    exportCollection,
    exportCollectionToPostman,
    importCollection,

    // Utilities
    initializeDefaultData
  }
}