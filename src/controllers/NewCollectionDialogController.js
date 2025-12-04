import { BaseDialogController } from './BaseDialogController.js'
import { useCollections } from '../stores/useCollections.js'
import { useAlert } from '../composables/useAlert.js'
import { PostmanAdapter } from '../adapters/PostmanAdapter.js'

/**
 * Controller for New Collection dialog
 */
export class NewCollectionDialogController extends BaseDialogController {
  constructor() {
    super('new-collection')

    this.collectionsStore = useCollections()
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
   * Import collection from file
   * Shows warnings if unsupported features are detected
   */
  async importCollection(fileData, name, description) {
    let parsedData

    try {
      parsedData = JSON.parse(fileData)
    } catch (error) {
      throw new Error('Invalid JSON file')
    }

    if (!parsedData.info) {
      throw new Error('Not a valid Postman collection')
    }

    // Override name and description if provided
    if (name && name !== parsedData.info.name) {
      parsedData.info.name = name
    }

    if (description) {
      parsedData.info.description = description
    }

    // Import using PostmanAdapter (returns { collection, warnings, errors })
    const result = this.collectionsStore.importCollection(parsedData, {
      appendImportedSuffix: false // We already handle naming
    })

    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      const summary = PostmanAdapter.summarizeWarnings(result.warnings)
      this._showImportWarnings(summary)
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
   * Handle file selection for import
   */
  async handleFileSelect(file) {
    if (!file) return

    if (!file.name.endsWith('.json')) {
      this.setFieldError('import', 'Please select a JSON file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      this.setFieldError('import', 'File size must be less than 10MB')
      return
    }

    const result = await this.executeAsync(async () => {
      const content = await this.readFile(file)

      try {
        const parsed = JSON.parse(content)
        if (!parsed.info) {
          throw new Error('Not a valid Postman collection')
        }
        return content
      } catch (error) {
        throw new Error('Invalid JSON or not a Postman collection')
      }
    }, 'Failed to read file')

    if (result.success) {
      this.state.formData.importData = result.data

      const parsed = JSON.parse(result.data)
      if (parsed.info?.name && !this.state.formData.name) {
        this.state.formData.name = parsed.info.name
      }
      if (parsed.info?.description && !this.state.formData.description) {
        this.state.formData.description = parsed.info.description
      }

      this.clearFieldError('import')
      this.logger.info('File loaded successfully:', file.name)
    } else {
      this.setFieldError('import', result.error.message)
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
        description: 'Import an existing Postman collection',
        icon: '📁'
      }
    ]
  }

  /**
   * Preview imported collection
   */
  getImportPreview() {
    if (!this.state.formData.importData) return null

    try {
      const parsed = JSON.parse(this.state.formData.importData)
      return {
        name: parsed.info?.name || 'Unknown',
        description: parsed.info?.description || '',
        requestCount: this.countRequests(parsed.item || []),
        folderCount: this.countFolders(parsed.item || [])
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