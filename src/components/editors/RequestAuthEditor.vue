<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { RequestAuthEditorController } from '../../controllers/RequestAuthEditorController.js'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      type: 'none',
      bearer: { token: '' },
      basic: { username: '', password: '' },
      apikey: { key: 'X-API-Key', value: '', in: 'header' }
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// Controller instance
let controller = null

// Reactive refs bound to controller state
const state = ref({})

// Initialize controller
onMounted(() => {
  controller = new RequestAuthEditorController()
  state.value = controller.state

  // Initialize from props
  controller.initializeFromModel(props.modelValue)

  // Setup event handlers
  controller.on('update:modelValue', (newValue) => {
    emit('update:modelValue', newValue)
  })
})

onUnmounted(() => {
  if (controller) {
    controller.dispose()
    controller = null
  }
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (controller && newValue) {
    controller.initializeFromModel(newValue)
  }
}, { deep: true })

// Delegate methods to controller
const getAuthTypes = () => controller?.getAuthTypes() || []
const getApiKeyLocations = () => controller?.getApiKeyLocations() || []
const changeAuthType = (type) => controller?.changeAuthType(type)
const updateBearerToken = (token) => controller?.updateBearerToken(token)
const updateBasicUsername = (username) => controller?.updateBasicUsername(username)
const updateBasicPassword = (password) => controller?.updateBasicPassword(password)
const updateApiKeyName = (name) => controller?.updateApiKeyName(name)
const updateApiKeyValue = (value) => controller?.updateApiKeyValue(value)
const updateApiKeyLocation = (location) => controller?.updateApiKeyLocation(location)
const getCurlHint = () => controller?.getCurlHint() || ''
</script>

<template>
  <div class="request-auth-editor">
    <!-- Auth Type Selector -->
    <div class="auth-type-selector">
      <label class="form-label">Type</label>
      <select
        v-model="state.currentAuthType"
        @change="changeAuthType(state.currentAuthType)"
        class="auth-type-select"
      >
        <option v-for="type in getAuthTypes()" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>

    <!-- Auth Content -->
    <div class="auth-content">
      <!-- No Auth -->
      <div v-if="state.currentAuthType === 'none'" class="auth-none">
        <div class="empty-state">
          <p class="empty-message">This request does not use any authentication.</p>
        </div>
      </div>

      <!-- Bearer Token -->
      <div v-if="state.currentAuthType === 'bearer'" class="auth-bearer">
        <div class="form-group">
          <label class="form-label">Token</label>
          <input
            type="text"
            :value="state.bearerToken"
            @input="updateBearerToken($event.target.value)"
            placeholder="Enter your bearer token (e.g., eyJhbGciOi...)"
            class="form-input token-input"
          />
        </div>
        <div class="auth-hint">
          <span class="hint-label">cURL:</span>
          <code class="hint-code">{{ getCurlHint() }}</code>
        </div>
      </div>

      <!-- Basic Auth -->
      <div v-if="state.currentAuthType === 'basic'" class="auth-basic">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            type="text"
            :value="state.basicUsername"
            @input="updateBasicUsername($event.target.value)"
            placeholder="Enter username"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            type="password"
            :value="state.basicPassword"
            @input="updateBasicPassword($event.target.value)"
            placeholder="Enter password"
            class="form-input"
          />
        </div>
        <div class="auth-hint">
          <span class="hint-label">cURL:</span>
          <code class="hint-code">{{ getCurlHint() }}</code>
        </div>
      </div>

      <!-- API Key -->
      <div v-if="state.currentAuthType === 'apikey'" class="auth-apikey">
        <div class="form-group">
          <label class="form-label">Key</label>
          <input
            type="text"
            :value="state.apiKeyName"
            @input="updateApiKeyName($event.target.value)"
            placeholder="Header or param name (e.g., X-API-Key)"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Value</label>
          <input
            type="text"
            :value="state.apiKeyValue"
            @input="updateApiKeyValue($event.target.value)"
            placeholder="API key value"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Add to</label>
          <div class="radio-group">
            <label
              v-for="loc in getApiKeyLocations()"
              :key="loc.value"
              class="radio-label"
            >
              <input
                type="radio"
                :value="loc.value"
                :checked="state.apiKeyLocation === loc.value"
                @change="updateApiKeyLocation(loc.value)"
                name="apikey-location"
              />
              {{ loc.label }}
            </label>
          </div>
        </div>
        <div class="auth-hint">
          <span class="hint-label">cURL:</span>
          <code class="hint-code">{{ getCurlHint() }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-auth-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.auth-type-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.auth-type-select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  width: 100%;
  max-width: 300px;
  cursor: pointer;
}

.auth-type-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.auth-content {
  flex: 1;
}

.auth-none {
  padding: 40px 20px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-message {
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0;
}

.auth-bearer,
.auth-basic,
.auth-apikey {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 500px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input::placeholder {
  color: var(--color-text-muted);
}

.token-input {
  font-family: var(--font-mono);
  font-size: 13px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-primary);
}

.radio-label input[type="radio"] {
  cursor: pointer;
  accent-color: var(--color-primary);
}

.auth-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.hint-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.hint-code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-secondary);
  background: transparent;
  padding: 0;
}
</style>
