<script setup>
import { computed } from 'vue'
import { GeneralSettingsController } from '../../controllers/settings/GeneralSettingsController.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])

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
</style>