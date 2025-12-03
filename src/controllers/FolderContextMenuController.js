import { BaseContextMenuController } from './BaseContextMenuController.js'
import { useAlert } from '../composables/useAlert.js'

/**
 * Folder Context Menu Controller
 * Handles context menu actions for folders
 */
export class FolderContextMenuController extends BaseContextMenuController {
  constructor(collectionsController) {
    super('folder-context-menu')

    this.collectionsController = collectionsController
    this.currentCollection = null
    this.alert = useAlert()
  }

  /**
   * Show context menu for folder
   */
  show(event, collection, folder) {
    this.currentCollection = collection
    super.show(event, folder)
  }

  /**
   * Get menu title
   */
  getMenuTitle(folder) {
    return folder?.name || 'Folder'
  }

  /**
   * Get menu items configuration
   */
  getMenuItems() {
    return [
      {
        action: 'new-request',
        label: 'New Request',
        icon: '➕'
      },
      {
        action: 'new-folder',
        label: 'New Folder',
        icon: '📁'
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
   * Handle folder-specific actions
   */
  async handleAction(action, folder) {
    if (!this.currentCollection) {
      throw new Error('No collection context available')
    }

    this.logger.info(`Executing folder action: ${action} for folder: ${folder?.name}`)

    switch (action) {
      case 'new-request':
        return await this.addRequestToFolder(folder)
      case 'new-folder':
        return await this.addFolderToFolder(folder)
      case 'rename':
        return await this.renameFolder(folder)
      case 'duplicate':
        return await this.duplicateFolder(folder)
      case 'delete':
        return await this.deleteFolder(folder)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Add a new request to this folder
   */
  async addRequestToFolder(folder) {
    const request = this.collectionsController.addRequestToFolder(
      this.currentCollection.info.id,
      folder.id
    )
    if (request) {
      this.logger.info('Added new request to folder:', folder.name)
      return { action: 'new-request', requestId: request.id }
    }
    throw new Error('Failed to add request to folder')
  }

  /**
   * Add a new folder to this folder
   */
  async addFolderToFolder(folder) {
    // Emit event to trigger NewFolderDialog instead of using browser prompt
    this.emit('showFolderDialog', {
      type: 'new-folder',
      collectionId: this.currentCollection.info.id,
      parentFolderId: folder.id,
      collection: this.currentCollection,
      parentFolder: folder
    })

    this.logger.info('Requested folder creation dialog for folder:', folder.name)
    return { action: 'new-folder', dialogRequested: true }
  }

  /**
   * Rename the folder
   */
  async renameFolder(folder) {
    const newName = await this.alert.prompt('Enter new folder name:', folder.name, 'Rename Folder')
    if (newName && newName.trim() && newName.trim() !== folder.name) {
      const result = this.collectionsController.collectionsStore.renameFolder(
        this.currentCollection.info.id,
        folder.id,
        newName.trim()
      )
      if (result) {
        this.logger.info('Renamed folder from', folder.name, 'to', newName.trim())
        await this.alert.alertSuccess(`Folder renamed to "${newName.trim()}"`)
        return { action: 'rename', oldName: folder.name, newName: newName.trim() }
      }
      await this.alert.alertError('Failed to rename folder')
      throw new Error('Failed to rename folder')
    }
    return { action: 'rename', cancelled: true }
  }

  /**
   * Duplicate the folder
   */
  async duplicateFolder(folder) {
    const duplicated = this.collectionsController.duplicateFolder(
      this.currentCollection.info.id,
      folder.id
    )
    if (duplicated) {
      this.logger.info('Duplicated folder:', folder.name, '→', duplicated.name)
      return { action: 'duplicate', originalId: folder.id, duplicateId: duplicated.id }
    }
    throw new Error('Failed to duplicate folder')
  }

  /**
   * Delete the folder
   */
  async deleteFolder(folder) {
    const confirmDelete = await this.alert.confirmDelete(
      `Are you sure you want to delete the folder "${folder.name}"?\n\nThis action cannot be undone and will delete all contents inside the folder.`,
      'Delete Folder'
    )

    if (confirmDelete) {
      const success = this.collectionsController.collectionsStore.deleteFolder(
        this.currentCollection.info.id,
        folder.id
      )
      if (success) {
        this.logger.info('Deleted folder:', folder.name)
        await this.alert.alertSuccess(`Folder "${folder.name}" has been deleted`)
        return { action: 'delete', folderId: folder.id, folderName: folder.name }
      }
      await this.alert.alertError('Failed to delete folder')
      throw new Error('Failed to delete folder')
    }

    return { action: 'delete', cancelled: true }
  }
}