<script setup>
import { computed } from 'vue'
import { RequestSettingsController } from '../../controllers/settings/RequestSettingsController.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])

// Create controller instance
const controller = new RequestSettingsController()
controller.init(props.settings)

// Handle settings changes
controller.on('settingsChanged', (newSettings) => {
  emit('update:settings', newSettings)
})

// Access reactive state from controller
const { errors } = controller.state

// Computed properties for form values
const timeout = computed({
  get: () => props.settings.timeout,
  set: (value) => controller.updateSettings({ timeout: parseInt(value) })
})

const followRedirects = computed({
  get: () => props.settings.followRedirects,
  set: (value) => controller.updateSettings({ followRedirects: value })
})

const maxRedirects = computed({
  get: () => props.settings.maxRedirects,
  set: (value) => controller.updateSettings({ maxRedirects: parseInt(value) })
})

const validateSSL = computed({
  get: () => props.settings.validateSSL,
  set: (value) => controller.updateSettings({ validateSSL: value })
})
</script>

<template>
  <div class="request-settings">
    <div class="setting-group">
      <label class="setting-label">Request timeout (milliseconds)</label>
      <input
        type="number"
        v-model="timeout"
        min="1000"
        max="300000"
        class="setting-input"
      >
      <div v-if="errors.timeout" class="error-text">{{ errors.timeout }}</div>
      <div class="setting-description">
        Maximum time to wait for a response (1000-300000 ms)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="followRedirects"
          class="setting-checkbox"
        >
        Follow redirects automatically
      </label>
      <div class="setting-description">
        Automatically follow HTTP redirects (3xx status codes)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Maximum redirects</label>
      <input
        type="number"
        v-model="maxRedirects"
        min="0"
        max="50"
        class="setting-input"
      >
      <div v-if="errors.maxRedirects" class="error-text">{{ errors.maxRedirects }}</div>
      <div class="setting-description">
        Maximum number of redirects to follow (0-50)
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="validateSSL"
          class="setting-checkbox"
        >
        Validate SSL certificates
      </label>
      <div class="setting-description">
        Verify SSL/TLS certificates when making HTTPS requests
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-settings {
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