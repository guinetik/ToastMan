<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import { RequestTabsController } from '../controllers/RequestTabsController.js'
import CollectionPickerDialog from './dialogs/CollectionPickerDialog.vue'
import VariableInput from './VariableInput.vue'
import SyntaxHighlighter from './SyntaxHighlighter.vue'
import RequestBodyEditor from './editors/RequestBodyEditor.vue'

// Controller instance
let controller = null

// Reactive refs that will be bound to controller state
const state = ref({})
const tabs = ref([])
const activeTab = ref(null)
const currentRequest = ref(null)

// Initialize controller
onMounted(() => {
  // Create controller instance
  controller = new RequestTabsController()

  // Bind reactive state to controller state
  state.value = controller.state

  // Bind computed properties
  tabs.value = controller.getComputed('tabs')
  activeTab.value = controller.getComputed('activeTab')
  currentRequest.value = controller.getComputed('currentRequest')

  // Setup reactive binding for computed properties
  const updateComputedValues = () => {
    tabs.value = controller.getComputed('tabs')
    activeTab.value = controller.getComputed('activeTab')
    currentRequest.value = controller.getComputed('currentRequest')
  }

  // Update computed values periodically (simple reactive binding)
  const intervalId = setInterval(updateComputedValues, 100)

  // Store interval ID for cleanup
  controller._intervalId = intervalId
})

onUnmounted(() => {
  // Clean up controller
  if (controller) {
    if (controller._intervalId) {
      clearInterval(controller._intervalId)
    }
    controller.dispose()
    controller = null
  }
})

// Delegate all methods to controller
const addNewTab = () => controller?.addNewTab()
const closeTab = (tabId) => controller?.closeTab(tabId)
const setActiveTab = (tabId) => controller?.setActiveTab(tabId)
const addParam = () => controller?.addParam()
const removeParam = (index) => controller?.removeParam(index)
const addHeader = () => controller?.addHeader()
const removeHeader = (index) => controller?.removeHeader(index)
const saveRequest = () => controller?.saveRequest()
const handleSaveRequest = (data) => controller?.handleSaveRequest(data)
const sendRequest = () => controller?.sendRequest()
const toggleView = (mode) => controller?.toggleView(mode)
const setActiveRequestTab = (tab) => controller?.setActiveRequestTab(tab)
const setActiveResponseTab = (tab) => controller?.setActiveResponseTab(tab)
const closeSaveDialog = () => controller?.closeSaveDialog()

// Utility methods
const getHttpMethods = () => controller?.getHttpMethods() || []
const getMethodColor = (method) => controller?.getMethodColor(method) || ''
const getViewLabel = (mode) => controller?.getViewLabel(mode) || mode
const formatTime = (ms) => controller?.formatTime(ms) || 'N/A'
const formatSize = (bytes) => controller?.formatSize(bytes) || 'N/A'
const formatResponseBody = (body) => controller?.formatResponseBody(body) || ''
const getStatusText = (responseData) => controller?.getStatusText(responseData) || ''
const detectResponseLanguage = (responseData) => controller?.detectResponseLanguage(responseData) || 'auto'
</script>

