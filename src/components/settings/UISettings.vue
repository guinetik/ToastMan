<script setup>
import { computed } from 'vue'
import { UISettingsController } from '../../controllers/settings/UISettingsController.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])

// Create controller instance
const controller = new UISettingsController()
controller.init(props.settings)

// Handle settings changes
controller.on('settingsChanged', (newSettings) => {
  emit('update:settings', newSettings)
})

// Access reactive state from controller
const { errors } = controller.state

// Computed properties for form values
const theme = computed({
  get: () => props.settings.theme,
  set: (value) => controller.updateSettings({ theme: value })
})

const fontSize = computed({
  get: () => props.settings.fontSize,
  set: (value) => controller.updateSettings({ fontSize: parseInt(value) })
})

const sidebarWidth = computed({
  get: () => props.settings.sidebarWidth,
  set: (value) => controller.updateSettings({ sidebarWidth: parseInt(value) })
})

const showLineNumbers = computed({
  get: () => props.settings.showLineNumbers,
  set: (value) => controller.updateSettings({ showLineNumbers: value })
})

const wordWrap = computed({
  get: () => props.settings.wordWrap,
  set: (value) => controller.updateSettings({ wordWrap: value })
})

const autoComplete = computed({
  get: () => props.settings.autoComplete,
  set: (value) => controller.updateSettings({ autoComplete: value })
})
</script>

<template>
  <div class="ui-settings">
    <div class="setting-group">
      <label class="setting-label">Theme</label>
      <select v-model="theme" class="setting-select">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto (System)</option>
      </select>
      <div class="setting-description">
        Choose the application color theme
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Font size (px)</label>
      <input
        type="number"
        v-model="fontSize"
        min="10"
        max="24"
        class="setting-input"
      >
      <div v-if="errors.fontSize" class="error-text">{{ errors.fontSize }}</div>
      <div class="setting-description">
        Base font size for the application (10-24px)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Sidebar width (%)</label>
      <input
        type="number"
        v-model="sidebarWidth"
        min="15"
        max="50"
        class="setting-input"
      >
      <div v-if="errors.sidebarWidth" class="error-text">{{ errors.sidebarWidth }}</div>
      <div class="setting-description">
        Default width of the sidebar panel (15-50%)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="showLineNumbers"
          class="setting-checkbox"
        >
        Show line numbers in code editor
      </label>
      <div class="setting-description">
        Display line numbers in JSON/code views
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="wordWrap"
          class="setting-checkbox"
        >
        Enable word wrap
      </label>
      <div class="setting-description">
        Wrap long lines in code editor and response viewer
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="autoComplete"
          class="setting-checkbox"
        >
        Enable auto-complete
      </label>
      <div class="setting-description">
        Show suggestions and auto-completion in editors
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-settings {
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

.setting-select {
  width: 100%;
  max-width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.setting-input:focus,
.setting-select:focus {
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