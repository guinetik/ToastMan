/**
 * Custom ACE autocomplete provider for cURL commands
 *
 * Provides context-aware suggestions for:
 * - HTTP methods (after -X flag)
 * - cURL flags (-H, -d, --header, etc.)
 * - Common headers (after -H flag)
 * - Environment variables (after {{ prefix)
 */

import { useEnvironments } from '../stores/useEnvironments.js'

// HTTP Methods
const HTTP_METHODS = [
  { caption: 'GET', value: 'GET', meta: 'method', description: 'Retrieve resource' },
  { caption: 'POST', value: 'POST', meta: 'method', description: 'Create resource' },
  { caption: 'PUT', value: 'PUT', meta: 'method', description: 'Update/replace resource' },
  { caption: 'PATCH', value: 'PATCH', meta: 'method', description: 'Partial update' },
  { caption: 'DELETE', value: 'DELETE', meta: 'method', description: 'Delete resource' },
  { caption: 'HEAD', value: 'HEAD', meta: 'method', description: 'Get headers only' },
  { caption: 'OPTIONS', value: 'OPTIONS', meta: 'method', description: 'Get allowed methods' }
]

// cURL Flags
const CURL_FLAGS = [
  // Request flags
  { caption: '-X', value: '-X ', meta: 'method', description: 'HTTP method' },
  { caption: '--request', value: '--request ', meta: 'method', description: 'HTTP method (long)' },

  // Header flags
  { caption: '-H', value: '-H ', meta: 'header', description: 'Add header' },
  { caption: '--header', value: '--header ', meta: 'header', description: 'Add header (long)' },

  // Data flags
  { caption: '-d', value: '-d ', meta: 'data', description: 'Request body data' },
  { caption: '--data', value: '--data ', meta: 'data', description: 'Request body (long)' },
  { caption: '--data-raw', value: '--data-raw ', meta: 'data', description: 'Raw data (no processing)' },
  { caption: '--data-binary', value: '--data-binary ', meta: 'data', description: 'Binary data' },
  { caption: '--data-urlencode', value: '--data-urlencode ', meta: 'data', description: 'URL encoded data' },

  // Form flags
  { caption: '-F', value: '-F ', meta: 'form', description: 'Multipart form field' },
  { caption: '--form', value: '--form ', meta: 'form', description: 'Multipart form (long)' },

  // Auth flags
  { caption: '-u', value: '-u ', meta: 'auth', description: 'User:password auth' },
  { caption: '--user', value: '--user ', meta: 'auth', description: 'User auth (long)' },

  // SSL/TLS flags
  { caption: '-k', value: '-k ', meta: 'ssl', description: 'Allow insecure connections' },
  { caption: '--insecure', value: '--insecure ', meta: 'ssl', description: 'Skip SSL verification' },

  // Behavior flags
  { caption: '-L', value: '-L ', meta: 'redirect', description: 'Follow redirects' },
  { caption: '--location', value: '--location ', meta: 'redirect', description: 'Follow redirects (long)' },
  { caption: '-v', value: '-v ', meta: 'debug', description: 'Verbose output' },
  { caption: '--verbose', value: '--verbose ', meta: 'debug', description: 'Verbose (long)' },
  { caption: '-i', value: '-i ', meta: 'output', description: 'Include response headers' },
  { caption: '--include', value: '--include ', meta: 'output', description: 'Include headers (long)' },
  { caption: '-s', value: '-s ', meta: 'output', description: 'Silent mode' },
  { caption: '--silent', value: '--silent ', meta: 'output', description: 'Silent (long)' },

  // Timeout
  { caption: '--connect-timeout', value: '--connect-timeout ', meta: 'timeout', description: 'Connection timeout (seconds)' },
  { caption: '-m', value: '-m ', meta: 'timeout', description: 'Max time for request' },
  { caption: '--max-time', value: '--max-time ', meta: 'timeout', description: 'Max time (long)' },

  // Output
  { caption: '-o', value: '-o ', meta: 'output', description: 'Write to file' },
  { caption: '--output', value: '--output ', meta: 'output', description: 'Write to file (long)' }
]

