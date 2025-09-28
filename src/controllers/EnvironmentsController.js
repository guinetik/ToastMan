import { BaseController } from './BaseController.js'
import { Environment } from '../models/Environment.js'
import { useEnvironments } from '../stores/useEnvironments.js'

/**
 * Controller for Environments functionality
 */
export class EnvironmentsController extends BaseController {
  constructor() {
    super('environments')

    this.createState({
      // Environment-specific state can be added here if needed
    })

    // Initialize stores after state is created
    this.environmentsStore = useEnvironments()
  }

  init() {
    super.init()

    this.environments = this.createComputed('environments', () => {
      if (!this.environmentsStore) return []

      const envs = this.environmentsStore.environments
      const actualEnvs = envs?.value || envs
      const environments = Array.isArray(actualEnvs) ? actualEnvs : []

      return environments.map(e => {
        try {
          this.logger.debug('Creating Environment instance for:', e?.name || 'unnamed', 'with data:', e)
          return new Environment(e)
        } catch (error) {
          this.logger.error('Failed to parse environment:', error)
          this.logger.error('Raw environment data:', e)
          this.logger.error('Environment data types:', {
            id: typeof e?.id,
            name: typeof e?.name,
            createdAt: typeof e?.createdAt,
            updatedAt: typeof e?.updatedAt
          })
          return e
        }
      })
    })

    this.activeEnvironment = this.createComputed('activeEnvironment', () => {
      if (!this.environmentsStore) return null

      const active = this.environmentsStore.activeEnvironment
      const actualActive = active?.value || active
      if (!actualActive) return null

      try {
        this.logger.debug('Creating Environment instance with data:', actualActive)
        return new Environment(actualActive)
      } catch (error) {
        this.logger.error('Failed to parse active environment:', error)
        this.logger.error('Raw active environment data:', actualActive)
        this.logger.error('Active environment ID type:', typeof actualActive?.id, 'Value:', actualActive?.id)
        return actualActive
      }
    })
  }

  /**
   * Create new environment
   */
  async createEnvironment(name = 'New Environment') {
    const result = await this.executeAsync(async () => {
      const validation = this.validate(Environment, { name })
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const environment = this.environmentsStore.createEnvironment(name)
      this.logger.info('Created environment:', environment?.name, 'with ID:', environment?.id)

      return environment
    }, 'Failed to create environment')

    if (result.success) {
      this.emit('environmentCreated', result.data)
    }

    return result
  }

  /**
   * Set active environment
   */
  setActiveEnvironment(envId) {
    this.environmentsStore.setActiveEnvironment(envId)
    this.logger.info(`Set active environment: ${envId}`)
    this.emit('environmentChanged', envId)
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(envId) {
    const result = await this.executeAsync(async () => {
      this.environmentsStore.deleteEnvironment(envId)
      this.logger.info(`Deleted environment: ${envId}`)
    }, 'Failed to delete environment')

    if (result.success) {
      this.emit('environmentDeleted', envId)
    }

    return result
  }

  /**
   * Duplicate environment
   */
  async duplicateEnvironment(envId) {
    const result = await this.executeAsync(async () => {
      const duplicated = this.environmentsStore.duplicateEnvironment(envId)
      this.logger.info(`Duplicated environment: ${envId}`)
      return duplicated
    }, 'Failed to duplicate environment')

    if (result.success) {
      this.emit('environmentDuplicated', result.data)
    }

    return result
  }

  /**
   * Add variable to environment
   */
  async addVariable(environmentId, key = '', value = '', enabled = true) {
    const result = await this.executeAsync(async () => {
      const variable = this.environmentsStore.addVariable(environmentId, key, value, enabled)
      this.logger.info(`Added variable '${key}' to environment: ${environmentId}`)
      return variable
    }, 'Failed to add variable')

    if (result.success) {
      this.emit('variableAdded', { environmentId, variable: result.data })
    }

    return result
  }

  /**
   * Update variable in environment
   */
  async updateVariable(environmentId, variableId, updates) {
    const result = await this.executeAsync(async () => {
      const variable = this.environmentsStore.updateVariable(environmentId, variableId, updates)
      this.logger.info(`Updated variable in environment: ${environmentId}`)
      return variable
    }, 'Failed to update variable')

    if (result.success) {
      this.emit('variableUpdated', { environmentId, variableId, variable: result.data })
    }

    return result
  }

  /**
   * Delete variable from environment
   */
  async deleteVariable(environmentId, variableId) {
    const result = await this.executeAsync(async () => {
      this.environmentsStore.deleteVariable(environmentId, variableId)
      this.logger.info(`Deleted variable from environment: ${environmentId}`)
    }, 'Failed to delete variable')

    if (result.success) {
      this.emit('variableDeleted', { environmentId, variableId })
    }

    return result
  }

  /**
   * Import environment from file/data
   */
  async importEnvironment(environmentData) {
    const result = await this.executeAsync(async () => {
      const imported = this.environmentsStore.importEnvironment(environmentData)
      this.logger.info('Imported environment:', imported?.name)
      return imported
    }, 'Failed to import environment')

    if (result.success) {
      this.emit('environmentImported', result.data)
    }

    return result
  }

  /**
   * Export environment
   */
  exportEnvironment(environmentId) {
    try {
      const exported = this.environmentsStore.exportEnvironment(environmentId)
      this.logger.info('Exported environment:', environmentId)
      this.emit('environmentExported', { environmentId, data: exported })
      return { success: true, data: exported }
    } catch (error) {
      this.logger.error('Failed to export environment:', error)
      return { success: false, error: error.message }
    }
  }
}