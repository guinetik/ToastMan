<script setup>
import { computed } from 'vue'
import { GeneralSettingsController } from '../../controllers/settings/GeneralSettingsController.js'
import { useAlert } from '../../composables/useAlert.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])
const { showConfirm, alertError } = useAlert()

// Create controller instance
const controller = new GeneralSettingsController()
controller.init(props.settings)

// Handle settings changes
controller.on('settingsChanged', (newSettings) => {
  emit('update:settings', newSettings)
})

// Access reactive state from controller
const { errors } = controller.state

// Computed properties for form values
const autoSave = computed({
  get: () => props.settings.autoSave,
  set: (value) => controller.updateSettings({ autoSave: value })
})

const autoSaveInterval = computed({
  get: () => Math.floor(props.settings.autoSaveInterval / 1000), // Convert ms to seconds for display
  set: (value) => controller.updateSettings({ autoSaveInterval: parseInt(value) * 1000 })
})

const confirmOnDelete = computed({
  get: () => props.settings.confirmOnDelete,
  set: (value) => controller.updateSettings({ confirmOnDelete: value })
})

const maxHistoryItems = computed({
  get: () => props.settings.maxHistoryItems,
  set: (value) => controller.updateSettings({ maxHistoryItems: parseInt(value) })
})

// Delete all data handler
async function deleteAllData() {
  // First confirmation
  const confirmed = await showConfirm({
    title: '⚠️ Delete All Data',
    message: 'This will permanently delete ALL your data including:\n\n' +
             '• Collections and requests\n' +
             '• Environments and variables\n' +
             '• Conversation history\n' +
             '• All settings\n' +
             '• AI model cache\n\n' +
             'This action CANNOT be undone!\n\n' +
             'Are you sure you want to continue?',
    type: 'error',
    confirmText: 'Continue',
    cancelText: 'Cancel'
  })

  if (!confirmed) return

  // Double confirmation for safety
  const doubleConfirmed = await showConfirm({
    title: '🚨 FINAL WARNING',
    message: 'You are about to DELETE EVERYTHING.\n\n' +
             'Click "Delete All" to proceed with deletion, or "Cancel" to keep your data.',
    type: 'error',
    confirmText: 'Delete All',
    cancelText: 'Cancel'
  })

  if (!doubleConfirmed) return

  try {
    // Clear all localStorage
    localStorage.clear()

    // Reload the page to reset app state
    window.location.reload()
  } catch (error) {
    alertError(`Failed to clear data: ${error.message}`)
  }
}
</script>

<template>
  <div class="general-settings">
    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="autoSave"
          class="setting-checkbox"
        >
        Auto-save changes
      </label>
      <div class="setting-description">
        Automatically save your work as you make changes
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Auto-save interval (seconds)</label>
      <input
        type="number"
        v-model="autoSaveInterval"
        min="10"
        max="300"
        class="setting-input"
      >
      <div v-if="errors.autoSaveInterval" class="error-text">{{ errors.autoSaveInterval }}</div>
      <div class="setting-description">
        How often to automatically save your changes (10-300 seconds)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="confirmOnDelete"
          class="setting-checkbox"
        >
        Confirm before deleting items
      </label>
      <div class="setting-description">
        Show confirmation dialog when deleting collections, requests, or environments
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Maximum history items</label>
      <input
        type="number"
        v-model="maxHistoryItems"
        min="0"
        max="1000"
        class="setting-input"
      >
      <div v-if="errors.maxHistoryItems" class="error-text">{{ errors.maxHistoryItems }}</div>
      <div class="setting-description">
        Maximum number of requests to keep in history (0-1000)
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="danger-zone">
      <div class="danger-zone-header">
        <h3 class="danger-zone-title">⚠️ Danger Zone</h3>
      </div>
      <div class="setting-group">
        <label class="setting-label">Delete All Data</label>
        <div class="setting-description">
          Permanently delete all collections, requests, environments, conversations, settings, and AI model cache.
          This action cannot be undone.
        </div>
        <button
          @click="deleteAllData"
          class="btn-danger"
        >
          🗑️ Delete All Data
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.general-settings {
  padding: 0;
}

.setting-group {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.setting-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 8px;
  cursor: pointer;
}

.setting-checkbox {
  margin-right: 8px;
  width: 16px;
  height: 16px;
}

.setting-input {
  width: 100%;
  max-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.setting-description {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  line-height: 1.4;
}

.error-text {
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}

/* Danger Zone */
.danger-zone {
  margin-top: 32px;
  padding: 20px;
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  background: rgba(239, 68, 68, 0.05);
}

.danger-zone-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.danger-zone-title {
  font-size: 16px;
  font-weight: 600;
  color: #ef4444;
  margin: 0;
}

.danger-zone .setting-group {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.btn-danger {
  margin-top: 12px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: #ef4444;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
}
</style>