<script setup>
import { onMounted, onUnmounted } from 'vue'
import { HistoryController } from '../../controllers/HistoryController.js'

// Create controller instance
const controller = new HistoryController()

// Access reactive state from controller
const state = controller.state

// Component methods that delegate to controller
const clearHistory = () => controller.clearHistory()
const openHistoryRequest = (entry) => controller.openHistoryRequest(entry)
const removeHistoryEntry = (entryId) => controller.removeHistoryEntry(entryId)

// Utility methods
const formatTime = (timestamp) => controller.formatTime(timestamp)
const getStatusClass = (status) => controller.getStatusClass(status)
const getMethodColor = (method) => controller.getMethodColor(method)

// Lifecycle hooks
onMounted(() => {
  controller.init()
})

onUnmounted(() => {
  controller.onUnmounted()
})
</script>

<template>
  <div class="history-tab">
    <div class="section-header">
      <span class="section-title">Request History</span>
      <div class="header-actions">
        <button
          v-if="state.requestHistory && state.requestHistory.length > 0"
          class="btn-icon"
          title="Clear History"
          @click="clearHistory"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="history-list">
      <div v-if="!state.requestHistory || state.requestHistory.length === 0" class="empty-state welcome-state">
        <div class="welcome-icon">📜</div>
        <h3>No Request History</h3>
        <p>Once you start sending requests, they'll appear here so you can easily access them again.</p>
        <div class="quick-tips">
          <h4>History Features:</h4>
          <ul>
            <li>Automatic request tracking</li>
            <li>Response time monitoring</li>
            <li>Quick re-execution</li>
          </ul>
        </div>
      </div>
      <template v-else>
        <div
          v-for="entry in state.requestHistory"
          :key="entry.id"
          class="history-item"
          @click="openHistoryRequest(entry)"
        >
          <div class="history-header">
            <span
              class="method-badge"
              :style="{ color: getMethodColor(entry.method) }"
            >
              {{ entry.method }}
            </span>
            <span class="history-url">{{ entry.url }}</span>
            <span class="history-time">{{ formatTime(entry.timestamp) }}</span>
            <button
              class="btn-remove"
              title="Remove from history"
              @click.stop="removeHistoryEntry(entry.id)"
            >
              ×
            </button>
          </div>
          <div class="history-status">
            <span
              :class="['status-code', getStatusClass(entry.status)]"
              v-if="entry.status"
            >
              {{ entry.status }}
            </span>
            <span class="response-time" v-if="entry.responseTime">{{ entry.responseTime }}ms</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.history-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-light);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border-light);
  margin-bottom: 8px;
  position: relative;
}

.history-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.history-item:hover .btn-remove {
  opacity: 1;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.method-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 35px;
  text-align: left;
}

.history-url {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: var(--color-text-muted);
}

.btn-remove {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-remove:hover {
  background: var(--color-error);
  color: white;
}

.history-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-code {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-code.success {
  background: var(--color-success);
  color: white;
}

.status-code.warning {
  background: var(--color-warning);
  color: white;
}

.status-code.error {
  background: var(--color-error);
  color: white;
}

.response-time {
  font-size: 11px;
  color: var(--color-text-muted);
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
}

.welcome-state {
  padding: 32px 24px;
  font-style: normal;
  max-width: 300px;
  margin: 0 auto;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.welcome-state h3 {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.welcome-state p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.quick-tips {
  text-align: left;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border-light);
}

.quick-tips h4 {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quick-tips ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-tips li {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
}

.quick-tips li:before {
  content: "•";
  color: var(--color-primary);
  position: absolute;
  left: 0;
}
</style>