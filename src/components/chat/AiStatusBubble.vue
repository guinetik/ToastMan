<template>
  <div class="message-bubble ai-status" :class="statusType">
    <div class="status-content">
      <span class="status-icon">{{ statusIcon }}</span>
      <div class="status-text">
        <div class="status-message">{{ message }}</div>
        <div v-if="showProgress" class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent }"></div>
        </div>
        <div v-if="showProgress" class="progress-text">{{ progressText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['loading', 'generating', 'error', 'warning', 'info'].includes(value)
  },
  message: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 1
  },
  progressText: {
    type: String,
    default: ''
  }
})

const statusType = computed(() => props.type)

const statusIcon = computed(() => {
  const icons = {
    loading: '⏳',
    generating: '✨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[props.type] || 'ℹ️'
})

const showProgress = computed(() => {
  return (props.type === 'loading' || props.type === 'generating') && props.progress > 0
})

const progressPercent = computed(() => {
  return `${Math.round(props.progress * 100)}%`
})
</script>

<style scoped>
.message-bubble.ai-status {
  align-self: center;
  max-width: 80%;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 8px auto;
}

.message-bubble.ai-status.loading,
.message-bubble.ai-status.generating {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

.message-bubble.ai-status.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.message-bubble.ai-status.warning {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.3);
}

.status-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.status-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.status-text {
  flex: 1;
  min-width: 0;
}

.status-message {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.message-bubble.ai-status.error .status-message {
  color: var(--color-delete, #ef4444);
}

.message-bubble.ai-status.warning .status-message {
  color: #f59e0b;
}

.message-bubble.ai-status.loading .status-message,
.message-bubble.ai-status.generating .status-message {
  color: #3b82f6;
}

.progress-bar {
  margin-top: 8px;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.progress-text {
  margin-top: 4px;
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .message-bubble.ai-status {
    max-width: 100%;
  }
}
</style>
