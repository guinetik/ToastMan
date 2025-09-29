<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NewFolderDialogController } from '../../controllers/NewFolderDialogController.js'
import BaseDialog from '../base/BaseDialog.vue'

const props = defineProps({
  collectionId: {
    type: String,
    required: true
  },
  parentFolderId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'create'])

// Create controller instance
const controller = new NewFolderDialogController(props.collectionId, props.parentFolderId)

// Access reactive state from controller (keep it reactive by not destructuring)
const state = controller.state

const createFolder = async () => {
  const result = await controller.submit()
  if (result.success) {
    // Folder is created by the controller, just close the dialog
    emit('create', result.data)
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

// Initialize controller
onMounted(() => {
  controller.init()
})

// Cleanup controller
onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <BaseDialog
    title="Create New Folder"
    @close="closeDialog"
    :width="400"
  >
    <!-- Folder Name Input -->
    <div class="form-group">
      <label for="folder-name">Folder Name</label>
      <input
        id="folder-name"
        v-model="state.name"
        @input="updateField('name', $event.target.value)"
        type="text"
        placeholder="Enter folder name"
        class="form-input"
        :class="{ 'has-error': state.validation.errors.name }"
        @keyup.enter="createFolder"
        autofocus
      />
      <div v-if="state.validation.errors.name" class="error-message">
        {{ state.validation.errors.name }}
      </div>
    </div>

    <!-- Description Input (Optional) -->
    <div class="form-group">
      <label for="folder-description">Description (Optional)</label>
      <textarea
        id="folder-description"
        v-model="state.description"
        @input="updateField('description', $event.target.value)"
        placeholder="Enter folder description"
        class="form-input"
        rows="3"
      ></textarea>
    </div>

    <!-- Footer Buttons -->
    <template #footer>
      <button type="button" class="btn-cancel" @click="closeDialog">
        Cancel
      </button>
      <button
        type="button"
        class="btn-primary"
        @click="createFolder"
        :disabled="!state.validation.isValid || state.isSubmitting"
      >
        <span v-if="state.isSubmitting">Creating...</span>
        <span v-else>Create Folder</span>
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
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
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input.has-error {
  border-color: var(--color-error);
}

.error-message {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-error);
}

.btn-cancel,
.btn-primary {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background: var(--color-bg-hover);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>