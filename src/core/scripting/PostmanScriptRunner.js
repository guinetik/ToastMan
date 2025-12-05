/**
 * PostmanScriptRunner
 *
 * Executes Postman-compatible post-request scripts in a sandboxed environment.
 * Provides a lightweight `pm` API for common operations:
 * - pm.response - access response data
 * - pm.environment - get/set environment variables
 * - pm.test() - run test assertions
 * - pm.expect() - Chai-like assertions
 *
 * Also captures console.log/warn/error output.
 */

import { createExpect, AssertionError } from './Assertions.js'

/**
 * ResponseAssertions - Chai BDD-style assertions for pm.response.to.have...
 * Provides the fluent API: pm.response.to.have.status(200)
 */
class ResponseAssertions {
  constructor(response) {
    this._response = response
    this._negate = false
  }

  /**
   * Assert helper - handles negation and throws AssertionError on failure
   */
  _assert(condition, message, expected, actual) {
    const pass = this._negate ? !condition : condition
    if (!pass) {
      const negatePrefix = this._negate ? 'not ' : ''
      throw new AssertionError(
        message.replace('{not}', negatePrefix),
        expected,
        actual
      )
    }
    return this
  }

  // Chainable language getters
  get to() { return this }
  get be() { return this }
  get have() { return this }
  get and() { return this }
  get a() { return this }
  get an() { return this }

  /**
   * Negate the next assertion
   */
  get not() {
    const negated = new ResponseAssertions(this._response)
    negated._negate = !this._negate
    return negated
  }

  /**
   * Assert response status code
   * Usage: pm.response.to.have.status(200)
   *        pm.response.to.have.status("OK")
   */
  status(expected) {
    if (typeof expected === 'number') {
      return this._assert(
        this._response.code === expected,
        `Expected status code to {not}be ${expected}, got ${this._response.code}`,
        expected,
        this._response.code
      )
    }
    // String match against status text
    return this._assert(
      this._response.status.toLowerCase().includes(expected.toLowerCase()),
      `Expected status to {not}contain "${expected}", got "${this._response.status}"`,
      expected,
      this._response.status
    )
  }

  /**
   * Assert response has header (optionally with value)
   * Usage: pm.response.to.have.header("Content-Type")
   *        pm.response.to.have.header("Content-Type", "application/json")
   */
  header(name, value) {
    const headerValue = this._response.headers.get(name)
    const hasHeader = headerValue !== undefined

    if (arguments.length === 1) {
      return this._assert(
        hasHeader,
        `Expected response to {not}have header "${name}"`,
        name,
        hasHeader ? headerValue : 'not present'
      )
    }

    // Check header value
    const valueMatches = hasHeader && headerValue.toLowerCase().includes(value.toLowerCase())
    return this._assert(
      valueMatches,
      `Expected header "${name}" to {not}contain "${value}", got "${headerValue || 'not present'}"`,
      value,
      headerValue
    )
  }

  /**
   * Assert response body contains JSON
   * Usage: pm.response.to.be.json
   */
  get json() {
    let isJson = false
    try {
      this._response.json()
      isJson = true
    } catch {
      isJson = false
    }
    return this._assert(
      isJson,
      `Expected response body to {not}be valid JSON`,
      'valid JSON',
      'invalid JSON'
    )
  }

  /**
   * Assert response has body
   * Usage: pm.response.to.have.body
   *        pm.response.to.have.body("expected text")
   */
  body(expected) {
    const bodyText = this._response.text()

    if (arguments.length === 0) {
      return this._assert(
        bodyText && bodyText.length > 0,
        `Expected response to {not}have a body`,
        'body present',
        bodyText ? 'body present' : 'empty body'
      )
    }

    // String or regex match
    if (expected instanceof RegExp) {
      return this._assert(
        expected.test(bodyText),
        `Expected body to {not}match ${expected}`,
        expected.toString(),
        bodyText
      )
    }

    return this._assert(
      bodyText.includes(expected),
      `Expected body to {not}contain "${expected}"`,
      expected,
      bodyText
    )
  }

  /**
   * Assert response has JSON body with property
   * Usage: pm.response.to.have.jsonBody("data.id")
   *        pm.response.to.have.jsonBody("data.id", 123)
   */
  jsonBody(path, expectedValue) {
    let json
    try {
      json = this._response.json()
    } catch (e) {
      throw new AssertionError(
        `Cannot check jsonBody: Response is not valid JSON`,
        'valid JSON',
        'invalid JSON'
      )
    }

    // Navigate the path
    const parts = path.split('.')
    let value = json
    for (const part of parts) {
      if (value === null || value === undefined) {
        value = undefined
        break
      }
      value = value[part]
    }

    if (arguments.length === 1) {
      return this._assert(
        value !== undefined,
        `Expected JSON body to {not}have path "${path}"`,
        path,
        value === undefined ? 'undefined' : value
      )
    }

    return this._assert(
      value === expectedValue,
      `Expected JSON body path "${path}" to {not}equal ${JSON.stringify(expectedValue)}, got ${JSON.stringify(value)}`,
      expectedValue,
      value
    )
  }

