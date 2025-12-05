<template>
  <div class="message-bubble script-results">
    <div class="script-card" :class="{ 'has-failures': failedCount > 0, 'all-passed': failedCount === 0 && passedCount > 0 }">
      <div class="script-header">
        <div class="header-left">
          <span class="script-icon">{{ failedCount > 0 ? '!' : '✓' }}</span>
          <span class="script-title">Script Tests</span>
        </div>
        <div class="header-right">
          <span class="passed-count" v-if="passedCount > 0">
            {{ passedCount }} passed
          </span>
          <span class="failed-count" v-if="failedCount > 0">
            {{ failedCount }} failed
          </span>
          <span class="timestamp">{{ formattedTimestamp }}</span>
        </div>
      </div>

      <div class="script-content" v-if="tests.length > 0">
        <div
          v-for="(test, index) in tests"
          :key="index"
          class="test-item"
          :class="{ passed: test.passed, failed: !test.passed }"
        >
          <span class="test-icon">{{ test.passed ? '✓' : '✗' }}</span>
          <div class="test-details">
            <span class="test-name">{{ test.name }}</span>
            <span class="test-duration" v-if="test.duration !== undefined">
              {{ test.duration.toFixed(1) }}ms
            </span>
            <div class="test-error" v-if="!test.passed && test.error">
              <span class="error-message">{{ test.error.message }}</span>
              <div class="error-diff" v-if="test.error.expected !== undefined">
                <span class="expected">Expected: {{ formatValue(test.error.expected) }}</span>
                <span class="actual">Actual: {{ formatValue(test.error.actual) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="script-content" v-else-if="scriptError">
        <div class="script-error">
          <span class="error-icon">!</span>
          <div class="error-details">
            <span class="error-title">Script Error</span>
            <span class="error-message">{{ scriptError.message }}</span>
          </div>
        </div>
      </div>

      <div class="script-footer" v-if="duration">
        <span class="duration-label">Script executed in {{ duration.toFixed(1) }}ms</span>
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
const tests = computed(() => data.value.tests || [])
const scriptError = computed(() => data.value.error || null)
const duration = computed(() => data.value.duration)

const passedCount = computed(() => tests.value.filter(t => t.passed).length)
const failedCount = computed(() => tests.value.filter(t => !t.passed).length)

const formattedTimestamp = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const formatValue = (value) => {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}
</script>

<style scoped>
.message-bubble.script-results {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  margin-right: auto;
}

.script-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-text-muted);
  border-radius: 8px;
  overflow: hidden;
}

.script-card.all-passed {
  border-left-color: var(--color-success);
}

.script-card.has-failures {
  border-left-color: var(--color-error);
}

.script-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-text-muted);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
}

.all-passed .script-icon {
  background: var(--color-success);
}

.has-failures .script-icon {
  background: var(--color-error);
}

.script-title {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.passed-count {
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.2);
  color: var(--color-success);
  border-radius: 10px;
  font-weight: 500;
}

.failed-count {
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
  border-radius: 10px;
  font-weight: 500;
}

.timestamp {
  color: var(--color-text-muted);
}

.script-content {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.test-item.passed {
  border-left: 3px solid var(--color-success);
}

.test-item.failed {
  border-left: 3px solid var(--color-error);
}

.test-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.test-item.passed .test-icon {
  background: var(--color-success);
  color: white;
}

.test-item.failed .test-icon {
  background: var(--color-error);
  color: white;
}

.test-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.test-name {
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.test-duration {
  font-size: 10px;
  color: var(--color-text-muted);
}

.test-error {
  margin-top: 4px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
  font-size: 11px;
}

.test-error .error-message {
  color: var(--color-error);
  word-break: break-word;
}

.error-diff {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 10px;
}

.error-diff .expected {
  color: var(--color-success);
}

.error-diff .actual {
  color: var(--color-error);
}

.script-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  border-radius: 6px;
}

.script-error .error-icon {
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
  flex-shrink: 0;
}

.script-error .error-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.script-error .error-title {
  font-weight: 600;
  color: var(--color-error);
  font-size: 12px;
}

.script-error .error-message {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  word-break: break-word;
}

.script-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.duration-label {
  font-size: 10px;
  color: var(--color-text-muted);
}
</style>
