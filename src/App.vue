<script setup>
import { ref, computed, onMounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import Sidebar from './components/Sidebar.vue'
import RequestTabs from './components/RequestTabs.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import AlertDialog from './components/AlertDialog.vue'
import { useEnvironments } from './stores/useEnvironments.js'
import { useTabs } from './stores/useTabs.js'
import { useAlert } from './composables/useAlert.js'
import { createLogger } from './core/Logger.js'

const logger = createLogger('app')
const environmentsStore = useEnvironments()
const tabsStore = useTabs()
const { alertState, handleConfirm, handleCancel, closeAlert } = useAlert()

// Global environment indicator
const activeEnvironment = computed(() => {
  const active = environmentsStore.activeEnvironment
  const resolved = active?.value || active
  // Only return if we have a valid environment with a name
  return resolved && resolved.name ? resolved : null
})

const sidebarWidth = ref(25) // 25% initial width
const showSettings = ref(false)

const openSettings = () => {
  logger.debug('Opening settings dialog')
  showSettings.value = true
}

const closeSettings = () => {
  logger.debug('Closing settings dialog')
  showSettings.value = false
}

const createNewRequest = () => {
  logger.debug('Creating new request tab')
  const newTab = tabsStore.createTab({
    name: 'New Request',
    method: 'GET'
  })
  logger.info('Created new tab:', newTab.id)
}

const handleResize = (event) => {
  try {
    // Handle different possible event formats from splitpanes
    if (Array.isArray(event) && event.length > 0 && event[0] && typeof event[0].size === 'number') {
      sidebarWidth.value = event[0].size
    } else if (event && typeof event.size === 'number') {
      sidebarWidth.value = event.size
    } else if (Array.isArray(event) && event.length > 0 && typeof event[0] === 'number') {
      sidebarWidth.value = event[0]
    } else {
      // Log the event structure to help debug
      logger.warn('Unexpected resize event format:', event)
    }
  } catch (error) {
    logger.error('Error handling resize:', error)
  }
}

// Initialize logging and expose global API
onMounted(() => {
  logger.info('ToastMan application mounted')
  logger.info('Global logging API available at window.toastmanLog')

  // Log initial state for debugging
  logger.debug('Initial sidebar width:', sidebarWidth.value)

  // Expose additional debugging helpers
  if (typeof window !== 'undefined') {
    window.toastmanDebug = {
      logger: createLogger('debug'),
      logAllComponents: () => {
        logger.info('🔧 Enabling logging for all ToastMan components...')
        window.toastmanLog.enableAll()
      },
      enableCollections: () => window.toastmanLog.enable('collections'),
      enableStorage: () => window.toastmanLog.enable('storage'),
      enableSidebar: () => window.toastmanLog.enable('sidebar'),
      enableTabs: () => window.toastmanLog.enable('tabs'),
      status: () => window.toastmanLog.status(),
      list: () => window.toastmanLog.list()
    }
    logger.info('Debug helpers available at window.toastmanDebug')
  }
})
</script>

<template>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <div class="logo-section">
        <h1 class="app-title">🍞 ToastMan</h1>
        <span class="app-subtitle">API Testing Tool</span>
      </div>

      <!-- Global Environment Indicator -->
      <div class="environment-indicator" v-if="activeEnvironment && activeEnvironment.name">
        <span class="env-label">Environment:</span>
        <span class="env-name">{{ activeEnvironment.name }}</span>
      </div>

      <div class="header-actions">
        <button
          class="create-request-button"
          @click="createNewRequest"
          title="Create New Request"
        >
          ➕ New Request
        </button>
        <button
          class="settings-button"
          @click="openSettings"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="app-main">
      <Splitpanes class="default-theme" @resize="handleResize">
        <!-- Left Sidebar -->
        <Pane :size="sidebarWidth" min-size="20" max-size="40">
          <Sidebar />
        </Pane>

        <!-- Right Panel -->
        <Pane>
          <RequestTabs />
        </Pane>
      </Splitpanes>
    </div>

    <!-- Settings Dialog -->
    <SettingsDialog
      v-if="showSettings"
      @close="closeSettings"
    />

    <!-- Global Alert Dialog -->
    <AlertDialog
      v-if="alertState.show"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
      :confirm-text="alertState.confirmText"
      :cancel-text="alertState.cancelText"
      :show-input="alertState.showInput"
      :input-placeholder="alertState.inputPlaceholder"
      :input-value="alertState.inputValue"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close="closeAlert"
    />
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.app-header {
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.default-theme .splitpanes__splitter {
  background: var(--color-border);
  width: 1px;
  border: none;
  position: relative;
}

.default-theme .splitpanes__splitter:before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  width: 5px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
}

.default-theme .splitpanes__splitter:hover:before {
  background: var(--color-primary-light);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-request-button {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.create-request-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.settings-button {
  padding: 8px;
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 36px;
  min-height: 36px;
}

.settings-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
}

/* Environment Indicator */
.environment-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  font-size: 12px;
}

.env-label {
  color: var(--color-text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.env-name {
  color: var(--color-primary);
  font-weight: 600;
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>