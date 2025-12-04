/**
 * PostmanAdapter Import Tests
 *
 * Tests for importing Postman collections into ToastMan format.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PostmanAdapter } from '../PostmanAdapter.js'

// Load fixtures
import basicCollection from './fixtures/basic-collection.json'
import nestedFolders from './fixtures/nested-folders.json'
import authTypes from './fixtures/auth-types.json'
import bodyModes from './fixtures/body-modes.json'
import withScripts from './fixtures/with-scripts.json'

describe('PostmanAdapter.import', () => {

  describe('Basic Import', () => {

    it('should import a basic collection with name and items', () => {
      const result = PostmanAdapter.import(basicCollection)

      expect(result.errors).toHaveLength(0);
      expect(result.collection).toBeDefined();
      expect(result.collection.info.name).toBe('Basic Test Collection');
      expect(result.collection.item).toHaveLength(2);
    })

    it('should generate new IDs for imported collection', () => {
      const result = PostmanAdapter.import(basicCollection)

      expect(result.collection.info.id).toBeDefined()
      expect(result.collection.info.id).not.toBe('test-collection-001')
    })

    it('should not mutate the original data', () => {
      const originalName = basicCollection.info.name
      const result = PostmanAdapter.import(basicCollection)

      expect(basicCollection.info.name).toBe(originalName)
      expect(result.collection.info.id).not.toBe(basicCollection.info._postman_id)
    })

    it('should handle null input gracefully', () => {
      const result = PostmanAdapter.import(null)

      expect(result.collection).toBeNull()
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('structure')
    })

    it('should handle missing info.name', () => {
      const result = PostmanAdapter.import({ info: {} })

      expect(result.collection).toBeNull()
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('missing info.name')
    })

  })

  describe('Request Normalization', () => {

    it('should normalize simple GET request', () => {
      const result = PostmanAdapter.import(basicCollection)
      const request = result.collection.item[0]

      expect(request.name).toBe('Simple GET Request')
      expect(request.type).toBe('request')
      expect(request.request.method).toBe('GET')
      expect(request.request.url.raw).toBe('https://api.example.com/users')
    })

    it('should normalize URL object format', () => {
      const result = PostmanAdapter.import(basicCollection)
      const request = result.collection.item[1]

      expect(request.request.url.raw).toBe('https://api.example.com/users')
      expect(request.request.url.protocol).toBe('https')
      expect(request.request.url.host).toEqual(['api', 'example', 'com'])
    })

    it('should normalize headers with enabled flag', () => {
      const result = PostmanAdapter.import(basicCollection)
      const headers = result.collection.item[0].request.header

      expect(headers[0].key).toBe('Accept')
      expect(headers[0].value).toBe('application/json')
      expect(headers[0].enabled).toBe(true)
    })

    it('should invert disabled flag to enabled', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'Test',
          request: {
            method: 'GET',
            url: 'https://example.com',
            header: [
              { key: 'Active', value: 'yes', disabled: false },
              { key: 'Inactive', value: 'no', disabled: true }
            ]
          }
        }]
      }

      const result = PostmanAdapter.import(collection)
      const headers = result.collection.item[0].request.header

      expect(headers[0].enabled).toBe(true)
      expect(headers[1].enabled).toBe(false)
    })

    it('should create default request for items without request property', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{ name: 'Empty Request' }]
      }

      const result = PostmanAdapter.import(collection)

      expect(result.collection.item[0].request.method).toBe('GET')
      expect(result.warnings.some(w => w.type === 'missing')).toBe(true)
    })

    it('should handle string-only request (URL)', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'URL Only',
          request: 'https://api.example.com/endpoint'
        }]
      }

      const result = PostmanAdapter.import(collection)
      const request = result.collection.item[0].request

      expect(request.method).toBe('GET')
      expect(request.url.raw).toBe('https://api.example.com/endpoint')
    })

  })

  describe('Nested Folders', () => {

    it('should preserve folder structure', () => {
      const result = PostmanAdapter.import(nestedFolders)

      expect(result.collection.item).toHaveLength(2)
      expect(result.collection.item[0].type).toBe('folder')
      expect(result.collection.item[0].name).toBe('Users API')
    })

    it('should process nested items within folders', () => {
      const result = PostmanAdapter.import(nestedFolders)
      const usersFolder = result.collection.item[0]

      expect(usersFolder.item).toHaveLength(2)
      expect(usersFolder.item[0].name).toBe('List Users')
      expect(usersFolder.item[0].type).toBe('request')
    })

    it('should handle deeply nested folders', () => {
      const result = PostmanAdapter.import(nestedFolders)
      const adminFolder = result.collection.item[0].item[1]

      expect(adminFolder.type).toBe('folder')
      expect(adminFolder.name).toBe('Admin')
      expect(adminFolder.item[0].name).toBe('Delete User')
    })

    it('should generate unique IDs for all nested items', () => {
      const result = PostmanAdapter.import(nestedFolders)
      const ids = new Set()

      const collectIds = (items) => {
        for (const item of items) {
          ids.add(item.id)
          if (item.item) collectIds(item.item)
        }
      }

      collectIds(result.collection.item)
      expect(ids.size).toBe(6) // 3 folders + 3 requests
    })

  })

  describe('Body Modes', () => {

    it('should import raw body with options', () => {
      const result = PostmanAdapter.import(bodyModes)
      const request = result.collection.item[0].request

      expect(request.body.mode).toBe('raw')
      expect(request.body.raw).toBe('{"key": "value"}')
      expect(request.body.options.raw.language).toBe('json')
    })

    it('should map urlencoded to x-www-form-urlencoded', () => {
      const result = PostmanAdapter.import(bodyModes)
      const request = result.collection.item[1].request

      expect(request.body.mode).toBe('x-www-form-urlencoded')
      expect(request.body.urlEncoded).toHaveLength(3)
      expect(request.body.urlEncoded[0].key).toBe('username')
    })

    it('should map formdata to form-data', () => {
      const result = PostmanAdapter.import(bodyModes)
      const request = result.collection.item[2].request

      expect(request.body.mode).toBe('form-data')
      expect(request.body.formData).toHaveLength(2)
      expect(request.body.formData[1].type).toBe('file')
    })

    it('should handle GraphQL body', () => {
      const result = PostmanAdapter.import(bodyModes)
      const request = result.collection.item[3].request

      expect(request.body.mode).toBe('graphql')
      expect(request.body.graphql.query).toContain('users')
    })

    it('should invert disabled flag in body fields', () => {
      const result = PostmanAdapter.import(bodyModes)
      const urlEncoded = result.collection.item[1].request.body.urlEncoded

      expect(urlEncoded[0].enabled).toBe(true)  // disabled: false
      expect(urlEncoded[2].enabled).toBe(false) // disabled: true
    })

  })

  describe('Authentication', () => {

    it('should import collection-level auth', () => {
      const result = PostmanAdapter.import(authTypes)

      expect(result.collection.auth).toBeDefined()
      expect(result.collection.auth.type).toBe('bearer')
    })

    it('should convert auth array format to object', () => {
      const result = PostmanAdapter.import(authTypes)
      const basicAuth = result.collection.item[0].request.auth

      expect(basicAuth.type).toBe('basic')
      expect(basicAuth.basic.username).toBe('admin')
      expect(basicAuth.basic.password).toBe('secret123')
    })

    it('should convert API key auth format', () => {
      const result = PostmanAdapter.import(authTypes)
      const apiKeyAuth = result.collection.item[1].request.auth

      expect(apiKeyAuth.type).toBe('apikey')
      expect(apiKeyAuth.apikey.key).toBe('X-API-Key')
      expect(apiKeyAuth.apikey.value).toBe('my-secret-key')
      expect(apiKeyAuth.apikey.in).toBe('header')
    })

    it('should warn about OAuth2 requiring manual token', () => {
      const result = PostmanAdapter.import(authTypes)

      const oauthWarning = result.warnings.find(w =>
        w.type === 'auth' && w.message.includes('oauth2')
      )
      expect(oauthWarning).toBeDefined()
      expect(oauthWarning.message).toContain('manual')
    })

    it('should handle noauth type', () => {
      const collection = {
        info: { name: 'Test' },
        auth: { type: 'noauth' },
        item: []
      }

      const result = PostmanAdapter.import(collection)
      expect(result.collection.auth.type).toBe('none')
    })

  })

  describe('Scripts Warning', () => {

    it('should warn about collection-level scripts', () => {
      const result = PostmanAdapter.import(withScripts)

      const scriptWarning = result.warnings.find(w =>
        w.type === 'scripts' && w.message.includes('Collection-level')
      )
      expect(scriptWarning).toBeDefined()
    })

    it('should warn about request-level scripts', () => {
      const result = PostmanAdapter.import(withScripts)

      const requestScriptWarning = result.warnings.find(w =>
        w.type === 'scripts' && w.message.includes('pre-request') && w.message.includes('test')
      )
      expect(requestScriptWarning).toBeDefined()
    })

    it('should preserve script content', () => {
      const result = PostmanAdapter.import(withScripts)
      const request = result.collection.item[0]

      expect(request.event).toHaveLength(2)
      expect(request.event[0].listen).toBe('prerequest')
    })

  })

  describe('URL Normalization', () => {

    it('should reconstruct raw URL from parts if missing', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'Test',
          request: {
            method: 'GET',
            url: {
              protocol: 'https',
              host: ['api', 'example', 'com'],
              path: ['v1', 'users']
            }
          }
        }]
      }

      const result = PostmanAdapter.import(collection)
      expect(result.collection.item[0].request.url.raw).toBe('https://api.example.com/v1/users')
    })

    it('should normalize query parameters', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'Test',
          request: {
            method: 'GET',
            url: {
              raw: 'https://example.com/search?q=test',
              query: [
                { key: 'q', value: 'test', disabled: false },
                { key: 'page', value: '1', disabled: true }
              ]
            }
          }
        }]
      }

      const result = PostmanAdapter.import(collection)
      const query = result.collection.item[0].request.url.query

      expect(query[0].enabled).toBe(true)
      expect(query[1].enabled).toBe(false)
    })

  })

  describe('Warning Summary', () => {

    it('should summarize warnings by type', () => {
      const result = PostmanAdapter.import(withScripts)
      const summary = PostmanAdapter.summarizeWarnings(result.warnings)

      expect(summary.total).toBeGreaterThan(0)
      expect(summary.byType.scripts).toBeDefined()
      expect(summary.messages).toBeInstanceOf(Array)
    })

  })

  describe('Edge Cases', () => {

    it('should handle empty item array', () => {
      const collection = {
        info: { name: 'Empty Collection' },
        item: []
      }

      const result = PostmanAdapter.import(collection)
      expect(result.collection.item).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle collection with variables', () => {
      const collection = {
        info: { name: 'Test' },
        variable: [
          { key: 'baseUrl', value: 'https://api.example.com', disabled: false },
          { key: 'token', value: 'abc123', disabled: true }
        ],
        item: []
      }

      const result = PostmanAdapter.import(collection)
      expect(result.collection.variable).toHaveLength(2)
      expect(result.collection.variable[0].enabled).toBe(true)
      expect(result.collection.variable[1].enabled).toBe(false)
    })

    it('should handle description as object', () => {
      const collection = {
        info: {
          name: 'Test',
          description: {
            content: 'This is the description',
            type: 'text/markdown'
          }
        },
        item: []
      }

      const result = PostmanAdapter.import(collection)
      // Description object handling is internal, just verify no errors
      expect(result.errors).toHaveLength(0)
    })

    it('should warn about proxy configuration', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'Proxied Request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            proxy: { host: 'proxy.example.com', port: 8080 }
          }
        }]
      }

      const result = PostmanAdapter.import(collection)
      const proxyWarning = result.warnings.find(w => w.type === 'proxy')
      expect(proxyWarning).toBeDefined()
    })

    it('should warn about certificate configuration', () => {
      const collection = {
        info: { name: 'Test' },
        item: [{
          name: 'Cert Request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            certificate: { src: '/path/to/cert.pem' }
          }
        }]
      }

      const result = PostmanAdapter.import(collection)
      const certWarning = result.warnings.find(w => w.type === 'certificate')
      expect(certWarning).toBeDefined()
    })

  })

})
