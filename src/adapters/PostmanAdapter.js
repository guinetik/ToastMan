/**
 * PostmanAdapter - Handles import/export of Postman collections
 *
 * Maps between Postman v2.1.0 schema and ToastMan internal format.
 * Provides graceful degradation for unsupported features with warnings.
 */

import { generateId } from '../models/types.js'

// Postman body mode mappings (Postman → ToastMan)
const BODY_MODE_MAP = {
  'urlencoded': 'x-www-form-urlencoded',
  'formdata': 'form-data',
  'file': 'binary',
  'raw': 'raw',
  'graphql': 'graphql'
}

// Reverse mapping (ToastMan → Postman)
const BODY_MODE_REVERSE_MAP = Object.fromEntries(
  Object.entries(BODY_MODE_MAP).map(([k, v]) => [v, k])
)

// Supported auth types
const SUPPORTED_AUTH_TYPES = ['basic', 'bearer', 'apikey', 'digest', 'ntlm', 'awsv4', 'hawk']

// Partially supported auth types (imported but need manual intervention)
const PARTIAL_AUTH_TYPES = ['oauth1', 'oauth2']

// Unsupported auth types
const UNSUPPORTED_AUTH_TYPES = ['edgegrid']

/**
 * Import result structure
 * @typedef {Object} ImportResult
 * @property {Object} collection - The normalized collection
 * @property {Array<{type: string, message: string, item?: string}>} warnings - Import warnings
 * @property {Array<{type: string, message: string}>} errors - Import errors (non-fatal)
 */

/**
 * PostmanAdapter class for importing/exporting Postman collections
 */
export class PostmanAdapter {

  /**
   * Import a Postman collection
   * @param {Object} data - Raw Postman collection data
   * @returns {ImportResult} - Normalized collection with warnings
   */
  static import(data) {
    const warnings = []
    const errors = []

    // Validate basic structure
    if (!data || typeof data !== 'object') {
      errors.push({ type: 'structure', message: 'Invalid collection data: expected object' })
      return { collection: null, warnings, errors }
    }

    if (!data.info || !data.info.name) {
      errors.push({ type: 'structure', message: 'Invalid collection format: missing info.name' })
      return { collection: null, warnings, errors }
    }

    // Deep clone to avoid mutating original
    const collection = JSON.parse(JSON.stringify(data))

    // Generate new ID to avoid conflicts
    collection.info.id = generateId()
    collection.info._postman_id = collection.info._postman_id || generateId()

    // Check for collection-level features
    if (collection.event && collection.event.length > 0) {
      warnings.push({
        type: 'scripts',
        message: 'Collection-level scripts detected. Scripts are stored but not executed.'
      })
    }

    if (collection.auth) {
      const authWarning = this._checkAuthSupport(collection.auth, 'collection')
      if (authWarning) warnings.push(authWarning)
      collection.auth = this._normalizeAuth(collection.auth)
    }

    // Process variables
    if (collection.variable && collection.variable.length > 0) {
      collection.variable = collection.variable.map(v => this._normalizeVariable(v))
    }

    // Process all items recursively
    if (collection.item) {
      const { items, itemWarnings } = this._processItems(collection.item)
      collection.item = items
      warnings.push(...itemWarnings)
    }

    return { collection, warnings, errors }
  }

  /**
   * Export a ToastMan collection to Postman format
   * @param {Object} collection - ToastMan collection
   * @returns {Object} - Postman-formatted collection
   */
  static export(collection) {
    const exported = JSON.parse(JSON.stringify(collection))

    // Ensure schema is set
    if (exported.info) {
      exported.info.schema = exported.info.schema ||
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    }

    // Convert items recursively
    if (exported.item) {
      exported.item = this._exportItems(exported.item)
    }

    // Convert collection-level auth back to Postman format
    if (exported.auth) {
      exported.auth = this._denormalizeAuth(exported.auth)
    }

    // Convert variables
    if (exported.variable) {
      exported.variable = exported.variable.map(v => this._denormalizeVariable(v))
    }

    // Add export metadata
    exported._postman_exported_at = new Date().toISOString()
    exported._postman_exported_using = 'ToastMan'

    // Remove ToastMan-specific fields
    delete exported.createdAt
    delete exported.updatedAt

    return exported
  }

