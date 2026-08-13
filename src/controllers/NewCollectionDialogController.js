import { BaseDialogController } from './BaseDialogController.js'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useAlert } from '../composables/useAlert.js'
import { PostmanAdapter } from '../adapters/PostmanAdapter.js'
import { BrunoOpenCollectionAdapter } from '../adapters/BrunoOpenCollectionAdapter.js'
import { readCollectionArchive } from '../adapters/collectionArchive.js'

/**
 * Controller for New Collection dialog
 */
export class NewCollectionDialogController extends BaseDialogController {
  constructor() {
    super('new-collection')

    this.collectionsStore = useCollections()
    this.environmentsStore = useEnvironments()
    this.alertService = useAlert()
  }

  /**
   * Reset form data
   */
  resetFormData() {
    this.state.formData = {
      name: '',
      description: '',
      template: 'blank',
      importData: null
    }
  }

  /**
   * Validate form
   */
  validateForm() {
    this.clearErrors()

    if (!this.state.formData.name || this.state.formData.name.trim().length === 0) {
      this.setFieldError('name', 'Collection name is required')
      return false
    }

    if (this.state.formData.name.trim().length < 2) {
      this.setFieldError('name', 'Collection name must be at least 2 characters')
      return false
    }

    if (this.state.formData.name.trim().length > 100) {
      this.setFieldError('name', 'Collection name must be less than 100 characters')
      return false
    }

    if (this.isNameTaken(this.state.formData.name.trim())) {
      this.setFieldError('name', 'A collection with this name already exists')
      return false
    }

    if (this.state.formData.description && this.state.formData.description.length > 500) {
      this.setFieldError('description', 'Description must be less than 500 characters')
      return false
    }

    if (this.state.formData.template === 'import' && !this.state.formData.importData) {
      this.setFieldError('import', 'Please select a file to import')
      return false
    }

    return true
  }

  /**
   * Check if collection name is already taken
   */
  isNameTaken(name) {
    const collections = this.collectionsStore.collections?.value || this.collectionsStore.collections || []
    return collections.some(c => c.info?.name.toLowerCase() === name.toLowerCase())
  }

  /**
   * Process submit
   */
  async processSubmit(formData) {
    const { name, description, template, importData } = formData

    let collection

    switch (template) {
      case 'blank':
        collection = await this.createBlankCollection(name.trim(), description.trim())
        break

      case 'rest-api':
        collection = await this.createRestApiTemplate(name.trim(), description.trim())
        break

      case 'graphql':
        collection = await this.createGraphQLTemplate(name.trim(), description.trim())
        break

      case 'import':
        collection = await this.importCollection(importData, name.trim(), description.trim())
        break

      default:
        throw new Error(`Unknown template: ${template}`)
    }

    this.logger.info(`Created collection: ${collection.info.name}`)
    return collection
  }

  /**
   * Create blank collection
   */
  async createBlankCollection(name, description) {
    const collection = this.collectionsStore.createCollection(name)
    if (description) {
      this.collectionsStore.updateCollection(collection.info.id, { description })
    }
    return collection
  }

