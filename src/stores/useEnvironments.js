/**
 * Environments Store
 *
 * Manages environments and variables with reactive persistence to localStorage.
 * Provides CRUD operations for environments and variable management.
 */

import { computed, nextTick } from 'vue'
import { useEnvironmentsStorage, useActiveEnvironmentStorage } from '../composables/useStorage.js'
import { Environment, EnvironmentVariable } from '../models/Environment.js'
import { generateId } from '../models/types.js'

// Global environments store
let environmentsStore = null

export function useEnvironments() {
  if (!environmentsStore) {
    environmentsStore = createEnvironmentsStore()
  }
  return environmentsStore
}

function createEnvironmentsStore() {
  const { data: environments } = useEnvironmentsStorage()
  const { data: activeEnvironmentId } = useActiveEnvironmentStorage()

  // Computed getters
  const allEnvironments = computed(() => environments.value || [])

  const activeEnvironment = computed(() => {
    if (activeEnvironmentId.value) {
      return allEnvironments.value.find(env => env.id === activeEnvironmentId.value)
    }
    return null
  })

  const totalVariables = computed(() => {
    return allEnvironments.value.reduce((total, env) => {
      return total + (env.values?.length || 0)
    }, 0)
  })

  // Environment operations
  const createNewEnvironment = (name = 'New Environment') => {
    const environment = new Environment({ name })
    const environmentJson = environment.toJSON()
    environments.value.push(environmentJson)
    return environmentJson
  }

  const getEnvironment = (id) => {
    return allEnvironments.value.find(env => env.id === id)
  }

  const updateEnvironment = (id, updates) => {
    console.log('[DEBUG] updateEnvironment called with id:', id, 'updates:', updates)
    const environment = getEnvironment(id)
    console.log('[DEBUG] Found environment:', environment)
    if (environment) {
      console.log('[DEBUG] Before update:', JSON.stringify(environment, null, 2))
      Object.assign(environment, updates)
      environment._postman_exported_at = new Date().toISOString()
      console.log('[DEBUG] After update:', JSON.stringify(environment, null, 2))
    }
    return environment
  }

  const deleteEnvironment = (id) => {
    const index = environments.value.findIndex(env => env.id === id)
    if (index > -1) {
      environments.value.splice(index, 1)

      // Clear active environment if it was deleted
      if (activeEnvironmentId.value === id) {
        activeEnvironmentId.value = null
      }
      return true
    }
    return false
  }

  const duplicateEnvironment = (id) => {
    const original = getEnvironment(id)
    if (original) {
      const envInstance = new Environment(original)
      const duplicate = envInstance.clone()
      duplicate.id = generateId()
      duplicate.name = `${original.name} Copy`
      duplicate._postman_exported_at = new Date().toISOString()

      // Generate new IDs for all variables
      duplicate.values = duplicate.values.map(variable => ({
        ...variable,
        id: generateId()
      }))

      const duplicateJson = duplicate.toJSON()
      environments.value.push(duplicateJson)
      return duplicateJson
    }
    return null
  }

  const setActiveEnvironment = (id) => {
    const environment = getEnvironment(id)
    if (environment) {
      activeEnvironmentId.value = id
      return environment
    } else if (id === null) {
      activeEnvironmentId.value = null
      return null
    }
    return null
  }

  // Variable operations
  const addVariable = (environmentId, key = '', value = '', enabled = true) => {
    const environment = getEnvironment(environmentId)
    if (environment) {
      const variable = new EnvironmentVariable({ key, value, enabled })
      environment.values.push(variable.toJSON())
      environment._postman_exported_at = new Date().toISOString()
      return variable.toJSON()
    }
    return null
  }

  const getVariable = (environmentId, variableId) => {
    const environment = getEnvironment(environmentId)
    if (environment) {
      return environment.values.find(variable => variable.id === variableId)
    }
    return null
  }

  const updateVariable = (environmentId, variableId, updates) => {
    const variable = getVariable(environmentId, variableId)
    if (variable) {
      Object.assign(variable, updates)

      const environment = getEnvironment(environmentId)
      if (environment) {
        environment._postman_exported_at = new Date().toISOString()
      }
    }
    return variable
  }

  const deleteVariable = (environmentId, variableId) => {
    const environment = getEnvironment(environmentId)
    if (environment) {
      const index = environment.values.findIndex(variable => variable.id === variableId)
      if (index > -1) {
        environment.values.splice(index, 1)
        environment._postman_exported_at = new Date().toISOString()
        return true
      }
    }
    return false
  }

  const duplicateVariable = (environmentId, variableId) => {
    const original = getVariable(environmentId, variableId)
    if (original) {
      const duplicate = JSON.parse(JSON.stringify(original))
      duplicate.id = generateId()
      duplicate.key = `${original.key}_copy`

      const environment = getEnvironment(environmentId)
      if (environment) {
        environment.values.push(duplicate)
        environment._postman_exported_at = new Date().toISOString()
        return duplicate
      }
    }
    return null
  }

  // Variable resolution and interpolation
  const resolveVariable = (key, environmentId = null) => {
    const targetEnvironment = environmentId
      ? getEnvironment(environmentId)
      : activeEnvironment.value

    if (targetEnvironment) {
      const variable = targetEnvironment.values.find(v => v.key === key && v.enabled)
      return variable?.value || null
    }
    return null
  }

  const interpolateString = (text, environmentId = null) => {
    if (!text || typeof text !== 'string') return text

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = resolveVariable(key.trim(), environmentId)
      return value !== null ? value : match
    })
  }

  const getAvailableVariables = (environmentId = null) => {
    const targetEnvironment = environmentId
      ? getEnvironment(environmentId)
      : activeEnvironment.value

    if (targetEnvironment) {
      return targetEnvironment.values.filter(v => v.enabled).map(v => ({
        key: v.key,
        value: v.value
      }))
    }
    return []
  }

  // Search and filtering
  const searchVariables = (query) => {
    const results = []
    const searchTerm = query.toLowerCase()

    allEnvironments.value.forEach(environment => {
      environment.values.forEach(variable => {
        const matchesKey = variable.key.toLowerCase().includes(searchTerm)
        const matchesValue = variable.value.toLowerCase().includes(searchTerm)

        if (matchesKey || matchesValue) {
          results.push({
            environment: environment,
            variable: variable
          })
        }
      })
    })

    return results
  }

  // Import/Export operations
  const exportEnvironment = (id) => {
    const environment = getEnvironment(id)
    if (environment) {
      return {
        ...environment,
        _postman_exported_at: new Date().toISOString(),
        _postman_exported_using: 'ToastMan'
      }
    }
    return null
  }

  const importEnvironment = (environmentData) => {
    try {
      // Validate basic structure
      if (!environmentData.name) {
        throw new Error('Invalid environment format')
      }

      // Create Environment instance for validation
      const imported = new Environment(environmentData)
      imported.id = generateId()
      imported.name = `${imported.name} (Imported)`
      imported._postman_exported_at = new Date().toISOString()
      imported._postman_exported_using = 'ToastMan'

      // Generate new IDs for all variables
      if (imported.values) {
        imported.values = imported.values.map(variable => ({
          ...variable,
          id: generateId()
        }))
      } else {
        imported.values = []
      }

      const importedJson = imported.toJSON()
      environments.value.push(importedJson)
      return importedJson
    } catch (error) {
      console.error('Failed to import environment:', error)
      throw error
    }
  }

  // Initialize with default environments if empty
  const initializeDefaultData = async () => {
    await nextTick()

    if (allEnvironments.value.length === 0) {
      const development = createNewEnvironment('Development')
      addVariable(development.id, 'baseUrl', 'https://api-dev.example.com')
      addVariable(development.id, 'apiKey', 'dev-api-key-123')

      const production = createNewEnvironment('Production')
      addVariable(production.id, 'baseUrl', 'https://api.example.com')
      addVariable(production.id, 'apiKey', 'prod-api-key-456')

      // Set development as active by default
      setActiveEnvironment(development.id)
    }
  }

  // Don't auto-initialize default data - let users start with empty state
  // initializeDefaultData()

  return {
    // Reactive data
    environments: allEnvironments,
    activeEnvironment,
    activeEnvironmentId: computed(() => activeEnvironmentId.value),
    totalVariables,

    // Environment operations
    createEnvironment: createNewEnvironment,
    getEnvironment,
    updateEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    setActiveEnvironment,

    // Variable operations
    addVariable,
    getVariable,
    updateVariable,
    deleteVariable,
    duplicateVariable,

    // Variable resolution
    resolveVariable,
    interpolateString,
    getAvailableVariables,

    // Search and filtering
    searchVariables,

    // Import/Export
    exportEnvironment,
    importEnvironment,

    // Utilities
    initializeDefaultData
  }
}