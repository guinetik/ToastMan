<template>
  <div class="message-bubble request">
    <div class="bubble-header">
      <div class="method-badge" :style="{ backgroundColor: methodColor }">
        {{ method }}
      </div>
      <span class="url">{{ displayUrl }}</span>
      <span class="timestamp">{{ formattedTime }}</span>
    </div>

    <!-- Always visible summary -->
    <div class="bubble-summary">
      <!-- Headers Preview -->
      <div v-if="headers.length > 0" class="summary-row">
        <span class="summary-label">Headers</span>
        <span class="summary-badge">{{ headers.length }}</span>
        <span class="summary-preview">{{ headersPreview }}</span>
      </div>

      <!-- Body Preview -->
      <div v-if="hasBody" class="summary-row">
        <span class="summary-label">Body</span>
        <span class="summary-badge">{{ bodyMode }}</span>
        <span class="summary-preview">{{ bodyPreview }}</span>
      </div>
    </div>

    <div v-if="expanded" class="bubble-details">
      <!-- Headers Section -->
      <div v-if="headers.length > 0" class="bubble-section">
        <div class="section-header" @click="toggleSection('headers')">
          <span>Headers ({{ headers.length }})</span>
          <span class="toggle-icon">{{ sectionsOpen.headers ? '−' : '+' }}</span>
        </div>
        <div v-if="sectionsOpen.headers" class="section-content">
          <div v-for="header in headers" :key="header.key" class="kv-item">
            <span class="kv-key">{{ header.key }}:</span>
            <span class="kv-value">{{ header.value }}</span>
          </div>
        </div>
      </div>

      <!-- Body Section -->
      <div v-if="hasBody" class="bubble-section">
        <div class="section-header" @click="toggleSection('body')">
          <span>Body</span>
          <span class="toggle-icon">{{ sectionsOpen.body ? '−' : '+' }}</span>
        </div>
        <div v-if="sectionsOpen.body" class="section-content">
          <pre class="body-content">{{ formattedBody }}</pre>
        </div>
      </div>

      <!-- cURL Section -->
      <div class="bubble-section curl-section">
        <div class="section-header" @click="toggleSection('curl')">
          <span>cURL</span>
          <span class="toggle-icon">{{ sectionsOpen.curl ? '−' : '+' }}</span>
        </div>
        <div v-if="sectionsOpen.curl" class="section-content">
          <pre class="curl-content">{{ curl }}</pre>
          <button class="copy-btn" @click="copyCurl">Copy</button>
        </div>
      </div>
    </div>

    <div class="bubble-actions">
      <button class="action-btn" @click="toggleExpanded" :title="expanded ? 'Collapse' : 'Expand'">
        {{ expanded ? '▲' : '▼' }}
      </button>
      <button class="action-btn" @click="$emit('edit')" title="Edit">
        Edit
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVariableInterpolation } from '../../composables/useVariableInterpolation.js'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit'])

// Get interpolation utilities
const { interpolateText } = useVariableInterpolation()

const expanded = ref(false)
const sectionsOpen = ref({
  headers: false,
  body: true,
  curl: false
})

const request = computed(() => props.message.data?.request || {})
const curl = computed(() => props.message.data?.curl || '')

const method = computed(() => request.value.method || 'GET')
const url = computed(() => {
  const urlObj = request.value.url
  if (!urlObj) return ''
  if (typeof urlObj === 'string') return urlObj
  return urlObj.raw || ''
})

// Interpolate URL to resolve environment variables
const resolvedUrl = computed(() => interpolateText(url.value))

const displayUrl = computed(() => {
  const fullUrl = resolvedUrl.value
  if (fullUrl.length > 60) {
    return fullUrl.substring(0, 60) + '...'
  }
  return fullUrl
})

const headers = computed(() => {
  return (request.value.header || []).filter(h => h.enabled !== false && h.key)
})

