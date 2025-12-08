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
      <!-- Model Selector -->
      <div class="model-selector-section">
        <label class="selector-label">AI Model</label>
        <CustomDropdown
          v-model="selectedModel"
          :options="modelOptions"
          :disabled="isLoading"
          placeholder="Select AI model"
        />
      </div>

      <!-- Example Prompts -->
      <div v-if="showExamples && !isLoading" class="examples-section">
        <div class="examples-label">Quick Examples:</div>
        <div class="examples-grid">
          <button
            v-for="(example, index) in examples"
            :key="index"
            class="example-btn"
            @click="useExample(example)"
          >
            {{ example }}
          </button>
        </div>
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

      <!-- Generate Button -->
      <div class="actions-section">
        <button
          class="primary large"
          :disabled="!canGenerate"
          @click="generate"
        >
          <span v-if="!isLoading">✨ Generate cURL Command</span>
          <span v-else>⏳ {{ loadingText }}</span>
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

const conversationsStore = useConversations()

const selectedModel = ref('phi-3.5-mini')
const query = ref('')
const isLoading = ref(false)
const loadingText = ref('Generating...')
const loadingProgress = ref(0)
const progressText = ref('')

const webgpuAvailable = ref(false)
const webgpuChecked = ref(false)
const webgpuMessage = ref('')

const models = WEBLLM_MODELS
const showExamples = ref(true)

// Convert models object to dropdown options
const modelOptions = computed(() => {
  return Object.entries(WEBLLM_MODELS).map(([key, model]) => ({
    value: key,
    label: `${model.name} (${model.params}) - ${model.size}`
  }))
})

const examples = [
  'GET request to https://api.github.com/users/octocat',
  'POST JSON data to create a new user',
  'GET with bearer token authentication to /profile',
  'GraphQL mutation to update user email'
]

const canGenerate = computed(() => {
  return query.value.trim().length > 0 && !isLoading.value && webgpuAvailable.value
})

const showProgress = computed(() => {
  return loadingProgress.value > 0
})

const progressPercent = computed(() => {
  return `${Math.round(loadingProgress.value * 100)}%`
})

onMounted(async () => {
  // Initialize AI controller
  await aiController.init()

  // Get WebGPU status
  webgpuAvailable.value = aiController.state.webgpuAvailable
  webgpuChecked.value = aiController.state.webgpuChecked
  webgpuMessage.value = aiController.state.webgpuMessage

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
})

// Watch for model changes in controller state
watch(() => aiController.state.isModelLoading, (newVal) => {
  if (newVal) {
    isLoading.value = true
    loadingText.value = 'Loading model...'
  }
})

watch(() => aiController.state.isGenerating, (newVal) => {
  if (newVal) {
    isLoading.value = true
    loadingText.value = 'Generating...'
  } else {
    isLoading.value = false
  }
})

function useExample(example) {
  query.value = example
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
  background: var(--color-bg-primary);
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

.model-selector-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selector-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.examples-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.examples-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.example-btn {
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.example-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
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
  .examples-grid {
    grid-template-columns: 1fr;
  }
}
</style>
