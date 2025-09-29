import { BaseController } from './BaseController.js'
import { Collection, CollectionFolder } from '../models/Collection.js'
import { Request } from '../models/Request.js'
import { useCollections } from '../stores/useCollections.js'
import { useTabs } from '../stores/useTabs.js'

/**
 * Controller for Collections functionality
 */
export class CollectionsController extends BaseController {
  constructor() {
    super('collections')

    this.createState({
      expandedCollections: new Set(),
      showNewCollectionDialog: false,
      searchQuery: '',
      filterMethod: null
    })

    // Initialize stores after state is created
    this.collectionsStore = useCollections()
    this.tabsStore = useTabs()
  }

  init() {
    super.init()

    // Ensure stores are initialized
    if (!this.collectionsStore) {
      this.collectionsStore = useCollections()
    }
    if (!this.tabsStore) {
      this.tabsStore = useTabs()
    }

    this.logger.debug('Initializing computed properties')
    this.logger.debug('Collections store available:', !!this.collectionsStore)
    this.logger.debug('Store collections value:', this.collectionsStore?.collections?.value)

    this.collections = this.createComputed('collections', () => {
      if (!this.collectionsStore) {
        this.logger.warn('Collections store not available')
        return []
      }

      // Store.collections is already a computed ref, access its value directly
      const collections = this.collectionsStore.collections.value || []

      this.logger.debug('Raw collections from store:', collections.length, 'items')
      this.logger.debug('Collections data:', JSON.stringify(collections))

      if (!Array.isArray(collections)) {
        this.logger.warn('Collections is not an array:', collections)
        return []
      }

      const processedCollections = collections.map(c => {
        try {
          return new Collection(c)
        } catch (error) {
          this.logger.error('Failed to parse collection:', error)
          return c
        }
      })

      this.logger.debug('Processed collections:', processedCollections.length, 'items')
      return processedCollections
    })

    this.logger.debug('Collections computed created, test value:', this.getComputed('collections'))

    this.filteredCollections = this.createComputed('filteredCollections', () => {
      const collections = this.getComputed('collections')
      if (!collections || !Array.isArray(collections)) return []

      const query = this.state.searchQuery.toLowerCase()

      if (!query && !this.state.filterMethod) {
        return collections
      }

      return collections.map(collection => {
        try {
          const filteredCollection = new Collection(collection.toJSON())
          filteredCollection.item = this.filterItems(collection.item, query, this.state.filterMethod)
          return filteredCollection
        } catch (error) {
          this.logger.error('Failed to filter collection:', error)
          return collection
        }
      }).filter(c => c.item && c.item.length > 0)
    })

    this.createWatcher(
      () => this.getComputed('collections'),
      (newCollections, oldCollections) => {
        // Only auto-expand if we're transitioning from empty to having collections
        // and we don't already have expanded collections
        if (newCollections &&
            newCollections.length > 0 &&
            (!oldCollections || oldCollections.length === 0) &&
            this.state &&
            this.state.expandedCollections &&
            this.state.expandedCollections.size === 0) {
          const firstCollection = newCollections[0]
          if (firstCollection?.info?.id) {
            this.logger.info('Auto-expanding first collection:', firstCollection.info.name)
            this.state.expandedCollections.add(firstCollection.info.id)
          }
        }
      },
      { immediate: false } // Changed to false to prevent immediate execution
    )
  }

  /**
   * Filter collection items based on search query and method
   */
  filterItems(items, query, method) {
    if (!items) return []

    return items.filter(item => {
      if (item.item && Array.isArray(item.item)) {
        const folder = new CollectionFolder(item)
        const filteredSubItems = this.filterItems(folder.item, query, method)
        return filteredSubItems.length > 0
      }

      if (!item.request) return false

      const request = new Request(item.request)

      if (method && request.method !== method) {
        return false
      }

      if (query) {
        const name = (item.name || '').toLowerCase()
        const url = request.getUrlString().toLowerCase()
        const description = (request.description || '').toLowerCase()

        return name.includes(query) || url.includes(query) || description.includes(query)
      }

      return true
    })
  }

  /**
   * Toggle collection expansion
   */
  toggleCollection(collectionId) {
    if (this.state.expandedCollections.has(collectionId)) {
      this.state.expandedCollections.delete(collectionId)
      this.logger.debug(`Collapsed collection: ${collectionId}`)
    } else {
      this.state.expandedCollections.add(collectionId)
      this.logger.debug(`Expanded collection: ${collectionId}`)
    }
  }

  /**
   * Check if collection is expanded
   */
  isCollectionExpanded(collectionId) {
    return this.state.expandedCollections.has(collectionId)
  }

  /**
   * Open request in new tab
   */
  openRequest(collectionId, requestId) {
    this.logger.info(`Opening request: ${requestId} from collection: ${collectionId}`)
    this.tabsStore.openRequest(collectionId, requestId)
    this.emit('requestOpened', { collectionId, requestId })
  }

