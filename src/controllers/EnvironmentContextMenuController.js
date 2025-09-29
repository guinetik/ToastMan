import { BaseContextMenuController } from './BaseContextMenuController.js'
import { useAlert } from '../composables/useAlert.js'

/**
 * Environment Context Menu Controller
 * Handles context menu actions for environments
 */
export class EnvironmentContextMenuController extends BaseContextMenuController {
  constructor(environmentsController) {
    super('environment-context-menu')

    this.environmentsController = environmentsController
    this.alert = useAlert()
  }

  /**
   * Get menu title
   */
  getMenuTitle(environment) {
    return environment?.name || 'Environment'
  }

  /**
   * Get menu items configuration
   */
  getMenuItems() {
    return [
      {
        action: 'activate',
        label: 'Set as Active',
        icon: '⚡'
      },
      {
        type: 'separator'
      },
      {
        action: 'variables',
        label: 'Manage Variables',
        icon: '🔧'
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
        action: 'export',
        label: 'Export',
        icon: '📤'
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
   * Handle environment-specific actions
   */
  async handleAction(action, environment) {
    this.logger.info(`Executing environment action: ${action} for environment: ${environment?.name}`)

    switch (action) {
      case 'activate':
        return await this.activateEnvironment(environment)
      case 'variables':
        return await this.manageVariables(environment)
      case 'rename':
        return await this.renameEnvironment(environment)
      case 'duplicate':
        return await this.duplicateEnvironment(environment)
      case 'export':
        return await this.exportEnvironment(environment)
      case 'delete':
        return await this.deleteEnvironment(environment)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Activate the environment
   */
  async activateEnvironment(environment) {
    this.environmentsController.setActiveEnvironment(environment.id)
    this.logger.info('Activated environment:', environment.name)
    return { action: 'activate', environmentId: environment.id, environmentName: environment.name }
  }

  /**
   * Manage environment variables
   */
  async manageVariables(environment) {
    this.logger.info('Opening variables dialog for environment:', environment.name)
    return { action: 'variables', environment: environment }
  }

  /**
   * Rename the environment
   */
  async renameEnvironment(environment) {
    const newName = await this.alert.prompt('Enter new environment name:', environment.name, 'Rename Environment')
    if (newName && newName.trim() && newName.trim() !== environment.name) {
      this.environmentsController.environmentsStore.updateEnvironment(environment.id, {
        name: newName.trim()
      })
      this.logger.info('Renamed environment from', environment.name, 'to', newName.trim())
      await this.alert.alertSuccess(`Environment renamed to "${newName.trim()}"`)
      return { action: 'rename', oldName: environment.name, newName: newName.trim() }
    }
    return { action: 'rename', cancelled: true }
  }

  /**
   * Duplicate the environment
   */
  async duplicateEnvironment(environment) {
    const duplicated = this.environmentsController.duplicateEnvironment(environment.id)
    if (duplicated) {
      this.logger.info('Duplicated environment:', environment.name, '→', duplicated.name)
      return { action: 'duplicate', originalId: environment.id, duplicateId: duplicated.id }
    }
    throw new Error('Failed to duplicate environment')
  }

  /**
   * Export the environment
   */
  async exportEnvironment(environment) {
    try {
      const exportData = {
        id: environment.id,
        name: environment.name,
        values: environment.values || [],
        exportedAt: new Date().toISOString(),
        exportedBy: 'ToastMan'
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${environment.name.replace(/[^a-z0-9]/gi, '_')}_environment.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.logger.info('Exported environment:', environment.name)
      return { action: 'export', environmentId: environment.id, environmentName: environment.name }
    } catch (error) {
      this.logger.error('Failed to export environment:', error)
      throw new Error('Failed to export environment')
    }
  }

  /**
   * Delete the environment
   */
  async deleteEnvironment(environment) {
    const isActive = this.environmentsController.environmentsStore.activeEnvironment?.value?.id === environment.id ||
                     this.environmentsController.environmentsStore.activeEnvironment?.id === environment.id

    const warningMessage = isActive
      ? `Are you sure you want to delete the environment "${environment.name}"?\n\nThis is your currently ACTIVE environment. Deleting it will deactivate all environment variables.\n\nThis action cannot be undone.`
      : `Are you sure you want to delete the environment "${environment.name}"?\n\nThis action cannot be undone.`

    const confirmDelete = await this.alert.confirmDelete(warningMessage, 'Delete Environment')

    if (confirmDelete) {
      await this.environmentsController.deleteEnvironment(environment.id)
      this.logger.info('Deleted environment:', environment.name)
      await this.alert.alertSuccess(`Environment "${environment.name}" has been deleted`)
      return { action: 'delete', environmentId: environment.id, environmentName: environment.name, wasActive: isActive }
    }

    return { action: 'delete', cancelled: true }
  }
}