  /**
   * Create REST API template collection
   */
  async createRestApiTemplate(name, description) {
    const collection = this.collectionsStore.createCollection(name)
    if (description) {
      this.collectionsStore.updateCollection(collection.info.id, { description })
    }

    const sampleRequests = [
      {
        name: 'Get Users',
        request: {
          method: 'GET',
          url: {
            raw: 'https://jsonplaceholder.typicode.com/users',
            protocol: 'https',
            host: ['jsonplaceholder', 'typicode', 'com'],
            path: ['users']
          },
          header: [
            { key: 'Accept', value: 'application/json', enabled: true }
          ]
        }
      },
      {
        name: 'Create User',
        request: {
          method: 'POST',
          url: {
            raw: 'https://jsonplaceholder.typicode.com/users',
            protocol: 'https',
            host: ['jsonplaceholder', 'typicode', 'com'],
            path: ['users']
          },
          header: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Accept', value: 'application/json', enabled: true }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              name: 'John Doe',
              email: 'john@example.com',
              username: 'johndoe'
            }, null, 2),
            options: {
              raw: { language: 'json' }
            }
          }
        }
      },
      {
        name: 'Update User',
        request: {
          method: 'PUT',
          url: {
            raw: 'https://jsonplaceholder.typicode.com/users/1',
            protocol: 'https',
            host: ['jsonplaceholder', 'typicode', 'com'],
            path: ['users', '1']
          },
          header: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Accept', value: 'application/json', enabled: true }
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify({
              name: 'Jane Doe',
              email: 'jane@example.com'
            }, null, 2),
            options: {
              raw: { language: 'json' }
            }
          }
        }
      },
      {
        name: 'Delete User',
        request: {
          method: 'DELETE',
          url: {
            raw: 'https://jsonplaceholder.typicode.com/users/1',
            protocol: 'https',
            host: ['jsonplaceholder', 'typicode', 'com'],
            path: ['users', '1']
          },
          header: [
            { key: 'Accept', value: 'application/json', enabled: true }
          ]
        }
      }
    ]

    sampleRequests.forEach(req => {
      this.collectionsStore.addRequest(collection.info.id, req.request)
      // Update the request name
      const updatedCollection = this.collectionsStore.getCollection(collection.info.id)
      const addedRequest = updatedCollection.item[updatedCollection.item.length - 1]
      if (addedRequest) {
        addedRequest.name = req.name
      }
    })

    return collection
  }

  /**
   * Create GraphQL template collection
   */
  async createGraphQLTemplate(name, description) {
    const collection = this.collectionsStore.createCollection(name)
    if (description) {
      this.collectionsStore.updateCollection(collection.info.id, { description })
    }

    const sampleRequests = [
      {
        name: 'Get Users Query',
        request: {
          method: 'POST',
          url: {
            raw: 'https://api.graphql.example.com/graphql',
            protocol: 'https',
            host: ['api', 'graphql', 'example', 'com'],
            path: ['graphql']
          },
          header: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Accept', value: 'application/json', enabled: true }
          ],
          body: {
            mode: 'graphql',
            graphql: {
              query: `query GetUsers {\n  users {\n    id\n    name\n    email\n  }\n}`,
              variables: '{}'
            }
          }
        }
      },
      {
        name: 'Create User Mutation',
        request: {
          method: 'POST',
          url: {
            raw: 'https://api.graphql.example.com/graphql',
            protocol: 'https',
            host: ['api', 'graphql', 'example', 'com'],
            path: ['graphql']
          },
          header: [
            { key: 'Content-Type', value: 'application/json', enabled: true },
            { key: 'Accept', value: 'application/json', enabled: true }
          ],
          body: {
            mode: 'graphql',
            graphql: {
              query: `mutation CreateUser($input: CreateUserInput!) {\n  createUser(input: $input) {\n    id\n    name\n    email\n  }\n}`,
              variables: JSON.stringify({
                input: {
                  name: 'John Doe',
                  email: 'john@example.com'
                }
              }, null, 2)
            }
          }
        }
      }
    ]

    sampleRequests.forEach(req => {
      this.collectionsStore.addRequest(collection.info.id, req.request)
      // Update the request name
      const updatedCollection = this.collectionsStore.getCollection(collection.info.id)
      const addedRequest = updatedCollection.item[updatedCollection.item.length - 1]
      if (addedRequest) {
        addedRequest.name = req.name
      }
    })

    return collection
  }

  /**
   * Import collection from a previously loaded Postman JSON or Bruno zip.
   * Shows warnings if unsupported features are detected.
   * @param {Object|string} importData
   * @param {string} name
   * @param {string} description
   */
  async importCollection(importData, name, description) {
    const payload = typeof importData === 'string'
      ? { format: 'postman', postmanRaw: importData }
      : importData

    if (payload.format === 'bruno-opencollection') {
      return this._persistBrunoImport(payload, name, description)
    }

    return this._persistPostmanImport(payload.postmanRaw || payload, name, description)
  }

  /**
   * @param {string|Object} raw
   * @param {string} name
   * @param {string} description
   * @private
   */
  _persistPostmanImport(raw, name, description) {
    const parsedData = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsedData.info) {
      throw new Error('Not a valid Postman collection')
    }

    if (name && name !== parsedData.info.name) {
      parsedData.info.name = name
    }
    if (description) {
      parsedData.info.description = description
    }

    const result = this.collectionsStore.importCollection(parsedData, {
      appendImportedSuffix: false
    })

    if (result.warnings && result.warnings.length > 0) {
      this._showImportWarnings(PostmanAdapter.summarizeWarnings(result.warnings))
    }

    return result.collection
  }

  /**
   * @param {Object} payload
   * @param {string} name
   * @param {string} description
   * @private
   */
  _persistBrunoImport(payload, name, description) {
    const result = payload.result || BrunoOpenCollectionAdapter.import(payload.files || [])
    if (!result.collection) {
      const message = (result.errors || []).map(e => e.message).join('; ') || 'Bruno import failed'
      throw new Error(message)
    }

    if (name) {
      result.collection.info.name = name
    }
    if (description) {
      result.collection.info.description = description
    }

    this.collectionsStore.addImportedCollection(result.collection, {
      appendImportedSuffix: false
    })

    for (const environment of result.environments || []) {
      try {
        this.environmentsStore.importEnvironment(environment)
      } catch (error) {
        this.logger.warn('Failed to import Bruno environment', error)
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      this._showImportWarnings(BrunoOpenCollectionAdapter.summarizeWarnings(result.warnings))
    }

    return result.collection
  }

  /**
   * Show import warnings in a user-friendly alert
   * @private
   */
  _showImportWarnings(summary) {
    const warningMessages = []

    // Build warning message based on types
    if (summary.byType.scripts) {
      warningMessages.push(`${summary.byType.scripts} script(s) detected (scripts are stored but not executed)`)
    }
    if (summary.byType.auth) {
      warningMessages.push(`${summary.byType.auth} authentication warning(s) (some auth types require manual configuration)`)
    }
    if (summary.byType.proxy) {
      warningMessages.push(`Proxy configuration not supported`)
    }
    if (summary.byType.certificate) {
      warningMessages.push(`SSL certificate configuration not supported`)
    }
    if (summary.byType.responses) {
      warningMessages.push(`Saved responses imported for reference`)
    }

    const message = warningMessages.length > 0
      ? `Collection imported with ${summary.total} notice(s):\n\n• ${warningMessages.join('\n• ')}`
      : `Collection imported with ${summary.total} notice(s). Check console for details.`

    this.alertService.alertWarning(message, 'Import Notices')
  }

  /**
   * Handle file selection for import (Postman JSON or Bruno zip)
   * @param {File} file
   */
  async handleFileSelect(file) {
    if (!file) return

    const lower = file.name.toLowerCase()
    const isZip = lower.endsWith('.zip')
    const isJson = lower.endsWith('.json')

    if (!isZip && !isJson) {
      this.setFieldError('import', 'Please select a Postman .json or Bruno .zip file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      this.setFieldError('import', 'File size must be less than 10MB')
      return
    }

    const result = await this.executeAsync(async () => {
      if (isZip) {
        return this._loadBrunoZip(file)
      }
      return this._loadPostmanJson(file)
    }, 'Failed to read file')

    if (result.success) {
      this.state.formData.importData = result.data
      if (result.data.preview?.name && !this.state.formData.name) {
        this.state.formData.name = result.data.preview.name
      }
      if (result.data.preview?.description && !this.state.formData.description) {
        this.state.formData.description = result.data.preview.description
      }
      this.clearFieldError('import')
      this.logger.info('File loaded successfully:', file.name)
    } else {
      this.setFieldError('import', result.error.message)
    }
  }

  /**
   * @param {File} file
   * @returns {Promise<Object>}
   * @private
   */
  async _loadPostmanJson(file) {
    const content = await this.readFile(file)
    const parsed = JSON.parse(content)
    if (!parsed.info) {
      throw new Error('Not a valid Postman collection')
    }
    return {
      format: 'postman',
      postmanRaw: content,
      preview: {
        name: parsed.info?.name || 'Unknown',
        description: typeof parsed.info?.description === 'string' ? parsed.info.description : '',
        requestCount: this.countRequests(parsed.item || []),
        folderCount: this.countFolders(parsed.item || []),
        environmentCount: 0,
        formatLabel: 'Postman'
      }
    }
  }

  /**
   * @param {File} file
   * @returns {Promise<Object>}
   * @private
   */
  async _loadBrunoZip(file) {
    const archiveFiles = await readCollectionArchive(file)
    const imported = BrunoOpenCollectionAdapter.import(archiveFiles)
    if (!imported.collection) {
      throw new Error((imported.errors || []).map(e => e.message).join('; ') || 'Not a Bruno OpenCollection zip')
    }
    return {
      format: 'bruno-opencollection',
      files: archiveFiles,
      result: imported,
      preview: {
        name: imported.collection.info.name,
        description: imported.collection.info.description || '',
        requestCount: this.countRequests(imported.collection.item || []),
        folderCount: this.countFolders(imported.collection.item || []),
        environmentCount: imported.environments?.length || 0,
        formatLabel: 'Bruno OpenCollection'
      }
    }
  }

  /**
   * Read file content
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Update form field
   */
  updateField(field, value) {
    this.updateFormField(field, value)

    if (field === 'template') {
      this.clearFieldError('import')
      if (value !== 'import') {
        this.state.formData.importData = null
      }
    }
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return [
      {
        id: 'blank',
        name: 'Blank Collection',
        description: 'Start with an empty collection',
        icon: '📄'
      },
      {
        id: 'rest-api',
        name: 'REST API',
        description: 'Collection with sample REST API requests',
        icon: '🌐'
      },
      {
        id: 'graphql',
        name: 'GraphQL',
        description: 'Collection with sample GraphQL queries',
        icon: '📊'
      },
      {
        id: 'import',
        name: 'Import from File',
        description: 'Postman .json or Bruno OpenCollection .zip',
        icon: '📁'
      }
    ]
  }

  /**
   * Preview imported collection
   */
  getImportPreview() {
    const data = this.state.formData.importData
    if (!data) return null
    if (typeof data === 'object' && data.preview) {
      return data.preview
    }

    try {
      const parsed = JSON.parse(data)
      return {
        name: parsed.info?.name || 'Unknown',
        description: parsed.info?.description || '',
        requestCount: this.countRequests(parsed.item || []),
        folderCount: this.countFolders(parsed.item || []),
        environmentCount: 0,
        formatLabel: 'Postman'
      }
    } catch {
      return null
    }
  }

  /**
   * Count requests in collection
   */
  countRequests(items) {
    let count = 0
    for (const item of items) {
      if (item.request) {
        count++
      } else if (item.item) {
        count += this.countRequests(item.item)
      }
    }
    return count
  }

  /**
   * Count folders in collection
   */
  countFolders(items) {
    let count = 0
    for (const item of items) {
      if (item.item) {
        count++
        count += this.countFolders(item.item)
      }
    }
    return count
  }
}