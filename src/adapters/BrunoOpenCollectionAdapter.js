/**
 * BrunoOpenCollectionAdapter
 *
 * Imports Bruno OpenCollection YAML (opencollection.yml + request .yml files)
 * into ToastMan's Postman-shaped collection format.
 *
 * Classic Bru (bruno.json + .bru) is intentionally rejected so a future
 * BrunoAdapter can own that format.
 */

import { load as loadYaml } from 'js-yaml'
import { createUrl, generateId } from '../models/types.js'
import { createLogger } from '../core/logger.js'

const logger = createLogger('BrunoOpenCollectionAdapter')

const DEFAULT_IGNORE = ['node_modules', '.git']

const PARTIAL_AUTH = new Set(['oauth1', 'oauth2', 'awsv4', 'ntlm', 'wsse', 'digest'])

/**
 * @typedef {{ path: string, content: string }} CollectionFile
 * @typedef {{ type: string, message: string, item?: string }} ImportNotice
 * @typedef {{ collection: Object|null, environments: Array, warnings: ImportNotice[], errors: ImportNotice[] }} ImportResult
 */

export class BrunoOpenCollectionAdapter {
  /**
   * Import an OpenCollection file list.
   * @param {CollectionFile[]} inputFiles
   * @returns {ImportResult}
   */
  static import(inputFiles) {
    const warnings = []
    const errors = []

    if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
      errors.push({ type: 'structure', message: 'Invalid collection data: expected a list of files' })
      return { collection: null, environments: [], warnings, errors }
    }

    const files = normalizeFiles(inputFiles)
    const format = detectBrunoFormat(files)

    if (format === 'bruno-classic') {
      errors.push({
        type: 'format',
        message: 'Classic Bru collections (bruno.json + .bru) are not supported yet. Save or export the collection as OpenCollection YAML, or wait for BrunoAdapter.'
      })
      return { collection: null, environments: [], warnings, errors }
    }

    const parsed = parseYamlFiles(files, warnings)
    const root = parsed.openCollection

    if (!root && parsed.requests.length === 0) {
      errors.push({
        type: 'structure',
        message: 'Not a Bruno OpenCollection: missing opencollection.yml and no YAML request files'
      })
      return { collection: null, environments: [], warnings, errors }
    }

    if (!root) {
      warnings.push({
        type: 'structure',
        message: 'opencollection.yml was missing; collection name was inferred from the folder'
      })
    }

    const info = root?.info || {}
    const collection = {
      info: {
        id: generateId(),
        name: info.name || inferCollectionName(files) || 'Bruno Collection',
        description: stringifyDescription(info.description || info.summary || ''),
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        version: { major: 1, minor: 0, patch: 0 }
      },
      item: [],
      auth: mapAuth(parsed.collectionSettings?.auth || root?.auth, 'collection', warnings),
      event: mapScripts(parsed.collectionSettings?.runtime, 'collection', warnings),
      variable: mapCollectionVariables(parsed.collectionSettings, root),
      protocolProfileBehavior: {}
    }

    collection.item = buildItemTree(parsed, warnings)

    const environments = parsed.environments.map(env => mapEnvironment(env))

    logger.debug('Imported OpenCollection', {
      name: collection.info.name,
      requests: countRequests(collection.item),
      environments: environments.length,
      warnings: warnings.length
    })

    return { collection, environments, warnings, errors }
  }

  /**
   * Summarize warnings for display
   * @param {ImportNotice[]} warnings
   * @returns {{ total: number, byType: Object, messages: string[] }}
   */
  static summarizeWarnings(warnings) {
    const summary = { total: warnings.length, byType: {}, messages: [] }
    for (const warning of warnings) {
      summary.byType[warning.type] = (summary.byType[warning.type] || 0) + 1
      summary.messages.push(warning.message)
    }
    return summary
  }
}

/**
 * Detect Bruno flavor from file names.
 * @param {CollectionFile[]} files
 * @returns {'bruno-opencollection'|'bruno-classic'|'unknown'}
 */
export function detectBrunoFormat(files) {
  const paths = files.map(f => normalizePath(f.path).toLowerCase())
  const hasOpen = paths.some(p => basename(p) === 'opencollection.yml' || basename(p) === 'opencollection.yaml')
  const hasBrunoJson = paths.some(p => basename(p) === 'bruno.json')
  if (hasOpen) return 'bruno-opencollection'
  if (hasBrunoJson) return 'bruno-classic'
  const hasYamlRequest = files.some(f => {
    const name = basename(f.path).toLowerCase()
    return isYamlName(name) && /(?:^|\n)http\s*:/.test(f.content || '')
  })
  return hasYamlRequest ? 'bruno-opencollection' : 'unknown'
}

