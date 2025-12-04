/**
 * PostmanAdapter Export Tests
 *
 * Tests for exporting ToastMan collections to Postman format.
 */

import { describe, it, expect } from 'vitest'
import { PostmanAdapter } from '../PostmanAdapter.js'

describe('PostmanAdapter.export', () => {

  describe('Basic Export', () => {

    it('should export a collection with Postman schema', () => {
      const collection = {
        info: {
          id: 'test-001',
          name: 'My Collection'
        },
        item: []
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported.info.schema).toBe(
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      )
    })

    it('should add export metadata', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: []
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported._postman_exported_at).toBeDefined()
      expect(exported._postman_exported_using).toBe('ToastMan')
    })

    it('should remove ToastMan-specific fields', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02'
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported.createdAt).toBeUndefined()
      expect(exported.updatedAt).toBeUndefined()
    })

  })

  describe('Request Export', () => {

    it('should export request with headers', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'GET Request',
          type: 'request',
          request: {
            method: 'GET',
            url: { raw: 'https://example.com' },
            header: [
              { key: 'Accept', value: 'application/json', enabled: true },
              { key: 'X-Disabled', value: 'test', enabled: false }
            ]
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const headers = exported.item[0].request.header

      expect(headers[0].disabled).toBeUndefined() // enabled: true → no disabled field
      expect(headers[1].disabled).toBe(true) // enabled: false → disabled: true
    })

    it('should invert enabled flag to disabled on export', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'Test',
          type: 'request',
          request: {
            method: 'GET',
            url: {
              raw: 'https://example.com',
              query: [
                { key: 'active', value: 'yes', enabled: true },
                { key: 'inactive', value: 'no', enabled: false }
              ]
            }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const query = exported.item[0].request.url.query

      expect(query[0].disabled).toBeUndefined()
      expect(query[1].disabled).toBe(true)
    })

  })

  describe('Body Export', () => {

    it('should map x-www-form-urlencoded back to urlencoded', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'Form',
          type: 'request',
          request: {
            method: 'POST',
            url: { raw: 'https://example.com' },
            body: {
              mode: 'x-www-form-urlencoded',
              urlEncoded: [
                { key: 'username', value: 'john', enabled: true }
              ]
            }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const body = exported.item[0].request.body

      expect(body.mode).toBe('urlencoded')
      expect(body.urlencoded[0].key).toBe('username')
    })

    it('should map form-data back to formdata', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'Upload',
          type: 'request',
          request: {
            method: 'POST',
            url: { raw: 'https://example.com' },
            body: {
              mode: 'form-data',
              formData: [
                { key: 'file', type: 'file', src: '/path/to/file.pdf' }
              ]
            }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const body = exported.item[0].request.body

      expect(body.mode).toBe('formdata')
      expect(body.formdata[0].type).toBe('file')
    })

    it('should export raw body with options', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'JSON',
          type: 'request',
          request: {
            method: 'POST',
            url: { raw: 'https://example.com' },
            body: {
              mode: 'raw',
              raw: '{"key": "value"}',
              options: { raw: { language: 'json' } }
            }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const body = exported.item[0].request.body

      expect(body.mode).toBe('raw')
      expect(body.raw).toBe('{"key": "value"}')
      expect(body.options.raw.language).toBe('json')
    })

    it('should handle null/none body mode', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'GET',
          type: 'request',
          request: {
            method: 'GET',
            url: { raw: 'https://example.com' },
            body: { mode: 'none' }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      expect(exported.item[0].request.body).toBeNull()
    })

  })

  describe('Auth Export', () => {

    it('should convert auth object back to array format', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        auth: {
          type: 'basic',
          basic: {
            username: 'admin',
            password: 'secret'
          }
        },
        item: []
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported.auth.type).toBe('basic')
      expect(exported.auth.basic).toBeInstanceOf(Array)
      expect(exported.auth.basic.find(a => a.key === 'username').value).toBe('admin')
    })

    it('should convert none auth type to noauth', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        auth: { type: 'none' },
        item: []
      }

      const exported = PostmanAdapter.export(collection)
      expect(exported.auth.type).toBe('noauth')
    })

    it('should export request-level auth', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [{
          name: 'Protected',
          type: 'request',
          request: {
            method: 'GET',
            url: { raw: 'https://example.com' },
            auth: {
              type: 'bearer',
              bearer: { token: 'abc123' }
            }
          }
        }]
      }

      const exported = PostmanAdapter.export(collection)
      const auth = exported.item[0].request.auth

      expect(auth.type).toBe('bearer')
      expect(auth.bearer.find(a => a.key === 'token').value).toBe('abc123')
    })

  })

  describe('Folder Export', () => {

    it('should export folder structure', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [
          {
            name: 'Users',
            type: 'folder',
            item: [
              {
                name: 'List',
                type: 'request',
                request: {
                  method: 'GET',
                  url: { raw: 'https://example.com/users' }
                }
              }
            ]
          }
        ]
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported.item[0].name).toBe('Users')
      expect(exported.item[0].item).toHaveLength(1)
      expect(exported.item[0].item[0].name).toBe('List')
    })

    it('should preserve folder auth on export', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        item: [
          {
            name: 'Protected',
            type: 'folder',
            auth: {
              type: 'basic',
              basic: { username: 'admin', password: 'secret' }
            },
            item: []
          }
        ]
      }

      const exported = PostmanAdapter.export(collection)
      expect(exported.item[0].auth.type).toBe('basic')
    })

  })

  describe('Variables Export', () => {

    it('should export collection variables', () => {
      const collection = {
        info: { id: 'test-001', name: 'Test' },
        variable: [
          { id: 'v1', key: 'baseUrl', value: 'https://api.example.com', enabled: true },
          { id: 'v2', key: 'token', value: 'secret', enabled: false }
        ],
        item: []
      }

      const exported = PostmanAdapter.export(collection)

      expect(exported.variable).toHaveLength(2)
      expect(exported.variable[0].disabled).toBeUndefined()
      expect(exported.variable[1].disabled).toBe(true)
    })

  })

  describe('Round-trip Import/Export', () => {

    it('should preserve data through import and export cycle', () => {
      const original = {
        info: {
          _postman_id: 'original-id',
          name: 'Round Trip Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/test',
              header: [
                { key: 'Content-Type', value: 'application/json' }
              ],
              body: {
                mode: 'raw',
                raw: '{"test": true}'
              }
            }
          }
        ]
      }

      const imported = PostmanAdapter.import(original)
      const exported = PostmanAdapter.export(imported.collection)

      expect(exported.info.name).toBe('Round Trip Test')
      expect(exported.item[0].name).toBe('Test Request')
      expect(exported.item[0].request.method).toBe('POST')
      expect(exported.item[0].request.body.raw).toBe('{"test": true}')
    })

  })

})