  /**
   * Process items array recursively
   * @private
   */
  static _processItems(items) {
    const processedItems = []
    const itemWarnings = []

    for (const item of items) {
      // Check if this is a folder (has nested items)
      if (item.item && Array.isArray(item.item)) {
        const folder = {
          id: generateId(),
          name: item.name || 'Unnamed Folder',
          type: 'folder',
          description: this._normalizeDescription(item.description),
          item: []
        }

        // Process folder-level auth
        if (item.auth) {
          const authWarning = this._checkAuthSupport(item.auth, `folder "${item.name}"`)
          if (authWarning) itemWarnings.push(authWarning)
          folder.auth = this._normalizeAuth(item.auth)
        }

        // Process folder-level scripts
        if (item.event && item.event.length > 0) {
          itemWarnings.push({
            type: 'scripts',
            message: `Folder "${item.name}" has scripts. Scripts are stored but not executed.`,
            item: item.name
          })
          folder.event = item.event
        }

        // Recursively process nested items
        const { items: nestedItems, itemWarnings: nestedWarnings } = this._processItems(item.item)
        folder.item = nestedItems
        itemWarnings.push(...nestedWarnings)

        processedItems.push(folder)
      } else {
        // This is a request item
        const { request, requestWarnings } = this._processRequest(item)
        processedItems.push(request)
        itemWarnings.push(...requestWarnings)
      }
    }

    return { items: processedItems, itemWarnings }
  }

  /**
   * Process a single request item
   * @private
   */
  static _processRequest(item) {
    const requestWarnings = []

    const normalized = {
      id: generateId(),
      name: item.name || 'Unnamed Request',
      type: 'request',
      description: this._normalizeDescription(item.description)
    }

    // Handle request data
    if (!item.request) {
      normalized.request = this._createDefaultRequest()
      requestWarnings.push({
        type: 'missing',
        message: `Request "${item.name}" has no request data. Created default GET request.`,
        item: item.name
      })
    } else if (typeof item.request === 'string') {
      // Request is just a URL string
      normalized.request = {
        method: 'GET',
        url: this._normalizeUrl(item.request),
        header: [],
        body: null
      }
    } else {
      normalized.request = this._normalizeRequestObject(item.request, item.name, requestWarnings)
    }

    // Handle request-level events (scripts)
    if (item.event && item.event.length > 0) {
      const hasPreRequest = item.event.some(e => e.listen === 'prerequest')
      const hasTest = item.event.some(e => e.listen === 'test')

      if (hasPreRequest || hasTest) {
        const scriptTypes = []
        if (hasPreRequest) scriptTypes.push('pre-request')
        if (hasTest) scriptTypes.push('test')

        requestWarnings.push({
          type: 'scripts',
          message: `Request "${item.name}" has ${scriptTypes.join(' and ')} scripts. Scripts are stored but not executed.`,
          item: item.name
        })
      }
      normalized.event = item.event
    }

    // Handle saved responses
    if (item.response && item.response.length > 0) {
      normalized.response = item.response
      requestWarnings.push({
        type: 'responses',
        message: `Request "${item.name}" has ${item.response.length} saved response(s). Responses are stored for reference.`,
        item: item.name
      })
    }

    // Handle protocol profile behavior
    if (item.protocolProfileBehavior) {
      normalized.protocolProfileBehavior = item.protocolProfileBehavior
    }

    return { request: normalized, requestWarnings }
  }

