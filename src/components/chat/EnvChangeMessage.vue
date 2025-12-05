<template>
  <div class="message-bubble env-changes">
    <div class="env-card">
      <div class="env-header">
        <div class="header-left">
          <span class="env-icon">≡</span>
          <span class="env-title">Environment Updated</span>
        </div>
        <div class="header-right">
          <span class="env-name" v-if="environmentName">{{ environmentName }}</span>
          <span class="change-count">{{ changes.length }} change{{ changes.length !== 1 ? 's' : '' }}</span>
          <span class="timestamp">{{ formattedTimestamp }}</span>
        </div>
      </div>

      <div class="env-content">
        <div
          v-for="(change, index) in changes"
          :key="index"
          class="change-item"
          :class="change.action"
        >
          <span class="change-action-icon">
            {{ getActionIcon(change.action) }}
          </span>
          <div class="change-details">
            <span class="change-key">{{ change.key }}</span>
            <span class="change-equals">=</span>
            <span class="change-value">{{ formatValue(change.value) }}</span>
            <span class="change-label">
              {{ getActionLabel(change.action, change.oldValue) }}
            </span>
          </div>
        </div>
      </div>

      <div class="env-note" v-if="!hasActiveEnvironment">
        <span class="note-icon">!</span>
        <span class="note-text">No active environment - changes were not persisted</span>
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
const changes = computed(() => data.value.changes || [])
const environmentName = computed(() => data.value.environmentName || '')
const hasActiveEnvironment = computed(() => data.value.hasActiveEnvironment !== false)

const formattedTimestamp = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const getActionIcon = (action) => {
  const icons = {
    set: '+',
    unset: '-',
    update: '~'
  }
  return icons[action] || '+'
}

const getActionLabel = (action, oldValue) => {
  if (action === 'unset') return '(removed)'
  if (action === 'set' && oldValue !== undefined) return '(updated)'
  if (action === 'set') return '(new)'
  return ''
}

const formatValue = (value) => {
  if (value === undefined || value === null) return '(empty)'
  const str = String(value)
  // Truncate long values
  if (str.length > 50) {
    return `"${str.substring(0, 47)}..."`
  }
  return `"${str}"`
}
</script>

<style scoped>
.message-bubble.env-changes {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  margin-right: auto;
}

.env-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-left: 4px solid #8b5cf6;
  border-radius: 8px;
  overflow: hidden;
}

.env-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(139, 92, 246, 0.1);
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.env-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8b5cf6;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.env-title {
  font-weight: 600;
  color: #a78bfa;
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.env-name {
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  border-radius: 10px;
  font-weight: 500;
}

.change-count {
  color: var(--color-text-muted);
}

.timestamp {
  color: var(--color-text-muted);
}

.env-content {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--color-border);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}

.change-item.set {
  border-left: 3px solid var(--color-success);
}

.change-item.unset {
  border-left: 3px solid var(--color-error);
}

.change-action-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.change-item.set .change-action-icon {
  background: var(--color-success);
  color: white;
}

.change-item.unset .change-action-icon {
  background: var(--color-error);
  color: white;
}

.change-details {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.change-key {
  color: #a78bfa;
  font-weight: 600;
}

.change-equals {
  color: var(--color-text-muted);
}

.change-value {
  color: var(--color-text-primary);
  word-break: break-all;
}

.change-item.unset .change-value {
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.change-label {
  color: var(--color-text-muted);
  font-size: 10px;
  font-style: italic;
}

.env-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px 12px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
}

.note-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-warning);
  color: white;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  flex-shrink: 0;
}

.note-text {
  font-size: 11px;
  color: var(--color-warning);
}
</style>