  /**
   * Create new collection
   */
  async createCollection(name) {
    const result = await this.executeAsync(async () => {
      const validation = this.validate(Collection, { info: { name } })
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const collection = this.collectionsStore.createCollection(name)
      this.logger.info('Created collection:', collection?.info?.name, 'with ID:', collection?.info?.id)

      if (collection?.info?.id) {
        this.state.expandedCollections.add(collection.info.id)
      }

      return collection
    }, 'Failed to create collection')

    if (result.success) {
      this.state.showNewCollectionDialog = false
      this.emit('collectionCreated', result.data)
    }

    return result
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId) {
    const result = await this.executeAsync(async () => {
      this.collectionsStore.deleteCollection(collectionId)
      this.state.expandedCollections.delete(collectionId)
      this.logger.info(`Deleted collection: ${collectionId}`)
    }, 'Failed to delete collection')

    if (result.success) {
      this.emit('collectionDeleted', collectionId)
    }

    return result
  }

  /**
   * Search collections
   */
  searchCollections(query) {
    this.state.searchQuery = query
    this.logger.debug('Searching collections with query:', query)
  }

  /**
   * Filter by method
   */
  filterByMethod(method) {
    this.state.filterMethod = method
    this.logger.debug('Filtering by method:', method)
  }

  /**
   * Clear filters
   */
  clearFilters() {
    this.state.searchQuery = ''
    this.state.filterMethod = null
    this.logger.debug('Cleared filters')
  }

  /**
   * Show/hide new collection dialog
   */
  toggleNewCollectionDialog(show) {
    this.state.showNewCollectionDialog = show
  }

  /**
   * Get method color for styling
   */
  getMethodColor(method) {
    const colors = {
      'GET': 'var(--color-get)',
      'POST': 'var(--color-post)',
      'PUT': 'var(--color-put)',
      'PATCH': 'var(--color-patch)',
      'DELETE': 'var(--color-delete)',
      'HEAD': 'var(--color-head)',
      'OPTIONS': 'var(--color-options)'
    }
    return colors[method] || 'var(--color-text-secondary)'
  }

  /**
   * Folder Operations
   */

  /**
   * Add a new folder to a collection (at root level)
   */
  addFolderToCollection(collectionId, name) {
    this.logger.info(`Adding folder to collection ${collectionId}: ${name}`)
    const folder = this.collectionsStore.addFolderToCollection(collectionId, name)
    if (folder) {
      this.emit('folderAddedToCollection', { collectionId, folder })
    }
    return folder
  }

  /**
   * Add a new request to a folder
   */
  addRequestToFolder(collectionId, folderId) {
    this.logger.info(`Adding request to folder ${folderId} in collection ${collectionId}`)
    const request = this.collectionsStore.addRequestToFolder(collectionId, folderId)
    if (request) {
      this.emit('requestAddedToFolder', { collectionId, folderId, request })
    }
    return request
  }

  /**
   * Add a new folder to a folder
   */
  addFolderToFolder(collectionId, parentFolderId) {
    this.logger.info(`Adding folder to folder ${parentFolderId} in collection ${collectionId}`)
    const folderName = prompt('Enter folder name:') || 'New Folder'
    const folder = this.collectionsStore.addFolderToFolder(collectionId, parentFolderId, folderName)
    if (folder) {
      this.emit('folderAddedToFolder', { collectionId, parentFolderId, folder })
    }
    return folder
  }

  /**
   * Rename a folder
   */
  async renameFolder(collectionId, folderId) {
    const folderName = prompt('Enter new folder name:')
    if (folderName) {
      this.logger.info(`Renaming folder ${folderId} to ${folderName}`)
      const folder = this.collectionsStore.renameFolder(collectionId, folderId, folderName)
      if (folder) {
        this.emit('folderRenamed', { collectionId, folderId, folder })
      }
      return folder
    }
    return null
  }

  /**
   * Duplicate a folder with all its contents
   */
  duplicateFolder(collectionId, folderId) {
    this.logger.info(`Duplicating folder ${folderId} in collection ${collectionId}`)
    const duplicatedFolder = this.collectionsStore.duplicateFolder(collectionId, folderId)
    if (duplicatedFolder) {
      this.emit('folderDuplicated', { collectionId, originalFolderId: folderId, duplicatedFolder })
    }
    return duplicatedFolder
  }

  /**
   * Delete a folder and all its contents
   */
  async deleteFolder(collectionId, folderId) {
    const confirm = window.confirm('Are you sure you want to delete this folder and all its contents?')
    if (confirm) {
      this.logger.info(`Deleting folder ${folderId} from collection ${collectionId}`)
      const success = this.collectionsStore.deleteFolder(collectionId, folderId)
      if (success) {
        this.emit('folderDeleted', { collectionId, folderId })
      }
      return success
    }
    return false
  }
}