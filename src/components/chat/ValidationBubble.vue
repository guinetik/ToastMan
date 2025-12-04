<template>
  <div class="message-bubble validation">
    <div class="validation-card">
      <div class="validation-header">
        <div class="header-left">
          <span class="validation-icon">!</span>
          <span class="validation-title">cURL Validation Failed</span>
        </div>
        <div class="header-right">
          <span class="error-count" v-if="errorCount > 0">
            {{ errorCount }} error{{ errorCount !== 1 ? 's' : '' }}
          </span>
          <span class="warning-count" v-if="warningCount > 0">
            {{ warningCount }} warning{{ warningCount !== 1 ? 's' : '' }}
          </span>
          <span class="timestamp">{{ formattedTimestamp }}</span>
        </div>
      </div>

      <div class="validation-content">
        <p class="validation-intro">
          Your cURL command has issues that need to be fixed before sending:
        </p>

        <div class="error-list">
          <div
            v-for="(error, index) in errors"
            :key="index"
            class="error-item"
            :class="error.type"
          >
            <span class="error-type-icon">
              {{ error.type === 'error' ? 'x' : '!' }}
            </span>
            <div class="error-details">
              <span class="error-location" v-if="error.row !== undefined">
                Line {{ error.row + 1 }}, Col {{ error.column + 1 }}
              </span>
              <span class="error-message">{{ error.text }}</span>
            </div>
          </div>
        </div>

        <div class="validation-tip">
          <span class="tip-icon">i</span>
          <span class="tip-text">
            Fix the highlighted errors in the editor above, then try sending again.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const data = computed(() => props.message.data || {})
const errors = computed(() => data.value.errors || [])
const errorCount = computed(() => data.value.errorCount || 0)
const warningCount = computed(() => data.value.warningCount || 0)

const formattedTimestamp = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<style scoped>
.message-bubble.validation {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  margin-right: auto;
}

.validation-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-error);
  border-left: 4px solid var(--color-error);
  border-radius: 8px;
  overflow: hidden;
}

.validation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.validation-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-error);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.validation-title {
  font-weight: 600;
  color: var(--color-error);
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.error-count {
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
  border-radius: 10px;
  font-weight: 500;
}

.warning-count {
  padding: 2px 8px;
  background: rgba(245, 158, 11, 0.2);
  color: var(--color-warning);
  border-radius: 10px;
  font-weight: 500;
}

.timestamp {
  color: var(--color-text-muted);
}

.validation-content {
  padding: 14px;
}

.validation-intro {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--color-border);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}

.error-item.error {
  border-left: 3px solid var(--color-error);
}

.error-item.warning {
  border-left: 3px solid var(--color-warning);
}

.error-type-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.error-item.error .error-type-icon {
  background: var(--color-error);
  color: white;
}

.error-item.warning .error-type-icon {
  background: var(--color-warning);
  color: white;
}

.error-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.error-location {
  color: var(--color-text-muted);
  font-size: 10px;
}

.error-message {
  color: var(--color-text-primary);
  word-break: break-word;
}

.error-item.error .error-message {
  color: var(--color-error);
}

.error-item.warning .error-message {
  color: var(--color-warning);
}

.validation-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
}

.tip-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  font-style: italic;
  flex-shrink: 0;
}

.tip-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