<template>
  <div class="request-tabs">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <div class="tabs-list">
        <div class="tabs-left">
          <div v-if="tabs.length === 0" class="empty-tabs">
            <span class="empty-message">No tabs open - Click + to create your first request</span>
          </div>
          <template v-else>
            <div
              v-for="tab in tabs"
              :key="tab?.id || Date.now()"
              :class="['request-tab', { active: tab?.active }]"
              @click="tab && setActiveTab(tab.id)"
            >
              <span
                class="method-indicator"
                :style="{ backgroundColor: getMethodColor(tab?.method || 'GET') }"
              ></span>
              <span class="tab-name">{{ tab?.name || 'New Request' }}</span>
              <button
                class="close-tab"
                @click.stop="tab && closeTab(tab.id)"
              >
                ×
              </button>
            </div>
          </template>
          <button class="add-tab" @click="addNewTab">+</button>
        </div>

        <!-- View Toggle Controls -->
        <div class="tabs-right" v-if="activeTab">
          <div class="view-controls">
            <button
              v-for="mode in ['request', 'both', 'response']"
              :key="mode"
              :class="['view-toggle', { active: state.viewMode === mode, disabled: mode === 'response' && !state.hasResponse }]"
              @click="toggleView(mode)"
              :disabled="mode === 'response' && !state.hasResponse"
              :title="getViewLabel(mode)"
            >
              {{ mode === 'request' ? '📝' : mode === 'response' ? '📄' : '📑' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="tabs.length === 0" class="empty-state-container">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>No Requests Open</h2>
        <p>Start by creating a new request or selecting one from your collections</p>
        <button class="btn-primary" @click="addNewTab">
          ➕ Create New Request
        </button>
        <div class="quick-tips">
          <h4>Quick Tips:</h4>
          <ul>
            <li>Click the + button above to create a new request</li>
            <li>Select requests from collections in the sidebar</li>
            <li>Use keyboard shortcut Ctrl+T to create a new tab</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content" v-else-if="activeTab">
      <Splitpanes horizontal v-if="state.viewMode === 'both'">
        <!-- Request Section -->
        <Pane size="60" min-size="40">
          <div class="request-section">
            <!-- URL Bar -->
            <div class="url-bar">
              <select
                v-model="state.currentMethod"
                class="method-select"
                :style="{ color: getMethodColor(state.currentMethod) }"
              >
                <option
                  v-for="method in getHttpMethods()"
                  :key="method"
                  :value="method"
                  :style="{ color: getMethodColor(method) }"
                >
                  {{ method }}
                </option>
              </select>
              <VariableInput
                v-model="state.currentUrl"
                placeholder="Enter request URL"
                class="url-input"
              />

              <button class="save-button" @click="saveRequest" title="Save Request">
                💾
              </button>
              <button
                class="send-button primary large"
                @click="sendRequest"
                :disabled="state.isLoading || !state.currentUrl"
                :class="{ loading: state.isLoading }"
              >
                <span v-if="state.isLoading" class="loading-content">
                  <span class="loading-spinner">⏳</span>
                  <span>Sending...</span>
                </span>
                <span v-else>▶️ Send</span>
              </button>
            </div>

            <!-- Request Details Tabs -->
            <div class="request-tabs-nav">
              <button
                :class="['nav-tab', { active: state.activeRequestTab === 'params' }]"
                @click="setActiveRequestTab('params')"
              >
                Params ({{ state.currentParams.filter(p => p.enabled && p.key).length }})
              </button>
              <button
                :class="['nav-tab', { active: state.activeRequestTab === 'headers' }]"
                @click="setActiveRequestTab('headers')"
              >
                Headers ({{ state.currentHeaders.filter(h => h.enabled && h.key).length }})
              </button>
              <button
                :class="['nav-tab', { active: state.activeRequestTab === 'body' }]"
                @click="setActiveRequestTab('body')"
              >
                Body
              </button>
            </div>

            <!-- Request Details Content -->
            <div class="request-details">
              <!-- Params Tab -->
              <div v-if="state.activeRequestTab === 'params'" class="params-section">
                <div class="section-header">
                  <span>Query Parameters</span>
                  <button @click="addParam" class="btn-add">+ Add</button>
                </div>
                <div class="key-value-list">
                  <div
                    v-for="(param, index) in state.currentParams"
                    :key="param.id || index"
                    class="key-value-row"
                  >
                    <input type="checkbox" v-model="param.enabled" class="enabled-checkbox">
                    <input
                      v-model="param.key"
                      type="text"
                      placeholder="Key"
                      class="key-input"
                    >
                    <input
                      v-model="param.value"
                      type="text"
                      placeholder="Value"
                      class="value-input"
                    >
                    <button @click="removeParam(index)" class="btn-remove">×</button>
                  </div>
                </div>
              </div>

              <!-- Headers Tab -->
              <div v-if="state.activeRequestTab === 'headers'" class="headers-section">
                <div class="section-header">
                  <span>Headers</span>
                  <button @click="addHeader" class="btn-add">+ Add</button>
                </div>
                <div class="key-value-list">
                  <div
                    v-for="(header, index) in state.currentHeaders"
                    :key="header.id || index"
                    class="key-value-row"
                  >
                    <input type="checkbox" v-model="header.enabled" class="enabled-checkbox">
                    <input
                      v-model="header.key"
                      type="text"
                      placeholder="Header"
                      class="key-input"
                    >
                    <input
                      v-model="header.value"
                      type="text"
                      placeholder="Value"
                      class="value-input"
                    >
                    <button @click="removeHeader(index)" class="btn-remove">×</button>
                  </div>
                </div>
              </div>

              <!-- Body Tab -->
              <div v-if="state.activeRequestTab === 'body'" class="body-section">
                <RequestBodyEditor v-model="state.currentBody" />
              </div>
            </div>
          </div>
        </Pane>

        <!-- Response Section -->
        <Pane>
          <div class="response-section">
            <!-- Response Content - Show empty state or actual response -->
            <div v-if="!state.hasResponse" class="response-empty-state">
              <div class="empty-icon">📡</div>
              <h3 class="empty-title">No Response Yet</h3>
              <p class="empty-description">
                Configure your request and click <strong>Send</strong> to see the response here
              </p>
              <div class="empty-actions">
                <button
                  class="empty-action-button primary"
                  @click="sendRequest"
                  :disabled="!state.currentUrl"
                >
                  ▶️ Send Request
                </button>
              </div>
              <div class="empty-tips">
                <div class="tip">
                  <span class="tip-icon">💡</span>
                  <span>Try starting with a simple GET request to test your setup</span>
                </div>
                <div class="tip">
                  <span class="tip-icon">🔗</span>
                  <span>Make sure your URL includes the protocol (http:// or https://)</span>
                </div>
              </div>
            </div>

            <!-- Actual Response Content -->
            <template v-else>
              <!-- Response Header -->
              <div class="response-header">
                <div class="response-status">
                  <span
                    :class="[
                      'status-code',
                      {
                        'success': state.responseData?.status >= 200 && state.responseData?.status < 300,
                        'redirect': state.responseData?.status >= 300 && state.responseData?.status < 400,
                        'client-error': state.responseData?.status >= 400 && state.responseData?.status < 500,
                        'server-error': state.responseData?.status >= 500,
                        'network-error': state.responseData?.status === 0
                      }
                    ]"
                  >
                    {{ state.responseData?.status || 'Error' }}
                  </span>
                  <span class="status-text">{{ getStatusText(state.responseData) }}</span>
                </div>
                <div class="response-meta">
                  <span class="response-time">Time: {{ formatTime(state.responseData?.time) }}</span>
                  <span class="response-size">Size: {{ formatSize(state.responseData?.size) }}</span>
                </div>
              </div>

              <!-- Response Tabs -->
              <div class="response-tabs-nav">
                <button
                  :class="['nav-tab', { active: state.activeResponseTab === 'body' }]"
                  @click="setActiveResponseTab('body')"
                >
                  Body
                </button>
                <button
                  :class="['nav-tab', { active: state.activeResponseTab === 'headers' }]"
                  @click="setActiveResponseTab('headers')"
                >
                  Headers ({{ Object.keys(state.responseData?.headers || {}).length }})
                </button>
              </div>

              <!-- Response Content -->
              <div class="response-content">
                <!-- Error Display -->
                <div v-if="state.responseData?.error && !state.responseData?.body" class="response-error">
                  <div class="error-icon">❌</div>
                  <div class="error-message">{{ state.responseData?.error }}</div>
                </div>

                <!-- Body Tab -->
                <div v-else-if="state.activeResponseTab === 'body'" class="response-body">
                  <SyntaxHighlighter
                    :code="formatResponseBody(state.responseData.body)"
                    :language="detectResponseLanguage(state.responseData)"
                    :copyable="true"
                    :show-line-numbers="false"
                    :max-height="state.viewMode === 'response' ? 'none' : '400px'"
                  />
                </div>

                <!-- Headers Tab -->
                <div v-if="state.activeResponseTab === 'headers'" class="response-headers">
                  <div v-if="!state.responseData?.headers || Object.keys(state.responseData?.headers).length === 0" class="empty-headers">
                    No headers received
                  </div>
                  <div
                    v-else
                    v-for="(value, key) in state.responseData?.headers"
                    :key="key"
                    class="header-row"
                  >
                    <span class="header-key">{{ key }}:</span>
                    <span class="header-value">{{ value }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </Pane>
      </Splitpanes>

      <!-- Request Only View -->
      <div v-else-if="state.viewMode === 'request'" class="single-view">
        <div class="request-section">
          <!-- URL Bar -->
          <div class="url-bar">
            <select
              v-model="state.currentMethod"
              class="method-select"
              :style="{ color: getMethodColor(state.currentMethod) }"
            >
              <option
                v-for="method in getHttpMethods()"
                :key="method"
                :value="method"
                :style="{ color: getMethodColor(method) }"
              >
                {{ method }}
              </option>
            </select>
            <VariableInput
              v-model="state.currentUrl"
              placeholder="Enter request URL"
              class="url-input"
            />

            <button class="save-button" @click="saveRequest" title="Save Request">
              💾
            </button>
            <button class="send-button primary large" @click="sendRequest">
              ▶️ Send
            </button>
          </div>

          <!-- Request Details Tabs -->
          <div class="request-tabs-nav">
            <button
              :class="['nav-tab', { active: state.activeRequestTab === 'params' }]"
              @click="setActiveRequestTab('params')"
            >
              Params ({{ state.currentParams.filter(p => p.enabled && p.key).length }})
            </button>
            <button
              :class="['nav-tab', { active: state.activeRequestTab === 'headers' }]"
              @click="setActiveRequestTab('headers')"
            >
              Headers ({{ state.currentHeaders.filter(h => h.enabled && h.key).length }})
            </button>
            <button
              :class="['nav-tab', { active: state.activeRequestTab === 'body' }]"
              @click="setActiveRequestTab('body')"
            >
              Body
            </button>
          </div>

          <!-- Request Details Content -->
          <div class="request-details">
            <!-- Params Tab -->
            <div v-if="state.activeRequestTab === 'params'" class="params-section">
              <div class="section-header">
                <span>Query Parameters</span>
                <button @click="addParam" class="btn-add">+ Add</button>
              </div>
              <div class="key-value-list">
                <div
                  v-for="(param, index) in state.currentParams"
                  :key="param.id || index"
                  class="key-value-row"
                >
                  <input type="checkbox" v-model="param.enabled" class="enabled-checkbox">
                  <input
                    v-model="param.key"
                    type="text"
                    placeholder="Key"
                    class="key-input"
                  >
                  <input
                    v-model="param.value"
                    type="text"
                    placeholder="Value"
                    class="value-input"
                  >
                  <button @click="removeParam(index)" class="btn-remove">×</button>
                </div>
              </div>
            </div>

            <!-- Headers Tab -->
            <div v-if="state.activeRequestTab === 'headers'" class="headers-section">
              <div class="section-header">
                <span>Headers</span>
                <button @click="addHeader" class="btn-add">+ Add</button>
              </div>
              <div class="key-value-list">
                <div
                  v-for="(header, index) in state.currentHeaders"
                  :key="header.id || index"
                  class="key-value-row"
                >
                  <input type="checkbox" v-model="header.enabled" class="enabled-checkbox">
                  <input
                    v-model="header.key"
                    type="text"
                    placeholder="Header"
                    class="key-input"
                  >
                  <input
                    v-model="header.value"
                    type="text"
                    placeholder="Value"
                    class="value-input"
                  >
                  <button @click="removeHeader(index)" class="btn-remove">×</button>
                </div>
              </div>
            </div>

            <!-- Body Tab -->
            <div v-if="state.activeRequestTab === 'body'" class="body-section">
              <RequestBodyEditor v-model="state.currentBody" />
            </div>
          </div>
        </div>
      </div>

      <!-- Response Only View -->
      <div v-else-if="state.viewMode === 'response'" class="single-view">
        <!-- Reuse the same response section from split view -->
        <div class="response-section response-section-full">
          <!-- Response Content - Show empty state or actual response -->
          <div v-if="!state.hasResponse" class="response-empty-state">
            <div class="empty-icon">📡</div>
            <h3 class="empty-title">No Response Yet</h3>
            <p class="empty-description">
              Switch to <strong>Request</strong> or <strong>Split View</strong> to configure and send your request
            </p>
            <div class="empty-actions">
              <button
                class="empty-action-button"
                @click="toggleView('both')"
              >
                📑 Switch to Split View
              </button>
              <button
                class="empty-action-button"
                @click="toggleView('request')"
              >
                📝 Switch to Request View
              </button>
            </div>
            <div class="empty-tips">
              <div class="tip">
                <span class="tip-icon">💡</span>
                <span>You can't send requests from the response-only view</span>
              </div>
            </div>
          </div>

          <!-- Actual Response Content - Same as split view -->
          <template v-else>
            <!-- Response Header -->
            <div class="response-header">
              <div class="response-status">
                <span
                  :class="[
                    'status-code',
                    {
                      'success': state.responseData?.status >= 200 && state.responseData?.status < 300,
                      'redirect': state.responseData?.status >= 300 && state.responseData?.status < 400,
                      'client-error': state.responseData?.status >= 400 && state.responseData?.status < 500,
                      'server-error': state.responseData?.status >= 500,
                      'network-error': state.responseData?.status === 0
                    }
                  ]"
                >
                  {{ state.responseData?.status || 'Error' }}
                </span>
                <span class="status-text">{{ getStatusText(state.responseData) }}</span>
              </div>
              <div class="response-meta">
                <span class="response-time">Time: {{ formatTime(state.responseData?.time) }}</span>
                <span class="response-size">Size: {{ formatSize(state.responseData?.size) }}</span>
              </div>
            </div>

            <!-- Response Tabs -->
            <div class="response-tabs-nav">
              <button
                :class="['nav-tab', { active: state.activeResponseTab === 'body' }]"
                @click="setActiveResponseTab('body')"
              >
                Body
              </button>
              <button
                :class="['nav-tab', { active: state.activeResponseTab === 'headers' }]"
                @click="setActiveResponseTab('headers')"
              >
                Headers ({{ Object.keys(state.responseData?.headers || {}).length }})
              </button>
            </div>

            <!-- Response Content -->
            <div class="response-content">
              <!-- Error Display -->
              <div v-if="state.responseData?.error && !state.responseData?.body" class="response-error">
                <div class="error-icon">❌</div>
                <div class="error-message">{{ state.responseData?.error }}</div>
              </div>

              <!-- Body Tab -->
              <div v-else-if="state.activeResponseTab === 'body'" class="response-body">
                <SyntaxHighlighter
                  :code="formatResponseBody(state.responseData?.body)"
                  :language="detectResponseLanguage(state.responseData)"
                  :copyable="true"
                  :show-line-numbers="false"
                  :max-height="state.viewMode === 'response' ? 'none' : '400px'"
                />
              </div>

              <!-- Headers Tab -->
              <div v-if="state.activeResponseTab === 'headers'" class="response-headers">
                <div v-if="!state.responseData?.headers || Object.keys(state.responseData?.headers).length === 0" class="empty-headers">
                  No headers received
                </div>
                <div
                  v-else
                  v-for="(value, key) in state.responseData?.headers"
                  :key="key"
                  class="header-row"
                >
                  <span class="header-key">{{ key }}:</span>
                  <span class="header-value">{{ value }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Fallback content when no active tab -->
    <div class="no-tab-content" v-if="!activeTab">
      <div class="welcome-tab">
        <div class="welcome-icon">🚀</div>
        <h3>Ready to test some APIs?</h3>
        <p>Create a new tab to start building your request</p>
        <button class="btn-primary" @click="addNewTab">
          + Create New Request
        </button>
      </div>
    </div>

    <!-- Save Request Dialog -->
    <CollectionPickerDialog
      v-if="state.showSaveDialog"
      :request-name="state.pendingSaveName"
      @close="closeSaveDialog"
      @save="handleSaveRequest"
    />
  </div>
</template>

<style scoped>
.request-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
}

.tab-bar {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.tabs-list {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.tabs-left {
  display: flex;
  align-items: center;
}

.tabs-right {
  display: flex;
  align-items: center;
}

.view-controls {
  display: flex;
  gap: 2px;
  align-items: center;
  background: var(--color-bg-tertiary);
  padding: 4px;
}

.view-toggle {
  background: var(--color-bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 8px 12px;
  transition: all 0.2s ease;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: -1px;
}

.view-toggle:hover:not(.disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border);
  transform: translateY(-1px);
}

.view-toggle.active {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg-secondary);
  font-weight: 600;
  z-index: 1;
}

.view-toggle.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.single-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.request-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  font-size: 13px;
  transition: all 0.2s ease;
  position: relative;
}

.request-tab:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.request-tab.active {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-text-primary);
}

.method-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tab-name {
  font-weight: 500;
}

.close-tab {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-tab:hover {
  background: var(--color-error);
  color: white;
}

.add-tab {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 16px;
  padding: 6px 10px;
  margin-left: 8px;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
}

.add-tab:hover {
  background: var(--color-button-bg-hover);
  color: var(--color-button-text);
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.request-section, .response-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.url-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
  background: var(--color-bg-secondary);
  padding: 16px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.method-select {
  min-width: 80px;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
}

.url-input {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.save-button {
  min-width: 36px;
  width: 36px;
  height: 36px;
  font-size: 16px;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0;
}

.save-button:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-dark);
}

.send-button {
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.request-tabs-nav, .response-tabs-nav {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 16px;
}

.nav-tab {
  background: none;
  border: none;
  padding: 8px 16px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.nav-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.nav-tab.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
  font-weight: 600;
}

.request-details {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.body-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex shrinking */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border-bottom: 1px solid var(--color-border);
}

.btn-add {
  font-size: 12px;
  padding: 4px 8px;
}

.key-value-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 20px 20px;
}

.key-value-row {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--color-bg-primary);
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.enabled-checkbox {
  width: 16px;
  height: 16px;
}

.key-input, .value-input {
  flex: 1;
  min-width: 0;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-remove:hover {
  background: var(--color-error);
  color: white;
}

.body-type-select {
  min-width: 100px;
}

.body-textarea {
  width: 100%;
  height: 300px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  resize: vertical;
  margin: 0 20px 20px 20px;
  width: calc(100% - 40px);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.response-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-code {
  font-weight: 700;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.status-code.success {
  background: var(--color-success);
  color: white;
}

.status-text {
  font-weight: 500;
  color: var(--color-text-primary);
}

.response-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.response-content {
  flex: 1;
  overflow-y: auto;
}

/* Response body now uses SyntaxHighlighter component */

.response-headers {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

.header-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.header-key {
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 120px;
}

.header-value {
  color: var(--color-text-primary);
}

.empty-tabs {
  padding: 8px 16px;
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 13px;
}

/* Response Empty State */
.response-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  height: 100%;
  padding: 20px;
  text-align: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin: 20px;
  border: 1px solid var(--color-border);
  overflow-y: auto;
  box-sizing: border-box;
}

.empty-icon {
  font-size: clamp(32px, 8vw, 48px);
  margin-bottom: clamp(8px, 2vh, 16px);
  opacity: 0.7;
  flex-shrink: 0;
}

.empty-title {
  font-size: clamp(16px, 4vw, 18px);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 clamp(4px, 1vh, 8px) 0;
  flex-shrink: 0;
}

.empty-description {
  font-size: clamp(12px, 3vw, 14px);
  color: var(--color-text-secondary);
  margin: 0 0 clamp(16px, 4vh, 24px) 0;
  max-width: 400px;
  line-height: 1.5;
  flex-shrink: 0;
}

.empty-actions {
  display: flex;
  gap: clamp(8px, 2vw, 12px);
  margin-bottom: clamp(16px, 4vh, 32px);
  flex-wrap: wrap;
  justify-content: center;
  flex-shrink: 0;
}

.empty-action-button {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 120px;
}

.empty-action-button:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-dark);
}

.empty-action-button.primary {
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border-color: var(--color-border-dark);
}

.empty-action-button.primary:hover {
  background: var(--color-button-bg-hover);
}

.empty-action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-tips {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 2vw, 12px);
  max-width: 500px;
  width: 100%;
  flex-shrink: 1;
  min-height: 0;
}

.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  font-size: clamp(11px, 2.5vw, 13px);
  color: var(--color-text-secondary);
  text-align: left;
  flex-shrink: 0;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* No Tab Content Styles */
.no-tab-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
}

.welcome-tab {
  text-align: center;
  max-width: 400px;
  padding: 40px 20px;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.welcome-tab h3 {
  font-size: 20px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.welcome-tab p {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.empty-message {
  font-style: italic;
  color: var(--color-text-muted);
  font-size: 14px;
}

/* Empty State Styles */
.empty-state-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--color-bg-primary);
}

.empty-state {
  text-align: center;
  max-width: 500px;
  padding: 60px 40px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
}

.empty-state .empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.8;
  filter: grayscale(20%);
}

.empty-state h2 {
  font-size: 24px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.empty-state p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 32px 0;
}

.empty-state .btn-primary {
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border: 1px solid var(--color-border-dark);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 32px;
}

.empty-state .btn-primary:hover {
  background: var(--color-button-bg-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.empty-state .quick-tips {
  text-align: left;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border-light);
}

.empty-state .quick-tips h4 {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-state .quick-tips ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.empty-state .quick-tips li {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.empty-state .quick-tips li:before {
  content: "•";
  color: var(--color-text-primary);
  position: absolute;
  left: 4px;
  font-weight: bold;
}

/* Response status styles */
.status-code {
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
}

.status-code.success {
  background-color: var(--color-status-success-bg);
  color: var(--color-success);
}

.status-code.redirect {
  background-color: var(--color-status-redirect-bg);
  color: #3b82f6;
}

.status-code.client-error {
  background-color: var(--color-status-client-error-bg);
  color: var(--color-warning);
}

.status-code.server-error {
  background-color: var(--color-status-server-error-bg);
  color: var(--color-error);
}

.status-code.network-error {
  background-color: rgba(156, 163, 175, 0.1);
  color: var(--color-text-muted);
}

/* Response error display */
.response-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message {
  font-size: 16px;
  color: var(--color-error);
  font-weight: 500;
  max-width: 500px;
}

.empty-headers {
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button.loading {
  background: var(--color-button-bg);
  transform: none !important;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Full response view overrides */
.response-section-full {
  overflow: visible !important;
}

.response-section-full .response-content {
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
}

.response-section-full .response-body {
  max-height: none !important;
  height: auto !important;
}
</style>