  /**
   * Normalize a request object
   * @private
   */
  static _normalizeRequestObject(req, itemName, warnings) {
    const normalized = {
      method: req.method || 'GET',
      url: this._normalizeUrl(req.url),
      header: this._normalizeHeaders(req.header),
      body: this._normalizeBody(req.body, itemName, warnings)
    }

    // Handle request-level auth
    if (req.auth) {
      const authWarning = this._checkAuthSupport(req.auth, `request "${itemName}"`)
      if (authWarning) warnings.push(authWarning)
      normalized.auth = this._normalizeAuth(req.auth)
    }

    // Handle description
    if (req.description) {
      normalized.description = this._normalizeDescription(req.description)
    }

    // Handle proxy config
    if (req.proxy) {
      warnings.push({
        type: 'proxy',
        message: `Request "${itemName}" has proxy configuration. Proxy settings are not supported.`,
        item: itemName
      })
    }

    // Handle certificate
    if (req.certificate) {
      warnings.push({
        type: 'certificate',
        message: `Request "${itemName}" has SSL certificate configuration. Certificates are not supported.`,
        item: itemName
      })
    }

    return normalized
  }

  /**
   * Normalize URL to consistent format
   * @private
   */
  static _normalizeUrl(url) {
    if (!url) {
      return { raw: '', query: [] }
    }

    if (typeof url === 'string') {
      return { raw: url, query: [] }
    }

    const normalized = {
      raw: url.raw || '',
      query: []
    }

    // If raw is missing, reconstruct from parts
    if (!normalized.raw && url.protocol && url.host) {
      const host = Array.isArray(url.host) ? url.host.join('.') : url.host
      const path = url.path
        ? (Array.isArray(url.path) ? url.path.join('/') : url.path)
        : ''
      const port = url.port ? `:${url.port}` : ''

      normalized.raw = `${url.protocol}://${host}${port}/${path}`
    }

    // Normalize query parameters
    if (url.query && Array.isArray(url.query)) {
      normalized.query = url.query.map(q => ({
        key: q.key || '',
        value: q.value || '',
        enabled: q.disabled !== true, // Invert disabled → enabled
        description: this._normalizeDescription(q.description)
      }))
    }

    // Preserve other URL properties
    if (url.protocol) normalized.protocol = url.protocol
    if (url.host) normalized.host = url.host
    if (url.path) normalized.path = url.path
    if (url.port) normalized.port = url.port
    if (url.hash) normalized.hash = url.hash
    if (url.variable) normalized.variable = url.variable

    return normalized
  }

  /**
   * Normalize headers array
   * @private
   */
  static _normalizeHeaders(headers) {
    if (!headers) return []

    // Handle string headers (rare but possible)
    if (typeof headers === 'string') {
      return []
    }

    return headers.map(h => ({
      key: h.key || '',
      value: h.value || '',
      enabled: h.disabled !== true, // Invert disabled → enabled
      description: this._normalizeDescription(h.description)
    }))
  }

  /**
   * Normalize request body
   * @private
   */
  static _normalizeBody(body, itemName, warnings) {
    if (!body || body.disabled) {
      return null
    }

    const normalized = {
      mode: BODY_MODE_MAP[body.mode] || body.mode || 'none'
    }

    switch (body.mode) {
      case 'raw':
        normalized.raw = body.raw || ''
        if (body.options?.raw?.language) {
          normalized.options = { raw: { language: body.options.raw.language } }
        }
        break

      case 'urlencoded':
        normalized.urlEncoded = (body.urlencoded || []).map(item => ({
          key: item.key || '',
          value: item.value || '',
          enabled: item.disabled !== true,
          description: this._normalizeDescription(item.description)
        }))
        break

      case 'formdata':
        normalized.formData = (body.formdata || []).map(item => {
          const normalized = {
            key: item.key || '',
            enabled: item.disabled !== true,
            type: item.type || 'text',
            description: this._normalizeDescription(item.description)
          }

          if (item.type === 'file') {
            normalized.src = item.src
          } else {
            normalized.value = item.value || ''
          }

          return normalized
        })
        break

      case 'file':
        normalized.binary = body.file || null
        break

      case 'graphql':
        normalized.graphql = {
          query: body.graphql?.query || '',
          variables: body.graphql?.variables || ''
        }
        break

      default:
        if (body.mode && !BODY_MODE_MAP[body.mode]) {
          warnings.push({
            type: 'body',
            message: `Request "${itemName}" has unknown body mode "${body.mode}".`,
            item: itemName
          })
        }
    }

    return normalized
  }

