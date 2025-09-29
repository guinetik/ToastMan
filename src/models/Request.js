import { BaseModel } from './BaseModel.js'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE']
export const BODY_MODES = ['none', 'raw', 'form-data', 'x-www-form-urlencoded', 'binary']
export const RAW_LANGUAGES = ['text', 'javascript', 'json', 'html', 'xml']
export const AUTH_TYPES = ['none', 'basic', 'bearer', 'apikey', 'oauth2', 'hawk', 'awsv4', 'ntlm', 'digest']

/**
 * KeyValue pair model for headers, params, etc.
 */
export class KeyValue extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    key: { type: 'string', default: '' },
    value: { type: 'string', default: '' },
    description: { type: 'string', default: '' },
    enabled: { type: 'boolean', default: true },
    type: { type: 'string', default: 'text' }
  }
}

/**
 * URL model compatible with Postman format
 */
export class RequestUrl extends BaseModel {
  static schema = {
    raw: { type: 'string', default: '' },
    protocol: { type: 'string', default: 'https' },
    host: { type: 'array', default: [] },
    port: { type: 'string', default: '' },
    path: { type: 'array', default: [] },
    query: { type: 'array', default: [] },
    hash: { type: 'string', default: '' },
    variable: { type: 'array', default: [] }
  }

  static fromString(urlString) {
    if (!urlString) {
      return new RequestUrl()
    }

    try {
      const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`)

      return new RequestUrl({
        raw: urlString,
        protocol: url.protocol.replace(':', ''),
        host: url.hostname.split('.'),
        port: url.port || '',
        path: url.pathname === '/' ? [] : url.pathname.split('/').filter(Boolean),
        query: Array.from(url.searchParams.entries()).map(([key, value]) =>
          new KeyValue({ key, value, enabled: true }).toJSON()
        ),
        hash: url.hash ? url.hash.substring(1) : ''
      })
    } catch (error) {
      return new RequestUrl({ raw: urlString })
    }
  }

  toString() {
    if (this.raw) return this.raw

    const protocol = this.protocol || 'https'
    const host = Array.isArray(this.host) ? this.host.join('.') : ''
    const port = this.port ? `:${this.port}` : ''
    const path = Array.isArray(this.path) ? `/${this.path.join('/')}` : ''
    const query = Array.isArray(this.query) && this.query.length > 0
      ? '?' + this.query
          .filter(q => q.enabled)
          .map(q => `${q.key}=${q.value}`)
          .join('&')
      : ''
    const hash = this.hash ? `#${this.hash}` : ''

    return `${protocol}://${host}${port}${path}${query}${hash}`
  }
}

/**
 * Request authentication model
 */
export class RequestAuth extends BaseModel {
  static schema = {
    type: { type: 'string', enum: AUTH_TYPES, default: 'none' },
    basic: { type: 'object', default: null },
    bearer: { type: 'object', default: null },
    apikey: { type: 'object', default: null },
    oauth2: { type: 'object', default: null },
    hawk: { type: 'object', default: null },
    awsv4: { type: 'object', default: null },
    ntlm: { type: 'object', default: null },
    digest: { type: 'object', default: null }
  }

  static createBasic(username = '', password = '') {
    return new RequestAuth({
      type: 'basic',
      basic: { username, password }
    })
  }

  static createBearer(token = '') {
    return new RequestAuth({
      type: 'bearer',
      bearer: { token }
    })
  }

  static createApiKey(key = '', value = '', addTo = 'header') {
    return new RequestAuth({
      type: 'apikey',
      apikey: { key, value, in: addTo }
    })
  }
}

/**
 * Request body model
 */
export class RequestBody extends BaseModel {
  static schema = {
    mode: { type: 'string', enum: BODY_MODES, default: 'none' },
    raw: { type: 'string', default: '' },
    formData: { type: 'array', default: [] },
    urlEncoded: { type: 'array', default: [] },
    binary: { type: 'object', default: null },
    options: { type: 'object', default: null },
    disabled: { type: 'boolean', default: false }
  }

  static createRaw(content = '', language = 'json') {
    return new RequestBody({
      mode: 'raw',
      raw: content,
      options: {
        raw: { language }
      }
    })
  }

  static createFormData(data = []) {
    return new RequestBody({
      mode: 'form-data',
      formData: data.map(item => new KeyValue(item).toJSON())
    })
  }

  static createUrlEncoded(data = []) {
    return new RequestBody({
      mode: 'x-www-form-urlencoded',
      urlEncoded: data.map(item => new KeyValue(item).toJSON())
    })
  }

  static createBinary(file = null) {
    return new RequestBody({
      mode: 'binary',
      binary: file
    })
  }

  static createGraphQL(query = '', variables = '{}') {
    return new RequestBody({
      mode: 'graphql',
      graphql: { query, variables }
    })
  }
}

/**
 * Pre-request script and test script model
 */
export class RequestEvent extends BaseModel {
  static schema = {
    listen: { type: 'string', enum: ['prerequest', 'test'], required: true },
    script: { type: 'object', default: () => ({ exec: [], type: 'text/javascript' }) },
    disabled: { type: 'boolean', default: false }
  }
}

/**
 * Main Request model
 */
export class Request extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', default: 'New Request' },
    method: { type: 'string', enum: HTTP_METHODS, default: 'GET' },
    url: { type: RequestUrl, default: () => new RequestUrl() },
    header: { type: 'array', default: [] },
    body: { type: RequestBody, default: () => new RequestBody() },
    auth: { type: RequestAuth, default: null },
    event: { type: 'array', default: [] },
    description: { type: 'string', default: '' },
    protocolProfileBehavior: { type: 'object', default: {} },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    // Normalize ID field to string
    if (data.id && typeof data.id !== 'string') {
      data.id = String(data.id)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }
    if (data.updatedAt && typeof data.updatedAt !== 'string') {
      data.updatedAt = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : String(data.updatedAt)
    }

    if (data.url && typeof data.url === 'string') {
      data.url = RequestUrl.fromString(data.url)
    } else if (data.url && !(data.url instanceof RequestUrl)) {
      data.url = new RequestUrl(data.url)
    }

    if (data.body && !(data.body instanceof RequestBody)) {
      data.body = new RequestBody(data.body)
    }

    if (data.auth && !(data.auth instanceof RequestAuth)) {
      data.auth = new RequestAuth(data.auth)
    }

    if (data.header) {
      data.header = data.header.map(h => new KeyValue(h).toJSON())
    }

    super(data)
  }

  addHeader(key, value, enabled = true) {
    this.header.push(new KeyValue({ key, value, enabled }).toJSON())
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeHeader(key) {
    this.header = this.header.filter(h => h.key !== key)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  setUrl(urlString) {
    this.url = RequestUrl.fromString(urlString)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  setBody(body) {
    if (body instanceof RequestBody) {
      this.body = body
    } else {
      this.body = new RequestBody(body)
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  setAuth(auth) {
    if (auth instanceof RequestAuth) {
      this.auth = auth
    } else {
      this.auth = new RequestAuth(auth)
    }
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  getEnabledHeaders() {
    return this.header.filter(h => h.enabled)
  }

  getUrlString() {
    return this.url instanceof RequestUrl ? this.url.toString() : this.url.raw || ''
  }
}