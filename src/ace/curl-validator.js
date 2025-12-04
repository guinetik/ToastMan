/**
 * cURL Validator
 *
 * Validates cURL commands and returns errors with positions
 * for educational highlighting in the editor.
 * Supports multi-line commands with backslash continuations.
 */

const VALID_FLAGS = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
  '-F', '--form',
  '-u', '--user',
  '-k', '--insecure',
  '-L', '--location',
  '-o', '--output',
  '-O', '--remote-name',
  '-v', '--verbose',
  '-i', '--include',
  '-s', '--silent',
  '-S', '--show-error',
  '-m', '--max-time',
  '--connect-timeout',
  '-b', '--cookie',
  '-c', '--cookie-jar',
  '-A', '--user-agent',
  '-e', '--referer',
  '-G', '--get',
  '-I', '--head',
  '--compressed',
  '--http1.1', '--http2',
  '-x', '--proxy',
  '-U', '--proxy-user'
])

const FLAGS_REQUIRING_VALUE = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
  '-F', '--form',
  '-u', '--user',
  '-o', '--output',
  '-m', '--max-time',
  '--connect-timeout',
  '-b', '--cookie',
  '-c', '--cookie-jar',
  '-A', '--user-agent',
  '-e', '--referer',
  '-x', '--proxy',
  '-U', '--proxy-user'
])

const VALID_METHODS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
])

/**
 * Validate a cURL command and return errors with range information
 * @param {string} input - The cURL command to validate
 * @returns {Array<{row: number, column: number, endRow: number, endColumn: number, text: string, type: string}>}
 */
export function validateCurl(input) {
  const errors = []

  if (!input || !input.trim()) {
    return errors
  }

  const lines = input.split('\n')

  // Check for unclosed quotes
  const quoteErrors = checkUnclosedQuotes(input, lines)
  errors.push(...quoteErrors)

  // Tokenize with positions (handles multi-line with backslash)
  const tokens = tokenizeWithPositions(input)

  let hasUrl = false
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    const value = token.value

    // Skip 'curl' command itself
    if (value.toLowerCase() === 'curl') {
      i++
      continue
    }

    // Check if it's a URL
    if (isUrl(value)) {
      hasUrl = true
      i++
      continue
    }

    // Check for flags
    if (value.startsWith('-')) {
      // Check if it's a valid flag
      if (!VALID_FLAGS.has(value)) {
        const suggestion = findSimilarFlag(value)
        errors.push({
          row: token.row,
          column: token.column,
          endRow: token.endRow,
          endColumn: token.endColumn,
          text: suggestion
            ? `Unknown flag "${value}". Did you mean "${suggestion}"?`
            : `Unknown flag "${value}"`,
          type: 'error'
        })
        i++
        continue
      }

      // Check if flag requires a value
      if (FLAGS_REQUIRING_VALUE.has(value)) {
        if (i + 1 >= tokens.length || tokens[i + 1].value.startsWith('-')) {
          errors.push({
            row: token.row,
            column: token.column,
            endRow: token.endRow,
            endColumn: token.endColumn,
            text: `Flag "${value}" requires a value`,
            type: 'error'
          })
          i++
          continue
        }

        // Validate the value based on flag type
        const nextToken = tokens[i + 1]

        if (value === '-X' || value === '--request') {
          const method = nextToken.value.toUpperCase()
          if (!VALID_METHODS.has(method)) {
            errors.push({
              row: nextToken.row,
              column: nextToken.column,
              endRow: nextToken.endRow,
              endColumn: nextToken.endColumn,
              text: `Invalid HTTP method "${nextToken.value}". Valid: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS`,
              type: 'error'
            })
          }
        }

        if (value === '-H' || value === '--header') {
          if (!nextToken.value.includes(':')) {
            errors.push({
              row: nextToken.row,
              column: nextToken.column,
              endRow: nextToken.endRow,
              endColumn: nextToken.endColumn,
              text: `Header should be "Name: Value" format (missing colon)`,
              type: 'warning'
            })
          }
        }

        i += 2
        continue
      }

      i++
      continue
    }

    // Unknown token that's not a flag, URL, or curl command
    // Could be an orphan value
    i++
  }

  // Check if URL is present
  if (!hasUrl && tokens.length > 0) {
    // Find a good place to show this error (first non-curl token or start)
    const firstToken = tokens.find(t => t.value.toLowerCase() !== 'curl') || tokens[0]
    if (firstToken) {
      errors.push({
        row: firstToken.row,
        column: firstToken.column,
        endRow: firstToken.endRow,
        endColumn: firstToken.endColumn,
        text: 'Missing URL. A cURL command needs a URL.',
        type: 'error'
      })
    }
  }

  return errors
}

