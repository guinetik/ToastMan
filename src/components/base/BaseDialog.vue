<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  width: {
    type: String,
    default: '600px'
  },
  height: {
    type: String,
    default: 'auto'
  }
})

const emit = defineEmits(['close'])

const closeDialog = () => {
  emit('close')
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    closeDialog()
  }
}

const handleBackdropClick = (event) => {
  if (event.target === event.currentTarget) {
    closeDialog()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="dialog-backdrop" @click="handleBackdropClick">
    <div
      class="dialog-container"
      :style="{
        width: props.width,
        height: props.height === 'auto' ? 'auto' : props.height,
        maxHeight: props.height === 'auto' ? '90vh' : props.height
      }"
    >
      <!-- Dialog Header -->
      <div class="dialog-header">
        <h2 class="dialog-title">{{ props.title }}</h2>
        <button class="close-button" @click="closeDialog">
          ×
        </button>
      </div>

      <!-- Dialog Content -->
      <div class="dialog-content">
        <slot></slot>
      </div>

      <!-- Dialog Footer (optional) -->
      <div v-if="$slots.footer" class="dialog-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: backdropFadeIn 0.2s ease-out;
}

@keyframes backdropFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.dialog-container {
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.98) 0%,
    rgba(20, 20, 20, 0.98) 100%
  );
  border-radius: var(--radius-lg);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  max-width: 90vw;
  overflow: hidden;
  animation: dialogAppear 0.25s ease-out;
}

@keyframes dialogAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 24px;
  padding: 4px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--color-error);
  color: white;
}

.dialog-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>