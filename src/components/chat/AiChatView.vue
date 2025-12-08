<template>
  <div class="ai-chat-view">
    <!-- WebGPU Status Warning -->
    <div v-if="!webgpuAvailable && webgpuChecked" class="webgpu-warning">
      <span class="warning-icon">⚠️</span>
      <div class="warning-content">
        <div class="warning-title">AI Chat Unavailable</div>
        <div class="warning-message">{{ webgpuMessage }}</div>
      </div>
    </div>

    <!-- Main Chat Interface -->
    <div v-else class="chat-interface">
      <!-- Model Info & Examples Row -->
      <div class="info-row">
        <div class="model-info">
          <span class="model-label">Model:</span>
          <button
            class="model-link"
            @click="openAiSettings"
            :title="`Click to configure AI model in Settings`"
          >
            {{ selectedModelInfo?.name || 'Not configured' }}
          </button>
        </div>

        <!-- Example Prompts Dropdown -->
        <CustomDropdown
          v-model="selectedExample"
          :options="exampleOptions"
          placeholder="Quick Examples..."
          @update:modelValue="useExample"
          class="examples-dropdown"
          :disabled="isLoading"
        />
      </div>

      <!-- Query Input -->
      <div class="input-section">
        <label class="input-label">Describe your request in natural language</label>
        <textarea
          v-model="query"
          class="query-input"
          placeholder="e.g., GET request to GitHub API for user octocat"
          rows="3"
          :disabled="isLoading"
          @keydown="handleKeydown"
        ></textarea>
      </div>

      <!-- Send Button -->
      <div class="actions-section">
        <button
          class="send-btn"
          :disabled="!canGenerate"
          @click="generate"
        >
          <span v-if="!isLoading">Send</span>
          <span v-else class="loading-content">
            <span class="loading-spinner"></span>
            {{ loadingText }}
          </span>
        </button>
      </div>

      <!-- Loading Progress -->
      <div v-if="isLoading && showProgress" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent }"></div>
        </div>
        <div class="progress-text">{{ progressText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import aiController from '../../controllers/AiController.js'
import { WEBLLM_MODELS } from '../../services/AiService.js'
import { useConversations } from '../../stores/useConversations.js'
import CustomDropdown from '../base/CustomDropdown.vue'
import { openSettings as openSettingsDialog } from '../../utils/settingsUtils.js'

const conversationsStore = useConversations()

const selectedModel = ref('')
const query = ref('')
const isLoading = ref(false)
const loadingText = ref('Generating...')
const loadingProgress = ref(0)
const progressText = ref('')
const selectedExample = ref('')

const webgpuAvailable = ref(false)
const webgpuChecked = ref(false)
const webgpuMessage = ref('')

// Example prompts list
const examples = [
  'GET request to https://api.github.com/users/octocat',
  'POST JSON data to create a new user',
  'GET with bearer token authentication to /profile',
  'GraphQL mutation to update user email',
  'DELETE request with confirmation header',
  'PUT request to update product details',
  'POST multipart form data to upload a file',
  'GET request with query parameters for pagination'
]

// Convert examples to dropdown options
const exampleOptions = computed(() => {
  const options = [{ value: '', label: 'Quick Examples...' }]
  examples.forEach((example, index) => {
    options.push({
      value: String(index),
      label: example
    })
  })
  return options
})

// Selected model info
const selectedModelInfo = computed(() => {
  if (!selectedModel.value) return null
  return WEBLLM_MODELS[selectedModel.value]
})

const canGenerate = computed(() => {
  return query.value.trim().length > 0 && !isLoading.value && webgpuAvailable.value && selectedModel.value
})

const showProgress = computed(() => {
  return loadingProgress.value > 0
})

const progressPercent = computed(() => {
  return `${Math.round(loadingProgress.value * 100)}%`
})

onMounted(async () => {
  // Load AI settings from localStorage
  loadAiSettings()

  // Initialize AI controller
  await aiController.init()

  // Get WebGPU status
  webgpuAvailable.value = aiController.state.webgpuAvailable
  webgpuChecked.value = aiController.state.webgpuChecked
  webgpuMessage.value = aiController.state.webgpuMessage

  // Auto-load model if configured
  if (getAiSettings().autoLoadModel && selectedModel.value && webgpuAvailable.value) {
    // Initialize model in background
    aiController.initModel(selectedModel.value, (progress) => {
      // Silent background load - no UI updates for auto-load
    }).catch(error => {
      console.error('Failed to auto-load model:', error)
    })
  }

  // Listen to controller events
  aiController.on('model-loading-progress', (progress) => {
    loadingProgress.value = progress.progress || 0
    progressText.value = progress.text || ''
  })

  aiController.on('generation-start', () => {
    isLoading.value = true
    loadingText.value = 'Generating...'
  })

  aiController.on('generation-complete', () => {
    isLoading.value = false
    query.value = '' // Clear input after successful generation
  })

  aiController.on('generation-error', () => {
    isLoading.value = false
    loadingText.value = 'Generate cURL Command'
  })

  // Listen for settings changes
  window.addEventListener('storage', handleStorageChange)
})

// Load AI settings from localStorage
function loadAiSettings() {
  const settings = getAiSettings()
  if (settings && 'selectedModel' in settings) {
    selectedModel.value = settings.selectedModel
  }
}

// Get AI settings from localStorage
function getAiSettings() {
  try {
    const saved = localStorage.getItem('toastman_settings')
    if (saved) {
      const settings = JSON.parse(saved)
      return settings.ai || {}
    }
  } catch (error) {
    console.error('Failed to load AI settings:', error)
  }
  return {}
}

// Handle storage changes (when settings are updated)
function handleStorageChange(event) {
  if (event.key === 'toastman_settings') {
    loadAiSettings()
  }
}

function openAiSettings() {
  // Open settings dialog on AI tab
  openSettingsDialog('ai')
}

function useExample(exampleIndex) {
  if (!exampleIndex) return

  const index = parseInt(exampleIndex)
  if (index >= 0 && index < examples.length) {
    query.value = examples[index]
  }

  // Reset dropdown
  selectedExample.value = ''
}

async function generate() {
  if (!canGenerate.value) return

  const queryText = query.value.trim()

  // Generate and add to conversation
  const result = await aiController.generateAndAddToConversation(
    queryText,
    conversationsStore,
    selectedModel.value,
    (progress) => {
      loadingProgress.value = progress.progress || 0
      progressText.value = progress.text || 'Loading model...'
    }
  )

  if (!result.success) {
    // Error is already shown via controller events
    console.error('Generation failed:', result.error)
  }
}

function handleKeydown(event) {
  // Cmd/Ctrl + Enter to generate
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    generate()
  }
}
</script>

<style scoped>
.ai-chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: transparent;
}

.webgpu-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
}

.warning-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-size: 14px;
  font-weight: 600;
  color: #f59e0b;
  margin-bottom: 4px;
}

.warning-message {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.chat-interface {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.model-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.model-link {
  background: none;
  border: none;
  color: #3b82f6;
  text-decoration: underline;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.model-link:hover {
  color: #2563eb;
  text-decoration: none;
}

.examples-dropdown {
  min-width: 180px;
  max-width: 220px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.query-input {
  padding: 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
}

.query-input:focus {
  outline: none;
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 1px var(--color-text-primary);
}

.query-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.query-input::placeholder {
  color: var(--color-text-muted);
}

.actions-section {
  display: flex;
  justify-content: flex-end;
}

.send-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
  text-align: center;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .ai-chat-view {
    padding: 12px;
  }

  .info-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .model-info {
    justify-content: center;
  }

  .examples-dropdown {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .send-btn {
    width: 100%;
  }

  .query-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>
