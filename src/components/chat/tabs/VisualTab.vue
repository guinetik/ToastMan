<template>
  <div class="visual-tab">
    <div class="url-row">
      <CustomDropdown
        :modelValue="method"
        @update:modelValue="$emit('update:method', $event)"
        :options="httpMethods"
        size="large"
        class="method-select"
      />
      <VariableHighlightInput
        :modelValue="url"
        @update:modelValue="$emit('update:url', $event)"
        class="url-input"
        placeholder="https://api.example.com/endpoint"
        @keydown.enter="$emit('send')"
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
        <div v-if="params.length === 0" class="kv-empty">
          <div class="kv-empty-mark">?</div>
          <p class="kv-empty-title">No query params</p>
          <p class="kv-empty-copy">Add key/value pairs to append to the URL as <code>?key=value</code>.</p>
          <button class="add-btn add-btn-primary" @click="addParam">Add param</button>
        </div>
        <template v-else>
          <div v-for="(param, index) in params" :key="param.id" class="kv-row">
            <input type="checkbox" v-model="param.enabled" />
            <input v-model="param.key" placeholder="Key" class="kv-input" />
            <VariableHighlightInput v-model="param.value" placeholder="Value" class="kv-input" />
            <button class="remove-btn" @click="removeParam(index)">×</button>
          </div>
          <button class="add-btn" @click="addParam">+ Add Param</button>
        </template>
      </div>

      <!-- Headers Tab -->
      <div v-if="activeTab === 'headers'" class="kv-editor">
        <div v-if="headers.length === 0" class="kv-empty">
          <div class="kv-empty-mark">H</div>
          <p class="kv-empty-title">No headers</p>
          <p class="kv-empty-copy">Add request headers like <code>Accept</code> or <code>Content-Type</code>.</p>
          <button class="add-btn add-btn-primary" @click="addHeader">Add header</button>
        </div>
        <template v-else>
          <div v-for="(header, index) in headers" :key="header.id" class="kv-row">
            <input type="checkbox" v-model="header.enabled" />
            <input v-model="header.key" placeholder="Key" class="kv-input" />
            <VariableHighlightInput v-model="header.value" placeholder="Value" class="kv-input" />
            <button class="remove-btn" @click="removeHeader(index)">×</button>
          </div>
          <button class="add-btn" @click="addHeader">+ Add Header</button>
        </template>
      </div>

      <!-- Body Tab -->
      <div v-if="activeTab === 'body'" class="body-editor">
        <div class="body-mode-selector">
          <SegmentedControl
            v-model="body.mode"
            :options="bodyModes"
            aria-label="Body type"
          />
          <CustomDropdown
            v-if="body.mode === 'raw'"
            v-model="rawType"
            :options="rawTypes"
            class="raw-type-select"
          />
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

        <div v-else-if="body.mode === 'none'" class="kv-empty">
          <div class="kv-empty-mark">∅</div>
          <p class="kv-empty-title">No body</p>
          <p class="kv-empty-copy">This request sends no payload. Typical for GET, HEAD, and DELETE.</p>
        </div>

        <div v-else-if="body.mode === 'formdata'" class="kv-editor">
          <div v-if="formDataFields.length === 0" class="kv-empty">
            <div class="kv-empty-mark">≡</div>
            <p class="kv-empty-title">No form fields</p>
            <p class="kv-empty-copy">Add key/value pairs to send as <code>multipart/form-data</code>.</p>
            <button class="add-btn add-btn-primary" @click="addFormData">Add field</button>
          </div>
          <template v-else>
            <div v-for="(field, index) in formDataFields" :key="field.id" class="kv-row">
              <input type="checkbox" v-model="field.enabled" />
              <input v-model="field.key" placeholder="Key" class="kv-input" />
              <VariableHighlightInput v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeFormData(index)">×</button>
            </div>
            <button class="add-btn" @click="addFormData">+ Add Field</button>
          </template>
        </div>

        <div v-else-if="body.mode === 'urlencoded'" class="kv-editor">
          <div v-if="urlEncodedFields.length === 0" class="kv-empty">
            <div class="kv-empty-mark">&</div>
            <p class="kv-empty-title">No encoded fields</p>
            <p class="kv-empty-copy">Add key/value pairs to send as <code>application/x-www-form-urlencoded</code>.</p>
            <button class="add-btn add-btn-primary" @click="addUrlEncoded">Add field</button>
          </div>
          <template v-else>
            <div v-for="(field, index) in urlEncodedFields" :key="field.id" class="kv-row">
              <input type="checkbox" v-model="field.enabled" />
              <input v-model="field.key" placeholder="Key" class="kv-input" />
              <VariableHighlightInput v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeUrlEncoded(index)">×</button>
            </div>
            <button class="add-btn" @click="addUrlEncoded">+ Add Field</button>
          </template>
        </div>
      </div>

      <!-- Auth Tab -->
      <div v-if="activeTab === 'auth'" class="auth-editor">
        <div class="auth-type-row">
          <label class="auth-label">Type</label>
          <CustomDropdown
            v-model="auth.type"
            :options="authTypes"
            class="auth-select"
          />
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
            <SegmentedControl
              v-model="auth.apikey.in"
              :options="apiKeyLocations"
              aria-label="API key location"
            />
          </div>
          <div class="auth-hint">
            <code v-if="auth.apikey.in === 'header'">-H '{{ auth.apikey.key || 'X-API-Key' }}: &lt;value&gt;'</code>
            <code v-else>?{{ auth.apikey.key || 'api_key' }}=&lt;value&gt;</code>
          </div>
        </div>

        <!-- No Auth Message -->
        <div v-if="auth.type === 'none'" class="kv-empty">
          <div class="kv-empty-mark">*</div>
          <p class="kv-empty-title">No authentication</p>
          <p class="kv-empty-copy">This request goes out without credentials. Pick a type above to add Bearer, Basic, or an API key.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../../config/editors.js'
