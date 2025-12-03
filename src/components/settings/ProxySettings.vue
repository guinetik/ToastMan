<script setup>
import { computed } from 'vue'
import { ProxySettingsController } from '../../controllers/settings/ProxySettingsController.js'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])

// Create controller instance
const controller = new ProxySettingsController()
controller.init(props.settings)

// Handle settings changes
controller.on('settingsChanged', (newSettings) => {
  emit('update:settings', newSettings)
})

// Handle test results
controller.on('testResult', (result) => {
  // Could show toast notification here
})

// Access reactive state from controller
const { errors, testing } = controller.state

// Computed properties for form values
const enabled = computed({
  get: () => props.settings.enabled,
  set: (value) => controller.updateSettings({ enabled: value })
})

const protocol = computed({
  get: () => props.settings.protocol,
  set: (value) => controller.updateSettings({ protocol: value })
})

const host = computed({
  get: () => props.settings.host,
  set: (value) => controller.updateSettings({ host: value })
})

const port = computed({
  get: () => props.settings.port,
  set: (value) => controller.updateSettings({ port: parseInt(value) })
})

const username = computed({
  get: () => props.settings.auth?.username || '',
  set: (value) => controller.updateSettings({ auth: { username: value } })
})

const password = computed({
  get: () => props.settings.auth?.password || '',
  set: (value) => controller.updateSettings({ auth: { password: value } })
})

// Methods
const testConnection = () => {
  controller.testConnection()
}
</script>

<template>
  <div class="proxy-settings">
    <div class="setting-group">
      <label class="setting-label">
        <input
          type="checkbox"
          v-model="enabled"
          class="setting-checkbox"
        >
        Enable proxy
      </label>
      <div class="setting-description">
        Route requests through a proxy server
      </div>
    </div>

    <template v-if="enabled">
      <div class="setting-group">
        <label class="setting-label">Protocol</label>
        <select v-model="protocol" class="setting-select">
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
          <option value="socks4">SOCKS4</option>
          <option value="socks5">SOCKS5</option>
        </select>
        <div class="setting-description">
          Proxy protocol type
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-row">
          <div class="setting-field">
            <label class="setting-label">Host</label>
            <input
              type="text"
              v-model="host"
              placeholder="proxy.company.com"
              class="setting-input"
            >
            <div v-if="errors.host" class="error-text">{{ errors.host }}</div>
          </div>
          <div class="setting-field">
            <label class="setting-label">Port</label>
            <input
              type="number"
              v-model="port"
              placeholder="8080"
              class="setting-input port-input"
              min="1"
              max="65535"
            >
            <div v-if="errors.port" class="error-text">{{ errors.port }}</div>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label">Authentication (Optional)</label>
        <div class="setting-row">
          <input
            type="text"
            v-model="username"
            placeholder="Username"
            class="setting-input flex-1"
          >
          <input
            type="password"
            v-model="password"
            placeholder="Password"
            class="setting-input flex-1"
          >
        </div>
        <div class="setting-description">
          Credentials for proxy authentication (if required)
        </div>
      </div>

      <div class="setting-group">
        <button
          @click="testConnection"
          class="test-btn"
          :disabled="testing || !host"
        >
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
        <div v-if="errors.connection" class="error-text">{{ errors.connection }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.proxy-settings {
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

.setting-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.setting-field {
  flex: 1;
}

.port-input {
  max-width: 100px;
}

.flex-1 {
  flex: 1;
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

.test-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--color-button-bg);
  border: 1px solid var(--color-border-dark);
  color: var(--color-button-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-btn:hover:not(:disabled) {
  background: var(--color-button-bg-hover);
  transform: translateY(-1px);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>