/**
 * Tokenize input and track positions, handling multi-line with backslash
 */
function tokenizeWithPositions(input) {
  const tokens = []
  let row = 0
  let col = 0
  let current = ''
  let tokenStartRow = 0
  let tokenStartCol = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  const pushToken = () => {
    if (current.trim()) {
      tokens.push({
        value: current.trim(),
        row: tokenStartRow,
        column: tokenStartCol,
        endRow: row,
        endColumn: col
      })
    }
    current = ''
  }

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const nextChar = input[i + 1]

    // Handle backslash line continuation
    if (char === '\\' && nextChar === '\n' && !inSingleQuote && !inDoubleQuote) {
      // Skip the backslash and newline - they're line continuation
      i++ // Skip newline
      row++
      col = 0
      continue
    }

    if (char === '\n') {
      if (!inSingleQuote && !inDoubleQuote) {
        pushToken()
      } else {
        current += char
      }
      row++
      col = 0
      continue
    }

    if (escaped) {
      current += char
      escaped = false
      col++
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true
      current += char
      col++
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      col++
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      col++
      continue
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      pushToken()
      col++
      continue
    }

    if (current === '') {
      tokenStartRow = row
      tokenStartCol = col
    }

    current += char
    col++
  }

  pushToken()
  return tokens
}

/**
 * Check for unclosed quotes
 */
function checkUnclosedQuotes(input, lines) {
  const errors = []
  let inSingleQuote = false
  let inDoubleQuote = false
  let singleQuoteStart = null
  let doubleQuoteStart = null
  let escaped = false

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row]
    for (let col = 0; col < line.length; col++) {
      const char = line[col]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        continue
      }

      if (char === "'" && !inDoubleQuote) {
        if (inSingleQuote) {
          inSingleQuote = false
          singleQuoteStart = null
        } else {
          inSingleQuote = true
          singleQuoteStart = { row, col }
        }
      }

      if (char === '"' && !inSingleQuote) {
        if (inDoubleQuote) {
          inDoubleQuote = false
          doubleQuoteStart = null
        } else {
          inDoubleQuote = true
          doubleQuoteStart = { row, col }
        }
      }
    }
  }

  if (inSingleQuote && singleQuoteStart) {
    errors.push({
      row: singleQuoteStart.row,
      column: singleQuoteStart.col,
      endRow: singleQuoteStart.row,
      endColumn: singleQuoteStart.col + 1,
      text: 'Unclosed single quote',
      type: 'error'
    })
  }

  if (inDoubleQuote && doubleQuoteStart) {
    errors.push({
      row: doubleQuoteStart.row,
      column: doubleQuoteStart.col,
      endRow: doubleQuoteStart.row,
      endColumn: doubleQuoteStart.col + 1,
      text: 'Unclosed double quote',
      type: 'error'
    })
  }

  return errors
}

/**
 * Check if string is a URL
 */
function isUrl(str) {
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return true
  }
  if (!str.startsWith('-') && str.includes('.') && !str.includes(' ')) {
    return true
  }
  if (str.startsWith('localhost') || str.match(/^127\.0\.0\.\d+/)) {
    return true
  }
  return false
}

/**
 * Find similar valid flag for typo suggestions
 */
function findSimilarFlag(input) {
  const inputLower = input.toLowerCase()
  let bestMatch = null
  let bestScore = 0

  for (const flag of VALID_FLAGS) {
    const score = similarity(inputLower, flag.toLowerCase())
    if (score > bestScore && score > 0.5) {
      bestScore = score
      bestMatch = flag
    }
  }

  return bestMatch
}

/**
 * Simple string similarity (Dice coefficient)
 */
function similarity(s1, s2) {
  if (s1 === s2) return 1
  if (s1.length < 2 || s2.length < 2) return 0

  const bigrams1 = new Set()
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2))
  }

  let matches = 0
  for (let i = 0; i < s2.length - 1; i++) {
    if (bigrams1.has(s2.substring(i, i + 2))) {
      matches++
    }
  }

  return (2 * matches) / (s1.length + s2.length - 2)
}

export default validateCurl
