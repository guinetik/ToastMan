<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseDialog from '../base/BaseDialog.vue'

const emit = defineEmits(['close', 'create', 'import'])

// Create mode state
const environmentName = ref('')
const nameInput = ref(null)

// Import mode state
const fileInput = ref(null)
const importedData = ref(null)
const importFileName = ref('')
const importError = ref('')

// Computed: determine if we're in import mode
const isImportMode = computed(() => importedData.value !== null)

// Computed: button text
const submitButtonText = computed(() => {
  if (isImportMode.value) return 'Import Environment'
  return 'Create Environment'
})

// Computed: can submit
const canSubmit = computed(() => {
  if (isImportMode.value) return importedData.value !== null && !importError.value
  return environmentName.value.trim().length > 0
})

// Computed: dialog title
const dialogTitle = computed(() => {
  if (isImportMode.value) return 'Import Environment'
  return 'New Environment'
})

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  importFileName.value = file.name
  importError.value = ''
  importedData.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)

      // Validate the structure
      if (!data.name) {
        importError.value = 'Environment file is missing a name field.'
        return
      }

      if (!Array.isArray(data.values)) {
        importError.value = 'Environment file is missing a values array.'
        return
      }

      // Valid import
      importedData.value = data
    } catch (err) {
      importError.value = 'Could not parse file. Please select a valid Postman environment JSON.'
    }
  }

  reader.onerror = () => {
    importError.value = 'Failed to read file.'
  }

  reader.readAsText(file)
}

// Clear import and go back to create mode
const clearImport = () => {
  importedData.value = null
  importFileName.value = ''
  importError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Trigger file picker
const triggerFilePicker = () => {
  fileInput.value?.click()
}

// Handle form submit
const handleSubmit = (event) => {
  event.preventDefault()

  if (isImportMode.value && importedData.value) {
    emit('import', importedData.value)
    emit('close')
  } else if (environmentName.value.trim()) {
    emit('create', environmentName.value.trim())
    emit('close')
  }
}

const closeDialog = () => {
  emit('close')
}

// Focus the input when the dialog opens
onMounted(() => {
  setTimeout(() => {
    nameInput.value?.focus()
  }, 100)
})
</script>

<template>
  <BaseDialog
    :title="dialogTitle"
    width="450px"
    @close="closeDialog"
  >
    <form @submit="handleSubmit" class="environment-form">
      <!-- Create New Section -->
      <div class="form-group" :class="{ disabled: isImportMode }">
        <label for="environment-name" class="form-label">
          Environment Name
        </label>
        <input
          id="environment-name"
          ref="nameInput"
          v-model="environmentName"
          type="text"
          placeholder="e.g., Development, Production, Staging"
          class="form-input"
          :disabled="isImportMode"
        />
        <p class="form-help">
          Choose a descriptive name for your environment.
        </p>
      </div>

      <!-- Divider -->
      <div class="divider">
        <span class="divider-text">or</span>
      </div>

      <!-- Import Section -->
      <div class="import-section">
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="file-input-hidden"
          @change="handleFileSelect"
        />

        <!-- Import button (when no file selected) -->
        <div v-if="!importedData && !importError" class="import-trigger">
          <button
            type="button"
            class="btn-import"
            @click="triggerFilePicker"
          >
            <span class="import-icon">📁</span>
            Import from Postman file
          </button>
          <p class="import-hint">
            Select a .postman_environment.json file
          </p>
        </div>

        <!-- Import preview (when file selected successfully) -->
        <div v-else-if="importedData" class="import-preview">
          <div class="preview-header">
            <span class="preview-icon">✓</span>
            <div class="preview-info">
              <span class="preview-name">{{ importedData.name }}</span>
              <span class="preview-meta">{{ importedData.values?.length || 0 }} variables</span>
            </div>
            <button
              type="button"
              class="btn-clear"
              @click="clearImport"
              title="Clear and start over"
            >
              ×
            </button>
          </div>
          <p class="preview-filename">{{ importFileName }}</p>
        </div>

        <!-- Import error -->
        <div v-else-if="importError" class="import-error">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ importError }}</span>
          </div>
          <button
            type="button"
            class="btn-retry"
            @click="triggerFilePicker"
          >
            Try another file
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button
          type="button"
          class="btn-secondary"
          @click="closeDialog"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn-primary"
          :disabled="!canSubmit"
        >
          {{ submitButtonText }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>

<style scoped>
.environment-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
  transition: opacity 0.2s ease;
}

.form-group.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input:disabled {
  background: var(--color-bg-tertiary);
  cursor: not-allowed;
}

.form-help {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 8px 0 0 0;
  line-height: 1.4;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border-light);
}

.divider-text {
  padding: 0 16px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Import Section */
.import-section {
  margin-bottom: 24px;
}

.file-input-hidden {
  position: absolute;
  left: -9999px;
  opacity: 0;
}

.import-trigger {
  text-align: center;
}

.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--color-bg-tertiary);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.btn-import:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-hover);
}

.import-icon {
  font-size: 16px;
}

.import-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 8px 0 0 0;
}

/* Import Preview */
.import-preview {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  padding: 12px 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-icon {
  color: var(--color-success);
  font-size: 18px;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-name {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 14px;
}

.preview-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.preview-filename {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 8px 0 0 0;
  font-family: monospace;
  word-break: break-all;
}

.btn-clear {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background: var(--color-error);
  color: white;
}

/* Import Error */
.import-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  padding: 12px 16px;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  color: var(--color-error);
  font-size: 13px;
  line-height: 1.4;
}

.btn-retry {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  color: var(--color-error);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background: var(--color-error);
  color: white;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.btn-primary {
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border: 1px solid var(--color-border-dark);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-button-bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
