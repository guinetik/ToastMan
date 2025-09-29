import { BaseModel } from './BaseModel.js'

/**
 * Environment variable model
 */
export class EnvironmentVariable extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    key: { type: 'string', required: true },
    value: { type: 'string', default: '' },
    type: { type: 'string', enum: ['default', 'secret', 'boolean', 'number', 'json'], default: 'default' },
    enabled: { type: 'boolean', default: true },
    description: { type: 'string', default: '' }
  }

  constructor(data = {}) {
    super(data)
    this.validateValue()
  }

  validateValue() {
    if (this.type === 'boolean' && this.value !== '') {
      if (this.value !== 'true' && this.value !== 'false') {
        throw new Error(`Boolean variable '${this.key}' must have value 'true' or 'false'`)
      }
    }

    if (this.type === 'number' && this.value !== '') {
      if (isNaN(Number(this.value))) {
        throw new Error(`Number variable '${this.key}' must have a numeric value`)
      }
    }

    if (this.type === 'json' && this.value !== '') {
      try {
        JSON.parse(this.value)
      } catch (error) {
        throw new Error(`JSON variable '${this.key}' must have valid JSON as value`)
      }
    }
  }

  getParsedValue() {
    if (!this.enabled || this.value === '') return undefined

    switch (this.type) {
      case 'boolean':
        return this.value === 'true'
      case 'number':
        return Number(this.value)
      case 'json':
        try {
          return JSON.parse(this.value)
        } catch {
          return this.value
        }
      case 'secret':
      case 'default':
      default:
        return this.value
    }
  }

  isSecret() {
    return this.type === 'secret'
  }
}

/**
 * Main Environment model
 */
export class Environment extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', required: true },
    values: { type: 'array', default: [] },
    isActive: { type: 'boolean', default: false },
    isGlobal: { type: 'boolean', default: false },
    color: { type: 'string', default: '' },
    _postman_variable_scope: { type: 'string', default: 'environment' },
    _postman_exported_at: { type: 'string', default: () => BaseModel.getTimestamp() },
    _postman_exported_using: { type: 'string', default: 'ToastMan' },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    if (typeof data === 'string') {
      data = { name: data }
    }


    // Normalize ID field to string
    if (data.id !== undefined && data.id !== null && typeof data.id !== 'string') {
      data.id = String(data.id)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt !== undefined && data.createdAt !== null && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }
    if (data.updatedAt !== undefined && data.updatedAt !== null && typeof data.updatedAt !== 'string') {
      data.updatedAt = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : String(data.updatedAt)
    }
    if (data._postman_exported_at !== undefined && data._postman_exported_at !== null && typeof data._postman_exported_at !== 'string') {
      data._postman_exported_at = data._postman_exported_at instanceof Date ? data._postman_exported_at.toISOString() : String(data._postman_exported_at)
    }

    if (data.values) {
      data.values = data.values.map(v =>
        v instanceof EnvironmentVariable ? v.toJSON() : new EnvironmentVariable(v).toJSON()
      )
    }

    super(data)
  }

  addVariable(key, value, type = 'default', enabled = true) {
    const existing = this.values.findIndex(v => v.key === key)

    if (existing !== -1) {
      this.values[existing] = new EnvironmentVariable({ key, value, type, enabled }).toJSON()
    } else {
      this.values.push(new EnvironmentVariable({ key, value, type, enabled }).toJSON())
    }

    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeVariable(key) {
    this.values = this.values.filter(v => v.key !== key)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  getVariable(key) {
    const variable = this.values.find(v => v.key === key && v.enabled)
    if (variable) {
      const envVar = new EnvironmentVariable(variable)
      return envVar.getParsedValue()
    }
    return undefined
  }

  getAllVariables() {
    const variables = {}
    for (const v of this.values) {
      if (v.enabled) {
        const envVar = new EnvironmentVariable(v)
        variables[v.key] = envVar.getParsedValue()
      }
    }
    return variables
  }

  getEnabledVariables() {
    return this.values.filter(v => v.enabled)
  }

  toggleVariable(key) {
    const variable = this.values.find(v => v.key === key)
    if (variable) {
      variable.enabled = !variable.enabled
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  updateVariable(key, updates) {
    const variable = this.values.find(v => v.key === key)
    if (variable) {
      Object.assign(variable, updates)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  /**
   * Replace variables in text using {{variable}} syntax
   */
  replaceVariables(text) {
    if (!text || typeof text !== 'string') return text

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getVariable(key)
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Merge with another environment (useful for global environments)
   */
  merge(otherEnvironment) {
    const merged = new Environment(this.toJSON())

    for (const variable of otherEnvironment.values) {
      if (!merged.values.find(v => v.key === variable.key)) {
        merged.values.push(variable)
      }
    }

    return merged
  }

  /**
   * Export environment in Postman format
   */
  export() {
    return {
      id: this.id,
      name: this.name,
      values: this.values.map(v => ({
        key: v.key,
        value: v.type === 'secret' ? '' : v.value,
        type: v.type,
        enabled: v.enabled
      })),
      _postman_variable_scope: this._postman_variable_scope,
      _postman_exported_at: new Date().toISOString(),
      _postman_exported_using: this._postman_exported_using
    }
  }

  /**
   * Import from Postman environment
   */
  static import(postmanEnvironment) {
    return new Environment(postmanEnvironment)
  }

  /**
   * Create a global environment
   */
  static createGlobal() {
    return new Environment({
      name: 'Global',
      isGlobal: true,
      _postman_variable_scope: 'globals'
    })
  }
}