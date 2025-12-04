/**
 * Custom ACE Editor mode for cURL syntax highlighting
 *
 * Provides syntax highlighting for:
 * - HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - Flags (-X, -H, -d, --header, --data, etc.)
 * - URLs (http:// and https://)
 * - Strings (single and double quoted)
 * - Template variables ({{variable}})
 * - Header names (before colon)
 * - Escape sequences in strings
 */

// Wait for ACE to be available
export function initCurlMode() {
  if (!window.ace) {
    console.warn('ACE not loaded, cannot initialize curl mode')
    return
  }

  const ace = window.ace

  // Define the highlight rules
  ace.define('ace/mode/curl_highlight_rules', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function(require, exports, module) {
    const oop = require('ace/lib/oop')
    const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules

    const CurlHighlightRules = function() {
      this.$rules = {
        start: [
          // Template variables {{var}} - highest priority
          {
            token: 'variable.language',
            regex: /\{\{[^}]+\}\}/
          },

          // HTTP Methods - standalone words
          {
            token: 'keyword.control',
            regex: /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)\b/
          },

          // Long flags (--header, --data, --data-raw, etc.)
          {
            token: 'keyword.operator',
            regex: /--[a-z][a-z0-9-]*/
          },

          // Short flags (-H, -X, -d, etc.)
          {
            token: 'keyword.operator',
            regex: /-[A-Za-z]\b/
          },

          // URLs (http:// or https://) - before strings to catch unquoted URLs
          {
            token: 'string.other',
            regex: /https?:\/\/[^\s'"]+/
          },

          // Double-quoted strings - transition to qqstring state
          {
            token: 'string.quoted.double',
            regex: /"/,
            next: 'qqstring'
          },

          // Single-quoted strings - transition to qstring state
          {
            token: 'string.quoted.single',
            regex: /'/,
            next: 'qstring'
          },

          // Header names (word followed by colon)
          {
            token: 'support.type',
            regex: /[A-Za-z][A-Za-z0-9-]*(?=\s*:)/
          },

          // Numbers
          {
            token: 'constant.numeric',
            regex: /\b\d+\b/
          },

          // Line continuation (backslash at end of line)
          {
            token: 'keyword.operator',
            regex: /\\$/
          },

          // Comments (bash style)
          {
            token: 'comment.line',
            regex: /#.*/
          }
        ],

        // Double-quoted string state
        qqstring: [
          // Variables inside strings
          {
            token: 'variable.language',
            regex: /\{\{[^}]+\}\}/
          },
          // Escape sequences
          {
            token: 'constant.character.escape',
            regex: /\\./
          },
          // End of string
          {
            token: 'string.quoted.double',
            regex: /"/,
            next: 'start'
          },
          // String content
          {
            defaultToken: 'string.quoted.double'
          }
        ],

        // Single-quoted string state
        qstring: [
          // Variables inside strings
          {
            token: 'variable.language',
            regex: /\{\{[^}]+\}\}/
          },
          // Escape sequences (less common in single quotes but still valid)
          {
            token: 'constant.character.escape',
            regex: /\\./
          },
          // End of string
          {
            token: 'string.quoted.single',
            regex: /'/,
            next: 'start'
          },
          // String content
          {
            defaultToken: 'string.quoted.single'
          }
        ]
      }

      this.normalizeRules()
    }

    oop.inherits(CurlHighlightRules, TextHighlightRules)
    exports.CurlHighlightRules = CurlHighlightRules
  })

  // Define the mode
  ace.define('ace/mode/curl', ['require', 'exports', 'module', 'ace/lib/oop', 'ace/mode/text', 'ace/mode/curl_highlight_rules'], function(require, exports, module) {
    const oop = require('ace/lib/oop')
    const TextMode = require('ace/mode/text').Mode
    const CurlHighlightRules = require('ace/mode/curl_highlight_rules').CurlHighlightRules

    const Mode = function() {
      this.HighlightRules = CurlHighlightRules
      this.$behaviour = this.$defaultBehaviour
    }

    oop.inherits(Mode, TextMode)

    ;(function() {
      this.lineCommentStart = '#'
      this.$id = 'ace/mode/curl'
    }).call(Mode.prototype)

    exports.Mode = Mode
  })

  console.debug('ACE curl mode initialized')
}

// Auto-initialize when imported if ACE is already loaded
if (typeof window !== 'undefined' && window.ace) {
  initCurlMode()
}
