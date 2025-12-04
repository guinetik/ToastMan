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
    </div>

    <!-- cURL Mode -->
    <div v-if="mode === 'curl'" class="curl-input-container">
      <component
        :is="TextEditor"
        ref="curlInputRef"
        v-model="curlInput"
        language="curl"
        theme="dark"
        height="100%"
        placeholder="Paste cURL: https://api.example.com -X POST -H 'Content-Type: application/json'"
        :options="{ showGutter: true, wrap: true, fontSize: 13, showLineNumbers: false, showFoldWidgets: false }"
        @send="send"
      />
    </div>

    <!-- Visual Mode -->
    <div v-else class="visual-input-container">
      <div class="url-row">
        <select v-model="method" class="method-select" :style="{ color: methodColor }">
          <option v-for="m in httpMethods" :key="m" :value="m">{{ m }}</option>
        </select>
        <input
          v-model="url"
          type="text"
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
      </div>

      <!-- Options Panel -->
      <div class="visual-panel">
        <!-- Params Tab -->
        <div v-if="activeTab === 'params'" class="kv-editor">
          <div v-for="(param, index) in params" :key="param.id" class="kv-row">
            <input type="checkbox" v-model="param.enabled" />
            <input v-model="param.key" placeholder="Key" class="kv-input" />
            <input v-model="param.value" placeholder="Value" class="kv-input" />
            <button class="remove-btn" @click="removeParam(index)">×</button>
          </div>
          <button class="add-btn" @click="addParam">+ Add Param</button>
        </div>

        <!-- Headers Tab -->
        <div v-if="activeTab === 'headers'" class="kv-editor">
          <div v-for="(header, index) in headers" :key="header.id" class="kv-row">
            <input type="checkbox" v-model="header.enabled" />
            <input v-model="header.key" placeholder="Key" class="kv-input" />
            <input v-model="header.value" placeholder="Value" class="kv-input" />
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
              <input v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeFormData(index)">×</button>
            </div>
            <button class="add-btn" @click="addFormData">+ Add Field</button>
          </div>

          <div v-else-if="body.mode === 'urlencoded'" class="kv-editor">
            <div v-for="(field, index) in body.urlEncoded" :key="field.id" class="kv-row">
              <input type="checkbox" v-model="field.enabled" />
              <input v-model="field.key" placeholder="Key" class="kv-input" />
              <input v-model="field.value" placeholder="Value" class="kv-input" />
              <button class="remove-btn" @click="removeUrlEncoded(index)">×</button>
            </div>
            <button class="add-btn" @click="addUrlEncoded">+ Add Field</button>
          </div>
        </div>
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

// Get the configured text editor (ACE)
const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()

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
const activeTab = ref('params')

const curlInputRef = ref(null)

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

// Sync local state to controller
watch(mode, (val) => props.controller.setComposerMode(val))
watch(curlInput, (val) => props.controller.setCurlInput(val))
watch(method, (val) => props.controller.updateField('method', val))
watch(url, (val) => props.controller.updateField('url', val))
watch(headers, (val) => props.controller.updateField('headers', val), { deep: true })
watch(params, (val) => props.controller.updateField('params', val), { deep: true })
watch(body, (val) => props.controller.updateField('body', val), { deep: true })

// Sync controller state to local (for when controller loads a request)
watch(() => props.controller.state.composerMode, (val) => { mode.value = val })
watch(() => props.controller.state.curlInput, (val) => { curlInput.value = val })
watch(() => props.controller.state.method, (val) => { method.value = val })
watch(() => props.controller.state.url, (val) => { url.value = val })
watch(() => props.controller.state.headers, (val) => { headers.value = val }, { deep: true })
watch(() => props.controller.state.params, (val) => { params.value = val }, { deep: true })
watch(() => props.controller.state.body, (val) => { body.value = val }, { deep: true })

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
  padding: 8px 12px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
}

.url-input:focus {
  outline: none;
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
  padding: 6px 8px;
  font-size: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
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
</style>
