import { ref, computed } from 'vue'
import { BaseController } from './BaseController.js'
import { useCollections } from '../stores/useCollections.js'

/**
 * Controller for CollectionPickerDialog component
 * Handles collection and folder selection, creation, and request saving with full folder support
 */
export class CollectionPickerDialogController extends BaseController {
  constructor() {
    super('CollectionPickerDialogController')

    // Store instance
    this.collectionsStore = useCollections()

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
      // Form inputs
      requestName: 'New Request',
      newCollectionName: '',
      newFolderName: '',

      // Selection state
      selectedCollectionId: null,
      selectedFolderId: null, // null = root of collection

      // UI state
      showNewCollection: false,
      showNewFolder: false,
      expandedFolders: new Set(), // Track which folders are expanded

      // Dialog operation mode
      mode: 'select' // 'select', 'create-collection', 'create-folder'
    })

    // Create computed properties
    this.createComputed('collections', () => {
      return this.collectionsStore.collections.value || []
    })

    this.createComputed('selectedCollection', () => {
      if (!this.state.selectedCollectionId) return null
      return this.getComputed('collections').find(c => c.info.id === this.state.selectedCollectionId)
    })

    this.createComputed('canSave', () => {
      const hasRequestName = this.state.requestName.trim().length > 0

      if (this.state.mode === 'create-collection') {
        return hasRequestName && this.state.newCollectionName.trim().length > 0
      } else if (this.state.mode === 'create-folder') {
        return hasRequestName && this.state.newFolderName.trim().length > 0 && this.state.selectedCollectionId
      } else {
        return hasRequestName && this.state.selectedCollectionId
      }
    })

    // Initialize with first collection if available
    this.autoSelectFirstCollection()
  }

  /**
   * Initialize from props
   */
  initializeFromProps(requestName) {
    this.state.requestName = requestName || 'New Request'
  }

  /**
   * Auto-select first collection if none selected
   */
  autoSelectFirstCollection() {
    const collections = this.getComputed('collections')
    if (collections.length > 0 && !this.state.selectedCollectionId) {
      this.state.selectedCollectionId = collections[0].info.id
    }
  }

  /**
   * Get folder hierarchy for a collection
   */
  getFolderHierarchy(collectionId) {
    const collection = this.getComputed('collections').find(c => c.info.id === collectionId)
    if (!collection) return []

    const buildHierarchy = (items, parentPath = []) => {
      const result = []

      items.forEach((item, index) => {
        const currentPath = [...parentPath, index]

        if (item.item && Array.isArray(item.item)) {
          // This is a folder
          const folder = {
            id: item.id,
            name: item.name,
            type: 'folder',
            path: currentPath,
            level: parentPath.length,
            requestCount: this.countRequestsInFolder(item),
            children: buildHierarchy(item.item, [...currentPath, 'item'])
          }
          result.push(folder)
        }
      })

      return result
    }

    return buildHierarchy(collection.item || [])
  }

  /**
   * Count total requests in a folder (recursive)
   */
  countRequestsInFolder(folder) {
    let count = 0

    for (const item of folder.item || []) {
      if (item.request) {
        count++
      } else if (item.item && Array.isArray(item.item)) {
        count += this.countRequestsInFolder(item)
      }
    }

    return count
  }

  /**
   * Get total request count for a collection
   */
  getCollectionRequestCount(collection) {
    return this.countRequestsInFolder({ item: collection.item || [] })
  }

  /**
   * Selection methods
   */
  selectCollection(collectionId) {
    this.state.selectedCollectionId = collectionId
    this.state.selectedFolderId = null // Reset folder selection
    this.state.mode = 'select'
    this.state.showNewCollection = false
    this.state.showNewFolder = false
  }

  selectFolder(collectionId, folderId) {
    this.state.selectedCollectionId = collectionId
    this.state.selectedFolderId = folderId
    this.state.mode = 'select'
    this.state.showNewCollection = false
    this.state.showNewFolder = false
  }

  /**
   * Folder expansion methods
   */
  toggleFolderExpansion(folderId) {
    if (this.state.expandedFolders.has(folderId)) {
      this.state.expandedFolders.delete(folderId)
    } else {
      this.state.expandedFolders.add(folderId)
    }

    // Trigger reactivity
    this.state.expandedFolders = new Set(this.state.expandedFolders)
  }

  isFolderExpanded(folderId) {
    return this.state.expandedFolders.has(folderId)
  }

  /**
   * Creation mode methods
   */
  showCreateCollection() {
    this.state.mode = 'create-collection'
    this.state.showNewCollection = true
    this.state.showNewFolder = false
    this.state.selectedCollectionId = null
    this.state.selectedFolderId = null
  }

  showCreateFolder(collectionId = null) {
    this.state.mode = 'create-folder'
    this.state.showNewFolder = true
    this.state.showNewCollection = false

    if (collectionId) {
      this.state.selectedCollectionId = collectionId
    }

    // If no collection selected, auto-select first one
    if (!this.state.selectedCollectionId) {
      this.autoSelectFirstCollection()
    }
  }

  cancelCreation() {
    this.state.mode = 'select'
    this.state.showNewCollection = false
    this.state.showNewFolder = false
    this.state.newCollectionName = ''
    this.state.newFolderName = ''
  }

  /**
   * Save request
   */
  async handleSave() {
    if (!this.getComputed('canSave')) {
      this.logger.warn('Cannot save - validation failed')
      return
    }

    try {
      let targetCollectionId = this.state.selectedCollectionId
      let targetFolderId = this.state.selectedFolderId
      let isNewCollection = false
      let isNewFolder = false

      // Handle new collection creation
      if (this.state.mode === 'create-collection' && this.state.newCollectionName.trim()) {
        const newCollection = await this.executeAsync(async () => {
          return this.collectionsStore.createCollection(this.state.newCollectionName.trim())
        }, 'Failed to create collection')

        if (newCollection.success) {
          targetCollectionId = newCollection.data.info.id
          targetFolderId = null
          isNewCollection = true

          this.logger.info('Created new collection:', newCollection.data.info.name)
        } else {
          return // Error already logged by executeAsync
        }
      }
      // Handle new folder creation
      else if (this.state.mode === 'create-folder' && this.state.newFolderName.trim()) {
        const result = await this.executeAsync(async () => {
          if (this.state.selectedFolderId) {
            // Create folder inside another folder
            return this.collectionsStore.addFolderToFolder(
              this.state.selectedCollectionId,
              this.state.selectedFolderId,
              this.state.newFolderName.trim()
            )
          } else {
            // Create folder at collection root
            return this.collectionsStore.addFolderToCollection(
              this.state.selectedCollectionId,
              this.state.newFolderName.trim()
            )
          }
        }, 'Failed to create folder')

        if (result.success) {
          targetFolderId = result.data.id
          isNewFolder = true

          this.logger.info('Created new folder:', result.data.name)
        } else {
          return // Error already logged by executeAsync
        }
      }

      // Emit save event
      this.emit('save', {
        collectionId: targetCollectionId,
        folderId: targetFolderId,
        requestName: this.state.requestName.trim(),
        isNewCollection,
        isNewFolder
      })

      this.logger.debug('Request save completed', {
        collectionId: targetCollectionId,
        folderId: targetFolderId,
        requestName: this.state.requestName.trim()
      })

    } catch (error) {
      this.logger.error('Failed to save request:', error)
      this.emit('error', { message: 'Failed to save request', error })
    }
  }

  /**
   * Close dialog
   */
  handleClose() {
    this.emit('close')
  }

  /**
   * Get display path for current selection
   */
  getSelectionDisplayPath() {
    const collection = this.getComputed('selectedCollection')
    if (!collection) return ''

    let path = collection.info.name

    if (this.state.selectedFolderId) {
      const folder = this.findFolderById(collection, this.state.selectedFolderId)
      if (folder) {
        const folderPath = this.buildFolderPath(collection, this.state.selectedFolderId)
        path += ' / ' + folderPath.join(' / ')
      }
    }

    return path
  }

  /**
   * Find folder by ID in a collection
   */
  findFolderById(collection, folderId) {
    const findInItems = (items) => {
      for (const item of items) {
        if (item.id === folderId && item.item && Array.isArray(item.item)) {
          return item
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

  /**
   * Build folder path array
   */
  buildFolderPath(collection, folderId) {
    const path = []

    const findPath = (items, targetId, currentPath = []) => {
      for (const item of items) {
        const newPath = [...currentPath, item.name]

        if (item.id === targetId) {
          return newPath
        }

        if (item.item && Array.isArray(item.item)) {
          const found = findPath(item.item, targetId, newPath)
          if (found) return found
        }
      }
      return null
    }

    const result = findPath(collection.item || [], folderId)
    return result || []
  }

  /**
   * Validate input
   */
  validateInput() {
    const errors = []

    if (!this.state.requestName.trim()) {
      errors.push('Request name is required')
    }

    if (this.state.mode === 'create-collection' && !this.state.newCollectionName.trim()) {
      errors.push('Collection name is required')
    }

    if (this.state.mode === 'create-folder' && !this.state.newFolderName.trim()) {
      errors.push('Folder name is required')
    }

    if (this.state.mode === 'select' && !this.state.selectedCollectionId) {
      errors.push('Please select a collection')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get summary for debugging
   */
  getSummary() {
    return {
      mode: this.state.mode,
      requestName: this.state.requestName,
      selectedCollection: this.getComputed('selectedCollection')?.info.name,
      selectedFolder: this.state.selectedFolderId,
      selectionPath: this.getSelectionDisplayPath(),
      canSave: this.getComputed('canSave'),
      validation: this.validateInput()
    }
  }
}