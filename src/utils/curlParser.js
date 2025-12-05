/**
 * cURL Parser
 *
 * Parses cURL-style strings (without the `curl` prefix) into Postman-compatible request objects.
 *
 * Supported formats:
 * - URL -X METHOD -H "Header: Value" -d '{"body":"data"}'
 * - https://api.example.com/users -X POST -H "Content-Type: application/json" -d '{"name":"John"}'
 *
 * Supported flags:
 * - -X, --request: HTTP method
 * - -H, --header: Headers (can appear multiple times)
 * - -d, --data, --data-raw: Request body
 * - -F, --form: Form data (multipart)
 * - --data-urlencode: URL-encoded data
 */

import { createUrl, createKeyValue, createRequestBody } from '../models/types.js'

/**
 * Tokenize a cURL string, respecting quoted strings
 * @param {string} input - The cURL string to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenize(input) {
  const tokens = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      current += char
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim()) {
        tokens.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    tokens.push(current.trim())
  }

  return tokens
}

/**
 * Check if a string looks like a URL
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isUrl(str) {
  // Starts with http:// or https://
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return true
  }
  // Looks like a domain (contains . and no spaces, doesn't start with -)
  if (!str.startsWith('-') && str.includes('.') && !str.includes(' ')) {
    return true
  }
  // Localhost with port
  if (str.startsWith('localhost') || str.match(/^127\.0\.0\.\d+/)) {
    return true
  }
  return false
}

/**
 * Parse a header string into key-value pair
 * @param {string} headerStr - Header string like "Content-Type: application/json"
 * @returns {{key: string, value: string}}
 */
function parseHeader(headerStr) {
  const colonIndex = headerStr.indexOf(':')
  if (colonIndex === -1) {
    return { key: headerStr.trim(), value: '' }
  }
  return {
    key: headerStr.substring(0, colonIndex).trim(),
    value: headerStr.substring(colonIndex + 1).trim()
  }
}

/**
 * Parse a form field string
 * @param {string} fieldStr - Form field like "name=John" or "file=@/path/to/file"
 * @returns {{key: string, value: string, type: string}}
 */
function parseFormField(fieldStr) {
  const equalsIndex = fieldStr.indexOf('=')
  if (equalsIndex === -1) {
    return { key: fieldStr.trim(), value: '', type: 'text' }
  }

  const key = fieldStr.substring(0, equalsIndex).trim()
  let value = fieldStr.substring(equalsIndex + 1).trim()
  let type = 'text'

  // Check for file upload syntax: @/path/to/file
  if (value.startsWith('@')) {
    type = 'file'
    value = value.substring(1)
  }

  return { key, value, type }
}

/**
 * Decode base64 string safely
 * @param {string} str - Base64 encoded string
 * @returns {string|null} Decoded string or null if invalid
 */
function safeBase64Decode(str) {
  try {
    return atob(str)
  } catch (e) {
    return null
  }
}

/**
 * Parse a cURL-style string into a Postman-compatible request object
 * @param {string} curlString - The cURL string (without `curl` prefix)
 * @returns {object} Postman-compatible request object
 */