  /**
   * Assert response time is below threshold
   * Usage: pm.response.to.have.responseTime.below(500)
   */
  get responseTime() {
    const time = this._response.responseTime
    const self = this
    return {
      below(ms) {
        return self._assert(
          time < ms,
          `Expected response time to {not}be below ${ms}ms, got ${time}ms`,
          `< ${ms}ms`,
          `${time}ms`
        )
      },
      above(ms) {
        return self._assert(
          time > ms,
          `Expected response time to {not}be above ${ms}ms, got ${time}ms`,
          `> ${ms}ms`,
          `${time}ms`
        )
      }
    }
  }
}

/**
 * HeaderList - Provides header access methods like Postman
 */
class HeaderList {
  constructor(headers) {
    this._headers = headers || {}
    // Normalize header keys to lowercase for case-insensitive lookup
    this._normalized = {}
    Object.entries(this._headers).forEach(([key, value]) => {
      this._normalized[key.toLowerCase()] = { key, value }
    })
  }

  /**
   * Get header value by name (case-insensitive)
   */
  get(name) {
    const entry = this._normalized[name.toLowerCase()]
    return entry ? entry.value : undefined
  }

  /**
   * Check if header exists
   */
  has(name) {
    return name.toLowerCase() in this._normalized
  }

  /**
   * Get all headers as array of {key, value}
   */
  all() {
    return Object.values(this._normalized).map(({ key, value }) => ({ key, value }))
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return { ...this._headers }
  }
}

/**
 * Script execution result
 */
export class ScriptResult {
  constructor() {
    this.tests = []              // Array of { name, passed, error, duration }
    this.consoleLogs = []        // Array of { type, args, timestamp }
    this.environmentChanges = [] // Array of { action, key, value, oldValue }
    this.error = null           // Global script error if any
    this.duration = 0           // Total execution time in ms
  }

  addTest(name, passed, error = null, duration = 0) {
    this.tests.push({ name, passed, error, duration })
  }

  addConsoleLog(type, args) {
    this.consoleLogs.push({
      type,
      args: args.map(arg => this._formatArg(arg)),
      timestamp: Date.now()
    })
  }

  addEnvChange(action, key, value, oldValue = undefined) {
    this.environmentChanges.push({ action, key, value, oldValue })
  }

  _formatArg(arg) {
    if (arg === null) return 'null'
    if (arg === undefined) return 'undefined'
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }

  get passed() {
    return this.tests.filter(t => t.passed).length
  }

  get failed() {
    return this.tests.filter(t => !t.passed).length
  }

  get totalTests() {
    return this.tests.length
  }
}

/**
 * PostmanScriptRunner - Main script execution class
 */
export class PostmanScriptRunner {
  constructor(options = {}) {
    this.environmentStore = options.environmentStore
    this.logger = options.logger || console
  }

  /**
   * Execute a post-request script
   *
   * @param {Object} options
   * @param {string} options.script - The JavaScript code to execute
   * @param {Object} options.response - The HTTP response object
   * @param {Object} options.request - The original request object (optional)
   * @param {string} options.requestName - Name of the request (optional)
   * @returns {ScriptResult} - The execution result
   */
  execute({ script, response, request, requestName }) {
    const result = new ScriptResult()
    const startTime = performance.now()

    if (!script || typeof script !== 'string' || script.trim() === '') {
      return result
    }

    // Create the pm object
    const pm = this._createPmObject(response, request, requestName, result)

    // Create sandboxed console
    const sandboxedConsole = this._createConsole(result)

    // Create the expect function
    const expect = createExpect()

    try {
      // Execute the script in a sandboxed context
      this._executeInSandbox(script, pm, sandboxedConsole, expect)
    } catch (error) {
      // Handle global script errors
      result.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
      this.logger.error('Script execution error:', error)
    }

    // Apply environment changes to the actual store
    this._applyEnvironmentChanges(result.environmentChanges)

    result.duration = performance.now() - startTime
    return result
  }

