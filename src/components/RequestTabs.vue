<script setup>
import { ref, computed, watch } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import { useCollections } from '../stores/useCollections.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { useTabs } from '../stores/useTabs.js'

const collectionsStore = useCollections()
const environmentsStore = useEnvironments()
const tabsStore = useTabs()

// Use real data from stores
const tabs = computed(() => {
  const tabsData = tabsStore.tabs
  return Array.isArray(tabsData) ? tabsData : []
})
const activeTab = computed(() => tabsStore.activeTab)

// Get the current request data for the active tab
const currentRequest = computed(() => {
  if (activeTab.value?.itemId && activeTab.value?.collectionId) {
    return collectionsStore.getRequest(activeTab.value.collectionId, activeTab.value.itemId)
  }
  return null
})

const addNewTab = () => {
  tabsStore.createTab()
}

const closeTab = (tabId) => {
  tabsStore.closeTab(tabId)
}

const setActiveTab = (tabId) => {
  tabsStore.setActiveTab(tabId)
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

// Form data - reactive representations of current request data
const currentUrl = ref('')
const currentMethod = ref('GET')
const currentHeaders = ref([])
const currentParams = ref([])
const currentBody = ref('')
const currentBodyType = ref('raw')

// Response data (mock for now)
const responseData = ref({
  status: 200,
  statusText: 'OK',
  time: '245ms',
  size: '1.2kb',
  headers: {
    'content-type': 'application/json',
    'content-length': '1234'
  },
  body: '{\n  "id": 1,\n  "name": "John Doe",\n  "email": "john@example.com",\n  "created_at": "2023-01-01T00:00:00Z"\n}'
})

const activeRequestTab = ref('params')
const activeResponseTab = ref('body')

// View toggle state
const viewMode = ref('both') // 'request', 'response', 'both'
const hasResponse = ref(false) // Track if a response has been received

// Load request data into form
const loadRequestData = () => {
  if (currentRequest.value) {
    const request = currentRequest.value.request
    currentUrl.value = request.url.raw || ''
    currentMethod.value = request.method || 'GET'
    currentHeaders.value = [...(request.header || [])]
    currentParams.value = [...(request.url.query || [])]

    if (request.body) {
      currentBodyType.value = request.body.mode || 'raw'
      currentBody.value = request.body.raw || ''
    } else {
      currentBodyType.value = 'raw'
      currentBody.value = ''
    }
  } else {
    // New request defaults
    currentUrl.value = ''
    currentMethod.value = 'GET'
    currentHeaders.value = [{ key: 'Content-Type', value: 'application/json', enabled: true, id: Date.now() }]
    currentParams.value = []
    currentBody.value = ''
    currentBodyType.value = 'raw'
  }
}

// Save current form data back to the request
const saveRequestData = () => {
  if (activeTab.value) {
    // Update tab info
    tabsStore.updateTab(activeTab.value.id, {
      name: currentUrl.value ? `${currentMethod.value} ${currentUrl.value}` : 'New Request',
      method: currentMethod.value
    })

    // If linked to a request, update the actual request data
    if (activeTab.value.itemId && activeTab.value.collectionId) {
      collectionsStore.updateRequest(activeTab.value.collectionId, activeTab.value.itemId, {
        request: {
          method: currentMethod.value,
          url: {
            raw: currentUrl.value,
            query: currentParams.value.filter(p => p.key)
          },
          header: currentHeaders.value.filter(h => h.key),
          body: {
            mode: currentBodyType.value,
            raw: currentBody.value
          }
        }
      })
    }
  }
}

// Auto-save when form data changes
watch([currentUrl, currentMethod, currentHeaders, currentParams, currentBody, currentBodyType], () => {
  saveRequestData()
}, { deep: true })

const addParam = () => {
  currentParams.value.push({ key: '', value: '', enabled: true, id: Date.now() })
}

const removeParam = (index) => {
  currentParams.value.splice(index, 1)
}

const addHeader = () => {
  currentHeaders.value.push({ key: '', value: '', enabled: true, id: Date.now() })
}

const removeHeader = (index) => {
  currentHeaders.value.splice(index, 1)
}

const saveRequest = () => {
  if (activeTab.value) {
    const result = tabsStore.saveTab(activeTab.value.id)
    if (result) {
      console.log('Request saved:', result)
      // TODO: Show success message
    }
  }
}

const sendRequest = () => {
  console.log('Sending request...', {
    method: currentMethod.value,
    url: currentUrl.value,
    params: currentParams.value,
    headers: currentHeaders.value,
    body: currentBody.value
  })

  // Set response received flag and show response view
  hasResponse.value = true
  if (viewMode.value === 'request') {
    viewMode.value = 'both' // Auto-switch to both when response comes in
  }

  // TODO: Implement actual request logic
  // TODO: Add to history after sending
}

// View toggle functions
const toggleView = (mode) => {
  viewMode.value = mode
}

const getViewLabel = (mode) => {
  switch (mode) {
    case 'request': return '📝 Request Only'
    case 'response': return '📄 Response Only'
    case 'both': return '📑 Split View'
    default: return mode
  }
}

const getMethodColor = (method) => {
  const colors = {
    'GET': 'var(--color-get)',
    'POST': 'var(--color-post)',
    'PUT': 'var(--color-put)',
    'PATCH': 'var(--color-patch)',
    'DELETE': 'var(--color-delete)'
  }
  return colors[method] || 'var(--color-text-secondary)'
}

// Watch for active tab changes and load request data
watch(activeTab, (newTab) => {
  if (newTab) {
    loadRequestData()
  }
}, { immediate: true })
</script>

<template>
  <div class="request-tabs">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <div class="tabs-list">
        <div class="tabs-left">
          <div v-if="tabs.length === 0" class="empty-tabs">
            <span>Loading...</span>
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
                v-if="tabs.length > 1"
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
              :class="['view-toggle', { active: viewMode === mode, disabled: mode === 'response' && !hasResponse }]"
              @click="toggleView(mode)"
              :disabled="mode === 'response' && !hasResponse"
              :title="getViewLabel(mode)"
            >
              {{ mode === 'request' ? '📝' : mode === 'response' ? '📄' : '📑' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content" v-if="activeTab">
      <Splitpanes horizontal v-if="viewMode === 'both'">
        <!-- Request Section -->
        <Pane size="60" min-size="40">
          <div class="request-section">
            <!-- URL Bar -->
            <div class="url-bar">
              <select
                v-model="currentMethod"
                class="method-select"
                :style="{ color: getMethodColor(currentMethod) }"
              >
                <option
                  v-for="method in httpMethods"
                  :key="method"
                  :value="method"
                  :style="{ color: getMethodColor(method) }"
                >
                  {{ method }}
                </option>
              </select>
              <input
                v-model="currentUrl"
                type="text"
                placeholder="Enter request URL"
                class="url-input"
              >

              <button class="save-button" @click="saveRequest" title="Save Request">
                💾 Save
              </button>
              <button class="send-button primary large" @click="sendRequest">
                ▶️ Send
              </button>
            </div>

            <!-- Request Details Tabs -->
            <div class="request-tabs-nav">
              <button
                :class="['nav-tab', { active: activeRequestTab === 'params' }]"
                @click="activeRequestTab = 'params'"
              >
                Params ({{ currentParams.filter(p => p.enabled && p.key).length }})
              </button>
              <button
                :class="['nav-tab', { active: activeRequestTab === 'headers' }]"
                @click="activeRequestTab = 'headers'"
              >
                Headers ({{ currentHeaders.filter(h => h.enabled && h.key).length }})
              </button>
              <button
                :class="['nav-tab', { active: activeRequestTab === 'body' }]"
                @click="activeRequestTab = 'body'"
              >
                Body
              </button>
            </div>

            <!-- Request Details Content -->
            <div class="request-details">
              <!-- Params Tab -->
              <div v-if="activeRequestTab === 'params'" class="params-section">
                <div class="section-header">
                  <span>Query Parameters</span>
                  <button @click="addParam" class="btn-add">+ Add</button>
                </div>
                <div class="key-value-list">
                  <div
                    v-for="(param, index) in currentParams"
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
              <div v-if="activeRequestTab === 'headers'" class="headers-section">
                <div class="section-header">
                  <span>Headers</span>
                  <button @click="addHeader" class="btn-add">+ Add</button>
                </div>
                <div class="key-value-list">
                  <div
                    v-for="(header, index) in currentHeaders"
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
              <div v-if="activeRequestTab === 'body'" class="body-section">
                <div class="section-header">
                  <span>Request Body</span>
                  <select v-model="currentBodyType" class="body-type-select">
                    <option value="raw">Raw</option>
                    <option value="urlencoded">URL Encoded</option>
                    <option value="formdata">Form Data</option>
                    <option value="binary">Binary</option>
                  </select>
                </div>
                <textarea
                  v-model="currentBody"
                  class="body-textarea"
                  placeholder="Enter request body..."
                ></textarea>
              </div>
            </div>
          </div>
        </Pane>

        <!-- Response Section -->
        <Pane>
          <div class="response-section">
            <!-- Response Content - Show empty state or actual response -->
            <div v-if="!hasResponse" class="response-empty-state">
              <div class="empty-icon">📡</div>
              <h3 class="empty-title">No Response Yet</h3>
              <p class="empty-description">
                Configure your request and click <strong>Send</strong> to see the response here
              </p>
              <div class="empty-actions">
                <button
                  class="empty-action-button primary"
                  @click="sendRequest"
                  :disabled="!currentUrl"
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
                  <span class="status-code success">{{ responseData.status }}</span>
                  <span class="status-text">{{ responseData.statusText }}</span>
                </div>
                <div class="response-meta">
                  <span class="response-time">Time: {{ responseData.time }}</span>
                  <span class="response-size">Size: {{ responseData.size }}</span>
                </div>
              </div>

              <!-- Response Tabs -->
              <div class="response-tabs-nav">
                <button
                  :class="['nav-tab', { active: activeResponseTab === 'body' }]"
                  @click="activeResponseTab = 'body'"
                >
                  Body
                </button>
                <button
                  :class="['nav-tab', { active: activeResponseTab === 'headers' }]"
                  @click="activeResponseTab = 'headers'"
                >
                  Headers ({{ Object.keys(responseData.headers).length }})
                </button>
              </div>

              <!-- Response Content -->
              <div class="response-content">
                <div v-if="activeResponseTab === 'body'" class="response-body">
                  <pre>{{ responseData.body }}</pre>
                </div>
                <div v-if="activeResponseTab === 'headers'" class="response-headers">
                  <div
                    v-for="(value, key) in responseData.headers"
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
      <div v-else-if="viewMode === 'request'" class="single-view">
        <div class="request-section">
          <!-- URL Bar -->
          <div class="url-bar">
            <select
              v-model="currentMethod"
              class="method-select"
              :style="{ color: getMethodColor(currentMethod) }"
            >
              <option
                v-for="method in httpMethods"
                :key="method"
                :value="method"
                :style="{ color: getMethodColor(method) }"
              >
                {{ method }}
              </option>
            </select>
            <input
              v-model="currentUrl"
              type="text"
              placeholder="Enter request URL"
              class="url-input"
            >

            <button class="save-button" @click="saveRequest" title="Save Request">
              💾 Save
            </button>
            <button class="send-button primary large" @click="sendRequest">
              ▶️ Send
            </button>
          </div>

          <!-- Request Details Tabs -->
          <div class="request-tabs-nav">
            <button
              :class="['nav-tab', { active: activeRequestTab === 'params' }]"
              @click="activeRequestTab = 'params'"
            >
              Params ({{ currentParams.filter(p => p.enabled && p.key).length }})
            </button>
            <button
              :class="['nav-tab', { active: activeRequestTab === 'headers' }]"
              @click="activeRequestTab = 'headers'"
            >
              Headers ({{ currentHeaders.filter(h => h.enabled && h.key).length }})
            </button>
            <button
              :class="['nav-tab', { active: activeRequestTab === 'body' }]"
              @click="activeRequestTab = 'body'"
            >
              Body
            </button>
          </div>

          <!-- Request Details Content -->
          <div class="request-details">
            <!-- Params Tab -->
            <div v-if="activeRequestTab === 'params'" class="params-section">
              <div class="section-header">
                <span>Query Parameters</span>
                <button @click="addParam" class="btn-add">+ Add</button>
              </div>
              <div class="key-value-list">
                <div
                  v-for="(param, index) in currentParams"
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
            <div v-if="activeRequestTab === 'headers'" class="headers-section">
              <div class="section-header">
                <span>Headers</span>
                <button @click="addHeader" class="btn-add">+ Add</button>
              </div>
              <div class="key-value-list">
                <div
                  v-for="(header, index) in currentHeaders"
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
            <div v-if="activeRequestTab === 'body'" class="body-section">
              <div class="section-header">
                <span>Request Body</span>
                <select v-model="currentBodyType" class="body-type-select">
                  <option value="raw">Raw</option>
                  <option value="urlencoded">URL Encoded</option>
                  <option value="formdata">Form Data</option>
                  <option value="binary">Binary</option>
                </select>
              </div>
              <textarea
                v-model="currentBody"
                class="body-textarea"
                placeholder="Enter request body..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Response Only View -->
      <div v-else-if="viewMode === 'response'" class="single-view">
        <div class="response-section">
          <!-- Response Content - Show empty state or actual response -->
          <div v-if="!hasResponse" class="response-empty-state">
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

          <!-- Actual Response Content -->
          <template v-else>
            <!-- Response Header -->
            <div class="response-header">
              <div class="response-status">
                <span class="status-code success">{{ responseData.status }}</span>
                <span class="status-text">{{ responseData.statusText }}</span>
              </div>
              <div class="response-meta">
                <span class="response-time">Time: {{ responseData.time }}</span>
                <span class="response-size">Size: {{ responseData.size }}</span>
              </div>
            </div>

            <!-- Response Tabs -->
            <div class="response-tabs-nav">
              <button
                :class="['nav-tab', { active: activeResponseTab === 'body' }]"
                @click="activeResponseTab = 'body'"
              >
                Body
              </button>
              <button
                :class="['nav-tab', { active: activeResponseTab === 'headers' }]"
                @click="activeResponseTab = 'headers'"
              >
                Headers ({{ Object.keys(responseData.headers).length }})
              </button>
            </div>

            <!-- Response Content -->
            <div class="response-content">
              <div v-if="activeResponseTab === 'body'" class="response-body">
                <pre>{{ responseData.body }}</pre>
              </div>
              <div v-if="activeResponseTab === 'headers'" class="response-headers">
                <div
                  v-for="(value, key) in responseData.headers"
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
  gap: 4px;
  align-items: center;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  padding: 4px;
  border: 1px solid var(--color-border);
}

.view-toggle {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-toggle:hover:not(.disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.view-toggle.active {
  background: var(--color-primary);
  color: white;
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
  border-bottom: 2px solid var(--color-primary);
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
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 18px;
  padding: 8px;
  margin-left: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.add-tab:hover {
  background: var(--color-primary);
  color: white;
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
  min-width: 80px;
  font-size: 13px;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.save-button:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary-light);
}

.send-button {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
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
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.request-details {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
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

.response-body pre {
  background: var(--color-bg-secondary);
  padding: 20px;
  border-radius: var(--radius-lg);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

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
  color: var(--color-primary);
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
  border-color: var(--color-primary-light);
}

.empty-action-button.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.empty-action-button.primary:hover {
  background: var(--color-primary-dark);
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
</style>