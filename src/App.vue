<script setup>
import { ref, computed, onMounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import Sidebar from './components/Sidebar.vue'
import ChatTabs from './components/chat/ChatTabs.vue'
import SettingsDialog from './components/dialogs/SettingsDialog.vue'
import AlertDialog from './components/dialogs/AlertDialog.vue'
import CurlTutorialDialog from './components/dialogs/CurlTutorialDialog.vue'
import { useEnvironments } from './stores/useEnvironments.js'
import { useTabs } from './stores/useTabs.js'
import { useAlert } from './composables/useAlert.js'
import { useAnalytics } from './composables/useAnalytics.js'
import { useMobileView } from './composables/useMobileView.js'
import { UI_EVENTS } from './lib/analytics/AnalyticsEvents.js'
import { createLogger } from './core/logger.js'

const logger = createLogger('app')
const environmentsStore = useEnvironments()
const tabsStore = useTabs()
const { alertState, handleConfirm, handleCancel, closeAlert } = useAlert()
const { trackUI } = useAnalytics()
const { mobileView, toggleMobileView, showComposer, isMobile } = useMobileView()

// Chat tabs ref
const chatTabsRef = ref(null)

// Modal states
const showCorsModal = ref(false)
const showCurlTutorial = ref(false)

// Global environment indicator
const activeEnvironment = computed(() => {
  const active = environmentsStore.activeEnvironment
  const resolved = active?.value || active
  // Only return if we have a valid environment with a name
  return resolved && resolved.name ? resolved : null
})

const sidebarWidth = ref(25) // 25% initial width
const showSettings = ref(false)
const settingsTab = ref('general')

const openSettings = (tab = 'general') => {
  logger.debug('Opening settings dialog', { tab })
  settingsTab.value = tab
  showSettings.value = true
  trackUI(UI_EVENTS.SETTINGS_OPEN)
}

const closeSettings = () => {
  logger.debug('Closing settings dialog')
  showSettings.value = false
}

const openCorsModal = () => {
  showCorsModal.value = true
  trackUI(UI_EVENTS.CORS_MODAL_OPEN)
}

const openCurlTutorial = () => {
  showCurlTutorial.value = true
  trackUI(UI_EVENTS.CURL_TUTORIAL_OPEN)
}

/**
 * Downloads the Chrome shortcut zip file
 * Uses blob download to ensure correct filename preservation
 * Note: Public assets in Vite are always served from root, regardless of base path
 */
const downloadChromeShortcut = async () => {
  try {
    // Public assets are always at root, even with base path
    const filePath = '/Toastman-Chrome.zip'
    
    logger.debug('Downloading Chrome shortcut from:', filePath)
    const response = await fetch(filePath)
    
    if (!response.ok) {
      throw new Error(`Failed to download shortcut: ${response.status} ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Toastman-Chrome.zip'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }, 100)
    
    logger.info('Chrome shortcut downloaded successfully')
  } catch (error) {
    logger.error('Error downloading Chrome shortcut:', error)
    alert(`Failed to download Chrome shortcut: ${error.message}`)
  }
}

const createNewRequest = () => {
  logger.debug('Creating new request')
  if (chatTabsRef.value) {
    chatTabsRef.value.addNewTab()
  } else {
    tabsStore.createTab({
      name: 'New Request',
      method: 'GET'
    })
  }
  logger.info('Created new request')
  trackUI(UI_EVENTS.NEW_REQUEST)

  // Switch to composer view on mobile
  if (isMobile()) {
    showComposer()
  }
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

  // Listen for global settings events
  window.addEventListener('toastman:open-settings', (event) => {
    const { tab } = event.detail || {}
    openSettings(tab)
  })

  window.addEventListener('toastman:close-settings', () => {
    closeSettings()
  })

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
        <!-- Mobile Toggle Button (icon-only) -->
        <button
          class="mobile-toggle-button"
          @click="toggleMobileView"
          :title="mobileView === 'sidebar' ? 'Show Composer' : 'Show Sidebar'"
        >
          {{ mobileView === 'composer' ? '📁' : '💬' }}
        </button>

        <button
          class="create-request-button"
          @click="createNewRequest"
          title="Create New Request"
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text">New Request</span>
        </button>
        <button
          class="curl-tutorial-button"
          @click="openCurlTutorial"
          title="cURL Tutorial"
        >
          <span class="btn-icon">📖</span>
          <span class="btn-text">cURL Tutorial</span>
        </button>
        <button
          class="cors-button"
          @click="openCorsModal"
          title="CORS Information"
        >
          <span class="btn-icon">⚠️</span>
          <span class="btn-text">CORS</span>
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
      <!-- Desktop: Splitpanes layout -->
      <Splitpanes class="default-theme desktop-layout" @resize="handleResize">
        <!-- Left Sidebar -->
        <Pane :size="sidebarWidth" min-size="20" max-size="40">
          <Sidebar />
        </Pane>

        <!-- Right Panel - Chat Tabs -->
        <Pane>
          <ChatTabs ref="chatTabsRef" />
        </Pane>
      </Splitpanes>

      <!-- Mobile: Toggle between sidebar and composer -->
      <div class="mobile-layout">
        <div class="mobile-view" :class="{ active: mobileView === 'sidebar' }">
          <Sidebar />
        </div>
        <div class="mobile-view" :class="{ active: mobileView === 'composer' }">
          <ChatTabs ref="chatTabsRef" />
        </div>
      </div>
    </div>

    <!-- Settings Dialog -->
    <SettingsDialog
      v-if="showSettings"
      :initialTab="settingsTab"
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

    <!-- CORS Information Modal -->
    <Teleport to="body">
      <div v-if="showCorsModal" class="cors-modal-overlay" @click.self="showCorsModal = false">
        <div class="cors-modal">
          <div class="cors-modal-header">
            <h2>⚠️ CORS Limitations</h2>
            <button class="cors-close-btn" @click="showCorsModal = false">&times;</button>
          </div>

          <div class="cors-modal-content">
            <div class="cors-section">
              <h3>🌐 Web Version Limitations</h3>
              <p>
                ToastMan runs in your browser, which means it's subject to
                <strong>Cross-Origin Resource Sharing (CORS)</strong> restrictions.
                Most APIs won't respond to requests from a browser unless they explicitly allow it.
              </p>
            </div>

            <div class="cors-section coming-soon">
              <h3>🚀 VS Code Extension (Coming Soon)</h3>
              <p>
                We're building a <strong>VS Code extension</strong> that runs without CORS limitations.
                Stay tuned for the best ToastMan experience!
              </p>
            </div>

            <div class="cors-section workaround">
              <h3>🔧 Workaround: Disable Web Security</h3>
              <p class="warning-text">
                ⚠️ <strong>Security Warning:</strong> This disables browser security features.
                Only use this for development/testing and <strong>never browse untrusted sites</strong>
                with this flag enabled. Close the browser completely when done.
              </p>

              <div class="os-instructions">
                <div class="os-block">
                  <h4>🪟 Windows</h4>
                  <button @click="downloadChromeShortcut" class="download-shortcut-btn">
                    ⬇️ Download Chrome Shortcut
                  </button>
                  <p class="hint">Just double-click the downloaded shortcut to launch Chrome with CORS disabled</p>
                  <details class="manual-option">
                    <summary>Or run manually:</summary>
                    <code>chrome.exe --disable-web-security --user-data-dir="C:\tmp\chrome_dev"</code>
                  </details>
                </div>

                <div class="os-block">
                  <h4>🐧 Linux</h4>
                  <p>Close all Chrome windows, then run:</p>
                  <code>google-chrome --disable-web-security --user-data-dir="/tmp/chrome_dev"</code>
                  <p class="hint">For Chromium: replace google-chrome with chromium-browser</p>
                </div>

                <div class="os-block">
                  <h4>🍎 macOS</h4>
                  <p>Close all Chrome windows, then run:</p>
                  <code>open -na "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome_dev"</code>
                </div>
              </div>
            </div>

            <div class="cors-section">
              <h3>✅ After launching with the flag</h3>
              <p>
                Navigate to ToastMan and you'll be able to make requests to any API.
                You'll see a warning banner in Chrome indicating security is disabled.
              </p>
            </div>
          </div>

          <div class="cors-modal-footer">
            <button class="cors-got-it-btn" @click="showCorsModal = false">Got it!</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- cURL Tutorial Modal -->
    <CurlTutorialDialog
      :show="showCurlTutorial"
      @close="showCurlTutorial = false"
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
  box-shadow: var(--shadow-sm);
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
  color: var(--color-text-primary);
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

/* Vertical splitter (between sidebar and main) */
.default-theme .splitpanes__splitter {
  background: var(--color-border);
  width: 1px;
  min-width: 1px;
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
  background: var(--color-border-dark);
}

/* Horizontal splitter (between request and response) */
.default-theme .splitpanes--horizontal > .splitpanes__splitter {
  height: 1px;
  min-height: 1px;
  width: 100%;
}

.default-theme .splitpanes--horizontal > .splitpanes__splitter:before {
  left: 0;
  top: -2px;
  width: 100%;
  height: 5px;
  cursor: row-resize;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-request-button {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  background: var(--color-button-bg);
  border: 1px solid var(--color-border-dark);
  color: var(--color-button-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.create-request-button:hover {
  background: var(--color-button-bg-hover);
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
  color: var(--color-text-primary);
  border-color: var(--color-border-dark);
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
  color: var(--color-text-primary);
  font-weight: 600;
  background: var(--color-bg-hover);
  padding: 2px 6px;
  border-radius: 4px;
}

/* cURL Tutorial Button */
.curl-tutorial-button {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: #1a3a2a;
  border: 1px solid #2d5a40;
  color: #4ade80;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.curl-tutorial-button:hover {
  background: #2d5a40;
  border-color: #4ade80;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(74, 222, 128, 0.2);
}

/* CORS Button */
.cors-button {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: #3d3200;
  border: 1px solid #665500;
  color: #ffc107;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cors-button:hover {
  background: #4d4000;
  border-color: #ffc107;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
}

/* CORS Modal */
.cors-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: corsBackdropFadeIn 0.2s ease-out;
}

@keyframes corsBackdropFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.cors-modal {
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.98) 0%,
    rgba(20, 20, 20, 0.98) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  animation: corsModalAppear 0.25s ease-out;
}

@keyframes corsModalAppear {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.cors-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.cors-modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-text-primary);
}

.cors-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.cors-close-btn:hover {
  color: var(--color-text-primary);
}

.cors-modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.cors-section {
  margin-bottom: 24px;
}

.cors-section:last-child {
  margin-bottom: 0;
}

.cors-section h3 {
  font-size: 16px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.cors-section p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.cors-section.coming-soon {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-md);
  padding: 16px;
}

.cors-section.workaround {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
}

.warning-text {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: var(--radius-sm);
  padding: 12px;
  color: #ffc107 !important;
}

.os-instructions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.os-block {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 16px;
}

.os-block h4 {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.os-block p {
  font-size: 13px;
  margin: 0 0 8px 0;
}

.os-block code {
  display: block;
  background: #1a1a2e;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #4ade80;
  overflow-x: auto;
  white-space: nowrap;
}

.os-block .hint {
  font-size: 11px;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 8px 0 0 0;
}

.download-shortcut-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: #000;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border: none;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  margin-bottom: 12px;
  cursor: pointer;
  font-family: inherit;
}

.download-shortcut-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
}

.manual-option {
  margin-top: 8px;
}

.manual-option summary {
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px 0;
}

.manual-option summary:hover {
  color: var(--color-text-secondary);
}

.manual-option code {
  margin-top: 8px;
}

.cors-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.cors-got-it-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--color-button-bg);
  border: 1px solid var(--color-border-dark);
  color: var(--color-button-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cors-got-it-btn:hover {
  background: var(--color-button-bg-hover);
}

/* Mobile Toggle Button */
.mobile-toggle-button {
  display: none;
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

.mobile-toggle-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-dark);
}

/* Mobile Layout (hidden by default) */
.mobile-layout {
  display: none;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.mobile-view {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.mobile-view.active {
  opacity: 1;
  pointer-events: auto;
}

/* Desktop Layout (visible by default) */
.desktop-layout {
  display: flex;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  /* Show mobile toggle button */
  .mobile-toggle-button {
    display: flex;
  }

  /* Hide desktop layout, show mobile layout */
  .desktop-layout {
    display: none !important;
  }

  .mobile-layout {
    display: block;
  }

  /* Header adjustments */
  .app-header {
    padding: 8px 12px;
    min-height: auto;
    flex-wrap: wrap;
    gap: 8px;
  }

  .logo-section {
    flex: 1 1 auto;
    min-width: 0;
  }

  .app-title {
    font-size: 18px;
  }

  .app-subtitle {
    display: none;
  }

  .environment-indicator {
    order: 3;
    flex: 1 1 100%;
    width: 100%;
    justify-content: flex-start;
    font-size: 11px;
    padding: 4px 8px;
  }

  .header-actions {
    gap: 6px;
    flex-wrap: nowrap;
  }

  /* Make buttons icon-only on mobile */
  .create-request-button .btn-text,
  .curl-tutorial-button .btn-text,
  .cors-button .btn-text {
    display: none;
  }

  .create-request-button,
  .curl-tutorial-button,
  .cors-button {
    padding: 8px;
    min-width: 36px;
  }

  .btn-icon {
    font-size: 16px;
  }

  .settings-button,
  .mobile-toggle-button {
    padding: 8px;
    min-width: 36px;
  }
}

/* Extra small screens */
@media (max-width: 480px) {
  .app-header {
    padding: 6px 8px;
  }

  .app-title {
    font-size: 16px;
  }

  .logo-section {
    gap: 6px;
  }

  .environment-indicator {
    font-size: 10px;
    padding: 3px 6px;
  }

  .header-actions {
    gap: 4px;
  }

  .create-request-button,
  .curl-tutorial-button,
  .cors-button,
  .settings-button,
  .mobile-toggle-button {
    padding: 6px;
    min-width: 32px;
    font-size: 14px;
  }
}

/* Narrow screens - compact environment indicator */
@media (max-width: 600px) {
  .env-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>