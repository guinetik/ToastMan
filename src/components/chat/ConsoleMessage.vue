<template>
  <div class="message-bubble console-output">
    <div class="console-card">
      <div class="console-header">
        <div class="header-left">
          <span class="console-icon">></span>
          <span class="console-title">Console Output</span>
        </div>
        <div class="header-right">
          <span class="log-count">{{ logs.length }} message{{ logs.length !== 1 ? 's' : '' }}</span>
          <span class="timestamp">{{ formattedTimestamp }}</span>
        </div>
      </div>

      <div class="console-content">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="log-item"
          :class="log.type"
        >
          <span class="log-type-badge">{{ getTypeBadge(log.type) }}</span>
          <div class="log-args">
            <span
              v-for="(arg, argIndex) in log.args"
              :key="argIndex"
              class="log-arg"
            >{{ arg }}</span>
          </div>
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
const logs = computed(() => data.value.logs || [])

const formattedTimestamp = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const getTypeBadge = (type) => {
  const badges = {
    log: 'LOG',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERR',
    debug: 'DBG'
  }
  return badges[type] || 'LOG'
}
</script>

<style scoped>
.message-bubble.console-output {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  margin-right: auto;
}

.console-card {
  background: #1a1a1a;
  border: 1px solid var(--color-border);
  border-left: 4px solid #6b7280;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252525;
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.console-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4b5563;
  color: #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.console-title {
  font-weight: 600;
  color: #9ca3af;
  font-size: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
}

.log-count {
  color: #6b7280;
}

.timestamp {
  color: #4b5563;
}

.console-content {
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid #2d2d2d;
}

.log-item:last-child {
  border-bottom: none;
}

.log-type-badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  min-width: 32px;
  text-align: center;
}

.log-item.log .log-type-badge {
  background: #374151;
  color: #9ca3af;
}

.log-item.info .log-type-badge {
  background: #1e3a5f;
  color: #60a5fa;
}

.log-item.warn .log-type-badge {
  background: #78350f;
  color: #fbbf24;
}

.log-item.error .log-type-badge {
  background: #7f1d1d;
  color: #f87171;
}

.log-item.debug .log-type-badge {
  background: #4c1d95;
  color: #a78bfa;
}

.log-args {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.log-arg {
  font-size: 11px;
  word-break: break-word;
  white-space: pre-wrap;
}

.log-item.log .log-arg {
  color: #d1d5db;
}

.log-item.info .log-arg {
  color: #93c5fd;
}

.log-item.warn .log-arg {
  color: #fcd34d;
}

.log-item.error .log-arg {
  color: #fca5a5;
}

.log-item.debug .log-arg {
  color: #c4b5fd;
}

/* Scrollbar styling for console */
.console-content::-webkit-scrollbar {
  width: 6px;
}

.console-content::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.console-content::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.console-content::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
