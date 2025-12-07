<template>
  <div class="message-bubble response" :class="[statusClass, { flipped: showHeaders, maximized }]">
    <div class="card-container">
      <!-- Front face - Response Body -->
      <div class="card-face card-front">
        <div class="bubble-header">
          <div class="header-left">
            <div class="status-badge" :class="statusClass">
              {{ status }} {{ displayStatusText }}
            </div>
            <span class="meta">{{ formattedTime }} • {{ formattedSize }}</span>
          </div>
          <div class="header-right">
            <span class="timestamp">{{ formattedTimestamp }}</span>
            <button
              v-if="headersCount > 0"
              class="headers-flip-btn"
              @click="showHeaders = true"
              title="View response headers"
            >
              Headers ({{ headersCount }})
            </button>
            <button
              v-if="hasBody"
              class="download-btn"
              @click="downloadResponse"
              title="Download response"
            >
              ⤵
            </button>
            <button
              class="maximize-btn"
              @click="emit(maximized ? 'minimize' : 'maximize', message)"
              :title="maximized ? 'Restore' : 'Maximize'"
            >
              {{ maximized ? '⊖' : '⊕' }}
            </button>
          </div>
        </div>

        <!-- Network Error Display (only for status 0 / no response) -->
        <div v-if="isNetworkError" class="error-content">
          <span class="error-icon">⚠️</span>
          <span class="error-message">{{ errorMessage }}</span>
        </div>

        <!-- Response Body (show for all responses including 4xx/5xx) -->
        <div v-else class="response-body">
          <div class="body-preview" :class="{ expanded: bodyExpanded || maximized }">
            <component
              v-if="hasBody"
              :is="TextEditor"
              :model-value="formattedBody"
              :language="bodyLanguage"
              theme="dark"
              :readonly="true"
              :height="maximized ? '600px' : (bodyExpanded ? '400px' : '200px')"
              :options="{ ...editorDefaults.options, showGutter: true, highlightActiveLine: false }"
            />
            <div v-else class="no-body">No response body</div>
          </div>

          <button v-if="hasBody && !maximized" class="expand-btn" @click="toggleBody">
            {{ bodyExpanded ? 'Show less' : 'Show more' }}
          </button>
        </div>
      </div>

      <!-- Back face - Headers -->
      <div class="card-face card-back">
        <div class="bubble-header">
          <div class="header-left">
            <div class="status-badge" :class="statusClass">
              {{ status }} {{ displayStatusText }}
            </div>
            <span class="meta">Response Headers</span>
          </div>
          <div class="header-right">
            <span class="timestamp">{{ formattedTimestamp }}</span>
            <button
              class="headers-flip-btn active"
              @click="showHeaders = false"
              title="View response body"
            >
              Body
            </button>
            <button
              v-if="hasBody"
              class="download-btn"
              @click="downloadResponse"
              title="Download response"
            >
              ⤵
            </button>
            <button
              class="maximize-btn"
              @click="emit(maximized ? 'minimize' : 'maximize', message)"
              :title="maximized ? 'Restore' : 'Maximize'"
            >
              {{ maximized ? '⊖' : '⊕' }}
            </button>
          </div>
        </div>

        <div class="headers-list">
          <div v-for="(value, key) in headers" :key="key" class="kv-item">
            <span class="kv-key">{{ key }}:</span>
            <span class="kv-value">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../config/editors.js'

// Get the configured text editor (ACE)
const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()

// Complete HTTP status text mapping (RFC 9110 + common extensions)
const HTTP_STATUS_TEXT = {
  // 1xx Informational
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  // 3xx Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  // 4xx Client Errors
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a Teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Content',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  // 5xx Server Errors
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required'
}

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  maximized: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['maximize', 'minimize'])

const bodyExpanded = ref(false)
const showHeaders = ref(false)

const response = computed(() => props.message.data || {})

