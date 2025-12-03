import { BaseController } from './BaseController.js'
import { CollectionsController } from './CollectionsController.js'

/**
 * Controller for CollectionsTab component
 * Wraps CollectionsController and manages tab-specific functionality
 * Handles UI state, context menus, and component lifecycle
 */
export class CollectionsTabController extends BaseController {
  constructor() {
    super('CollectionsTabController')

    // Create the underlying collections controller
    this.collectionsController = new CollectionsController()

    // Initialize state
    this.init()
  }

  /**
   * Initialize controller state
   */
  init() {
    super.init()

    // Initialize the collections controller
    this.collectionsController.init()

    // Create reactive state for tab-specific functionality
    this.createState({
      // Context menu references will be set by component
      contextMenuRefs: {
        collection: null,
        request: null,
        folder: null
      },

      // Dialog state
      showNewFolderDialog: false,
      newFolderDialogData: null
    })

    // Proxy collections controller events
    this.collectionsController.on('collectionCreated', (data) => {
      this.emit('collectionCreated', data)
    })

    this.collectionsController.on('collectionDeleted', (collectionId) => {
      this.emit('collectionDeleted', collectionId)
    })
  }

  /**
   * Set context menu references from component
   */
  setContextMenuRefs(collectionRef, requestRef, folderRef) {
    this.state.contextMenuRefs.collection = collectionRef
    this.state.contextMenuRefs.request = requestRef
    this.state.contextMenuRefs.folder = folderRef

    // Set up event listeners for folder dialog requests
    if (collectionRef?.controller) {
      collectionRef.controller.on('showFolderDialog', (data) => {
        this.showNewFolderDialog(data)
      })
    }

    if (folderRef?.controller) {
      folderRef.controller.on('showFolderDialog', (data) => {
        this.showNewFolderDialog(data)
      })
    }
  }

  /**
   * Delegate methods to collections controller
   */
  getComputed(key) {
    return this.collectionsController.getComputed(key)
  }

  toggleCollection(id) {
    return this.collectionsController.toggleCollection(id)
  }

  openRequest(collectionId, requestId) {
    return this.collectionsController.openRequest(collectionId, requestId)
  }

  toggleNewCollectionDialog(show) {
    return this.collectionsController.toggleNewCollectionDialog(show)
  }

  isCollectionExpanded(collectionId) {
    return this.collectionsController.isCollectionExpanded(collectionId)
  }

  getMethodColor(method) {
    return this.collectionsController.getMethodColor(method)
  }

  async createCollection(name) {
    return this.collectionsController.createCollection(name)
  }

  async deleteCollection(collectionId) {
    return this.collectionsController.deleteCollection(collectionId)
  }

  /**
   * Context menu handling
   */
  showContextMenu(event, collection) {
    const contextMenuRef = this.state.contextMenuRefs.collection
    if (contextMenuRef) {
      contextMenuRef.show(event, collection)
    }
  }

  showRequestContextMenu(event, collection, request) {
    event.stopPropagation() // Prevent triggering collection context menu
    const requestContextMenuRef = this.state.contextMenuRefs.request
    if (requestContextMenuRef) {
      requestContextMenuRef.show(event, collection, request)
    }
  }

  showFolderContextMenu(event, collection, folder) {
    event.stopPropagation() // Prevent triggering collection context menu
    const folderContextMenuRef = this.state.contextMenuRefs.folder
    if (folderContextMenuRef) {
      folderContextMenuRef.show(event, collection, folder)
    }
  }

  handleContextAction(action, data) {
    // Handle context menu actions
    this.logger.info('Context action:', action, data)
  }

  handleRequestContextAction(action, data) {
    // Handle request context menu actions
    this.logger.info('Request context action:', action, data)
  }

  handleFolderContextAction(action, data) {
    // Handle folder context menu actions
    this.logger.info('Folder context action:', action, data)
  }

  /**
   * Get collections controller state for direct access
   */
  getCollectionsState() {
    return this.collectionsController.state
  }

  /**
   * Utility methods
   */
  getCollections() {
    return this.getComputed('collections') || []
  }

  getFilteredCollections() {
    return this.getComputed('filteredCollections') || []
  }

  /**
   * Show NewFolderDialog
   */
  showNewFolderDialog(data) {
    this.state.newFolderDialogData = data
    this.state.showNewFolderDialog = true
    this.logger.info('Showing folder dialog for:', data.type, 'collection:', data.collectionId)
  }

  /**
   * Hide NewFolderDialog
   */
  hideNewFolderDialog() {
    this.state.showNewFolderDialog = false
    this.state.newFolderDialogData = null
  }

  /**
   * Validation and debugging
   */
  validateState() {
    const errors = []

    if (!this.collectionsController) {
      errors.push('Collections controller not initialized')
    }

    if (!this.state.contextMenuRefs) {
      errors.push('Context menu references not set')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  getDebugInfo() {
    return {
      controller: 'CollectionsTabController',
      collectionsControllerState: this.collectionsController?.state,
      contextMenuRefs: {
        collection: !!this.state.contextMenuRefs?.collection,
        request: !!this.state.contextMenuRefs?.request,
        folder: !!this.state.contextMenuRefs?.folder
      },
      validation: this.validateState()
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.collectionsController) {
      this.collectionsController.dispose()
    }
    super.dispose()
  }
}