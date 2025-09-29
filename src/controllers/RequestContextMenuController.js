import { BaseContextMenuController } from './BaseContextMenuController.js'
import { useAlert } from '../composables/useAlert.js'

/**
 * Request Context Menu Controller
 * Handles context menu actions for individual requests within collections
 */
export class RequestContextMenuController extends BaseContextMenuController {
  constructor(collectionsController) {
    super('request-context-menu')

    this.collectionsController = collectionsController
    this.alert = useAlert()
  }

  /**
   * Get menu title
   */
  getMenuTitle(requestData) {
    return requestData?.request?.name || 'Request'
  }

  /**
   * Get menu items configuration
   */
  getMenuItems() {
    return [
      {
        action: 'open',
        label: 'Open in Tab',
        icon: '📄'
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
        action: 'move',
        label: 'Move to Collection',
        icon: '📁'
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
   * Handle request-specific actions
   */
  async handleAction(action, requestData) {
    this.logger.info(`Executing request action: ${action} for request: ${requestData?.request?.name}`)

    if (!requestData || !requestData.collectionId || !requestData.request) {
      this.logger.error('Invalid request data for action:', action, requestData)
      return
    }

    const { collectionId, request } = requestData

    switch (action) {
      case 'open':
        await this.openRequest(collectionId, request.id)
        break

      case 'rename':
        await this.renameRequest(collectionId, request.id)
        break

      case 'duplicate':
        await this.duplicateRequest(collectionId, request.id)
        break

      case 'move':
        await this.moveRequest(collectionId, request.id)
        break

      case 'delete':
        await this.deleteRequest(collectionId, request.id)
        break

      default:
        this.logger.warn(`Unknown action: ${action}`)
    }

    this.hide()
  }

  /**
   * Open request in a new tab
   */
  async openRequest(collectionId, requestId) {
    this.logger.info(`Opening request ${requestId} from collection ${collectionId}`)
    this.collectionsController.openRequest(collectionId, requestId)
  }

  /**
   * Rename request
   */
  async renameRequest(collectionId, requestId) {
    const request = this.collectionsController.collectionsStore.getRequest(collectionId, requestId)
    if (!request) {
      this.logger.error('Request not found for rename')
      await this.alert.alertError('Request not found')
      return
    }

    const newName = await this.alert.prompt('Enter new name:', request.name, 'Rename Request')
    if (newName && newName.trim() && newName.trim() !== request.name) {
      this.collectionsController.collectionsStore.updateRequest(collectionId, requestId, {
        name: newName.trim()
      })
      this.logger.info(`Renamed request to: ${newName.trim()}`)
      await this.alert.alertSuccess(`Request renamed to "${newName.trim()}"`)
    }
  }

  /**
   * Duplicate request
   */
  async duplicateRequest(collectionId, requestId) {
    const duplicated = this.collectionsController.collectionsStore.duplicateRequest(collectionId, requestId)
    if (duplicated) {
      this.logger.info(`Duplicated request: ${duplicated.name}`)
      await this.alert.alertSuccess(`Request duplicated as "${duplicated.name}"`)
    } else {
      await this.alert.alertError('Failed to duplicate request')
    }
  }

  /**
   * Move request to another collection
   */
  async moveRequest(collectionId, requestId) {
    // Get all collections for selection
    const collections = this.collectionsController.collectionsStore.collections.value || []
    const otherCollections = collections.filter(c => c.info.id !== collectionId)

    if (otherCollections.length === 0) {
      await this.alert.alertWarning('No other collections available to move to.')
      return
    }

    // Create a list of collection options
    const collectionOptions = otherCollections
      .map((c, index) => `${index + 1}. ${c.info.name} (${c.item?.length || 0} requests)`)
      .join('\n')

    const message = `Select collection to move to:\n\n${collectionOptions}\n\nEnter collection number (1-${otherCollections.length}):`
    const selectedIndex = await this.alert.prompt(message, '', 'Move Request')

    if (selectedIndex) {
      const index = parseInt(selectedIndex) - 1
      if (index >= 0 && index < otherCollections.length) {
        const targetCollectionId = otherCollections[index].info.id
        const moved = this.collectionsController.collectionsStore.moveRequest(collectionId, targetCollectionId, requestId)
        if (moved) {
          this.logger.info(`Moved request to collection: ${otherCollections[index].info.name}`)
          await this.alert.alertSuccess(`Request moved to "${otherCollections[index].info.name}"`)
        } else {
          await this.alert.alertError('Failed to move request')
        }
      } else {
        await this.alert.alertError('Invalid selection. Please enter a valid collection number.')
      }
    }
  }

  /**
   * Delete request
   */
  async deleteRequest(collectionId, requestId) {
    const request = this.collectionsController.collectionsStore.getRequest(collectionId, requestId)
    if (!request) {
      this.logger.error('Request not found for deletion')
      await this.alert.alertError('Request not found')
      return
    }

    const confirmed = await this.alert.confirmDelete(
      `Are you sure you want to delete "${request.name}"? This action cannot be undone.`,
      'Delete Request'
    )

    if (confirmed) {
      const deleted = this.collectionsController.collectionsStore.deleteRequest(collectionId, requestId)
      if (deleted) {
        this.logger.info(`Deleted request: ${request.name}`)
        await this.alert.alertSuccess(`Request "${request.name}" has been deleted`)
      } else {
        await this.alert.alertError('Failed to delete request')
      }
    }
  }

  /**
   * Show context menu for a request
   */
  show(event, collection, request) {
    // Prepare request data with collection context
    const requestData = {
      collectionId: collection.info.id,
      request: request
    }

    super.show(event, requestData)
  }
}