const status = computed(() => response.value.status || 0)
const statusText = computed(() => response.value.statusText || '')
const displayStatusText = computed(() => {
  // Use provided statusText, or fall back to lookup, or 'Unknown'
  if (statusText.value && statusText.value !== 'Unknown') return statusText.value
  return HTTP_STATUS_TEXT[status.value] || 'Unknown'
})
const isError = computed(() => !response.value.success || status.value === 0)
const isNetworkError = computed(() => status.value === 0) // Only for network failures, not 4xx/5xx
const errorMessage = computed(() => response.value.error || 'Request failed')

const statusClass = computed(() => {
  const s = status.value
  if (s === 0) return 'error'
  if (s >= 200 && s < 300) return 'success'
  if (s >= 300 && s < 400) return 'redirect'
  if (s >= 400 && s < 500) return 'client-error'
  if (s >= 500) return 'server-error'
  return ''
})

const headers = computed(() => response.value.headers || {})
const headersCount = computed(() => Object.keys(headers.value).length)

const body = computed(() => response.value.body)
const hasBody = computed(() => body.value !== null && body.value !== undefined)

// Max size to display in editor (500KB) - larger responses freeze the UI
const MAX_DISPLAY_SIZE = 500 * 1024
const bodySize = computed(() => {
  if (!hasBody.value) return 0
  const content = typeof body.value === 'string' ? body.value : JSON.stringify(body.value)
  return new Blob([content]).size
})
const isBodyTooLarge = computed(() => bodySize.value > MAX_DISPLAY_SIZE)

const formattedBody = computed(() => {
  if (!hasBody.value) return ''

  let content = ''
  if (typeof body.value === 'object') {
    try {
      content = JSON.stringify(body.value, null, 2)
    } catch {
      content = String(body.value)
    }
  } else if (typeof body.value === 'string') {
    try {
      content = JSON.stringify(JSON.parse(body.value), null, 2)
    } catch {
      content = body.value
    }
  } else {
    content = String(body.value)
  }

  // Truncate if too large to prevent UI freeze
  if (content.length > MAX_DISPLAY_SIZE) {
    const truncated = content.substring(0, MAX_DISPLAY_SIZE)
    const lastNewline = truncated.lastIndexOf('\n')
    return (lastNewline > 0 ? truncated.substring(0, lastNewline) : truncated) +
      '\n\n... [Response truncated - ' + formattedBodySize.value + ' total. Use download button to get full response]'
  }

  return content
})

const formattedBodySize = computed(() => {
  const size = bodySize.value
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
})

const bodyTruncated = computed(() => {
  return formattedBody.value.split('\n').length > 10
})

const bodyLanguage = computed(() => {
  const contentType = headers.value['content-type'] || ''

  if (contentType.includes('json')) return 'json'
  if (contentType.includes('html')) return 'html'
  if (contentType.includes('xml')) return 'xml'
  if (contentType.includes('javascript')) return 'javascript'

  // Try to detect from body
  const trimmed = formattedBody.value.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json'
  if (trimmed.startsWith('<')) return 'xml'

  return 'plaintext'
})

const formattedTime = computed(() => {
  const time = response.value.time
  if (!time && time !== 0) return ''
  if (time < 1000) return `${Math.round(time)}ms`
  return `${(time / 1000).toFixed(2)}s`
})

