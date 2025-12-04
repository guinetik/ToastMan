<template>
  <div class="chat-tabs">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <div class="tabs-container">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: tab.id === activeTabId }"
          @click="setActiveTab(tab.id)"
        >
          <span class="tab-method" :style="{ color: getMethodColor(tab.method) }">
            {{ tab.method }}
          </span>
          <span class="tab-name">{{ tab.name }}</span>
          <button class="tab-close" @click.stop="closeTab(tab.id)" title="Close">
            ×
          </button>
        </div>
      </div>
      <button class="add-tab-btn" @click="addNewTab" title="New Request">
        +
      </button>
    </div>

    <!-- Chat View for Active Tab -->
    <div class="chat-content">
      <ChatView
        v-if="activeTab"
        ref="chatViewRef"
        :key="activeTab.id"
        :request-id="activeTab.itemId"
        :collection-id="activeTab.collectionId"
        :folder-id="activeTab.folderId"
        :conversation-id="activeTab.conversationId"
        :request-name="activeTab.name"
      />
      <div v-else class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>No request open</h3>
        <p>Select a request from the sidebar or create a new one</p>
        <button class="new-request-btn" @click="addNewTab">
          + New Request
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ChatView from './ChatView.vue'
import { useTabs } from '../../stores/useTabs.js'

const tabsStore = useTabs()
const chatViewRef = ref(null)

const tabs = computed(() => tabsStore.tabs.value || [])
const activeTabId = computed(() => tabsStore.activeTab.value?.id)
const activeTab = computed(() => tabsStore.activeTab.value)

function getMethodColor(method) {
  const colors = {
    'GET': 'var(--color-get)',
    'POST': 'var(--color-post)',
    'PUT': 'var(--color-put)',
    'PATCH': 'var(--color-patch)',
    'DELETE': 'var(--color-delete)'
  }
  return colors[method] || 'var(--color-text-secondary)'
}

function setActiveTab(tabId) {
  tabsStore.setActiveTab(tabId)
}

function closeTab(tabId) {
  tabsStore.closeTab(tabId)
}

function addNewTab() {
  tabsStore.createTab({
    name: 'New Request',
    method: 'GET'
  })
}

// Expose for parent access
defineExpose({
  chatViewRef,
  addNewTab
})
</script>

<style scoped>
.chat-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
}

.tab-bar {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  min-height: 40px;
  padding: 0 8px;
  gap: 4px;
}

.tabs-container {
  display: flex;
  flex: 1;
  overflow-x: auto;
  gap: 2px;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  max-width: 200px;
  min-width: 100px;
}

.tab:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
}

.tab.active {
  background: var(--color-bg-primary);
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg-primary);
  margin-bottom: -1px;
}

.tab-method {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.tab-name {
  flex: 1;
  font-size: 12px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  padding: 0 4px;
  font-size: 14px;
  line-height: 1;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s ease;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.add-tab-btn {
  padding: 6px 12px;
  font-size: 16px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.add-tab-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border-dark);
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0 0 24px 0;
}

.new-request-btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  background: var(--color-button-bg);
  color: var(--color-button-text);
  border: 1px solid var(--color-border-dark);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-request-btn:hover {
  background: var(--color-button-bg-hover);
  transform: translateY(-1px);
}
</style>
