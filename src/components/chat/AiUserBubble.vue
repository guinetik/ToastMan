<template>
  <div class="message-bubble ai-user">
    <div class="bubble-header">
      <span class="ai-icon">✨</span>
      <span class="label">AI Query</span>
      <span class="timestamp">{{ formattedTime }}</span>
    </div>

    <div class="query-content">
      {{ query }}
    </div>

    <div class="bubble-actions">
      <button class="action-btn" @click="$emit('delete')" title="Delete">
        Delete
      </button>
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

defineEmits(['delete'])

const query = computed(() => props.message.data?.query || '')

const formattedTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<style scoped>
.message-bubble.ai-user {
  align-self: flex-end;
  width: 70%;
  max-width: 70%;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-left: auto;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-icon {
  font-size: 14px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.timestamp {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-muted);
}

.query-content {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-primary);
  word-wrap: break-word;
}

.bubble-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  justify-content: flex-end;
}

.action-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .message-bubble.ai-user {
    width: 100%;
    max-width: 100%;
    margin-left: 0;
  }
}
</style>
