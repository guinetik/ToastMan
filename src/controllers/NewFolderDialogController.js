import { BaseController } from './BaseController.js'
import { useCollections } from '../stores/useCollections.js'

/**
 * Controller for NewFolderDialog component
 * Handles folder creation with validation and error handling
 */
export class NewFolderDialogController extends BaseController {
  constructor(collectionId, parentFolderId = null) {
    super('NewFolderDialogController')

    // Store parameters
    this.collectionId = collectionId
    this.parentFolderId = parentFolderId

    // Get collections store
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
      // Form fields
      name: '',
      description: '',

      // UI state
      isSubmitting: false,
      hasChanges: false,

      // Validation
      validation: {
        isValid: false,
        errors: {}
      }
    })

    // Watch for form changes
    this.watchFormChanges()
  }

  /**
   * Watch for form field changes
   */
  watchFormChanges() {
    // This would be implemented with Vue watchers in the component
    // For now, validation is called manually on field updates
  }

  /**
   * Update form field
   */
  updateField(field, value) {
    this.state[field] = value
    this.state.hasChanges = true
    this.validateForm()
  }

  /**
   * Validate form
   */
  validateForm() {
    const errors = {}

    // Validate name
    if (!this.state.name.trim()) {
      errors.name = 'Folder name is required'
    } else if (this.state.name.trim().length < 2) {
      errors.name = 'Folder name must be at least 2 characters'
    } else if (this.state.name.trim().length > 100) {
      errors.name = 'Folder name must be less than 100 characters'
    }

    // Check for duplicate names
    if (this.state.name.trim() && this.isDuplicateName(this.state.name.trim())) {
      errors.name = 'A folder with this name already exists'
    }

    this.state.validation = {
      isValid: Object.keys(errors).length === 0,
      errors
    }

    return this.state.validation
  }

  /**
   * Check if folder name already exists
   */
  isDuplicateName(name) {
    try {
      const collection = this.collectionsStore.getCollection(this.collectionId)
      if (!collection) return false

      // Get the container where the new folder will be added
      let container = collection
      if (this.parentFolderId) {
        // Find parent folder
        const findFolder = (items, folderId) => {
          for (const item of items) {
            if (item.id === folderId) return item
            if (item.item && Array.isArray(item.item)) {
              const found = findFolder(item.item, folderId)
              if (found) return found
            }
          }
          return null
        }
        container = findFolder(collection.item || [], this.parentFolderId)
        if (!container) return false
      }

      // Check for duplicate names in the container
      const items = container.item || []
      return items.some(item =>
        item.name &&
        item.name.toLowerCase() === name.toLowerCase() &&
        (item.type === 'folder' || (!item.type && item.item))
      )
    } catch (error) {
      this.logger.error('Error checking duplicate name:', error)
      return false
    }
  }

  /**
   * Submit form
   */
  async submit() {
    return this.executeAsync(async () => {
      // Validate form
      const validation = this.validateForm()
      if (!validation.isValid) {
        throw new Error('Please fix the form errors before submitting')
      }

      this.state.isSubmitting = true

      // Create folder data
      const folderData = {
        name: this.state.name.trim(),
        description: this.state.description.trim(),
        type: 'folder',
        item: []
      }

      // Add folder to collection
      let newFolder
      if (this.parentFolderId) {
        newFolder = this.collectionsStore.addFolderToFolder(
          this.collectionId,
          this.parentFolderId,
          folderData.name
        )
      } else {
        newFolder = this.collectionsStore.addFolderToCollection(
          this.collectionId,
          folderData.name
        )
      }

      if (!newFolder) {
        throw new Error('Failed to create folder')
      }

      this.logger.info('Created new folder:', newFolder.name)

      // Reset state
      this.resetForm()

      return newFolder
    }, 'Failed to create folder')
  }

  /**
   * Reset form
   */
  resetForm() {
    this.state.name = ''
    this.state.description = ''
    this.state.hasChanges = false
    this.state.isSubmitting = false
    this.state.validation = {
      isValid: false,
      errors: {}
    }
  }

  /**
   * Check if user wants to close with unsaved changes
   */
  async confirmClose() {
    if (!this.state.hasChanges) {
      return true
    }

    // You might want to show a confirmation dialog here
    // For now, just allow close
    return true
  }

  /**
   * Close dialog
   */
  close() {
    this.resetForm()
  }

  /**
   * Get collection info for display
   */
  getCollectionInfo() {
    try {
      const collection = this.collectionsStore.getCollection(this.collectionId)
      return {
        name: collection?.info?.name || 'Unknown Collection',
        id: this.collectionId
      }
    } catch (error) {
      this.logger.error('Error getting collection info:', error)
      return {
        name: 'Unknown Collection',
        id: this.collectionId
      }
    }
  }

  /**
   * Get parent folder info for display
   */
  getParentFolderInfo() {
    if (!this.parentFolderId) return null

    try {
      const collection = this.collectionsStore.getCollection(this.collectionId)
      if (!collection) return null

      const findFolder = (items, folderId) => {
        for (const item of items) {
          if (item.id === folderId) return item
          if (item.item && Array.isArray(item.item)) {
            const found = findFolder(item.item, folderId)
            if (found) return found
          }
        }
        return null
      }

      const folder = findFolder(collection.item || [], this.parentFolderId)
      return folder ? {
        name: folder.name || 'Unnamed Folder',
        id: this.parentFolderId
      } : null
    } catch (error) {
      this.logger.error('Error getting parent folder info:', error)
      return null
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      collectionId: this.collectionId,
      parentFolderId: this.parentFolderId,
      state: this.state,
      collectionInfo: this.getCollectionInfo(),
      parentFolderInfo: this.getParentFolderInfo()
    }
  }
}