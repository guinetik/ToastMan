<script setup>
import { ref, computed, onMounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import './App.css'
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

// Chat tabs refs (separate for desktop and mobile to avoid double mounting)
const chatTabsRef = ref(null)
const mobileTabsRef = ref(null)

// Modal states
const showCorsModal = ref(false)
const showCurlTutorial = ref(false)

// Reactive mobile check
const isOnMobile = computed(() => isMobile())

// Global environment indicator
const activeEnvironment = computed(() => {
  const active = environmentsStore.activeEnvironment
  const resolved = active?.value || active
  // Only return if we have a valid environment with a name
  return resolved && resolved.name ? resolved : null
})

const sidebarWidth = ref(25) // 25% initial width
const showSidebar = ref(true) // Desktop sidebar visibility
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

/**
 * Toggle sidebar visibility on desktop
 */
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
  logger.debug('Sidebar toggled', { visible: showSidebar.value })
}

/**
 * Handle toggle button click - different behavior for mobile vs desktop
 */
const handleToggleButton = () => {
  if (isMobile()) {
    // Mobile: toggle between sidebar and composer views
    toggleMobileView()
  } else {
    // Desktop: toggle sidebar visibility
    toggleSidebar()
  }
}

const toggleViewMode = () => {
  // Use the correct ref based on mobile/desktop
  const chatTabs = isMobile() ? mobileTabsRef.value : chatTabsRef.value
  const chatView = chatTabs?.chatViewRef
  if (chatView?.toggleViewMode) {
    chatView.toggleViewMode()
  }
}

const createNewRequest = () => {
  logger.debug('Creating new request')
  const chatTabs = isMobile() ? mobileTabsRef.value : chatTabsRef.value
  if (chatTabs) {
    chatTabs.addNewTab()
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
        <!-- Toggle Button (Mobile: switch views | Desktop: show/hide sidebar) -->
        <button
          class="toggle-sidebar-button"
          @click="handleToggleButton"
          :title="isOnMobile
            ? (mobileView === 'sidebar' ? 'Show Composer' : 'Show Sidebar')
            : (showSidebar ? 'Hide Sidebar' : 'Show Sidebar')"
        >
          <template v-if="isOnMobile">
            {{ mobileView === 'composer' ? '📁' : '💬' }}
          </template>
          <template v-else>
            {{ showSidebar ? '◀️' : '▶️' }}
          </template>
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
          v-if="tabsStore.activeTab.value"
          class="view-mode-toggle-button"
          @click="toggleViewMode"
          title="Toggle view mode"
        >
          ⬆️⬇️
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
      <Splitpanes v-if="!isOnMobile" class="default-theme desktop-layout" @resize="handleResize">
        <!-- Left Sidebar (conditionally rendered) -->
        <Pane v-if="showSidebar" :size="sidebarWidth" min-size="20" max-size="40">
          <Sidebar />
        </Pane>

        <!-- Right Panel - Chat Tabs -->
        <Pane>
          <ChatTabs ref="chatTabsRef" />
        </Pane>
      </Splitpanes>

      <!-- Mobile: Toggle between sidebar and composer -->
      <div v-if="isOnMobile" class="mobile-layout">
        <div class="mobile-view" :class="{ active: mobileView === 'sidebar' }">
          <Sidebar />
        </div>
        <div class="mobile-view" :class="{ active: mobileView === 'composer' }">
          <ChatTabs ref="mobileTabsRef" />
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