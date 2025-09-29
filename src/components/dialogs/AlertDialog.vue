<script setup>
import { ref, onMounted } from 'vue'
import BaseDialog from '../base/BaseDialog.vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Alert'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info', // 'info', 'warning', 'error', 'success'
    validator: (value) => ['info', 'warning', 'error', 'success'].includes(value)
  },
  confirmText: {
    type: String,
    default: 'OK'
  },
  cancelText: {
    type: String,
    default: null // If null, only shows confirm button
  },
  showInput: {
    type: Boolean,
    default: false
  },
  inputPlaceholder: {
    type: String,
    default: ''
  },
  inputValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const inputRef = ref(null)
const inputModel = ref(props.inputValue)

const typeIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅'
}

const typeColors = {
  info: 'var(--color-primary)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  success: 'var(--color-success)'
}

const handleConfirm = () => {
  if (props.showInput) {
    emit('confirm', inputModel.value.trim())
  } else {
    emit('confirm', true)
  }
}

const handleCancel = () => {
  emit('cancel', false)
}

const handleClose = () => {
  emit('close')
}

const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleConfirm()
  }
}

onMounted(() => {
  // Auto-focus input if present, otherwise focus confirm button
  if (props.showInput && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<template>
  <BaseDialog
    :title="title"
    width="400px"
    @close="handleClose"
  >
    <div class="alert-content">
      <!-- Icon and Message -->
      <div class="alert-header">
        <div
          class="alert-icon"
          :style="{ color: typeColors[type] }"
        >
          {{ typeIcons[type] }}
        </div>
        <div class="alert-message">{{ message }}</div>
      </div>

      <!-- Input Field (if enabled) -->
      <div v-if="showInput" class="alert-input">
        <input
          ref="inputRef"
          v-model="inputModel"
          type="text"
          :placeholder="inputPlaceholder"
          class="input-field"
          @keydown="handleKeydown"
        >
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <button
        v-if="cancelText"
        class="btn-cancel"
        @click="handleCancel"
      >
        {{ cancelText }}
      </button>
      <button
        class="btn-confirm"
        :class="[`btn-${type}`]"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.alert-content {
  padding: 8px 0;
}

.alert-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-message {
  flex: 1;
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-text-primary);
  word-wrap: break-word;
}

.alert-input {
  margin-top: 16px;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-cancel,
.btn-confirm {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn-cancel {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-hover);
}

.btn-confirm {
  border: none;
  color: white;
}

.btn-info {
  background: var(--color-primary);
}

.btn-info:hover {
  background: var(--color-primary-dark);
}

.btn-warning {
  background: var(--color-warning);
}

.btn-warning:hover {
  background: var(--color-warning-dark);
}

.btn-error {
  background: var(--color-error);
}

.btn-error:hover {
  background: var(--color-error-dark);
}

.btn-success {
  background: var(--color-success);
}

.btn-success:hover {
  background: var(--color-success-dark);
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>