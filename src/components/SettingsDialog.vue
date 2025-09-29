<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { SettingsDialogController } from '../controllers/SettingsDialogController.js'
import BaseDialog from './BaseDialog.vue'

// Import all settings tab components
import GeneralSettings from './settings/GeneralSettings.vue'
import RequestSettings from './settings/RequestSettings.vue'
import UISettings from './settings/UISettings.vue'
import ProxySettings from './settings/ProxySettings.vue'
import CertificatesSettings from './settings/CertificatesSettings.vue'

const emit = defineEmits(['close'])

// Create controller instance and initialize immediately
const controller = new SettingsDialogController()
controller.init()

// Access reactive state from controller
const {
  loading,
  errors,
  formData
} = controller.state

// Create computed ref for activeTab to ensure reactivity
const activeTab = computed(() => controller.state.activeTab)

// Component methods that delegate to controller
const closeDialog = async () => {
  // Check for unsaved changes
  if (controller.hasUnsavedChanges()) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?')
    if (!confirmed) return
  }

  emit('close')
}

const saveSettings = () => controller.submit()
const switchTab = (tab) => controller.switchTab(tab)
const resetToDefaults = () => controller.resetToDefaults()
const exportSettings = () => controller.exportSettings()

// Handle settings updates from tab components
const updateGeneralSettings = (newSettings) => {
  controller.updateGeneralSettings(newSettings)
}

const updateRequestSettings = (newSettings) => {
  controller.updateRequestSettings(newSettings)
}

const updateUISettings = (newSettings) => {
  controller.updateUISettings(newSettings)
}

const updateProxySettings = (newSettings) => {
  controller.updateProxySettings(newSettings)
}

const updateCertificatesSettings = (newCertificates) => {
  controller.updateCertificatesSettings(newCertificates)
}

// Keyboard shortcuts
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    closeDialog()
  } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    saveSettings()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <BaseDialog
    title="Settings"
    width="700px"
    height="600px"
    @close="closeDialog"
  >
    <div class="settings-container">
      <!-- Settings Tabs -->
      <div class="settings-tabs">
        <button
          :class="['settings-tab', { active: activeTab === 'general' }]"
          @click="switchTab('general')"
        >
          ⚙️ General
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'request' }]"
          @click="switchTab('request')"
        >
          🌐 Request
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'ui' }]"
          @click="switchTab('ui')"
        >
          🎨 UI
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'proxy' }]"
          @click="switchTab('proxy')"
        >
          🔄 Proxy
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'certificates' }]"
          @click="switchTab('certificates')"
        >
          🔒 Certificates
        </button>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <GeneralSettings
          v-if="activeTab === 'general' && formData?.general"
          :settings="formData.general"
          @update:settings="updateGeneralSettings"
        />

        <RequestSettings
          v-if="activeTab === 'request' && formData?.request"
          :settings="formData.request"
          @update:settings="updateRequestSettings"
        />

        <UISettings
          v-if="activeTab === 'ui' && formData?.ui"
          :settings="formData.ui"
          @update:settings="updateUISettings"
        />

        <ProxySettings
          v-if="activeTab === 'proxy' && formData?.proxy"
          :settings="formData.proxy"
          @update:settings="updateProxySettings"
        />

        <CertificatesSettings
          v-if="activeTab === 'certificates' && formData?.certificates"
          :certificates="formData.certificates"
          @update:certificates="updateCertificatesSettings"
        />
      </div>

      <!-- Action Buttons -->
      <div class="settings-actions">
        <div class="actions-left">
          <button @click="resetToDefaults" class="btn-secondary">
            Reset to Defaults
          </button>
          <button @click="exportSettings" class="btn-secondary">
            Export Settings
          </button>
        </div>
        <div class="actions-right">
          <button @click="closeDialog" class="btn-secondary">
            Cancel
          </button>
          <button @click="saveSettings" class="btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped>
.settings-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.settings-tab {
  background: none;
  border: none;
  padding: 12px 20px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.settings-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.settings-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  background: var(--color-bg-tertiary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
  margin-right: -8px;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

.settings-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  margin-top: 20px;
}

.actions-left,
.actions-right {
  display: flex;
  gap: 12px;
}

.btn-primary {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}
</style>