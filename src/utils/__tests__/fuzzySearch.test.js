import { describe, it, expect } from 'vitest'
import { fuzzyMatch, fuzzyMatchRequest } from '../fuzzySearch.js'

describe('fuzzyMatch', () => {
  it('matches exact substrings', () => {
    const result = fuzzyMatch('get', 'getUsers')
    expect(result.match).toBe(true)
    expect(result.score).toBeGreaterThan(0)
  })

  it('matches characters in order but not consecutive', () => {
    const result = fuzzyMatch('gu', 'getUsers')
    expect(result.match).toBe(true)
    expect(result.score).toBeGreaterThan(0)
  })

  it('does not match characters out of order', () => {
    const result = fuzzyMatch('ug', 'getUsers')
    expect(result.match).toBe(false)
    expect(result.score).toBe(0)
  })

  it('is case insensitive', () => {
    const result = fuzzyMatch('GU', 'getUsers')
    expect(result.match).toBe(true)
  })

  it('scores consecutive matches higher', () => {
    const consecutiveResult = fuzzyMatch('get', 'getUsers')
    const scatteredResult = fuzzyMatch('geu', 'getUsers')

    expect(consecutiveResult.score).toBeGreaterThan(scatteredResult.score)
  })

  it('scores word boundary matches higher', () => {
    // 'u' at word boundary (camelCase) should score higher
    const boundaryResult = fuzzyMatch('u', 'getUsers')
    const midWordResult = fuzzyMatch('e', 'getUsers')

    expect(boundaryResult.score).toBeGreaterThan(midWordResult.score)
  })

  it('scores start of string matches highest', () => {
    const startResult = fuzzyMatch('g', 'getUsers')
    const midResult = fuzzyMatch('u', 'getUsers')

    expect(startResult.score).toBeGreaterThan(midResult.score)
  })

  it('handles empty query', () => {
    const result = fuzzyMatch('', 'getUsers')
    expect(result.match).toBe(true)
    expect(result.score).toBe(0)
  })

  it('handles empty text', () => {
    const result = fuzzyMatch('test', '')
    expect(result.match).toBe(false)
  })

  it('handles query longer than text', () => {
    const result = fuzzyMatch('getUsers', 'get')
    expect(result.match).toBe(false)
  })
})

describe('fuzzyMatchRequest', () => {
  const mockRequest = {
    name: 'Get All Users',
    url: 'https://api.example.com/users',
    method: 'GET'
  }

  it('matches against request name', () => {
    const result = fuzzyMatchRequest('users', mockRequest)
    expect(result.match).toBe(true)
  })

  it('matches against request URL', () => {
    const result = fuzzyMatchRequest('example', mockRequest)
    expect(result.match).toBe(true)
  })

  it('matches against request method', () => {
    const result = fuzzyMatchRequest('get', mockRequest)
    expect(result.match).toBe(true)
  })

  it('handles url as object with raw property', () => {
    const requestWithUrlObject = {
      name: 'Test',
      url: { raw: 'https://api.example.com/test' },
      method: 'POST'
    }
    const result = fuzzyMatchRequest('example', requestWithUrlObject)
    expect(result.match).toBe(true)
  })

  it('returns match true for empty query', () => {
    const result = fuzzyMatchRequest('', mockRequest)
    expect(result.match).toBe(true)
  })

  it('returns match false when nothing matches', () => {
    const result = fuzzyMatchRequest('xyz123', mockRequest)
    expect(result.match).toBe(false)
  })
})