/**
 * @param {CollectionFile[]} inputFiles
 * @returns {CollectionFile[]}
 */
function normalizeFiles(inputFiles) {
  const cleaned = inputFiles
    .filter(f => f && typeof f.path === 'string')
    .map(f => ({ path: normalizePath(f.path), content: f.content == null ? '' : String(f.content) }))
    .filter(f => !isIgnoredPath(f.path))

  return stripCommonRoot(cleaned)
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function isIgnoredPath(path) {
  const parts = normalizePath(path).split('/')
  return parts.some(part => DEFAULT_IGNORE.includes(part))
}

/**
 * If every file shares a single top-level folder, strip it.
 * @param {CollectionFile[]} files
 * @returns {CollectionFile[]}
 */
function stripCommonRoot(files) {
  if (files.length === 0) return files
  const firstParts = files[0].path.split('/')
  if (firstParts.length < 2) return files
  const root = firstParts[0]
  const allShare = files.every(f => f.path === root || f.path.startsWith(`${root}/`))
  if (!allShare) return files
  return files.map(f => ({
    path: f.path === root ? '' : f.path.slice(root.length + 1),
    content: f.content
  })).filter(f => f.path)
}

/**
 * @param {CollectionFile[]} files
 * @param {ImportNotice[]} warnings
 */
function parseYamlFiles(files, warnings) {
  const result = {
    openCollection: null,
    collectionSettings: null,
    folders: new Map(),
    requests: [],
    environments: []
  }

  for (const file of files) {
    const name = basename(file.path).toLowerCase()
    if (!isYamlName(name) && name !== 'opencollection.yml') continue

    let doc
    try {
      doc = loadYaml(file.content)
    } catch (error) {
      warnings.push({
        type: 'parse',
        message: `Could not parse ${file.path}: ${error.message}`,
        item: file.path
      })
      continue
    }

    if (!doc || typeof doc !== 'object') continue

    const dir = dirname(file.path)

    if (name === 'opencollection.yml' || name === 'opencollection.yaml') {
      result.openCollection = doc
      continue
    }

    if (dir === 'environments' || dir.startsWith('environments/')) {
      result.environments.push({ path: file.path, doc })
      continue
    }

    if (name === 'collection.yml' || name === 'collection.yaml') {
      result.collectionSettings = doc
      continue
    }

    if (name === 'folder.yml' || name === 'folder.yaml' || doc.info?.type === 'folder') {
      const folderDir = name.startsWith('folder.') ? dir : (dir ? `${dir}/${stripExt(name)}` : stripExt(name))
      result.folders.set(folderDir, { path: file.path, doc, seq: Number(doc.info?.seq ?? doc.seq ?? 0) })
      continue
    }

    if (doc.http || doc.info?.type === 'http') {
      result.requests.push({
        path: file.path,
        dir,
        doc,
        seq: Number(doc.info?.seq ?? doc.seq ?? 0),
        name: doc.info?.name || stripExt(basename(file.path))
      })
    }
  }

  return result
}

/**
 * @param {object} parsed
 * @param {ImportNotice[]} warnings
 * @returns {Array}
 */
function buildItemTree(parsed, warnings) {
  const rootItems = []
  const folderNodes = new Map()

  const ensureFolder = (dir) => {
    if (!dir) return null
    if (folderNodes.has(dir)) return folderNodes.get(dir)

    const parentDir = dirname(dir)
    const parent = parentDir ? ensureFolder(parentDir) : null
    const meta = parsed.folders.get(dir)?.doc
    const folderName = meta?.info?.name || meta?.name || basename(dir)
    const node = {
      id: generateId(),
      name: folderName,
      type: 'folder',
      description: stringifyDescription(meta?.info?.description || meta?.docs || ''),
      item: [],
      auth: mapAuth(meta?.auth || meta?.http?.auth, `folder "${folderName}"`, warnings),
      event: mapScripts(meta?.runtime, `folder "${folderName}"`, warnings),
      _seq: Number(meta?.info?.seq ?? meta?.seq ?? parsed.folders.get(dir)?.seq ?? 0)
    }

    folderNodes.set(dir, node)
    if (parent) parent.item.push(node)
    else rootItems.push(node)
    return node
  }

  for (const dir of parsed.folders.keys()) {
    ensureFolder(dir)
  }

  for (const request of parsed.requests) {
    const item = mapRequest(request, warnings)
    const parent = request.dir ? ensureFolder(request.dir) : null
    if (parent) parent.item.push(item)
    else rootItems.push(item)
  }

  sortItems(rootItems)
  return rootItems
}

/**
 * @param {Array} items
 */
function sortItems(items) {
  items.sort((a, b) => {
    const seqA = a._seq ?? 0
    const seqB = b._seq ?? 0
    if (seqA !== seqB) return seqA - seqB
    return String(a.name).localeCompare(String(b.name))
  })
  for (const item of items) {
    if (item.item) sortItems(item.item)
    delete item._seq
  }
}

/**
 * @param {{ doc: object, name: string, seq: number }} request
 * @param {ImportNotice[]} warnings
 */
function mapRequest(request, warnings) {
  const doc = request.doc
  const http = doc.http || {}
  const name = request.name
  const method = String(http.method || 'GET').toUpperCase()
  const rawUrl = http.url || ''
  const url = createUrl(rawUrl)

  const queryFromBlock = mapParams(http.params, 'query')
  if (queryFromBlock.length > 0) {
    url.query = mergeQuery(url.query, queryFromBlock)
  }

  const item = {
    id: generateId(),
    name,
    type: 'request',
    description: stringifyDescription(doc.docs || doc.info?.description || ''),
    request: {
      method,
      url,
      header: mapHeaders(http.headers),
      body: mapBody(http.body, name, warnings),
      auth: mapAuth(http.auth, `request "${name}"`, warnings),
      description: stringifyDescription(doc.docs || '')
    },
    event: mapScripts(doc.runtime, `request "${name}"`, warnings),
    response: [],
    protocolProfileBehavior: {},
    _seq: request.seq
  }

  return item
}

/**
 * @param {Array|object|undefined} headers
 * @returns {Array}
 */
function mapHeaders(headers) {
  return normalizeNamedList(headers).map(h => ({
    key: h.name || h.key || '',
    value: String(h.value ?? ''),
    enabled: h.disabled !== true,
    description: h.description || ''
  }))
}

/**
 * @param {Array|object|undefined} params
 * @param {'query'|'path'} type
 * @returns {Array}
 */
function mapParams(params, type) {
  const list = Array.isArray(params)
    ? params.filter(p => !p.type || p.type === type)
    : normalizeNamedList(params)

  return list.map(p => ({
    key: p.name || p.key || '',
    value: String(p.value ?? ''),
    enabled: p.disabled !== true,
    description: p.description || ''
  }))
}

/**
 * @param {Array} existing
 * @param {Array} extra
 */
function mergeQuery(existing, extra) {
  const byKey = new Map((existing || []).map(q => [q.key, q]))
  for (const param of extra) {
    byKey.set(param.key, param)
  }
  return [...byKey.values()]
}

/**
 * @param {object|undefined} body
 * @param {string} itemName
 * @param {ImportNotice[]} warnings
 */
function mapBody(body, itemName, warnings) {
  if (!body || body.type === 'none' || body.disabled) return null

  const type = String(body.type || 'json').toLowerCase()

  if (type === 'json' || type === 'text' || type === 'xml') {
    const language = type === 'xml' ? 'xml' : (type === 'text' ? 'text' : 'json')
    return {
      mode: 'raw',
      raw: stringifyBodyData(body.data),
      options: { raw: { language } }
    }
  }

  if (type === 'form-urlencoded' || type === 'urlencoded') {
    return {
      mode: 'urlencoded',
      urlencoded: normalizeNamedList(body.data).map(field => ({
        key: field.name || field.key || '',
        value: String(field.value ?? ''),
        enabled: field.disabled !== true,
        type: 'text'
      }))
    }
  }

  if (type === 'multipart-form' || type === 'formdata' || type === 'multipart') {
    return {
      mode: 'formdata',
      formdata: normalizeNamedList(body.data).map(field => ({
        key: field.name || field.key || '',
        value: String(field.value ?? ''),
        enabled: field.disabled !== true,
        type: field.type === 'file' ? 'file' : 'text',
        src: field.src
      }))
    }
  }

  if (type === 'graphql') {
    return {
      mode: 'graphql',
      graphql: {
        query: stringifyBodyData(body.data || body.query),
        variables: stringifyBodyData(body.vars || body.variables || '')
      }
    }
  }

  warnings.push({
    type: 'body',
    message: `Request "${itemName}" has unknown body type "${body.type}".`,
    item: itemName
  })
  return {
    mode: 'raw',
    raw: stringifyBodyData(body.data),
    options: { raw: { language: 'text' } }
  }
}

/**
 * @param {object|string|undefined} auth
 * @param {string} context
 * @param {ImportNotice[]} warnings
 * @returns {object|null}
 */
function mapAuth(auth, context, warnings) {
  if (!auth || auth === 'none' || auth === 'noauth') return null
  if (auth === 'inherit') return null

  const type = String(auth.type || '').toLowerCase()
  if (!type || type === 'none' || type === 'inherit' || type === 'noauth') return null

  if (PARTIAL_AUTH.has(type)) {
    warnings.push({
      type: 'auth',
      message: `${context} uses ${type} authentication. Token must be obtained manually.`,
      item: context
    })
  }

  if (type === 'bearer') {
    return { type: 'bearer', bearer: { token: auth.token || auth.bearer?.token || '' } }
  }

  if (type === 'basic') {
    return {
      type: 'basic',
      basic: {
        username: auth.username || auth.basic?.username || '',
        password: auth.password || auth.basic?.password || ''
      }
    }
  }

  if (type === 'apikey') {
    return {
      type: 'apikey',
      apikey: {
        key: auth.key || auth.apikey?.key || 'X-API-Key',
        value: auth.value || auth.apikey?.value || '',
        in: auth.placement === 'query' ? 'query' : 'header'
      }
    }
  }

  return { type, [type]: auth[type] || {} }
}

/**
 * @param {object|undefined} runtime
 * @param {string} context
 * @param {ImportNotice[]} warnings
 * @returns {Array}
 */
function mapScripts(runtime, context, warnings) {
  const scripts = runtime?.scripts
  if (!Array.isArray(scripts) || scripts.length === 0) return []

  const events = []
  const pre = scripts.filter(s => s.type === 'before-request').map(s => s.code || '').filter(Boolean)
  const post = scripts
    .filter(s => s.type === 'after-response' || s.type === 'tests')
    .map(s => s.code || '')
    .filter(Boolean)

  if (pre.length) {
    events.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: pre.join('\n\n').split('\n') }
    })
  }
  if (post.length) {
    events.push({
      listen: 'test',
      script: { type: 'text/javascript', exec: post.join('\n\n').split('\n') }
    })
  }

  if (events.length) {
    warnings.push({
      type: 'scripts',
      message: `${context} has Bruno scripts. They are stored but use the bru/req API and will not execute as Postman scripts.`,
      item: context
    })
  }

  return events
}

