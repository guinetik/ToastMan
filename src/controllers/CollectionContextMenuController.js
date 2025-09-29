import { BaseContextMenuController } from './BaseContextMenuController.js'
import { useAlert } from '../composables/useAlert.js'

/**
 * Collection Context Menu Controller
 * Handles context menu actions for collections
 */
export class CollectionContextMenuController extends BaseContextMenuController {
  constructor(collectionsController) {
    super('collection-context-menu')

    this.collectionsController = collectionsController
    this.alert = useAlert()
  }

  /**
   * Get menu title
   */
  getMenuTitle(collection) {
    return collection?.info?.name || 'Collection'
  }

  /**
   * Get menu items configuration
   */
  getMenuItems() {
    return [
      {
        action: 'create-request',
        label: 'Create Request',
        icon: '➕'
      },
      {
        type: 'separator'
      },
      {
        action: 'rename',
        label: 'Rename',
        icon: '✏️'
      },
      {
        action: 'duplicate',
        label: 'Duplicate',
        icon: '📋'
      },
      {
        type: 'separator'
      },
      {
        action: 'delete',
        label: 'Delete',
        icon: '🗑️',
        danger: true
      }
    ]
  }

  /**
   * Handle collection-specific actions
   */
  async handleAction(action, collection) {
    this.logger.info(`Executing collection action: ${action} for collection: ${collection?.info?.name}`)

    switch (action) {
      case 'create-request':
        return await this.createRequest(collection)
      case 'rename':
        return await this.renameCollection(collection)
      case 'duplicate':
        return await this.duplicateCollection(collection)
      case 'delete':
        return await this.deleteCollection(collection)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Create a new request in the collection
   */
  async createRequest(collection) {
    const newRequest = this.collectionsController.collectionsStore.addRequest(collection.info.id)
    if (newRequest) {
      this.collectionsController.openRequest(collection.info.id, newRequest.id)
      this.logger.info('Created new request in collection:', collection.info.name)
      return { action: 'create-request', requestId: newRequest.id }
    }
    throw new Error('Failed to create request')
  }

  /**
   * Rename the collection
   */
  async renameCollection(collection) {
    const newName = await this.alert.prompt('Enter new collection name:', collection.info.name, 'Rename Collection')
    if (newName && newName.trim() && newName.trim() !== collection.info.name) {
      this.collectionsController.collectionsStore.updateCollection(collection.info.id, {
        name: newName.trim()
      })
      this.logger.info('Renamed collection from', collection.info.name, 'to', newName.trim())
      await this.alert.alertSuccess(`Collection renamed to "${newName.trim()}"`)
      return { action: 'rename', oldName: collection.info.name, newName: newName.trim() }
    }
    return { action: 'rename', cancelled: true }
  }

  /**
   * Duplicate the collection
   */
  async duplicateCollection(collection) {
    const duplicated = this.collectionsController.collectionsStore.duplicateCollection(collection.info.id)
    if (duplicated?.info?.id) {
      this.collectionsController.state.expandedCollections.add(duplicated.info.id)
      this.logger.info('Duplicated collection:', collection.info.name, '→', duplicated.info.name)
      await this.alert.alertSuccess(`Collection duplicated as "${duplicated.info.name}"`)
      return { action: 'duplicate', originalId: collection.info.id, duplicateId: duplicated.info.id }
    }
    await this.alert.alertError('Failed to duplicate collection')
    throw new Error('Failed to duplicate collection')
  }

  /**
   * Delete the collection
   */
  async deleteCollection(collection) {
    const confirmDelete = await this.alert.confirmDelete(
      `Are you sure you want to delete the collection "${collection.info.name}"?\n\nThis action cannot be undone.`,
      'Delete Collection'
    )

    if (confirmDelete) {
      await this.collectionsController.deleteCollection(collection.info.id)
      this.logger.info('Deleted collection:', collection.info.name)
      await this.alert.alertSuccess(`Collection "${collection.info.name}" has been deleted`)
      return { action: 'delete', collectionId: collection.info.id, collectionName: collection.info.name }
    }

    return { action: 'delete', cancelled: true }
  }
}