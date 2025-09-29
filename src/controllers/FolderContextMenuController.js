import { BaseContextMenuController } from './BaseContextMenuController.js'

/**
 * Folder Context Menu Controller
 * Handles context menu actions for folders
 */
export class FolderContextMenuController extends BaseContextMenuController {
  constructor(collectionsController) {
    super('folder-context-menu')

    this.collectionsController = collectionsController
    this.currentCollection = null
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
    const newFolder = this.collectionsController.addFolderToFolder(
      this.currentCollection.info.id,
      folder.id
    )
    if (newFolder) {
      this.logger.info('Added new folder to folder:', folder.name)
      return { action: 'new-folder', folderId: newFolder.id }
    }
    throw new Error('Failed to add folder to folder')
  }

  /**
   * Rename the folder
   */
  async renameFolder(folder) {
    const result = await this.collectionsController.renameFolder(
      this.currentCollection.info.id,
      folder.id
    )
    if (result) {
      this.logger.info('Renamed folder:', folder.name, '→', result.name)
      return { action: 'rename', oldName: folder.name, newName: result.name }
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
    const success = await this.collectionsController.deleteFolder(
      this.currentCollection.info.id,
      folder.id
    )
    if (success) {
      this.logger.info('Deleted folder:', folder.name)
      return { action: 'delete', folderId: folder.id, folderName: folder.name }
    }
    throw new Error('Failed to delete folder')
  }
}