<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NewCollectionDialogController } from '../controllers/NewCollectionDialogController.js'
import BaseDialog from './BaseDialog.vue'

const emit = defineEmits(['close', 'create'])

// Create controller instance
const controller = new NewCollectionDialogController()

// Access reactive state from controller (keep it reactive by not destructuring)
const state = controller.state

const createCollection = async () => {
  const result = await controller.submit()
  if (result.success) {
    emit('create', result.data.info.name)
    emit('close')
  }
}

const closeDialog = async () => {
  if (await controller.confirmClose()) {
    controller.close()
    emit('close')
  }
}

const updateField = (field, value) => controller.updateField(field, value)

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    controller.handleFileSelect(file)
  }
}

const templates = controller.getTemplates()
const importPreview = controller.getImportPreview()

// Focus the input when the dialog opens
const nameInput = ref(null)
onMounted(() => {
  controller.open()
  setTimeout(() => {
    nameInput.value?.focus()
  }, 100)
})

onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <BaseDialog
    title="New Collection"
    width="600px"
    @close="closeDialog"
  >
    <div class="dialog-content">
      <!-- Collection Name -->
      <div class="form-group">
        <label for="collection-name" class="form-label">Collection Name</label>
        <input
          ref="nameInput"
          id="collection-name"
          v-model="state.formData.name"
          @input="updateField('name', $event.target.value)"
          type="text"
          placeholder="Enter collection name"
          class="form-input"
          :class="{ error: state.errors.name }"
          @keyup.enter="createCollection"
        >
        <div v-if="state.errors.name" class="error-text">{{ state.errors.name }}</div>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="collection-description" class="form-label">Description (Optional)</label>
        <textarea
          id="collection-description"
          v-model="state.formData.description"
          @input="updateField('description', $event.target.value)"
          placeholder="Describe your collection"
          class="form-textarea"
          rows="3"
        ></textarea>
        <div v-if="state.errors.description" class="error-text">{{ state.errors.description }}</div>
      </div>

      <!-- Template Selection -->
      <div class="form-group">
        <label class="form-label">Template</label>
        <div class="template-grid">
          <div
            v-for="template in templates"
            :key="template.id"
            :class="['template-card', { selected: state.formData.template === template.id }]"
            @click="updateField('template', template.id)"
          >
            <div class="template-icon">{{ template.icon }}</div>
            <div class="template-name">{{ template.name }}</div>
            <div class="template-description">{{ template.description }}</div>
          </div>
        </div>
      </div>

      <!-- Import File (if import template selected) -->
      <div v-if="state.formData.template === 'import'" class="form-group">
        <label class="form-label">Import File</label>
        <div class="file-input-group">
          <input
            type="file"
            accept=".json"
            @change="handleFileSelect"
            class="file-input"
            id="import-file"
          >
          <label for="import-file" class="file-input-label">
            <span v-if="!state.formData.importData">Choose Postman Collection (.json)</span>
            <span v-else>📄 File loaded</span>
          </label>
        </div>
        <div v-if="state.errors.import" class="error-text">{{ state.errors.import }}</div>

        <!-- Import Preview -->
        <div v-if="importPreview" class="import-preview">
          <h4>Import Preview</h4>
          <div class="preview-item">
            <strong>Name:</strong> {{ importPreview.name }}
          </div>
          <div class="preview-item" v-if="importPreview.description">
            <strong>Description:</strong> {{ importPreview.description }}
          </div>
          <div class="preview-item">
            <strong>Requests:</strong> {{ importPreview.requestCount }}
          </div>
          <div class="preview-item">
            <strong>Folders:</strong> {{ importPreview.folderCount }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button @click="closeDialog" class="cancel-btn" :disabled="state.loading">
        Cancel
      </button>
      <button
        @click="createCollection"
        class="primary create-btn"
        :disabled="state.loading || !state.formData.name?.trim() || controller.hasErrors()"
      >
        {{ state.loading ? 'Creating...' : 'Create Collection' }}
      </button>
    </template>
  </BaseDialog>
</template>


<style scoped>
.dialog-content {
  padding: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.cancel-btn {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.cancel-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.create-btn {
  min-width: 140px;
}

.create-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
  resize: vertical;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.form-input.error, .form-textarea.error {
  border-color: var(--color-error);
}

.error-text {
  font-size: 12px;
  color: var(--color-error);
  margin-top: 4px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.template-card {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.template-card:hover {
  border-color: var(--color-primary-light);
  background: var(--color-bg-hover);
}

.template-card.selected {
  border-color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
}

.template-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.template-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.file-input-group {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.file-input-label {
  display: block;
  padding: 10px 12px;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-input-label:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.import-preview {
  margin-top: 16px;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.import-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.preview-item {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.preview-item strong {
  color: var(--color-text-primary);
}
</style>