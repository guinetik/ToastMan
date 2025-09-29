<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../config/editors.js'
import { createLogger } from '../../core/logger.js'

// Get the configured text editor component
const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()

const logger = createLogger('RequestBodyEditor')

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      mode: 'none',
      raw: '',
      formData: [],
      urlEncoded: [],
      binary: null
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// Body types
const bodyTypes = [
  { value: 'none', label: 'None' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'binary', label: 'Binary' }
]

// Raw content types
const rawTypes = [
  { value: 'text', label: 'Text', mode: 'text' },
  { value: 'json', label: 'JSON', mode: 'json' },
  { value: 'xml', label: 'XML', mode: 'xml' },
  { value: 'html', label: 'HTML', mode: 'html' }
]

// Local state
const currentBodyType = ref(props.modelValue.mode || 'none')
const currentRawType = ref('json')
const textEditor = ref(null)

// Form data state
const formDataItems = ref(props.modelValue.formData || [])
const urlEncodedItems = ref(props.modelValue.urlEncoded || [])

// Binary file state
const selectedFile = ref(null)
const fileInput = ref(null)

// Computed
const bodyValue = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

const rawContent = computed({
  get() {
    return props.modelValue.raw || ''
  },
  set(value) {
    updateBody({ raw: value })
  }
})

// Methods
const updateBody = (updates) => {
  const newValue = { ...bodyValue.value, ...updates }
  emit('update:modelValue', newValue)
}

const changeBodyType = (type) => {
  currentBodyType.value = type
  updateBody({ mode: type })

  if (type === 'raw' && textEditor.value) {
    // Focus the editor when switching to raw mode
    setTimeout(() => {
      textEditor.value?.focus()
    }, 100)
  }
}

const changeRawType = (type) => {
  currentRawType.value = type
  // The editor will automatically update its language mode via props
}

// Form data methods
const addFormDataItem = () => {
  const newItem = { key: '', value: '', type: 'text', enabled: true }
  formDataItems.value.push(newItem)
  updateBody({ formData: formDataItems.value })
}

const removeFormDataItem = (index) => {
  formDataItems.value.splice(index, 1)
  updateBody({ formData: formDataItems.value })
}

const updateFormDataItem = (index, field, value) => {
  if (formDataItems.value[index]) {
    formDataItems.value[index][field] = value
    updateBody({ formData: formDataItems.value })
  }
}

// URL encoded methods
const addUrlEncodedItem = () => {
  const newItem = { key: '', value: '', enabled: true }
  urlEncodedItems.value.push(newItem)
  updateBody({ urlEncoded: urlEncodedItems.value })
}

const removeUrlEncodedItem = (index) => {
  urlEncodedItems.value.splice(index, 1)
  updateBody({ urlEncoded: urlEncodedItems.value })
}

const updateUrlEncodedItem = (index, field, value) => {
  if (urlEncodedItems.value[index]) {
    urlEncodedItems.value[index][field] = value
    updateBody({ urlEncoded: urlEncodedItems.value })
  }
}

// Binary file methods
const selectFile = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    updateBody({
      binary: {
        name: file.name,
        size: file.size,
        type: file.type,
        path: file.path || `file://${file.name}` // For display purposes
      }
    })
  }
}

