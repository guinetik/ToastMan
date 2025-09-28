import { BaseModel } from './BaseModel.js'
import { Request } from './Request.js'

/**
 * Collection folder model for organizing requests
 */
export class CollectionFolder extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', default: 'New Folder' },
    description: { type: 'string', default: '' },
    item: { type: 'array', default: [] },
    auth: { type: 'object', default: null },
    event: { type: 'array', default: [] },
    variable: { type: 'array', default: [] },
    protocolProfileBehavior: { type: 'object', default: {} }
  }

  addItem(item) {
    if (item instanceof Request || item instanceof CollectionFolder) {
      this.item.push(item.toJSON())
    } else {
      this.item.push(item)
    }
    return this
  }

  removeItem(itemId) {
    this.item = this.item.filter(i => i.id !== itemId)
    return this
  }

  findItem(itemId) {
    for (const item of this.item) {
      if (item.id === itemId) {
        return item
      }
      if (item.item && Array.isArray(item.item)) {
        const found = new CollectionFolder(item).findItem(itemId)
        if (found) return found
      }
    }
    return null
  }

  getAllRequests() {
    const requests = []

    for (const item of this.item) {
      if (item.request) {
        requests.push(item)
      } else if (item.item && Array.isArray(item.item)) {
        const folderRequests = new CollectionFolder(item).getAllRequests()
        requests.push(...folderRequests)
      }
    }

    return requests
  }
}

/**
 * Collection info metadata
 */
export class CollectionInfo extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    name: { type: 'string', required: true },
    description: { type: 'string', default: '' },
    schema: { type: 'string', default: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    version: { type: 'object', default: () => ({ major: 1, minor: 0, patch: 0 }) },
    _postman_id: { type: 'string', default: () => BaseModel.generateId() }
  }
}

/**
 * Collection variable model
 */
export class CollectionVariable extends BaseModel {
  static schema = {
    id: { type: 'string', default: () => BaseModel.generateId() },
    key: { type: 'string', required: true },
    value: { type: 'string', default: '' },
    type: { type: 'string', enum: ['string', 'number', 'boolean', 'any'], default: 'string' },
    disabled: { type: 'boolean', default: false }
  }
}

/**
 * Main Collection model compatible with Postman v2.1
 */
export class Collection extends BaseModel {
  static schema = {
    info: { type: CollectionInfo, required: true },
    item: { type: 'array', default: [] },
    auth: { type: 'object', default: null },
    event: { type: 'array', default: [] },
    variable: { type: 'array', default: [] },
    protocolProfileBehavior: { type: 'object', default: {} },
    createdAt: { type: 'string', default: () => BaseModel.getTimestamp() },
    updatedAt: { type: 'string', default: () => BaseModel.getTimestamp() }
  }

  constructor(data = {}) {
    if (typeof data === 'string') {
      data = { info: { name: data } }
    }

    // Normalize ID fields to strings in info object
    if (data.info && data.info.id && typeof data.info.id !== 'string') {
      data.info.id = String(data.info.id)
    }
    if (data.info && data.info._postman_id && typeof data.info._postman_id !== 'string') {
      data.info._postman_id = String(data.info._postman_id)
    }

    // Normalize timestamp fields to strings
    if (data.createdAt && typeof data.createdAt !== 'string') {
      data.createdAt = data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt)
    }
    if (data.updatedAt && typeof data.updatedAt !== 'string') {
      data.updatedAt = data.updatedAt instanceof Date ? data.updatedAt.toISOString() : String(data.updatedAt)
    }

    if (!data.info) {
      data.info = new CollectionInfo({ name: data.name || 'New Collection' })
    } else if (!(data.info instanceof CollectionInfo)) {
      data.info = new CollectionInfo(data.info)
    }

    super(data)
  }

  addRequest(request) {
    const item = request instanceof Request ? request.toJSON() : request
    this.item.push(item)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  addFolder(folder) {
    const item = folder instanceof CollectionFolder ? folder.toJSON() : folder
    this.item.push(item)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeItem(itemId) {
    const initialLength = this.item.length
    this.item = this.item.filter(i => i.id !== itemId)

    if (this.item.length < initialLength) {
      this.updatedAt = BaseModel.getTimestamp()
    } else {
      for (let item of this.item) {
        if (item.item && Array.isArray(item.item)) {
          const folder = new CollectionFolder(item)
          folder.removeItem(itemId)
          item = folder.toJSON()
          this.updatedAt = BaseModel.getTimestamp()
        }
      }
    }

    return this
  }

  findItem(itemId, path = []) {
    for (let i = 0; i < this.item.length; i++) {
      const item = this.item[i]
      const currentPath = [...path, i]

      if (item.id === itemId) {
        return { item, path: currentPath }
      }

      if (item.item && Array.isArray(item.item)) {
        const folder = new CollectionFolder(item)
        const found = this.findItemInFolder(folder, itemId, currentPath)
        if (found) return found
      }
    }
    return null
  }

  findItemInFolder(folder, itemId, path) {
    for (let i = 0; i < folder.item.length; i++) {
      const item = folder.item[i]
      const currentPath = [...path, 'item', i]

      if (item.id === itemId) {
        return { item, path: currentPath }
      }

      if (item.item && Array.isArray(item.item)) {
        const subFolder = new CollectionFolder(item)
        const found = this.findItemInFolder(subFolder, itemId, currentPath)
        if (found) return found
      }
    }
    return null
  }

  updateItem(itemId, updates) {
    const found = this.findItem(itemId)
    if (found) {
      Object.assign(found.item, updates)
      this.updatedAt = BaseModel.getTimestamp()
    }
    return this
  }

  getAllRequests() {
    const requests = []

    for (const item of this.item) {
      if (item.request) {
        requests.push(item)
      } else if (item.item && Array.isArray(item.item)) {
        const folderRequests = new CollectionFolder(item).getAllRequests()
        requests.push(...folderRequests)
      }
    }

    return requests
  }

  getAllFolders() {
    const folders = []

    const collectFolders = (items) => {
      for (const item of items) {
        if (item.item && Array.isArray(item.item)) {
          folders.push(item)
          collectFolders(item.item)
        }
      }
    }

    collectFolders(this.item)
    return folders
  }

  addVariable(key, value, type = 'string') {
    const variable = new CollectionVariable({ key, value, type })
    this.variable.push(variable.toJSON())
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  removeVariable(key) {
    this.variable = this.variable.filter(v => v.key !== key)
    this.updatedAt = BaseModel.getTimestamp()
    return this
  }

  getVariable(key) {
    const variable = this.variable.find(v => v.key === key && !v.disabled)
    return variable ? variable.value : undefined
  }

  /**
   * Export collection in Postman format
   */
  export() {
    const exported = {
      info: this.info.toJSON(),
      item: this.item,
      auth: this.auth,
      event: this.event,
      variable: this.variable
    }

    if (Object.keys(this.protocolProfileBehavior).length > 0) {
      exported.protocolProfileBehavior = this.protocolProfileBehavior
    }

    return exported
  }

  /**
   * Import from Postman collection
   */
  static import(postmanCollection) {
    return new Collection(postmanCollection)
  }
}