import VariableHighlightInput from '../../VariableHighlightInput.vue'
import CustomDropdown from '../../base/CustomDropdown.vue'
import SegmentedControl from '../../base/SegmentedControl.vue'

const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()

const props = defineProps({
  method: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  headers: {
    type: Array,
    required: true
  },
  params: {
    type: Array,
    required: true
  },
  body: {
    type: Object,
    required: true
  },
  auth: {
    type: Object,
    required: true
  },
  methodColor: {
    type: String,
    default: 'var(--color-text-primary)'
  }
})

const emit = defineEmits(['update:method', 'update:url', 'send'])

const activeTab = ref('params')
const rawType = ref('json')

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const authTypes = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' }
]

const bodyModes = [
  { value: 'none', label: 'None' },
  { value: 'raw', label: 'Raw' },
  { value: 'formdata', label: 'Form Data' },
  { value: 'urlencoded', label: 'URL Encoded' }
]

const apiKeyLocations = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query Param' }
]

const rawTypes = [
  { value: 'json', label: 'JSON', mode: 'json' },
  { value: 'xml', label: 'XML', mode: 'xml' },
  { value: 'html', label: 'HTML', mode: 'html' },
  { value: 'text', label: 'Text', mode: 'text' }
]

const rawEditorMode = computed(() => {
  const found = rawTypes.find(t => t.value === rawType.value)
  return found?.mode || 'text'
})

const enabledParamsCount = computed(() =>
  props.params.filter(p => p.enabled && p.key).length
)

const enabledHeadersCount = computed(() =>
  props.headers.filter(h => h.enabled && h.key).length
)

const formDataFields = computed(() => props.body.formData || [])
const urlEncodedFields = computed(() => props.body.urlEncoded || [])

function addParam() {
  props.params.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeParam(index) {
  props.params.splice(index, 1)
}

function addHeader() {
  props.headers.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeHeader(index) {
  props.headers.splice(index, 1)
}

function addFormData() {
  if (!Array.isArray(props.body.formData)) {
    props.body.formData = []
  }
  props.body.formData.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeFormData(index) {
  props.body.formData.splice(index, 1)
}

function addUrlEncoded() {
  if (!Array.isArray(props.body.urlEncoded)) {
    props.body.urlEncoded = []
  }
  props.body.urlEncoded.push({ key: '', value: '', enabled: true, id: Date.now() })
}

function removeUrlEncoded(index) {
  props.body.urlEncoded.splice(index, 1)
}
</script>

<style scoped>
.visual-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.url-row {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-items: stretch;
}

.method-select {
  min-width: 132px;
  width: 140px;
  flex-shrink: 0;
}

.method-select :deep(.custom-dropdown-value) {
  font-weight: 700;
  letter-spacing: 0.06em;
  color: v-bind(methodColor);
}

.url-input {
  flex: 1;
  --input-padding: 14px 16px;
  --input-font-size: 16px;
  --input-font-family: 'Monaco', 'Menlo', monospace;
  --input-radius: 10px;
  background: var(--color-bg-primary);
  border-radius: 10px;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--surface-highlight);
}

.url-input :deep(.variable-input),
.url-input :deep(input) {
  min-height: 48px;
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
  padding: 8px 16px;
  font-size: 13px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  transition:
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
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

.auth-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success, #22c55e);
  border-radius: 50%;
  display: inline-block;
  margin-left: 4px;
}

.visual-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--surface-highlight);
  animation: panelIn var(--duration-med) var(--ease-out);
}

@keyframes panelIn {
  from {
    opacity: 0.72;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  --input-padding: 6px 8px;
  --input-font-size: 12px;
  --input-radius: 4px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

input.kv-input {
  padding: 8px 10px;
  font-size: 13px;
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

.add-btn-primary {
  border-style: solid;
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border-color: var(--color-border-dark);
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
}

.add-btn-primary:hover {
  background: var(--color-button-bg-hover);
  color: var(--color-button-text);
}

.kv-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  padding: 36px 20px;
  min-height: 180px;
  animation: panelIn var(--duration-med) var(--ease-out);
}

.kv-empty-mark {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 18px;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', monospace;
  box-shadow: var(--surface-highlight);
}

.kv-empty-title {
  margin: 8px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.kv-empty-copy {
  margin: 0 0 8px;
  max-width: 320px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.kv-empty-copy code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
  padding: 1px 6px;
  border-radius: 4px;
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
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.raw-type-select {
  margin-left: auto;
  width: 120px;
}

.body-raw-editor {
  flex: 1;
  min-height: 150px;
  border-radius: 4px;
  overflow: hidden;
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
  flex-shrink: 0;
}

.auth-select {
  flex: 1;
  min-width: 0;
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

input.auth-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
}

input.auth-input::placeholder {
  color: var(--color-text-muted);
}

.auth-field .variable-input-container {
  flex: 1;
  --input-padding: 6px 10px;
  --input-font-size: 12px;
  --input-font-family: inherit;
  --input-radius: 4px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
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
  animation: panelIn var(--duration-med) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .visual-panel,
  .kv-empty,
  .visual-tab-btn {
    animation: none;
    transition: none;
  }
}
</style>
