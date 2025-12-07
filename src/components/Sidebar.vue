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
        data-icon="📁"
        title="Collections"
      >
        📁 Collections
      </button>
      <button
        :class="['tab', { active: state.activeTab === 'environments' }]"
        @click="switchTab('environments')"
        data-icon="🌍"
        title="Environments"
      >
        🌍 Environments
      </button>
      <button
        :class="['tab', { active: state.activeTab === 'history' }]"
        @click="switchTab('history')"
        data-icon="📜"
        title="History"
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
  background: var(--color-bg-tertiary);
  padding: 4px;
  gap: 2px;
}

.tab {
  flex: 1;
  padding: 10px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  margin-bottom: -1px;
}

.tab:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-border);
  transform: translateY(-1px);
}

.tab.active {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg-secondary);
  font-weight: 600;
  z-index: 1;
}

.tab-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .tab {
    font-size: 12px;
    padding: 8px 8px;
    white-space: nowrap;
  }
}

/* Very narrow screens - icon only */
@media (max-width: 350px) {
  .tab {
    font-size: 16px;
    padding: 8px 6px;
    min-width: 0;
  }

  /* Hide text, keep emoji only */
  .tab::after {
    content: attr(data-icon);
  }

  .tab {
    text-indent: -9999px;
    position: relative;
  }

  .tab::after {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    text-indent: 0;
  }
}
</style>