/**
 * @param {object|undefined} settings
 * @param {object|null} root
 */
function mapCollectionVariables(settings, root) {
  const vars = settings?.vars || settings?.variables || root?.variables || []
  return normalizeNamedList(vars).map(v => ({
    id: generateId(),
    key: v.name || v.key || '',
    value: String(v.value ?? ''),
    type: 'string',
    enabled: v.disabled !== true
  }))
}

/**
 * @param {{ doc: object, path: string }} envFile
 */
function mapEnvironment(envFile) {
  const doc = envFile.doc
  const name = doc.name || stripExt(basename(envFile.path))
  const values = normalizeNamedList(doc.variables || doc.vars || []).map(v => ({
    id: generateId(),
    key: v.name || v.key || '',
    value: String(v.value ?? ''),
    enabled: v.disabled !== true && v.enabled !== false,
    type: 'default'
  }))

  return {
    id: generateId(),
    name,
    values,
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'ToastMan'
  }
}

/**
 * Accept arrays of {name,value} or a plain object map.
 * @param {Array|object|undefined} value
 * @returns {Array}
 */
function normalizeNamedList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'object') {
    return Object.entries(value).map(([name, entry]) => {
      if (entry && typeof entry === 'object') {
        return { name, ...entry }
      }
      return { name, value: entry }
    })
  }
  return []
}

