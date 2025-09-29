<script setup>
import { ref, onMounted } from 'vue'
import BaseDialog from '../base/BaseDialog.vue'

const emit = defineEmits(['close', 'create'])

const environmentName = ref('')
const nameInput = ref(null)

const createEnvironment = () => {
  if (environmentName.value.trim()) {
    emit('create', environmentName.value.trim())
    emit('close')
  }
}

const closeDialog = () => {
  emit('close')
}

const handleSubmit = (event) => {
  event.preventDefault()
  createEnvironment()
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
    title="Create New Environment"
    width="400px"
    @close="closeDialog"
  >
    <form @submit="handleSubmit" class="environment-form">
      <div class="form-group">
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
          required
        />
        <p class="form-help">
          Choose a descriptive name for your environment to help manage different API configurations.
        </p>
      </div>

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
          :disabled="!environmentName.trim()"
        >
          Create Environment
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
  margin-bottom: 24px;
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

.form-help {
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 8px 0 0 0;
  line-height: 1.4;
}

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
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>