const hasBody = computed(() => {
  const body = request.value.body
  if (!body || body.mode === 'none') return false
  if (body.mode === 'raw') return !!body.raw
  if (body.mode === 'formdata') return (body.formdata || []).length > 0
  if (body.mode === 'urlencoded') return (body.urlencoded || []).length > 0
  return false
})

const bodyMode = computed(() => {
  const body = request.value.body
  if (!body || body.mode === 'none') return ''
  const modes = {
    'raw': 'JSON',
    'formdata': 'Form',
    'urlencoded': 'URL'
  }
  return modes[body.mode] || body.mode
})

const headersPreview = computed(() => {
  if (headers.value.length === 0) return ''
  const first = headers.value[0]
  const preview = `${first.key}: ${first.value}`
  if (preview.length > 40) return preview.substring(0, 40) + '...'
  if (headers.value.length > 1) return preview + ` +${headers.value.length - 1}`
  return preview
})

const bodyPreview = computed(() => {
  const body = request.value.body
  if (!body) return ''

  if (body.mode === 'raw') {
    const raw = body.raw || ''
    if (raw.length > 50) return raw.substring(0, 50) + '...'
    return raw
  }

  if (body.mode === 'formdata') {
    const fields = (body.formdata || []).filter(f => f.enabled !== false)
    if (fields.length === 0) return ''
    return `${fields.length} field${fields.length > 1 ? 's' : ''}`
  }

  if (body.mode === 'urlencoded') {
    const fields = (body.urlencoded || []).filter(f => f.enabled !== false)
    if (fields.length === 0) return ''
    return `${fields.length} field${fields.length > 1 ? 's' : ''}`
  }

  return ''
})

const formattedBody = computed(() => {
  const body = request.value.body
  if (!body) return ''

  if (body.mode === 'raw') {
    try {
      return JSON.stringify(JSON.parse(body.raw), null, 2)
    } catch {
      return body.raw
    }
  }

  if (body.mode === 'formdata') {
    return (body.formdata || [])
      .filter(f => f.enabled !== false)
      .map(f => `${f.key}=${f.value}`)
      .join('\n')
  }

  if (body.mode === 'urlencoded') {
    return (body.urlencoded || [])
      .filter(f => f.enabled !== false)
      .map(f => `${f.key}=${f.value}`)
      .join('&')
  }

  return ''
})

const methodColor = computed(() => {
  const colors = {
    'GET': 'var(--color-get)',
    'POST': 'var(--color-post)',
    'PUT': 'var(--color-put)',
    'PATCH': 'var(--color-patch)',
    'DELETE': 'var(--color-delete)'
  }
  return colors[method.value] || 'var(--color-text-secondary)'
})

const formattedTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

function toggleSection(section) {
  sectionsOpen.value[section] = !sectionsOpen.value[section]
}

function copyCurl() {
  navigator.clipboard.writeText(curl.value)
}
</script>

<style scoped>
.message-bubble.request {
  align-self: flex-end;
  width: 30%;
  max-width: 30%;
  background: var(--chat-request-bg, var(--color-bg-tertiary));
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-left: auto;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
}

.url {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: var(--color-text-primary);
  word-break: break-all;
}

.timestamp {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-muted);
}

.bubble-details {
  margin-top: 12px;
  border-top: 1px solid var(--color-border-light);
  padding-top: 12px;
}

.bubble-section {
  margin-top: 8px;
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
}

.body-content,
.curl-content {
  background: var(--color-bg-primary);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Monaco', 'Menlo', monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.curl-section .section-content {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 8px;
  font-size: 10px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.copy-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.action-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Summary Section - Always visible */
.bubble-summary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-light);
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.summary-label {
  color: var(--color-text-muted);
  min-width: 50px;
  font-weight: 500;
}

.summary-badge {
  padding: 1px 6px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.summary-preview {
  flex: 1;
  color: var(--color-text-secondary);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .message-bubble.request {
    width: 100%;
    max-width: 100%;
    margin-left: 0;
  }
}
</style>
