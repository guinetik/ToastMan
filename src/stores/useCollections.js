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

  const importCollection = (collectionData) => {
    try {
      // Debug: Log the raw imported data structure
      logger.info('Importing collection - raw data structure:', collectionData)

      // Log a sample item to understand the structure
      if (collectionData.item && collectionData.item.length > 0) {
        logger.info('First item in collection:', JSON.stringify(collectionData.item[0], null, 2))
      }

      // Validate basic structure
      if (!collectionData.info || !collectionData.info.name) {
        throw new Error('Invalid collection format')
      }

      // Generate new ID to avoid conflicts
      const imported = JSON.parse(JSON.stringify(collectionData))
      imported.info.id = generateId()
      imported.info.name = `${imported.info.name} (Imported)`

      // Recursive function to process items (preserves folder structure)
      const processItems = (items) => {
        if (!items) return []

        return items.map(item => {
          // Check if this is a folder with nested items
          if (item.item && Array.isArray(item.item)) {
            // This is a folder - process its children recursively
            return {
              ...item,
              id: generateId(),
              name: item.name || 'Unnamed Folder',
              type: 'folder',
              item: processItems(item.item) // Process nested items recursively
            }
          }

          // This is an actual request item
          let normalizedItem = {
            ...item,
            id: generateId(),
            name: item.name || 'Unnamed Request',
            type: 'request'
          }

          // Ensure the request property exists with the expected structure
          if (!item.request) {
            // If no request property, create a minimal one
            normalizedItem.request = {
              method: 'GET',
              url: { raw: '', query: [] },
              header: [],
              body: null
            }
            logger.warn('Item has no request property:', item.name)
          } else if (typeof item.request === 'string') {
            // Sometimes request might be just a URL string
            normalizedItem.request = {
              method: 'GET',
              url: { raw: item.request, query: [] },
              header: [],
              body: null
            }
          } else {
            // Standard Postman format - ensure all properties exist
            normalizedItem.request = {
              method: item.request.method || 'GET',
              url: item.request.url || { raw: '', query: [] },
              header: item.request.header || item.request.headers || [],
              body: item.request.body || null
            }

            // Normalize URL structure if it's a string
            if (typeof normalizedItem.request.url === 'string') {
              normalizedItem.request.url = {
                raw: normalizedItem.request.url,
                query: []
              }
            } else if (normalizedItem.request.url && !normalizedItem.request.url.raw) {
              // Sometimes Postman doesn't include 'raw' but has protocol, host, path
              const url = normalizedItem.request.url
              if (url.protocol && url.host && url.path) {
                const host = Array.isArray(url.host) ? url.host.join('.') : url.host
                const path = Array.isArray(url.path) ? url.path.join('/') : url.path
                const query = url.query ? `?${url.query.map(q => `${q.key}=${q.value}`).join('&')}` : ''
                normalizedItem.request.url.raw = `${url.protocol}://${host}/${path}${query}`
              }
            }
          }

          // Debug: Log the normalized item
          logger.debug('Normalized item:', {
            name: normalizedItem.name,
            hasRequest: !!normalizedItem.request,
            requestMethod: normalizedItem.request?.method,
            requestUrl: normalizedItem.request?.url?.raw,
            requestHeaders: normalizedItem.request?.header?.length || 0
          })

          return normalizedItem
        })
      }

      // Process all items (handles nested folders)
      if (imported.item) {
        imported.item = processItems(imported.item)

        // Log a sample normalized item
        if (imported.item.length > 0) {
          logger.info('First normalized item:', JSON.stringify(imported.item[0], null, 2))
        }
      }

      collections.value.push(imported)
      logger.info('Successfully imported collection:', imported.info.name)
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
    importCollection,

    // Utilities
    initializeDefaultData
  }
}