  /**
   * Create the pm object with all Postman-like APIs
   */
  _createPmObject(response, request, requestName, result) {
    const self = this

    // Parse response body
    let parsedJson = null
    let jsonParseError = null

    // Create the response object with BDD assertion chain support
    const pmResponse = {
      code: response?.status || 0,
      status: response?.statusText || '',
      responseTime: response?.time || 0,

      headers: new HeaderList(response?.headers || {}),

      json() {
        if (jsonParseError) {
          throw jsonParseError
        }
        if (parsedJson !== null) {
          return parsedJson
        }
        try {
          const body = response?.body
          if (typeof body === 'string') {
            parsedJson = JSON.parse(body)
          } else if (typeof body === 'object') {
            parsedJson = body
          } else {
            parsedJson = null
          }
          return parsedJson
        } catch (error) {
          jsonParseError = new Error(`Failed to parse response as JSON: ${error.message}`)
          throw jsonParseError
        }
      },

      text() {
        const body = response?.body
        if (typeof body === 'string') {
          return body
        }
        if (typeof body === 'object') {
          return JSON.stringify(body)
        }
        return String(body || '')
      }
    }

    // Add BDD assertion chain: pm.response.to.have.status(200)
    Object.defineProperty(pmResponse, 'to', {
      get() {
        return new ResponseAssertions(pmResponse)
      }
    })

    const pm = {
      // Response object with BDD assertions
      response: pmResponse,

      // Environment API
      environment: {
        get(key) {
          if (!self.environmentStore) return undefined
          return self.environmentStore.resolveVariable(key)
        },

        set(key, value) {
          const oldValue = self.environmentStore?.resolveVariable(key)
          result.addEnvChange('set', key, value, oldValue)
        },

        unset(key) {
          const oldValue = self.environmentStore?.resolveVariable(key)
          result.addEnvChange('unset', key, undefined, oldValue)
        },

        has(key) {
          if (!self.environmentStore) return false
          return self.environmentStore.resolveVariable(key) !== null
        },

        toObject() {
          if (!self.environmentStore) return {}
          const vars = self.environmentStore.getAvailableVariables() || []
          const obj = {}
          vars.forEach(v => { obj[v.key] = v.value })
          return obj
        }
      },

      // Test function
      test(name, fn) {
        const testStart = performance.now()
        let passed = true
        let error = null

        try {
          fn()
        } catch (e) {
          passed = false
          if (e instanceof AssertionError) {
            error = {
              message: e.message,
              expected: e.expected,
              actual: e.actual
            }
          } else {
            error = {
              message: e.message,
              stack: e.stack
            }
          }
        }

        const duration = performance.now() - testStart
        result.addTest(name, passed, error, duration)
      },

      // Expect function (Chai-like assertions)
      expect: createExpect(),

      // Info object
      info: {
        requestName: requestName || 'Unnamed Request',
        iteration: 1,
        iterationCount: 1,
        requestId: request?.id || null
      },

      // Variables API (alias for environment in our implementation)
      variables: {
        get(key) {
          return pm.environment.get(key)
        },
        set(key, value) {
          pm.environment.set(key, value)
        },
        has(key) {
          return pm.environment.has(key)
        }
      }
    }

    return pm
  }

  /**
   * Create a sandboxed console object that captures output
   */
  _createConsole(result) {
    return {
      log: (...args) => result.addConsoleLog('log', args),
      info: (...args) => result.addConsoleLog('info', args),
      warn: (...args) => result.addConsoleLog('warn', args),
      error: (...args) => result.addConsoleLog('error', args),
      debug: (...args) => result.addConsoleLog('debug', args)
    }
  }

  /**
   * Execute script in a sandboxed context using Function constructor
   */
  _executeInSandbox(script, pm, console, expect) {
    // Create a function with pm, console, and expect in scope
    // This prevents access to window, document, etc.
    const sandboxedFunction = new Function(
      'pm',
      'console',
      'expect',
      // Wrap in try-catch to provide better error messages
      `
        "use strict";
        ${script}
      `
    )

    // Execute with our sandboxed objects
    sandboxedFunction(pm, console, expect)
  }

  /**
   * Apply environment changes to the actual store
   */
  _applyEnvironmentChanges(changes) {
    if (!this.environmentStore) {
      if (changes.length > 0) {
        this.logger.warn('No environment store available - environment changes will not persist')
      }
      return
    }

    const activeEnv = this.environmentStore.activeEnvironment?.value
    if (!activeEnv) {
      if (changes.length > 0) {
        this.logger.warn('No active environment - environment changes will not persist')
      }
      return
    }

    changes.forEach(change => {
      if (change.action === 'set') {
        // Check if variable exists
        const existingVar = activeEnv.values?.find(v => v.key === change.key)
        if (existingVar) {
          // Update existing
          this.environmentStore.updateVariable(activeEnv.id, existingVar.id, {
            value: String(change.value)
          })
        } else {
          // Add new
          this.environmentStore.addVariable(activeEnv.id, change.key, String(change.value))
        }
      } else if (change.action === 'unset') {
        const existingVar = activeEnv.values?.find(v => v.key === change.key)
        if (existingVar) {
          this.environmentStore.deleteVariable(activeEnv.id, existingVar.id)
        }
      }
    })
  }

  /**
   * Convert Postman event format to script string
   * Postman stores scripts as array of lines in event[].script.exec
   */
  static extractScriptFromEvent(event) {
    if (!event?.script?.exec) return ''

    const exec = event.script.exec
    if (Array.isArray(exec)) {
      return exec.join('\n')
    }
    if (typeof exec === 'string') {
      return exec
    }
    return ''
  }

  /**
   * Convert script string to Postman event format
   */
  static createEventFromScript(script, listen = 'test') {
    if (!script || script.trim() === '') return null

    return {
      listen,
      script: {
        type: 'text/javascript',
        exec: script.split('\n')
      }
    }
  }
}

export default PostmanScriptRunner