const removeFile = () => {
  selectedFile.value = null
  updateBody({ binary: null })
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Get current raw type mode for editor
const currentRawMode = computed(() => {
  const rawType = rawTypes.find(t => t.value === currentRawType.value)
  return rawType?.mode || 'text'
})

// Initialize from props
if (props.modelValue.formData) {
  formDataItems.value = [...props.modelValue.formData]
}
if (props.modelValue.urlEncoded) {
  urlEncodedItems.value = [...props.modelValue.urlEncoded]
}
if (props.modelValue.binary) {
  selectedFile.value = props.modelValue.binary
}
</script>

<template>
  <div class="request-body-editor">
    <!-- Body Type Selector -->
    <div class="body-type-selector">
      <label class="form-label">Body Type:</label>
      <select
        v-model="currentBodyType"
        @change="changeBodyType(currentBodyType)"
        class="body-type-select"
      >
        <option v-for="type in bodyTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>

      <!-- Raw type selector -->
      <div v-if="currentBodyType === 'raw'" class="raw-type-selector">
        <select
          v-model="currentRawType"
          @change="changeRawType(currentRawType)"
          class="raw-type-select"
        >
          <option v-for="type in rawTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Body Content -->
    <div class="body-content">
      <!-- None -->
      <div v-if="currentBodyType === 'none'" class="body-none">
        <p class="empty-message">No body content</p>
      </div>

      <!-- Raw Editor -->
      <div v-if="currentBodyType === 'raw'" class="body-raw">
        <TextEditor
          ref="textEditor"
          v-model="rawContent"
          :language="currentRawMode"
          :theme="editorDefaults.theme"
          :options="editorDefaults.options"
          height="100%"
          class="raw-text-editor"
        />
      </div>

      <!-- Form Data -->
      <div v-if="currentBodyType === 'form-data'" class="body-form-data">
        <div class="form-data-header">
          <h4>Form Data</h4>
          <button @click="addFormDataItem" class="btn-add">+ Add Item</button>
        </div>

        <div class="form-data-table">
          <div class="table-header">
            <div class="col-enabled"></div>
            <div class="col-key">Key</div>
            <div class="col-value">Value</div>
            <div class="col-type">Type</div>
            <div class="col-actions"></div>
          </div>

          <div
            v-for="(item, index) in formDataItems"
            :key="index"
            class="table-row"
          >
            <div class="col-enabled">
              <input
                type="checkbox"
                :checked="item.enabled"
                @change="updateFormDataItem(index, 'enabled', $event.target.checked)"
              />
            </div>
            <div class="col-key">
              <input
                type="text"
                :value="item.key"
                @input="updateFormDataItem(index, 'key', $event.target.value)"
                placeholder="Key"
                class="form-input"
              />
            </div>
            <div class="col-value">
              <input
                v-if="item.type === 'text'"
                type="text"
                :value="item.value"
                @input="updateFormDataItem(index, 'value', $event.target.value)"
                placeholder="Value"
                class="form-input"
              />
              <input
                v-else
                type="file"
                @change="updateFormDataItem(index, 'value', $event.target.files[0])"
                class="form-input file-input"
              />
            </div>
            <div class="col-type">
              <select
                :value="item.type"
                @change="updateFormDataItem(index, 'type', $event.target.value)"
                class="type-select"
              >
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
            </div>
            <div class="col-actions">
              <button @click="removeFormDataItem(index)" class="btn-remove">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- URL Encoded -->
      <div v-if="currentBodyType === 'x-www-form-urlencoded'" class="body-url-encoded">
        <div class="url-encoded-header">
          <h4>URL Encoded Parameters</h4>
          <button @click="addUrlEncodedItem" class="btn-add">+ Add Item</button>
        </div>

        <div class="url-encoded-table">
          <div class="table-header">
            <div class="col-enabled"></div>
            <div class="col-key">Key</div>
            <div class="col-value">Value</div>
            <div class="col-actions"></div>
          </div>

          <div
            v-for="(item, index) in urlEncodedItems"
            :key="index"
            class="table-row"
          >
            <div class="col-enabled">
              <input
                type="checkbox"
                :checked="item.enabled"
                @change="updateUrlEncodedItem(index, 'enabled', $event.target.checked)"
              />
            </div>
            <div class="col-key">
              <input
                type="text"
                :value="item.key"
                @input="updateUrlEncodedItem(index, 'key', $event.target.value)"
                placeholder="Key"
                class="form-input"
              />
            </div>
            <div class="col-value">
              <input
                type="text"
                :value="item.value"
                @input="updateUrlEncodedItem(index, 'value', $event.target.value)"
                placeholder="Value"
                class="form-input"
              />
            </div>
            <div class="col-actions">
              <button @click="removeUrlEncodedItem(index)" class="btn-remove">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Binary -->
      <div v-if="currentBodyType === 'binary'" class="body-binary">
        <div class="binary-header">
          <h4>Binary File</h4>
        </div>

        <div class="file-selector">
          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            style="display: none"
          />

          <div v-if="!selectedFile" class="file-drop-zone" @click="selectFile">
            <div class="drop-content">
              <div class="drop-icon">📁</div>
              <p>Click to select a file</p>
              <p class="drop-hint">Any file type is supported</p>
            </div>
          </div>

          <div v-else class="selected-file">
            <div class="file-info">
              <div class="file-icon">📄</div>
              <div class="file-details">
                <div class="file-name">{{ selectedFile.name }}</div>
                <div class="file-meta">
                  {{ (selectedFile.size / 1024).toFixed(1) }} KB
                  <span v-if="selectedFile.type"> • {{ selectedFile.type }}</span>
                </div>
              </div>
            </div>
            <div class="file-actions">
              <button @click="selectFile" class="btn-change">Change</button>
              <button @click="removeFile" class="btn-remove">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-body-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px; /* Ensure a good minimum height */
  gap: 16px;
}

.body-type-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.body-type-select,
.raw-type-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.raw-type-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.body-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px; /* Ensure minimum height for content */
}

.body-none {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.empty-message {
  color: var(--color-text-muted);
  font-style: italic;
}

.body-raw {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  min-height: 0; /* Allow flex shrinking */
}

.raw-text-editor {
  flex: 1;
  width: 100%;
  min-height: 200px;
}

.body-form-data,
.body-url-encoded {
  flex: 1;
  padding: 20px;
}

.form-data-header,
.url-encoded-header,
.binary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.form-data-header h4,
.url-encoded-header h4,
.binary-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
}

.btn-add {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-add:hover {
  background: var(--color-primary-dark);
}

.form-data-table,
.url-encoded-table {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 1fr 2fr 100px 40px;
  background: var(--color-bg-tertiary);
  padding: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.url-encoded-table .table-header {
  grid-template-columns: 40px 1fr 2fr 40px;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 2fr 100px 40px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border-light);
  align-items: center;
  gap: 8px;
}

.url-encoded-table .table-row {
  grid-template-columns: 40px 1fr 2fr 40px;
}

.table-row:hover {
  background: var(--color-bg-hover);
}

.col-enabled {
  display: flex;
  justify-content: center;
}

.form-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.type-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--color-error);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.btn-remove:hover {
  background: var(--color-error-dark);
}

.body-binary {
  flex: 1;
  padding: 20px;
}

.file-selector {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.file-drop-zone {
  padding: 60px 20px;
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-secondary);
  transition: background-color 0.2s;
}

.file-drop-zone:hover {
  background: var(--color-bg-tertiary);
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-icon {
  font-size: 48px;
  opacity: 0.6;
}

.drop-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 0;
}

.selected-file {
  padding: 20px;
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.file-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.file-actions {
  display: flex;
  gap: 8px;
}

.btn-change {
  padding: 6px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 14px;
}

.btn-change:hover {
  background: var(--color-bg-hover);
}

.file-input {
  font-size: 12px;
}
</style>