  /**
   * Check if auth type is supported and return warning if needed
   * @private
   */
  static _checkAuthSupport(auth, context) {
    if (!auth || !auth.type || auth.type === 'noauth' || auth.type === 'none') {
      return null
    }

    if (UNSUPPORTED_AUTH_TYPES.includes(auth.type)) {
      return {
        type: 'auth',
        message: `${context} uses ${auth.type} authentication which is not supported.`,
        item: context
      }
    }

    if (PARTIAL_AUTH_TYPES.includes(auth.type)) {
      return {
        type: 'auth',
        message: `${context} uses ${auth.type} authentication. Token must be obtained manually.`,
        item: context
      }
    }

    return null
  }

  /**
   * Normalize auth object from Postman array format to ToastMan object format
   * @private
   */
  static _normalizeAuth(auth) {
    if (!auth || !auth.type) return null

    const normalized = {
      type: auth.type === 'noauth' ? 'none' : auth.type
    }

    // Convert array of {key, value} to object
    const authData = auth[auth.type]
    if (Array.isArray(authData)) {
      normalized[auth.type] = {}
      for (const attr of authData) {
        if (attr.key) {
          normalized[auth.type][attr.key] = attr.value
        }
      }
    } else if (authData && typeof authData === 'object') {
      // Already in object format
      normalized[auth.type] = authData
    }

    return normalized
  }

  /**
   * Denormalize auth from ToastMan object format back to Postman array format
   * @private
   */
  static _denormalizeAuth(auth) {
    if (!auth || !auth.type || auth.type === 'none') {
      return { type: 'noauth' }
    }

    const denormalized = {
      type: auth.type
    }

    // Convert object to array of {key, value, type}
    const authData = auth[auth.type]
    if (authData && typeof authData === 'object' && !Array.isArray(authData)) {
      denormalized[auth.type] = Object.entries(authData).map(([key, value]) => ({
        key,
        value,
        type: 'string'
      }))
    } else {
      denormalized[auth.type] = authData
    }

    return denormalized
  }

  /**
   * Normalize variable
   * @private
   */
  static _normalizeVariable(variable) {
    return {
      id: variable.id || generateId(),
      key: variable.key || '',
      value: variable.value || '',
      type: variable.type || 'string',
      enabled: variable.disabled !== true,
      description: this._normalizeDescription(variable.description)
    }
  }

  /**
   * Denormalize variable for export
   * @private
   */
  static _denormalizeVariable(variable) {
    const denormalized = {
      id: variable.id,
      key: variable.key,
      value: variable.value,
      type: variable.type || 'string'
    }
    // Only include disabled if true (Postman default is false)
    if (variable.enabled === false) {
      denormalized.disabled = true
    }
    return denormalized
  }

  /**
   * Normalize description (can be string or object in Postman)
   * @private
   */
  static _normalizeDescription(desc) {
    if (!desc) return ''
    if (typeof desc === 'string') return desc
    if (typeof desc === 'object' && desc.content) return desc.content
    return ''
  }

  /**
   * Create a default request object
   * @private
   */
  static _createDefaultRequest() {
    return {
      method: 'GET',
      url: { raw: '', query: [] },
      header: [],
      body: null
    }
  }

