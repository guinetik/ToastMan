<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { HistoryController } from '../../controllers/HistoryController.js'
import { useMobileView } from '../../composables/useMobileView.js'

// Create controller instance
const controller = new HistoryController()

// Mobile view composable
const { showComposer, isMobile } = useMobileView()

// Get sessions as a computed property
const sessions = computed(() => {
  return controller.getSessions().map(conv => controller.getSessionSummary(conv))
})

// Component methods that delegate to controller
const clearHistory = () => controller.clearHistory()
const openSession = (sessionId) => {
  controller.openSession(sessionId)
  // Switch to composer view on mobile when opening a session
  if (isMobile()) {
    showComposer()
  }
}
const removeSession = (sessionId) => controller.removeSession(sessionId)

// Utility methods
const formatTime = (timestamp) => controller.formatTime(timestamp)
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
      <span class="section-title">Session History</span>
      <div class="header-actions">
        <button
          v-if="sessions.length > 0"
          class="btn-icon"
          title="Clear All Sessions"
          @click="clearHistory"
        >
          <span class="icon-trash">&#128465;</span>
        </button>
      </div>
    </div>

    <div class="history-list">
      <div v-if="sessions.length === 0" class="empty-state welcome-state">
        <div class="welcome-icon">&#128172;</div>
        <h3>No Session History</h3>
        <p>Your conversation sessions will appear here. Send some requests to get started!</p>
        <div class="quick-tips">
          <h4>Session Features:</h4>
          <ul>
            <li>Full conversation threads</li>
            <li>Continue where you left off</li>
            <li>Persists across browser sessions</li>
          </ul>
        </div>
      </div>
      <template v-else>
        <div
          v-for="session in sessions"
          :key="session.id"
          class="history-item"
          @click="openSession(session.id)"
        >
          <div class="history-header">
            <span
              class="method-badge"
              :style="{ color: getMethodColor(session.method) }"
            >
              {{ session.method }}
            </span>
            <span class="history-name">{{ session.name }}</span>
            <span class="history-time">{{ formatTime(session.updatedAt) }}</span>
            <button
              class="btn-remove"
              title="Remove session"
              @click.stop="removeSession(session.id)"
            >
              &times;
            </button>
          </div>
          <div class="history-meta">
            <span class="message-count">
              {{ session.messageCount }} message{{ session.messageCount !== 1 ? 's' : '' }}
            </span>
            <span class="url-preview" v-if="session.url !== session.name">
              {{ session.url }}
            </span>
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
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.icon-trash {
  font-size: 14px;
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
  min-width: 45px;
  text-align: left;
}

.history-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.btn-remove {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: var(--color-error);
  color: white;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 53px;
}

.message-count {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
}

.url-preview {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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
