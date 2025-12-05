/**
 * ToastMan Data Models - Compatible with Postman Collection Format v2.1
 *
 * These models are designed to be compatible with Postman collection imports/exports
 * while providing a clean structure for our application.
 */

// HTTP Methods supported
export const HTTP_METHODS = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE',
  'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
]

// Request body modes
export const BODY_MODES = [
  'none', 'formdata', 'urlencoded', 'raw', 'binary', 'graphql'
]

// Raw body types
export const RAW_BODY_TYPES = [
  'text', 'javascript', 'json', 'html', 'xml'
]

/**
 * Creates a new UUID for unique identification
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Key-Value pair structure used throughout the application
 */
export function createKeyValue(key = '', value = '', enabled = true) {
  return {
    key,
    value,
    enabled,
    id: generateId()
  }
}

/**
 * URL structure compatible with Postman format
 * Note: Preserves {{variable}} patterns without URL-encoding them
 */
export function createUrl(raw = '') {
  // Always preserve raw exactly as user typed it
  // Don't try to "fix" URLs - let errors happen naturally at request time

  // Extract query string if present
  const queryStart = raw.indexOf('?')
  const baseUrl = queryStart > -1 ? raw.substring(0, queryStart) : raw
  const queryString = queryStart > -1 ? raw.substring(queryStart + 1) : ''

  // Parse query params
  const query = []
  if (queryString) {
    queryString.split('&').forEach(param => {
      const eqIndex = param.indexOf('=')
      if (eqIndex > -1) {
        query.push(createKeyValue(
          decodeURIComponent(param.substring(0, eqIndex)),
          decodeURIComponent(param.substring(eqIndex + 1)),
          true
        ))
      } else if (param) {
        query.push(createKeyValue(decodeURIComponent(param), '', true))
      }
    })
  }

  // Try to extract path (everything after first /)
  const pathStart = baseUrl.indexOf('/', baseUrl.indexOf('//') > -1 ? baseUrl.indexOf('//') + 2 : 0)
  const path = pathStart > -1
    ? baseUrl.substring(pathStart).split('/').filter(Boolean)
    : []

  // Extract hash if present
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex > -1 ? raw.substring(hashIndex + 1) : undefined

  return {
    raw: baseUrl,
    protocol: raw.startsWith('https://') ? 'https' : (raw.startsWith('http://') ? 'http' : ''),
    host: [], // Not needed - we use raw
    port: undefined,
    path,
    query,
    hash
  }
}

/**
 * Request body structure
 */
export function createRequestBody(mode = 'none') {
  const body = {
    mode,
    disabled: false
  }

  switch (mode) {
    case 'raw':
      body.raw = ''
      body.options = {
        raw: {
          language: 'json'
        }
      }
      break
    case 'urlencoded':
      body.urlencoded = []
      break
    case 'formdata':
      body.formdata = []
      break
    case 'binary':
      body.file = null
      break
    case 'graphql':
      body.graphql = {
        query: '',
        variables: ''
      }
      break
  }

  return body
}

/**
 * HTTP Request structure compatible with Postman
 */
export function createRequest({
  method = 'GET',
  url = '',
  headers = [],
  body = null,
  auth = null
} = {}) {
  return {
    method,
    header: headers.length ? headers : [createKeyValue('Content-Type', 'application/json')],
    url: typeof url === 'string' ? createUrl(url) : url,
    body: body || createRequestBody(),
    auth: auth || null,
    description: ''
  }
}

/**
 * Request/Response item in a collection
 */
export function createItem({
  name = 'New Request',
  request = null,
  response = []
} = {}) {
  return {
    id: generateId(),
    name,
    request: request || createRequest(),
    response,
    event: [], // Pre-request scripts, tests, etc.
    protocolProfileBehavior: {}
  }
}

/**
 * Collection information
 */
export function createCollectionInfo(name = 'New Collection') {
  return {
    id: generateId(),
    name,
    description: '',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    version: {
      major: 1,
      minor: 0,
      patch: 0
    }
  }
}

/**
 * Collection structure compatible with Postman v2.1
 */
export function createCollection(name = 'New Collection') {
  return {
    info: createCollectionInfo(name),
    item: [],
    auth: null,
    event: [],
    variable: [],
    protocolProfileBehavior: {}
  }
}

/**
 * Environment variable
 */
export function createEnvironmentVariable(key = '', value = '', enabled = true) {
  return {
    id: generateId(),
    key,
    value,
    enabled,
    type: 'default' // default, secret
  }
}

/**
 * Environment structure
 */
export function createEnvironment(name = 'New Environment') {
  return {
    id: generateId(),
    name,
    values: [],
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'ToastMan'
  }
}

/**
 * Tab structure for the UI (not part of Postman format)
 */
export function createTab({
  itemId = null,
  collectionId = null,
  conversationId = null,
  name = 'New Request',
  method = 'GET',
  saved = false
} = {}) {
  return {
    id: generateId(),
    itemId, // Reference to the actual request item
    collectionId, // Reference to the collection
    conversationId, // Reference to a conversation session (for history)
    name,
    method,
    saved,
    active: false,
    modified: false
  }
}

/**
 * Application settings structure
 */
export function createSettings() {
  return {
    proxy: {
      enabled: false,
      protocol: 'http',
      host: '',
      port: '',
      username: '',
      password: '',
      excludeList: ''
    },
    certificates: [],
    theme: 'dark',
    autoSave: true,
    requestTimeout: 30000,
    followRedirects: true,
    maxRedirects: 10
  }
}