const formattedSize = computed(() => {
  const size = response.value.size
  if (!size && size !== 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
})

const formattedTimestamp = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function toggleBody() {
  bodyExpanded.value = !bodyExpanded.value
}

function downloadResponse() {
  if (!hasBody.value) return

  // Determine file extension from content type
  const contentType = headers.value['content-type'] || ''
  let extension = 'txt'
  let mimeType = 'text/plain'

  if (contentType.includes('json')) {
    extension = 'json'
    mimeType = 'application/json'
  } else if (contentType.includes('html')) {
    extension = 'html'
    mimeType = 'text/html'
  } else if (contentType.includes('xml')) {
    extension = 'xml'
    mimeType = 'application/xml'
  }

  // Create blob and download - use raw body, not truncated version
  let content = ''
  if (typeof body.value === 'object') {
    content = JSON.stringify(body.value, null, 2)
  } else {
    content = String(body.value)
  }
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `response-${timestamp}.${extension}`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.message-bubble.response {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  margin-right: auto;
  perspective: 1000px;
}

/* When maximized (rendered in overlay), take full width */
.message-bubble.response.maximized {
  width: 100%;
  max-width: 100%;
}

.card-container {
  position: relative;
  width: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.message-bubble.response.flipped .card-container {
  transform: rotateY(180deg);
}

.card-face {
  background: var(--chat-response-bg, var(--color-bg-secondary));
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-front {
  position: relative;
}

.card-back {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transform: rotateY(180deg);
  min-height: 100%;
}

.bubble-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.success {
  background: var(--color-status-success-bg, rgba(34, 197, 94, 0.2));
  color: var(--color-get, #22c55e);
}

.status-badge.redirect {
  background: var(--color-status-redirect-bg, rgba(59, 130, 246, 0.2));
  color: #3b82f6;
}

.status-badge.client-error,
.status-badge.server-error,
.status-badge.error {
  background: var(--color-status-client-error-bg, rgba(239, 68, 68, 0.2));
  color: var(--color-delete, #ef4444);
}

.meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.timestamp {
  font-size: 11px;
  color: var(--color-text-muted);
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: var(--color-status-client-error-bg, rgba(239, 68, 68, 0.1));
  border-radius: 8px;
}

.error-icon {
  font-size: 16px;
}

.error-message {
  color: var(--color-delete, #ef4444);
  font-size: 13px;
}

.response-body {
  margin-top: 12px;
}

.body-preview {
  background: var(--color-bg-primary);
  border-radius: 8px;
  overflow: hidden;
}

.body-preview:not(.expanded) {
  max-height: 300px;
  overflow: hidden;
  position: relative;
}

/* When maximized, remove max-height constraint */
.message-bubble.response.maximized .body-preview {
  max-height: none;
}

.body-preview:not(.expanded)::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(transparent, var(--color-bg-primary));
  pointer-events: none;
}

.body-preview.expanded::after {
  display: none;
}

.no-body {
  padding: 12px;
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 13px;
}

.expand-btn {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.expand-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.bubble-section {
  margin-top: 12px;
  border-top: 1px solid var(--color-border-light);
  padding-top: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  user-select: none;
}

.section-header:hover {
  color: var(--color-text-primary);
}

.toggle-icon {
  font-weight: bold;
}

.section-content {
  margin-top: 8px;
  padding-left: 8px;
}

.kv-item {
  font-size: 12px;
  margin-bottom: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.kv-key {
  color: var(--color-text-secondary);
}

.kv-value {
  color: var(--color-text-primary);
  margin-left: 4px;
  word-break: break-all;
}

/* Flip button */
.headers-flip-btn {
  padding: 4px 10px;
  font-size: 11px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.headers-flip-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}

.headers-flip-btn.active {
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border-color: var(--color-text-primary);
}

/* Headers list on back of card */
.headers-list {
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  background: var(--color-bg-primary);
  border-radius: 8px;
}

/* When maximized, allow more space for headers */
.message-bubble.response.maximized .headers-list {
  max-height: 600px;
}

.headers-list .kv-item {
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.headers-list .kv-item:last-child {
  border-bottom: none;
}

/* Maximize button */
.maximize-btn {
  padding: 4px 8px;
  font-size: 14px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  line-height: 1;
}

.maximize-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}

/* Download button */
.download-btn {
  padding: 4px 8px;
  font-size: 14px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  line-height: 1;
}

.download-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .message-bubble.response {
    width: 100%;
    max-width: 100%;
    margin-right: 0;
  }
}
</style>
