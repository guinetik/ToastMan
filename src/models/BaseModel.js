/**
 * Base Model class for all data models
 * Provides common functionality like validation, serialization, and cloning
 */
export class BaseModel {
  constructor(data = {}) {
    this.validateAndAssign(data)
  }

  /**
   * Generate a UUID v4
   * @returns {string}
   */
  static generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Get current ISO timestamp
   * @returns {string}
   */
  static getTimestamp() {
    return new Date().toISOString()
  }

  /**
   * Validate and assign data to instance
   * @param {Object} data
   */
  validateAndAssign(data) {
    const schema = this.constructor.schema || {}

    Object.entries(schema).forEach(([key, config]) => {
      const value = data[key]

      if (config.required && value === undefined && config.default === undefined) {
        throw new Error(`Required field '${key}' is missing in ${this.constructor.name}`)
      }

      const finalValue = value !== undefined ? value :
        (typeof config.default === 'function' ? config.default() : config.default)

      if (finalValue !== undefined) {
        if (config.type && !this.validateType(finalValue, config.type)) {
          throw new Error(`Invalid type for '${key}' in ${this.constructor.name}. Expected ${config.type}`)
        }

        if (config.enum && !config.enum.includes(finalValue)) {
          throw new Error(`Invalid value for '${key}' in ${this.constructor.name}. Must be one of: ${config.enum.join(', ')}`)
        }

        if (config.validator && !config.validator(finalValue)) {
          throw new Error(`Validation failed for '${key}' in ${this.constructor.name}`)
        }

        this[key] = finalValue
      }
    })
  }

  /**
   * Validate type of value
   * @param {*} value
   * @param {string|Function} type
   * @returns {boolean}
   */
  validateType(value, type) {
    if (typeof type === 'string') {
      if (type === 'array') return Array.isArray(value)
      if (type === 'object') return value === null || (typeof value === 'object' && !Array.isArray(value))
      return typeof value === type
    }
    if (typeof type === 'function') {
      return value instanceof type
    }
    return false
  }

  /**
   * Convert model to plain JSON object for storage
   * @returns {Object}
   */
  toJSON() {
    const schema = this.constructor.schema || {}
    const result = {}

    Object.keys(schema).forEach(key => {
      if (this[key] !== undefined) {
        if (this[key] && typeof this[key].toJSON === 'function') {
          result[key] = this[key].toJSON()
        } else if (Array.isArray(this[key])) {
          result[key] = this[key].map(item =>
            item && typeof item.toJSON === 'function' ? item.toJSON() : item
          )
        } else {
          result[key] = this[key]
        }
      }
    })

    return result
  }

  /**
   * Create a deep clone of the model
   * @returns {BaseModel}
   */
  clone() {
    return new this.constructor(JSON.parse(JSON.stringify(this.toJSON())))
  }

  /**
   * Update model with partial data
   * @param {Object} updates
   */
  update(updates) {
    const schema = this.constructor.schema || {}

    Object.entries(updates).forEach(([key, value]) => {
      if (schema[key]) {
        if (schema[key].type && !this.validateType(value, schema[key].type)) {
          throw new Error(`Invalid type for '${key}' in ${this.constructor.name}`)
        }
        this[key] = value
      }
    })

    return this
  }

  /**
   * Create model from JSON string
   * @param {string} jsonString
   * @returns {BaseModel}
   */
  static fromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      return new this(data)
    } catch (error) {
      throw new Error(`Failed to parse JSON for ${this.name}: ${error.message}`)
    }
  }

  /**
   * Validate model against schema
   * @returns {boolean}
   */
  validate() {
    try {
      this.validateAndAssign(this.toJSON())
      return true
    } catch (error) {
      console.error(`Validation error in ${this.constructor.name}:`, error.message)
      return false
    }
  }
}