/**
 * @param {*} data
 * @returns {string}
 */
function stringifyBodyData(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

/**
 * @param {*} value
 * @returns {string}
 */
function stringifyDescription(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value.content) return String(value.content)
  return ''
}

/**
 * @param {CollectionFile[]} files
 */
function inferCollectionName(files) {
  const yamlNames = files.map(f => basename(f.path)).filter(n => n.toLowerCase() !== 'opencollection.yml')
  return yamlNames.length ? 'Bruno Collection' : ''
}

/**
 * @param {Array} items
 * @returns {number}
 */
function countRequests(items) {
  let count = 0
  for (const item of items) {
    if (item.request) count++
    if (item.item) count += countRequests(item.item)
  }
  return count
}

/**
 * @param {string} path
 */
function normalizePath(path) {
  return String(path).replace(/\\/g, '/').replace(/^\.\//, '')
}

/**
 * @param {string} path
 */
function basename(path) {
  const parts = normalizePath(path).split('/')
  return parts[parts.length - 1] || ''
}

/**
 * @param {string} path
 */
function dirname(path) {
  const normalized = normalizePath(path)
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '' : normalized.slice(0, idx)
}

/**
 * @param {string} name
 */
function stripExt(name) {
  return name.replace(/\.(ya?ml)$/i, '')
}

/**
 * @param {string} name
 */
function isYamlName(name) {
  return /\.(ya?ml)$/i.test(name)
}

export default BrunoOpenCollectionAdapter