  /**
   * Export items recursively, converting back to Postman format
   * @private
   */
  static _exportItems(items) {
    return items.map(item => {
      if (item.type === 'folder' || (item.item && Array.isArray(item.item))) {
        // Folder
        const folder = {
          name: item.name,
          item: this._exportItems(item.item || [])
        }

        if (item.description) folder.description = item.description
        if (item.auth) folder.auth = this._denormalizeAuth(item.auth)
        if (item.event) folder.event = item.event

        return folder
      } else {
        // Request
        return this._exportRequestItem(item)
      }
    })
  }

  /**
   * Export a single request item to Postman format
   * @private
   */
  static _exportRequestItem(item) {
    const exported = {
      name: item.name,
      request: this._exportRequest(item.request)
    }

    if (item.description) exported.description = item.description
    if (item.event) exported.event = item.event
    if (item.response) exported.response = item.response
    if (item.protocolProfileBehavior) {
      exported.protocolProfileBehavior = item.protocolProfileBehavior
    }

    return exported
  }

  /**
   * Export request object to Postman format
   * @private
   */
  static _exportRequest(request) {
    if (!request) return { method: 'GET', url: '' }

    const exported = {
      method: request.method || 'GET',
      url: this._exportUrl(request.url),
      header: this._exportHeaders(request.header)
    }

    if (request.body) {
      exported.body = this._exportBody(request.body)
    }

    if (request.auth) {
      exported.auth = this._denormalizeAuth(request.auth)
    }

    if (request.description) {
      exported.description = request.description
    }

    return exported
  }

  /**
   * Export URL to Postman format
   * @private
   */
  static _exportUrl(url) {
    if (!url) return ''
    if (typeof url === 'string') return url

    const exported = {
      raw: url.raw || ''
    }

    if (url.protocol) exported.protocol = url.protocol
    if (url.host) exported.host = url.host
    if (url.path) exported.path = url.path
    if (url.port) exported.port = url.port
    if (url.hash) exported.hash = url.hash

    if (url.query && url.query.length > 0) {
      exported.query = url.query.map(q => {
        const param = {
          key: q.key,
          value: q.value
        }
        // Only include disabled if true (Postman default is false)
        if (q.enabled === false) {
          param.disabled = true
        }
        return param
      })
    }

    if (url.variable) exported.variable = url.variable

    return exported
  }

  /**
   * Export headers to Postman format
   * @private
   */
  static _exportHeaders(headers) {
    if (!headers) return []

    return headers.map(h => {
      const header = {
        key: h.key,
        value: h.value
      }
      // Only include disabled if true (Postman default is false)
      if (h.enabled === false) {
        header.disabled = true
      }
      return header
    })
  }

  /**
   * Export body to Postman format
   * @private
   */
  static _exportBody(body) {
    if (!body || body.mode === 'none') return null

    const mode = BODY_MODE_REVERSE_MAP[body.mode] || body.mode
    const exported = { mode }

    switch (body.mode) {
      case 'raw':
        exported.raw = body.raw || ''
        if (body.options) exported.options = body.options
        break

      case 'x-www-form-urlencoded':
        exported.urlencoded = (body.urlEncoded || []).map(item => ({
          key: item.key,
          value: item.value,
          disabled: item.enabled === false
        }))
        break

      case 'form-data':
        exported.formdata = (body.formData || []).map(item => ({
          key: item.key,
          value: item.value,
          type: item.type || 'text',
          src: item.src,
          disabled: item.enabled === false
        }))
        break

      case 'binary':
        exported.file = body.binary
        break

      case 'graphql':
        exported.graphql = body.graphql
        break
    }

    return exported
  }

  /**
   * Summarize warnings for display
   * @param {Array} warnings - Array of warning objects
   * @returns {Object} - Summary with counts by type
   */
  static summarizeWarnings(warnings) {
    const summary = {
      total: warnings.length,
      byType: {},
      messages: []
    }

    for (const warning of warnings) {
      summary.byType[warning.type] = (summary.byType[warning.type] || 0) + 1
      summary.messages.push(warning.message)
    }

    return summary
  }
}

export default PostmanAdapter
