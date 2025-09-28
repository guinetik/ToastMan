<script setup>
import { onMounted, onUnmounted } from 'vue'
import { SidebarController } from '../controllers/SidebarController.js'
import CollectionsTab from './tabs/CollectionsTab.vue'
import EnvironmentsTab from './tabs/EnvironmentsTab.vue'
import HistoryTab from './tabs/HistoryTab.vue'

// Create controller instance
const controller = new SidebarController()

// Access reactive state from controller (keep it reactive by not destructuring)
const state = controller.state

// Component methods that delegate to controller
const switchTab = (tab) => controller.switchTab(tab)

// Lifecycle hooks
onMounted(() => {
  controller.init()
})

onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <div class="sidebar">
    <!-- Tab Headers -->
    <div class="sidebar-tabs">
      <button
        :class="['tab', { active: state.activeTab === 'collections' }]"
        @click="switchTab('collections')"
      >
        📁 Collections
      </button>
      <button
        :class="['tab', { active: state.activeTab === 'environments' }]"
        @click="switchTab('environments')"
      >
        🌍 Environments
      </button>
      <button
        :class="['tab', { active: state.activeTab === 'history' }]"
        @click="switchTab('history')"
      >
        📜 History
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <CollectionsTab v-if="state.activeTab === 'collections'" />
      <EnvironmentsTab v-if="state.activeTab === 'environments'" />
      <HistoryTab v-if="state.activeTab === 'history'" />
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  height: 100%;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  flex: 1;
  padding: 12px 8px;
  background: var(--color-bg-tertiary);
  border: none;
  border-right: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:last-child {
  border-right: none;
}

.tab:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.tab.active {
  background: var(--color-bg-secondary);
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
}

.tab-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
</style>