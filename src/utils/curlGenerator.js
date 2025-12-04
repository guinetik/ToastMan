/**
 * cURL Generator
 *
 * Converts Postman-compatible request objects into cURL-style strings.
 *
 * Output format (without curl prefix):
 * URL -X METHOD -H "Header: Value" -d '{"body":"data"}'
 */

/**
 * Escape a string for use in shell single quotes
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeForShell(str) {
  if (!str) return ''
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return str.replace(/'/g, "'\\''")
}

/**
 * Escape a string for use in shell double quotes
 * @param {string} str - String to escape
 * @returns {string}
 */
function escapeDoubleQuotes(str) {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Get the raw URL string from various URL formats
 * @param {object|string} url - URL object or string
 * @returns {string}
 */
function getUrlString(url) {
  if (!url) return ''

  if (typeof url === 'string') {
    return url
  }

  if (url.raw) {
    return url.raw
  }

  // Build URL from parts
  const protocol = url.protocol || 'https'
  const host = Array.isArray(url.host) ? url.host.join('.') : (url.host || '')
  const port = url.port ? `:${url.port}` : ''
  const path = Array.isArray(url.path) ? '/' + url.path.join('/') : (url.path || '')

  let queryString = ''
  if (url.query && url.query.length > 0) {
    const enabledParams = url.query.filter(q => q.enabled !== false)
    if (enabledParams.length > 0) {
      queryString = '?' + enabledParams
        .map(q => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
        .join('&')
    }
  }

  const hash = url.hash ? `#${url.hash}` : ''

  return `${protocol}://${host}${port}${path}${queryString}${hash}`
}

/**
 * Convert a Postman-compatible request object to a cURL string
 * @param {object} request - Postman request object
 * @param {object} options - Generation options
 * @param {boolean} options.includeCurlPrefix - Include 'curl' prefix (default: false)
 * @param {boolean} options.multiline - Format as multiline with backslashes (default: false)
 * @returns {string}
 */
export function requestToCurl(request, options = {}) {
  const { includeCurlPrefix = false, multiline = false } = options

  if (!request) {
    return ''
  }

  const parts = []
  const lineBreak = multiline ? ' \\\n  ' : ' '

  // Add curl prefix if requested
  if (includeCurlPrefix) {
    parts.push('curl')
  }

  // URL (first for readability in our non-curl format)
  const url = getUrlString(request.url)
  if (url) {
    parts.push(`'${escapeForShell(url)}'`)
  }

  // Method (only add if not GET, since GET is default)
  const method = request.method || 'GET'
  if (method !== 'GET') {
    parts.push(`-X ${method}`)
  }

  // Headers
  const headers = request.header || request.headers || []
  for (const header of headers) {
    if (header.enabled === false) continue
    if (!header.key) continue

    const headerValue = `${header.key}: ${header.value || ''}`
    parts.push(`-H '${escapeForShell(headerValue)}'`)
  }

  // Body
  if (request.body && request.body.mode !== 'none') {
    const body = request.body

    switch (body.mode) {
      case 'raw':
        if (body.raw) {
          parts.push(`-d '${escapeForShell(body.raw)}'`)
        }
        break

      case 'formdata':
      case 'form-data':
        const formData = body.formdata || body.formData || []
        for (const field of formData) {
          if (field.enabled === false) continue
          if (!field.key) continue

          if (field.type === 'file') {
            parts.push(`-F '${escapeForShell(field.key)}=@${escapeForShell(field.value)}'`)
          } else {
            parts.push(`-F '${escapeForShell(field.key)}=${escapeForShell(field.value)}'`)
          }
        }
        break

      case 'urlencoded':
      case 'x-www-form-urlencoded':
        const urlEncoded = body.urlencoded || body.urlEncoded || []
        for (const field of urlEncoded) {
          if (field.enabled === false) continue
          if (!field.key) continue

          parts.push(`--data-urlencode '${escapeForShell(field.key)}=${escapeForShell(field.value)}'`)
        }
        break

      case 'binary':
        if (body.binary || body.file) {
          const file = body.binary || body.file
          if (typeof file === 'string') {
            parts.push(`--data-binary '@${escapeForShell(file)}'`)
          }
        }
        break

      case 'graphql':
        if (body.graphql) {
          const graphqlBody = JSON.stringify({
            query: body.graphql.query || '',
            variables: body.graphql.variables ? JSON.parse(body.graphql.variables) : {}
          })
          parts.push(`-d '${escapeForShell(graphqlBody)}'`)
        }
        break
    }
  }

  return parts.join(lineBreak)
}

/**
 * Generate a short/summarized cURL representation
 * Shows method + URL, excludes headers and body
 * @param {object} request - Postman request object
 * @returns {string}
 */
export function requestToSummaryCurl(request) {
  if (!request) return ''

  const method = request.method || 'GET'
  const url = getUrlString(request.url)

  return `${method} ${url}`
}

/**
 * Generate a display-friendly version of the request
 * @param {object} request - Postman request object
 * @returns {{method: string, url: string, headers: Array, body: string|null}}
 */
export function requestToDisplay(request) {
  if (!request) {
    return { method: 'GET', url: '', headers: [], body: null }
  }

  const method = request.method || 'GET'
  const url = getUrlString(request.url)

  const headers = (request.header || request.headers || [])
    .filter(h => h.enabled !== false && h.key)
    .map(h => ({ key: h.key, value: h.value || '' }))

  let body = null
  if (request.body && request.body.mode !== 'none') {
    switch (request.body.mode) {
      case 'raw':
        body = request.body.raw || null
        break
      case 'formdata':
      case 'form-data':
        const formData = request.body.formdata || request.body.formData || []
        body = formData
          .filter(f => f.enabled !== false && f.key)
          .map(f => `${f.key}=${f.value}`)
          .join('\n')
        break
      case 'urlencoded':
      case 'x-www-form-urlencoded':
        const urlEncoded = request.body.urlencoded || request.body.urlEncoded || []
        body = urlEncoded
          .filter(f => f.enabled !== false && f.key)
          .map(f => `${f.key}=${f.value}`)
          .join('&')
        break
      case 'graphql':
        if (request.body.graphql) {
          body = request.body.graphql.query || ''
        }
        break
    }
  }

  return { method, url, headers, body }
}

/**
 * Check if a request has a body
 * @param {object} request - Postman request object
 * @returns {boolean}
 */
export function hasBody(request) {
  if (!request || !request.body) return false
  if (request.body.mode === 'none') return false

  switch (request.body.mode) {
    case 'raw':
      return !!request.body.raw
    case 'formdata':
    case 'form-data':
      return (request.body.formdata || request.body.formData || []).length > 0
    case 'urlencoded':
    case 'x-www-form-urlencoded':
      return (request.body.urlencoded || request.body.urlEncoded || []).length > 0
    case 'binary':
      return !!(request.body.binary || request.body.file)
    case 'graphql':
      return !!(request.body.graphql && request.body.graphql.query)
    default:
      return false
  }
}

/**
 * Check if a request has headers
 * @param {object} request - Postman request object
 * @returns {boolean}
 */
export function hasHeaders(request) {
  if (!request) return false
  const headers = request.header || request.headers || []
  return headers.some(h => h.enabled !== false && h.key)
}

export default {
  requestToCurl,
  requestToSummaryCurl,
  requestToDisplay,
  hasBody,
  hasHeaders
}
