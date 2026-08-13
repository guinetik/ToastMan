/**
 * BrunoOpenCollectionAdapter import tests
 */

import { describe, it, expect } from 'vitest'
import { BrunoOpenCollectionAdapter } from '../BrunoOpenCollectionAdapter.js'

/**
 * @param {Record<string, string>} filesByPath
 * @returns {{ path: string, content: string }[]}
 */
function files(filesByPath) {
  return Object.entries(filesByPath).map(([path, content]) => ({ path, content }))
}

const OPENCOLLECTION = `opencollection: 1.0.0
info:
  name: Demo API
  description: Sample OpenCollection
`

const GET_USERS = `info:
  name: Get Users
  type: http
  seq: 2

http:
  method: GET
  url: https://api.example.com/users
  params:
    - name: limit
      value: "10"
      type: query
    - name: archived
      value: "1"
      type: query
      disabled: true
  headers:
    - name: Accept
      value: application/json
    - name: X-Trace
      value: abc
      disabled: true
  auth: inherit

settings:
  encodeUrl: true
`

const CREATE_USER = `info:
  name: Create User
  type: http
  seq: 1

http:
  method: POST
  url: "{{baseUrl}}/users"
  headers:
    - name: Content-Type
      value: application/json
  body:
    type: json
    data: |-
      {
        "name": "Ada"
      }
  auth:
    type: bearer
    token: "{{token}}"
`

const LOGIN = `info:
  name: Login
  type: http
  seq: 1

http:
  method: GET
  url: https://httpbin.org/basic-auth/ada/secret
  auth:
    type: basic
    username: ada
    password: secret
`

const SCRIPTED = `info:
  name: Scripted
  type: http
  seq: 1

http:
  method: GET
  url: https://api.example.com/ping

runtime:
  scripts:
    - type: before-request
      code: |-
        req.setHeader("X-Time", Date.now());
    - type: tests
      code: |-
        test("ok", function() { expect(res.status).to.equal(200); });
`

const FOLDER_META = `info:
  name: User Management
  type: folder
  seq: 1
`

const LOCAL_ENV = `name: local
variables:
  - name: baseUrl
    value: https://api.example.com
  - name: token
    value: secret-token
`

describe('BrunoOpenCollectionAdapter.import', () => {
  it('imports collection name from opencollection.yml', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'demo/opencollection.yml': OPENCOLLECTION,
      'demo/get-users.yml': GET_USERS
    }))

    expect(result.errors).toEqual([])
    expect(result.collection.info.name).toBe('Demo API')
    expect(result.collection.info.description).toBe('Sample OpenCollection')
  })

  it('generates a new collection id', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS
    }))

    expect(result.collection.info.id).toBeTruthy()
    expect(result.collection.info.id).not.toBe('Demo API')
  })

  it('maps method, url, headers, and query params', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS
    }))

    const item = result.collection.item.find(i => i.name === 'Get Users')
    expect(item.request.method).toBe('GET')
    expect(item.request.url.raw).toContain('https://api.example.com/users')
    expect(item.request.header).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'Accept', value: 'application/json', enabled: true }),
      expect.objectContaining({ key: 'X-Trace', value: 'abc', enabled: false })
    ]))
    expect(item.request.url.query).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'limit', value: '10', enabled: true }),
      expect.objectContaining({ key: 'archived', value: '1', enabled: false })
    ]))
  })

  it('maps JSON body and bearer auth', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'create-user.yml': CREATE_USER
    }))

    const item = result.collection.item.find(i => i.name === 'Create User')
    expect(item.request.method).toBe('POST')
    expect(item.request.body.mode).toBe('raw')
    expect(item.request.body.raw).toContain('Ada')
    expect(item.request.body.options.raw.language).toBe('json')
    expect(item.request.auth.type).toBe('bearer')
    expect(item.request.auth.bearer.token).toBe('{{token}}')
  })

  it('maps basic auth', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'login.yml': LOGIN
    }))

    const item = result.collection.item.find(i => i.name === 'Login')
    expect(item.request.auth.type).toBe('basic')
    expect(item.request.auth.basic.username).toBe('ada')
    expect(item.request.auth.basic.password).toBe('secret')
  })

  it('omits auth when inherit is set', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS
    }))

    const item = result.collection.item.find(i => i.name === 'Get Users')
    expect(item.request.auth).toBeNull()
  })

  it('nests folders from the file tree and folder.yml name', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'demo/opencollection.yml': OPENCOLLECTION,
      'demo/users/folder.yml': FOLDER_META,
      'demo/users/create-user.yml': CREATE_USER
    }))

    const folder = result.collection.item.find(i => i.type === 'folder')
    expect(folder).toBeTruthy()
    expect(folder.name).toBe('User Management')
    expect(folder.item[0].name).toBe('Create User')
  })

  it('orders sibling requests by seq then name', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS,
      'create-user.yml': CREATE_USER
    }))

    expect(result.collection.item.map(i => i.name)).toEqual(['Create User', 'Get Users'])
  })

  it('stores Bruno scripts as events and warns they will not execute as-is', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'scripted.yml': SCRIPTED
    }))

    const item = result.collection.item.find(i => i.name === 'Scripted')
    expect(item.event.some(e => e.listen === 'prerequest')).toBe(true)
    expect(item.event.some(e => e.listen === 'test')).toBe(true)
    expect(result.warnings.some(w => w.type === 'scripts')).toBe(true)
  })

  it('extracts environments from environments/*.yml', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS,
      'environments/local.yml': LOCAL_ENV
    }))

    expect(result.environments).toHaveLength(1)
    expect(result.environments[0].name).toBe('local')
    expect(result.environments[0].values).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'baseUrl', value: 'https://api.example.com' }),
      expect.objectContaining({ key: 'token', value: 'secret-token' })
    ]))
  })

  it('rejects classic Bru collections with a clear error', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'bruno.json': JSON.stringify({ version: '1', name: 'Old', type: 'collection' }),
      'ping.bru': 'meta {\n  name: Ping\n}\nget {\n  url: https://example.com\n}\n'
    }))

    expect(result.collection).toBeNull()
    expect(result.errors.some(e => e.type === 'format')).toBe(true)
    expect(result.errors[0].message).toMatch(/classic/i)
  })

  it('errors when no OpenCollection root or request files are present', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'readme.md': '# hi'
    }))

    expect(result.collection).toBeNull()
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('skips node_modules and .git paths', () => {
    const result = BrunoOpenCollectionAdapter.import(files({
      'opencollection.yml': OPENCOLLECTION,
      'get-users.yml': GET_USERS,
      'node_modules/pkg/opencollection.yml': 'opencollection: 1.0.0\ninfo:\n  name: Nested\n',
      '.git/config': 'x'
    }))

    expect(result.collection.info.name).toBe('Demo API')
    expect(result.collection.item).toHaveLength(1)
  })
})
