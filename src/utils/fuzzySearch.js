/**
 * Fuzzy Search Utility
 *
 * fzf-style subsequence matching with scoring for filtering requests.
 * Characters must appear in order but not consecutively.
 *
 * Example: "gu" matches "getUsers" (g...U) with high score
 *          "gu" matches "debugging" with lower score (larger gaps)
 */

// Scoring constants
const SCORE_CONSECUTIVE = 16    // Bonus for consecutive character matches
const SCORE_WORD_BOUNDARY = 32  // Bonus for matching at word boundary (camelCase, -, _, /)
const SCORE_START = 48          // Bonus for matching at start of string
const PENALTY_GAP = 4           // Penalty per character gap between matches

/**
 * Check if a character is a word boundary
 * @param {string} text - The full text
 * @param {number} index - Position to check
 * @returns {boolean}
 */
function isWordBoundary(text, index) {
  if (index === 0) return true

  const char = text[index]
  const prevChar = text[index - 1]

  // camelCase boundary: lowercase followed by uppercase
  if (prevChar === prevChar.toLowerCase() && char === char.toUpperCase() && char !== char.toLowerCase()) {
    return true
  }

  // After separator: -, _, /, .
  if (['-', '_', '/', '.', ' '].includes(prevChar)) {
    return true
  }

  return false
}

/**
 * Fuzzy match a query against text with scoring
 * @param {string} query - The search query
 * @param {string} text - The text to search in
 * @returns {{ match: boolean, score: number }}
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) {
    return { match: !query, score: 0 }
  }

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  // Quick check: all query chars must exist in text
  for (const char of queryLower) {
    if (!textLower.includes(char)) {
      return { match: false, score: 0 }
    }
  }

  // Find best match using greedy algorithm with lookahead
  let score = 0
  let queryIndex = 0
  let lastMatchIndex = -1
  let consecutiveMatches = 0

  for (let textIndex = 0; textIndex < text.length && queryIndex < query.length; textIndex++) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      // Character match found
      let charScore = 0

      // Start of string bonus
      if (textIndex === 0) {
        charScore += SCORE_START
      }

      // Word boundary bonus
      if (isWordBoundary(text, textIndex)) {
        charScore += SCORE_WORD_BOUNDARY
      }

      // Consecutive match bonus
      if (lastMatchIndex === textIndex - 1) {
        consecutiveMatches++
        charScore += SCORE_CONSECUTIVE * consecutiveMatches
      } else {
        consecutiveMatches = 1
        // Gap penalty (only if not first match)
        if (lastMatchIndex >= 0) {
          const gap = textIndex - lastMatchIndex - 1
          charScore -= PENALTY_GAP * gap
        }
      }

      score += charScore
      lastMatchIndex = textIndex
      queryIndex++
    }
  }

  // Did we match all query characters?
  const match = queryIndex === query.length

  // Normalize score by query length to make scores comparable
  if (match && query.length > 0) {
    score = score / query.length
  }

  return { match, score: match ? score : 0 }
}

/**
 * Fuzzy match a query against a request (name, URL, method)
 * @param {string} query - The search query
 * @param {object} request - Request object with name, url, method
 * @returns {{ match: boolean, score: number }}
 */
export function fuzzyMatchRequest(query, request) {
  if (!query) {
    return { match: true, score: 0 }
  }

  const name = request.name || ''
  const url = typeof request.url === 'string'
    ? request.url
    : request.url?.raw || ''
  const method = request.method || ''

  // Match against each field with different weights
  const nameResult = fuzzyMatch(query, name)
  const urlResult = fuzzyMatch(query, url)
  const methodResult = fuzzyMatch(query, method)

  // Apply field weights
  const nameScore = nameResult.score
  const urlScore = urlResult.score * 0.8
  const methodScore = methodResult.score * 0.6

  // Match if any field matches, use best score
  const match = nameResult.match || urlResult.match || methodResult.match
  const score = Math.max(nameScore, urlScore, methodScore)

  return { match, score }
}

/**
 * Fuzzy match a query against a folder name
 * @param {string} query - The search query
 * @param {object} folder - Folder object with name
 * @returns {{ match: boolean, score: number }}
 */
export function fuzzyMatchFolder(query, folder) {
  if (!query) {
    return { match: true, score: 0 }
  }

  return fuzzyMatch(query, folder.name || '')
}

export default {
  fuzzyMatch,
  fuzzyMatchRequest,
  fuzzyMatchFolder
}