// Common Headers
const COMMON_HEADERS = [
  // Content types
  { caption: 'Content-Type: application/json', value: 'Content-Type: application/json', meta: 'content', description: 'JSON content' },
  { caption: 'Content-Type: application/x-www-form-urlencoded', value: 'Content-Type: application/x-www-form-urlencoded', meta: 'content', description: 'Form content' },
  { caption: 'Content-Type: multipart/form-data', value: 'Content-Type: multipart/form-data', meta: 'content', description: 'Multipart form' },
  { caption: 'Content-Type: text/plain', value: 'Content-Type: text/plain', meta: 'content', description: 'Plain text' },
  { caption: 'Content-Type: text/xml', value: 'Content-Type: text/xml', meta: 'content', description: 'XML content' },

  // Authorization
  { caption: 'Authorization: Bearer ', value: 'Authorization: Bearer ', meta: 'auth', description: 'Bearer token auth' },
  { caption: 'Authorization: Basic ', value: 'Authorization: Basic ', meta: 'auth', description: 'Basic auth' },
  { caption: 'Authorization: ApiKey ', value: 'Authorization: ApiKey ', meta: 'auth', description: 'API key auth' },

  // Accept
  { caption: 'Accept: application/json', value: 'Accept: application/json', meta: 'accept', description: 'Accept JSON' },
  { caption: 'Accept: */*', value: 'Accept: */*', meta: 'accept', description: 'Accept anything' },
  { caption: 'Accept: text/html', value: 'Accept: text/html', meta: 'accept', description: 'Accept HTML' },

  // Common headers
  { caption: 'User-Agent: ', value: 'User-Agent: ', meta: 'header', description: 'User agent string' },
  { caption: 'Cache-Control: no-cache', value: 'Cache-Control: no-cache', meta: 'cache', description: 'No caching' },
  { caption: 'Cache-Control: max-age=0', value: 'Cache-Control: max-age=0', meta: 'cache', description: 'Revalidate' },

  // Custom headers
  { caption: 'X-Api-Key: ', value: 'X-Api-Key: ', meta: 'custom', description: 'API key header' },
  { caption: 'X-Request-ID: ', value: 'X-Request-ID: ', meta: 'custom', description: 'Request ID header' }
]

/**
 * Get environment variables from the store for autocomplete
 */
function getEnvironmentVariables() {
  try {
    const envStore = useEnvironments()
    const activeEnv = envStore.activeEnvironment?.value

    if (!activeEnv?.values) return []

    return activeEnv.values
      .filter(v => v.enabled !== false)
      .map(v => ({
        caption: `{{${v.key}}}`,
        value: `{{${v.key}}}`,
        meta: 'variable',
        description: v.value ? (v.value.length > 30 ? v.value.slice(0, 30) + '...' : v.value) : 'empty',
        score: 500
      }))
  } catch (e) {
    // Store might not be available during initialization
    return []
  }
}

/**
 * Detect context from the current line to provide relevant suggestions
 */
function detectContext(line, column) {
  const beforeCursor = line.slice(0, column)

  // Check if we're starting a variable
  if (/\{\{[^}]*$/.test(beforeCursor)) {
    return 'variable'
  }

  // Check if we just typed -X and need a method
  if (/-X\s*$/.test(beforeCursor) || /--request\s*$/.test(beforeCursor)) {
    return 'method'
  }

  // Check if we just typed -H and need a header
  if (/-H\s*['"]?$/.test(beforeCursor) || /--header\s*['"]?$/.test(beforeCursor)) {
    return 'header'
  }

  // Check if we're typing a flag (starts with -)
  if (/(^|\s)-[a-zA-Z-]*$/.test(beforeCursor)) {
    return 'flag'
  }

  // Check if at start of line or after whitespace (general suggestions)
  if (/^\s*$/.test(beforeCursor) || /\s$/.test(beforeCursor)) {
    return 'general'
  }

  return null
}

/**
 * Create the cURL autocomplete completer for ACE
 */
export const curlCompleter = {
  identifierRegexps: [/[a-zA-Z_0-9\-{]/],

  getCompletions(editor, session, pos, prefix, callback) {
    const line = session.getLine(pos.row)
    const context = detectContext(line, pos.column)
    let suggestions = []

    switch (context) {
      case 'variable':
        // Show environment variables
        suggestions = getEnvironmentVariables()
        break

      case 'method':
        // Show HTTP methods after -X
        suggestions = HTTP_METHODS.map((m, i) => ({
          ...m,
          score: 1000 - i
        }))
        break

      case 'header':
        // Show common headers after -H
        suggestions = COMMON_HEADERS.map((h, i) => ({
          ...h,
          score: 1000 - i
        }))
        break

      case 'flag':
        // Show flags when typing -
        suggestions = CURL_FLAGS
          .filter(f => f.caption.toLowerCase().startsWith(prefix.toLowerCase()))
          .map((f, i) => ({
            ...f,
            score: 900 - i
          }))
        break

      case 'general':
        // Show methods and common flags
        suggestions = [
          ...HTTP_METHODS.map((m, i) => ({ ...m, score: 800 - i })),
          ...CURL_FLAGS.slice(0, 10).map((f, i) => ({ ...f, score: 700 - i }))
        ]
        break

      default:
        // Minimal suggestions for other contexts
        break
    }

    callback(null, suggestions)
  },

  getDocTooltip(item) {
    if (item.description) {
      return {
        docHTML: `<div style="padding: 4px 8px;"><strong>${item.caption}</strong><br/><span style="color: #888;">${item.description}</span></div>`
      }
    }
  }
}

export default curlCompleter
