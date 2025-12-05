<template>
  <div class="chat-composer">
    <!-- Mode Tabs -->
    <div class="composer-tabs">
      <button
        class="tab-btn"
        :class="{ active: mode === 'curl' }"
        @click="setMode('curl')"
      >
        cURL
      </button>
      <button
        class="tab-btn"
        :class="{ active: mode === 'visual' }"
        @click="setMode('visual')"
      >
        Visual
      </button>
      <button
        class="tab-btn"
        :class="{ active: mode === 'script', 'has-script': hasScript }"
        @click="setMode('script')"
      >
        Script
        <span v-if="hasScript" class="script-dot"></span>
      </button>
    </div>

    <!-- cURL Mode -->
    <div v-if="mode === 'curl'" class="curl-input-container">
      <div class="curl-toolbar">
        <button
          class="curl-format-btn"
          :class="{ active: curlBeautified }"
          @click="toggleCurlFormat"
          :title="curlBeautified ? 'Minify cURL (single line)' : 'Beautify cURL (multi-line)'"
        >
          {{ curlBeautified ? '⊟ Minify' : '⊞ Beautify' }}
        </button>
      </div>
      <component
        :is="TextEditor"
        ref="curlInputRef"
        v-model="curlInput"
        language="curl"
        theme="dark"
        height="100%"
        placeholder="Paste cURL: https://api.example.com -X POST -H 'Content-Type: application/json'"
        :options="{ showGutter: true, wrap: !curlBeautified, fontSize: 13, showLineNumbers: false, showFoldWidgets: false }"
        @send="send"
      />
    </div>

    <!-- Visual Mode -->
    <div v-else-if="mode === 'visual'" class="visual-input-container">
      <div class="url-row">
        <select v-model="method" class="method-select" :style="{ color: methodColor }">
          <option v-for="m in httpMethods" :key="m" :value="m">{{ m }}</option>
        </select>
        <VariableHighlightInput
          v-model="url"
          class="url-input"
          placeholder="https://api.example.com/endpoint"
          @keydown.enter="send"
        />
      </div>

      <!-- Visual Sub-tabs -->
      <div class="visual-tabs">
        <button
          class="visual-tab-btn"
          :class="{ active: activeTab === 'params' }"
          @click="activeTab = 'params'"
        >
          Params
          <span v-if="enabledParamsCount > 0" class="badge">{{ enabledParamsCount }}</span>
        </button>
        <button
          class="visual-tab-btn"
          :class="{ active: activeTab === 'headers' }"
          @click="activeTab = 'headers'"
        >
          Headers
          <span v-if="enabledHeadersCount > 0" class="badge">{{ enabledHeadersCount }}</span>
        </button>
        <button
          class="visual-tab-btn"
          :class="{ active: activeTab === 'body' }"
          @click="activeTab = 'body'"
        >
          Body
        </button>
        <button
          class="visual-tab-btn"
          :class="{ active: activeTab === 'auth' }"
          @click="activeTab = 'auth'"
        >
          Auth
          <span v-if="auth.type !== 'none'" class="auth-dot"></span>
        </button>
      </div>

      <!-- Options Panel -->
      <div class="visual-panel">
        <!-- Params Tab -->
        <div v-if="activeTab === 'params'" class="kv-editor">
          <div v-for="(param, index) in params" :key="param.id" class="kv-row">
            <input type="checkbox" v-model="param.enabled" />
            <input v-model="param.key" placeholder="Key" class="kv-input" />
            <VariableHighlightInput v-model="param.value" placeholder="Value" class="kv-input" />
            <button class="remove-btn" @click="removeParam(index)">×</button>
          </div>
          <button class="add-btn" @click="addParam">+ Add Param</button>
        </div>

        <!-- Headers Tab -->
        <div v-if="activeTab === 'headers'" class="kv-editor">
          <div v-for="(header, index) in headers" :key="header.id" class="kv-row">
            <input type="checkbox" v-model="header.enabled" />
            <input v-model="header.key" placeholder="Key" class="kv-input" />
            <VariableHighlightInput v-model="header.value" placeholder="Value" class="kv-input" />
            <button class="remove-btn" @click="removeHeader(index)">×</button>
          </div>
          <button class="add-btn" @click="addHeader">+ Add Header</button>
        </div>

        <!-- Body Tab -->
        <div v-if="activeTab === 'body'" class="body-editor">
          <div class="body-mode-selector">
            <label v-for="bm in bodyModes" :key="bm.value">
              <input type="radio" v-model="body.mode" :value="bm.value" />
              {{ bm.label }}
            </label>
            <!-- Raw type selector -->
            <select v-if="body.mode === 'raw'" v-model="rawType" class="raw-type-select">
              <option v-for="rt in rawTypes" :key="rt.value" :value="rt.value">
                {{ rt.label }}
              </option>
            </select>
          </div>

          <div v-if="body.mode === 'raw'" class="body-raw-editor">
            <component
              :is="TextEditor"
              v-model="body.raw"
              :language="rawEditorMode"
              :theme="editorDefaults.theme"
              :options="editorDefaults.options"
              height="100%"
              placeholder='{"key": "value"}'
            />
          </div>

          <div v-else-if="body.mode === 'formdata'" class="kv-editor">
            <div v-for="(field, index) in body.formData" :key="field.id" class="kv-row">
              <input type="checkbox" v-model="field.enabled" />
              <input v-model="field.key" placeholder="Key" class="kv-input" />
              <VariableHighlightInput v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeFormData(index)">×</button>
            </div>
            <button class="add-btn" @click="addFormData">+ Add Field</button>
          </div>

          <div v-else-if="body.mode === 'urlencoded'" class="kv-editor">
            <div v-for="(field, index) in body.urlEncoded" :key="field.id" class="kv-row">
              <input type="checkbox" v-model="field.enabled" />
              <input v-model="field.key" placeholder="Key" class="kv-input" />
              <VariableHighlightInput v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeUrlEncoded(index)">×</button>
            </div>
            <button class="add-btn" @click="addUrlEncoded">+ Add Field</button>
          </div>
        </div>

        <!-- Auth Tab -->
        <div v-if="activeTab === 'auth'" class="auth-editor">
          <div class="auth-type-row">
            <label class="auth-label">Type</label>
            <select v-model="auth.type" class="auth-select">
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>
          </div>

          <!-- Bearer Token -->
          <div v-if="auth.type === 'bearer'" class="auth-fields">
            <div class="auth-field">
              <label class="auth-label">Token</label>
              <VariableHighlightInput
                v-model="auth.bearer.token"
                placeholder="Enter bearer token (e.g., eyJhbGciOi...)"
              />
            </div>
            <div class="auth-hint">
              <code>-H 'Authorization: Bearer &lt;token&gt;'</code>
            </div>
          </div>

          <!-- Basic Auth -->
          <div v-if="auth.type === 'basic'" class="auth-fields">
            <div class="auth-field">
              <label class="auth-label">Username</label>
              <input v-model="auth.basic.username" class="auth-input" placeholder="Username" />
            </div>
            <div class="auth-field">
              <label class="auth-label">Password</label>
              <input v-model="auth.basic.password" type="password" class="auth-input" placeholder="Password" />
            </div>
            <div class="auth-hint">
              <code>-u '&lt;username&gt;:&lt;password&gt;'</code>
            </div>
          </div>

          <!-- API Key -->
          <div v-if="auth.type === 'apikey'" class="auth-fields">
            <div class="auth-field">
              <label class="auth-label">Key</label>
              <input v-model="auth.apikey.key" class="auth-input" placeholder="Header name (e.g., X-API-Key)" />
            </div>
            <div class="auth-field">
              <label class="auth-label">Value</label>
              <VariableHighlightInput
                v-model="auth.apikey.value"
                placeholder="API key value"
              />
            </div>
            <div class="auth-field">
              <label class="auth-label">Add to</label>
              <div class="auth-radio-group">
                <label>
                  <input type="radio" v-model="auth.apikey.in" value="header" />
                  Header
                </label>
                <label>
                  <input type="radio" v-model="auth.apikey.in" value="query" />
                  Query Param
                </label>
              </div>
            </div>
            <div class="auth-hint">
              <code v-if="auth.apikey.in === 'header'">-H '{{ auth.apikey.key || 'X-API-Key' }}: &lt;value&gt;'</code>
              <code v-else>?{{ auth.apikey.key || 'api_key' }}=&lt;value&gt;</code>
            </div>
          </div>

          <!-- No Auth Message -->
          <div v-if="auth.type === 'none'" class="auth-empty">
            <p>This request does not use any authentication.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Script Mode -->
    <div v-else-if="mode === 'script'" class="script-input-container">
      <div class="script-header">
        <div class="script-type-selector">
          <select v-model="scriptType" class="script-type-select">
            <option value="test">Post-Request Script</option>
            <option value="prerequest">Pre-Request Script</option>
          </select>
          <span v-if="scriptType === 'prerequest'" class="prerequest-warning">
            Pre-request scripts are stored but not executed
          </span>
        </div>
        <div class="script-actions">
          <select v-model="selectedSnippet" @change="insertSnippet" class="snippet-select">
            <option value="">Insert Snippet...</option>
            <optgroup v-for="(categorySnippets, category) in snippetsByCategory" :key="category" :label="category">
              <option v-for="snippet in categorySnippets" :key="snippet.name" :value="snippet.name">
                {{ snippet.name }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <div class="script-editor-container">
        <component
          :is="TextEditor"
          ref="scriptEditorRef"
          v-model="script.postRequest"
          language="javascript"
          :theme="editorDefaults.theme"
          height="100%"
          placeholder="// Write your post-request script here&#10;// Example: pm.test('Status is 200', function() {&#10;//   pm.expect(pm.response.code).to.equal(200);&#10;// });"
          :options="{ showGutter: true, wrap: true, fontSize: 12 }"
        />
      </div>

      <div class="script-help">
        <details>
          <summary>Available APIs</summary>
          <div class="api-list">
            <code>pm.response.code</code> - Status code<br>
            <code>pm.response.json()</code> - Parse body as JSON<br>
            <code>pm.response.text()</code> - Raw body text<br>
            <code>pm.response.responseTime</code> - Duration in ms<br>
            <code>pm.response.headers.get(name)</code> - Get header<br>
            <code>pm.environment.get(key)</code> - Get env variable<br>
            <code>pm.environment.set(key, value)</code> - Set env variable<br>
            <code>pm.test(name, fn)</code> - Run test assertion<br>
            <code>pm.expect(value)</code> - Chai-like assertions<br>
            <code>console.log(...)</code> - Log output
          </div>
        </details>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="composer-actions">
      <button
        v-if="canSave"
        class="save-btn"
        @click="save"
        title="Save to collection"
      >
        Save
      </button>
      <button
        class="send-btn"
        :disabled="isLoading || !canSend"
        @click="send"
      >
        <span v-if="isLoading" class="loading-spinner"></span>
        <span v-else>Send</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../config/editors.js'
import VariableHighlightInput from '../VariableHighlightInput.vue'
import { getSnippetsByCategory, findSnippet } from '../../core/scripting/snippets.js'

// Get the configured text editor (ACE)
const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()

// Script snippets
const snippetsByCategory = getSnippetsByCategory()

const props = defineProps({
  controller: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['send', 'save', 'mode-change'])

// Local state that syncs with controller
const mode = ref(props.controller.state.composerMode)
const curlInput = ref(props.controller.state.curlInput)
const method = ref(props.controller.state.method)
const url = ref(props.controller.state.url)
const headers = ref(props.controller.state.headers)
const params = ref(props.controller.state.params)
const body = ref(props.controller.state.body)
const auth = ref(props.controller.state.auth || {
  type: 'none',
  bearer: { token: '' },
  basic: { username: '', password: '' },
  apikey: { key: 'X-API-Key', value: '', in: 'header' }
})
const script = ref(props.controller.state.script || {
  preRequest: '',
  postRequest: ''
})
const activeTab = ref('params')
const scriptType = ref('test')
const selectedSnippet = ref('')

const curlInputRef = ref(null)
const scriptEditorRef = ref(null)
const curlBeautified = ref(false)

const isLoading = computed(() => props.controller.state.isLoading)

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const bodyModes = [
  { value: 'none', label: 'None' },
  { value: 'raw', label: 'Raw' },
  { value: 'formdata', label: 'Form Data' },
  { value: 'urlencoded', label: 'URL Encoded' }
]

const rawTypes = [
  { value: 'json', label: 'JSON', mode: 'json' },
  { value: 'xml', label: 'XML', mode: 'xml' },
  { value: 'html', label: 'HTML', mode: 'html' },
  { value: 'text', label: 'Text', mode: 'text' }
]

const rawType = ref('json')
const rawEditorMode = computed(() => {
  const found = rawTypes.find(t => t.value === rawType.value)
  return found?.mode || 'text'
})

const methodColor = computed(() => props.controller.getMethodColor(method.value))

const enabledParamsCount = computed(() =>
  params.value.filter(p => p.enabled && p.key).length
)

const enabledHeadersCount = computed(() =>
  headers.value.filter(h => h.enabled && h.key).length
)

const canSend = computed(() => {
  if (mode.value === 'curl') {
    return curlInput.value.trim().length > 0
  }
  return url.value.trim().length > 0
})

const canSave = computed(() => {
  // Can save if we have a collection context (loaded from collection)
  return props.controller.state.currentRequestId &&
         props.controller.state.currentCollectionId
})

const hasScript = computed(() => {
  return (script.value.postRequest && script.value.postRequest.trim().length > 0) ||
         (script.value.preRequest && script.value.preRequest.trim().length > 0)
})

// Sync local state to controller
watch(mode, (val) => props.controller.setComposerMode(val))
watch(curlInput, (val) => props.controller.setCurlInput(val))
watch(method, (val) => props.controller.updateField('method', val))
watch(url, (val) => props.controller.updateField('url', val))
watch(headers, (val) => props.controller.updateField('headers', val), { deep: true })
watch(params, (val) => props.controller.updateField('params', val), { deep: true })
watch(body, (val) => props.controller.updateField('body', val), { deep: true })
watch(auth, (val) => props.controller.updateField('auth', val), { deep: true })
watch(script, (val) => props.controller.updateField('script', val), { deep: true })

// Sync controller state to local (for when controller loads a request)
watch(() => props.controller.state.composerMode, (val) => { mode.value = val })
watch(() => props.controller.state.curlInput, (val) => { curlInput.value = val })
watch(() => props.controller.state.method, (val) => { method.value = val })
watch(() => props.controller.state.url, (val) => { url.value = val })
watch(() => props.controller.state.headers, (val) => { headers.value = val }, { deep: true })
watch(() => props.controller.state.params, (val) => { params.value = val }, { deep: true })
watch(() => props.controller.state.body, (val) => { body.value = val }, { deep: true })
watch(() => props.controller.state.auth, (val) => {
  if (val) auth.value = val
}, { deep: true })
watch(() => props.controller.state.script, (val) => {
  if (val) script.value = val
}, { deep: true })

function setMode(m) {
  mode.value = m
  emit('mode-change', m)
}

function addParam() {
  params.value.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeParam(index) {
  params.value.splice(index, 1)
}

function addHeader() {
  headers.value.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeHeader(index) {
  headers.value.splice(index, 1)
}

function addFormData() {
  body.value.formData.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeFormData(index) {
  body.value.formData.splice(index, 1)
}

function addUrlEncoded() {
  body.value.urlEncoded.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeUrlEncoded(index) {
  body.value.urlEncoded.splice(index, 1)
}

function send() {
  if (!canSend.value || isLoading.value) return
  emit('send')
}

function save() {
  if (!canSave.value) return
  emit('save')
}

function insertSnippet() {
  if (!selectedSnippet.value) return

  const snippet = findSnippet(selectedSnippet.value)
  if (snippet) {
    // Insert the snippet code into the current script
    const currentScript = script.value.postRequest || ''
    const separator = currentScript.trim() ? '\n\n' : ''
    script.value.postRequest = currentScript + separator + snippet.code
  }

  // Reset the dropdown
  selectedSnippet.value = ''
}

/**
 * Toggle cURL format between beautified (multi-line) and minified (single line)
 */
function toggleCurlFormat() {
  if (curlBeautified.value) {
    // Minify: remove line continuations and extra whitespace
    curlInput.value = minifyCurl(curlInput.value)
  } else {
    // Beautify: add line breaks with backslash continuations
    curlInput.value = beautifyCurl(curlInput.value)
  }
  curlBeautified.value = !curlBeautified.value
}

/**
 * Beautify cURL command - each option on its own line with backslash continuation
 */
function beautifyCurl(curl) {
  if (!curl.trim()) return curl

  // First, normalize: remove existing line continuations and collapse whitespace
  let normalized = curl
    .replace(/\s*\\\s*\n\s*/g, ' ')  // Remove existing \ continuations
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim()

  // Options that should be on their own line
  const breakBefore = [
    '-X', '--request',
    '-H', '--header',
    '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
    '-F', '--form',
    '-u', '--user',
    '-A', '--user-agent',
    '-b', '--cookie',
    '-c', '--cookie-jar',
    '-e', '--referer',
    '-o', '--output',
    '-L', '--location',
    '-k', '--insecure',
    '-v', '--verbose',
    '-s', '--silent',
    '--compressed',
    '--connect-timeout',
    '--max-time'
  ]

  // Build regex to match these options
  const optionsPattern = breakBefore.map(opt => opt.replace(/-/g, '\\-')).join('|')
  const regex = new RegExp(`\\s+(${optionsPattern})(?=\\s|$)`, 'g')

  // Add line break before each option
  const beautified = normalized.replace(regex, ' \\\n  $1')

  return beautified
}

/**
 * Minify cURL command - single line, no continuations
 */
function minifyCurl(curl) {
  if (!curl.trim()) return curl

  return curl
    .replace(/\s*\\\s*\n\s*/g, ' ')  // Remove line continuations
    .replace(/\s+/g, ' ')             // Collapse multiple spaces
    .trim()
}
</script>

<style scoped>
.chat-composer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 12px; /* Slightly less bottom padding since gap handles it */
  background: var(--composer-bg, var(--color-bg-secondary));
  height: 100%;
  overflow: hidden; /* Prevent overflow, let children handle scrolling */
}

.composer-tabs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tab-btn {
  padding: 6px 16px;
  font-size: 13px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--color-bg-hover);
}

.tab-btn.active {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border-color: var(--color-text-primary);
}

.curl-input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 60px; /* Minimum usable height */
  max-height: 100%; /* Don't exceed parent */
}

.curl-toolbar {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 6px;
  flex-shrink: 0;
}

.curl-format-btn {
  padding: 4px 10px;
  font-size: 11px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.curl-format-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

.curl-format-btn.active {
  background: var(--color-bg-tertiary);
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

/* Override ACE editor min-height for compact curl input */
.curl-input-container :deep(.ace-text-editor) {
  height: 100%;
  max-height: 100%;
}

.curl-input-container :deep(.ace-editor-container) {
  min-height: 60px;
  max-height: 100%;
}

.curl-input {
  width: 100%;
  flex: 1;
  min-height: 60px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-primary);
  resize: none; /* Disable manual resize since it's fluid */
}

.curl-input:focus {
  outline: none;
  border-color: var(--color-text-secondary);
}

.visual-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.url-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.method-select {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  min-width: 100px;
}

.url-input {
  flex: 1;
  /* CSS variables for VariableHighlightInput */
  --input-padding: 8px 12px;
  --input-font-size: 13px;
  --input-font-family: 'Monaco', 'Menlo', monospace;
  --input-radius: 6px;
  /* Background on container so backdrop text is visible */
  background: var(--color-bg-primary);
  border-radius: 6px;
}

.url-input :deep(.variable-input:focus) {
  border-color: var(--color-text-secondary);
}

.visual-tabs {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.visual-tab-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.visual-tab-btn:hover {
  color: var(--color-text-primary);
}

.visual-tab-btn.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}

.badge {
  padding: 0 6px;
  font-size: 10px;
  background: var(--color-bg-tertiary);
  border-radius: 10px;
}

.visual-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.kv-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.kv-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kv-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.kv-input {
  flex: 1;
  /* CSS variables for VariableHighlightInput */
  --input-padding: 6px 8px;
  --input-font-size: 12px;
  --input-radius: 4px;
  /* Background on container so backdrop text is visible */
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

/* Regular input styling (for key fields that are plain inputs) */
input.kv-input {
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.remove-btn {
  padding: 4px 8px;
  font-size: 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

.remove-btn:hover {
  color: var(--color-delete);
}

.add-btn {
  padding: 6px 12px;
  font-size: 12px;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.add-btn:hover {
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

.body-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.body-mode-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  flex-shrink: 0;
}

.body-mode-selector label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.raw-type-select {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
  margin-left: auto;
}

.body-raw-editor {
  flex: 1;
  min-height: 150px;
  border-radius: 4px;
  overflow: hidden;
}

.body-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
  resize: vertical;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.save-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-text-secondary);
}

.send-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Auth Tab Styles */
.auth-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success, #22c55e);
  border-radius: 50%;
  display: inline-block;
  margin-left: 4px;
}

.auth-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.auth-type-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 60px;
}

.auth-select {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
  min-width: 140px;
}

.auth-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.auth-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Regular input fields (username, password, key name) */
input.auth-input {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
}

input.auth-input::placeholder {
  color: var(--color-text-muted);
}

/* VariableHighlightInput container styling */
.auth-field .variable-input-container {
  flex: 1;
  /* CSS variables for VariableHighlightInput internal styling */
  --input-padding: 6px 10px;
  --input-font-size: 12px;
  --input-font-family: inherit;
  --input-radius: 4px;
  /* Background on container so backdrop text is visible */
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

.auth-radio-group {
  display: flex;
  gap: 16px;
}

.auth-radio-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.auth-hint {
  padding: 8px 10px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  margin-top: 4px;
}

.auth-hint code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.auth-empty {
  padding: 20px;
  text-align: center;
}

.auth-empty p {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 13px;
  margin: 0;
}

/* Script Tab Styles */
.tab-btn.has-script {
  position: relative;
}

.script-dot {
  width: 6px;
  height: 6px;
  background: var(--color-warning, #f59e0b);
  border-radius: 50%;
  display: inline-block;
  margin-left: 4px;
}

.script-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.script-type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.script-type-select {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
  min-width: 160px;
}

.prerequest-warning {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning, #f59e0b);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}

.script-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snippet-select {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
  min-width: 160px;
}

.snippet-select option {
  padding: 4px 8px;
}

.script-editor-container {
  flex: 1;
  min-height: 150px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.script-editor-container :deep(.ace-text-editor) {
  height: 100%;
}

.script-editor-container :deep(.ace-editor-container) {
  min-height: 150px;
}

.script-help {
  flex-shrink: 0;
}

.script-help details {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.script-help summary {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.script-help summary:hover {
  background: var(--color-bg-hover);
}

.script-help[open] summary {
  border-bottom: 1px solid var(--color-border);
}

.api-list {
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.api-list code {
  background: var(--color-bg-tertiary);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #a78bfa;
}
</style>