export function curlToRequest(curlString) {
  if (!curlString || typeof curlString !== 'string') {
    return createEmptyRequest()
  }

  // Clean up the input
  let input = curlString.trim()

  // Remove 'curl' prefix if present
  if (input.toLowerCase().startsWith('curl ')) {
    input = input.substring(5).trim()
  }

  const tokens = tokenize(input)

  let method = 'GET'
  let url = ''
  const headers = []
  let bodyMode = 'none'
  let bodyRaw = ''
  const formData = []
  const urlEncoded = []
  let auth = null

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    // Check for URL
    if (isUrl(token)) {
      url = token
      i++
      continue
    }

    // Parse flags
    switch (token) {
      case '-X':
      case '--request':
        if (i + 1 < tokens.length) {
          method = tokens[i + 1].toUpperCase()
          i += 2
        } else {
          i++
        }
        break

      case '-u':
      case '--user':
        // Basic auth: -u username:password
        if (i + 1 < tokens.length) {
          const userPass = tokens[i + 1]
          const colonIndex = userPass.indexOf(':')
          if (colonIndex !== -1) {
            auth = {
              type: 'basic',
              basic: {
                username: userPass.substring(0, colonIndex),
                password: userPass.substring(colonIndex + 1)
              }
            }
          } else {
            // No password provided
            auth = {
              type: 'basic',
              basic: { username: userPass, password: '' }
            }
          }
          i += 2
        } else {
          i++
        }
        break

      case '-H':
      case '--header':
        if (i + 1 < tokens.length) {
          const parsed = parseHeader(tokens[i + 1])

          // Check for Authorization header and extract auth
          if (parsed.key.toLowerCase() === 'authorization') {
            const authValue = parsed.value

            // Bearer token
            if (authValue.toLowerCase().startsWith('bearer ')) {
              auth = {
                type: 'bearer',
                bearer: { token: authValue.slice(7).trim() }
              }
              i += 2
              continue // Skip adding to headers array
            }

            // Basic auth (base64 encoded)
            if (authValue.toLowerCase().startsWith('basic ')) {
              const encoded = authValue.slice(6).trim()
              const decoded = safeBase64Decode(encoded)
              if (decoded) {
                const colonIndex = decoded.indexOf(':')
                if (colonIndex !== -1) {
                  auth = {
                    type: 'basic',
                    basic: {
                      username: decoded.substring(0, colonIndex),
                      password: decoded.substring(colonIndex + 1)
                    }
                  }
                } else {
                  auth = {
                    type: 'basic',
                    basic: { username: decoded, password: '' }
                  }
                }
                i += 2
                continue // Skip adding to headers array
              }
              // If decode fails, fall through and add as regular header
            }
          }

          headers.push(createKeyValue(parsed.key, parsed.value, true))
          i += 2
        } else {
          i++
        }
        break

      case '-d':
      case '--data':
      case '--data-raw':
        if (i + 1 < tokens.length) {
          bodyMode = 'raw'
          bodyRaw = tokens[i + 1]
          // Auto-detect POST if method is still GET
          if (method === 'GET') {
            method = 'POST'
          }
          i += 2
        } else {
          i++
        }
        break

      case '--data-urlencode':
        if (i + 1 < tokens.length) {
          bodyMode = 'urlencoded'
          const field = parseFormField(tokens[i + 1])
          urlEncoded.push(createKeyValue(field.key, field.value, true))
          if (method === 'GET') {
            method = 'POST'
          }
          i += 2
        } else {
          i++
        }
        break

      case '-F':
      case '--form':
        if (i + 1 < tokens.length) {
          bodyMode = 'formdata'
          const field = parseFormField(tokens[i + 1])
          formData.push({
            ...createKeyValue(field.key, field.value, true),
            type: field.type
          })
          if (method === 'GET') {
            method = 'POST'
          }
          i += 2
        } else {
          i++
        }
        break

      case '-G':
      case '--get':
        method = 'GET'
        i++
        break

      case '-I':
      case '--head':
        method = 'HEAD'
        i++
        break

      default:
        // Unknown token, skip
        i++
        break
    }
  }

  // Build the body object
  let body = createRequestBody(bodyMode)
  if (bodyMode === 'raw') {
    body.raw = bodyRaw
    body.options = { raw: { language: detectBodyLanguage(bodyRaw) } }
  } else if (bodyMode === 'formdata') {
    body.formdata = formData
  } else if (bodyMode === 'urlencoded') {
    body.urlencoded = urlEncoded
  }

  // Build the URL object
  const urlObj = createUrl(url)

  return {
    method,
    url: urlObj,
    header: headers.length > 0 ? headers : [],
    body,
    auth
  }
}

/**
 * Create an empty request object
 * @returns {object}
 */
function createEmptyRequest() {
  return {
    method: 'GET',
    url: createUrl(''),
    header: [],
    body: createRequestBody('none'),
    auth: null
  }
}

/**
 * Detect the language/format of a body string
 * @param {string} body - The body string
 * @returns {string} Language identifier
 */
function detectBodyLanguage(body) {
  if (!body) return 'text'

  const trimmed = body.trim()

  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch (e) {
      // Not valid JSON
    }
  }

  // XML detection
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return 'xml'
  }

  // HTML detection
  if (trimmed.toLowerCase().includes('<!doctype html') ||
      trimmed.toLowerCase().includes('<html')) {
    return 'html'
  }

  return 'text'
}

/**
 * Validate if a string is a valid cURL-style input
 * @param {string} input - The string to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateCurlInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is empty' }
  }

  const trimmed = input.trim()

  // Remove curl prefix if present
  let toCheck = trimmed
  if (toCheck.toLowerCase().startsWith('curl ')) {
    toCheck = toCheck.substring(5).trim()
  }

  // Must contain a URL
  const tokens = tokenize(toCheck)
  const hasUrl = tokens.some(token => isUrl(token))

  if (!hasUrl) {
    return { valid: false, error: 'No valid URL found' }
  }

  return { valid: true }
}

export default {
  curlToRequest,
  validateCurlInput
}
