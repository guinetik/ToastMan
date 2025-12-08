<template>
  <div class="ai-settings">
    <div class="settings-section">
      <h3 class="section-title">AI Assistant Configuration</h3>
      <p class="section-description">
        Configure the AI model used for generating cURL commands from natural language.
        Models run locally in your browser using WebGPU.
      </p>
    </div>

    <!-- WebGPU Status -->
    <div class="settings-section">
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">WebGPU Status</label>
          <p class="setting-description">
            WebGPU is required for running AI models in the browser
          </p>
        </div>
        <div class="setting-value">
          <div :class="['status-badge', webgpuAvailable ? 'status-success' : 'status-error']">
            {{ webgpuAvailable ? '✓ Available' : '✗ Unavailable' }}
          </div>
        </div>
      </div>

      <div v-if="!webgpuAvailable" class="warning-box">
        <span class="warning-icon">⚠️</span>
        <div class="warning-content">
          <div class="warning-text">{{ webgpuMessage }}</div>
        </div>
      </div>
    </div>

    <!-- Model Selection -->
    <div v-if="webgpuAvailable" class="settings-section">
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">AI Model</label>
          <p class="setting-description">
            Select the model to use for generating cURL commands
          </p>
        </div>
        <div class="setting-value">
          <CustomDropdown
            :modelValue="localSettings.selectedModel"
            @update:modelValue="updateModel"
            :options="modelOptions"
            :disabled="isLoading || isDownloading"
            placeholder="Select AI model"
            class="model-dropdown"
          />
        </div>
      </div>

      <!-- Selected Model Details -->
      <div v-if="selectedModelInfo" class="model-details">
        <div class="detail-row">
          <span class="detail-label">Parameters:</span>
          <span class="detail-value">{{ selectedModelInfo.params }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Size:</span>
          <span class="detail-value">{{ selectedModelInfo.size }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Description:</span>
          <span class="detail-value">{{ selectedModelInfo.description }}</span>
        </div>
      </div>
    </div>

    <!-- Model Download/Test -->
    <div v-if="webgpuAvailable && localSettings.selectedModel" class="settings-section">
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">Model Status</label>
          <p class="setting-description">
            Download and test the selected model to ensure it works
          </p>
        </div>
        <div class="setting-value">
          <button
            @click="downloadAndTestModel"
            :disabled="isLoading || isDownloading"
            class="btn-primary"
          >
            <span v-if="isDownloading">⏳ Downloading...</span>
            <span v-else-if="isLoading">⏳ Testing...</span>
            <span v-else>{{ modelInstalled ? '✓ Test Model' : '⬇ Download & Test' }}</span>
          </button>
        </div>
      </div>

      <!-- Download Progress -->
      <div v-if="isDownloading && downloadProgress > 0" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent }"></div>
        </div>
        <div class="progress-text">{{ progressText }}</div>
      </div>

      <!-- Test Result -->
      <div v-if="testResult" class="result-box" :class="testResult.success ? 'result-success' : 'result-error'">
        <span class="result-icon">{{ testResult.success ? '✓' : '✗' }}</span>
        <div class="result-content">
          <div class="result-text">{{ testResult.message }}</div>
          <div v-if="testResult.details" class="result-details">{{ testResult.details }}</div>
          <div v-if="testResult.output" class="result-output">{{ testResult.output }}</div>
        </div>
      </div>
    </div>

    <!-- Model Cache Management -->
    <div v-if="webgpuAvailable" class="settings-section">
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">Model Cache</label>
          <p class="setting-description">
            Clear downloaded AI models to free up browser storage space
          </p>
        </div>
        <div class="setting-value">
          <button
            @click="clearModelCache"
            class="btn-danger"
          >
            🗑️ Clear Model Cache
          </button>
        </div>
      </div>
    </div>

    <!-- Auto-load Model -->
    <div v-if="webgpuAvailable && localSettings.selectedModel" class="settings-section">
      <div class="setting-row">
        <div class="setting-info">
          <label class="setting-label">Auto-load Model</label>
          <p class="setting-description">
            Automatically load the model when opening the Chat tab
          </p>
        </div>
        <div class="setting-value">
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="localSettings.autoLoadModel"
              @change="updateAutoLoad($event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import aiController from '../../controllers/AiController.js'
import { WEBLLM_MODELS } from '../../services/AiService.js'
import CustomDropdown from '../base/CustomDropdown.vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:settings'])

const localSettings = ref({ ...props.settings })
const isLoading = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const progressText = ref('')
const testResult = ref(null)
const modelInstalled = ref(false)

const webgpuAvailable = ref(false)
const webgpuMessage = ref('')

// Model options for dropdown
const modelOptions = computed(() => {
  return Object.entries(WEBLLM_MODELS).map(([key, model]) => ({
    value: key,
    label: `${model.name} (${model.params})`
  }))
})

// Selected model details
const selectedModelInfo = computed(() => {
  if (!localSettings.value.selectedModel) return null
  return WEBLLM_MODELS[localSettings.value.selectedModel]
})

const progressPercent = computed(() => {
  return `${Math.round(downloadProgress.value * 100)}%`
})

onMounted(async () => {
  await aiController.init()
  webgpuAvailable.value = aiController.state.webgpuAvailable
  webgpuMessage.value = aiController.state.webgpuMessage

  // Listen to AI controller events
  aiController.on('model-loading-progress', (progress) => {
    isDownloading.value = true
    downloadProgress.value = progress.progress || 0
    progressText.value = progress.text || 'Loading model...'
  })

  aiController.on('model-loaded', () => {
    isDownloading.value = false
    modelInstalled.value = true
  })
})

function updateModel(modelKey) {
  localSettings.value.selectedModel = modelKey
  testResult.value = null
  modelInstalled.value = false
  emit('update:settings', { ...localSettings.value })
}

function updateAutoLoad(value) {
  localSettings.value.autoLoadModel = value
  emit('update:settings', { ...localSettings.value })
}

async function downloadAndTestModel() {
  if (!localSettings.value.selectedModel) return

  // Check if a model is already loaded
  if (aiController.isModelLoaded()) {
    const currentModel = aiController.getModelInfo()
    const newModel = selectedModelInfo.value

    const confirmed = confirm(
      `A model is already loaded (${currentModel?.name || 'Unknown'}). ` +
      `Loading ${newModel?.name || 'a new model'} will unload the current model to free GPU memory. ` +
      `\n\nContinue?`
    )

    if (!confirmed) {
      return
    }
  }

  testResult.value = null
  isLoading.value = true
  isDownloading.value = true
  downloadProgress.value = 0

  try {
    // Explicitly destroy current model to free GPU memory before downloading new one
    if (aiController.isModelLoaded()) {
      await aiController.destroyModel()
    }

    // Initialize/load the model
    const initResult = await aiController.initModel(
      localSettings.value.selectedModel,
      (progress) => {
        downloadProgress.value = progress.progress || 0
        progressText.value = progress.text || 'Loading model...'
      }
    )

    if (!initResult.success) {
      const errorMsg = String(initResult.error || 'Unknown error')

      // Check if it's a quota error
      if (errorMsg.toLowerCase().includes('quota')) {
        testResult.value = {
          success: false,
          message: 'Storage quota exceeded',
          details: 'Your browser has run out of storage space for AI models. Please clear your browser cache or use the "Clear Model Cache" button below to free up space.'
        }
      }
      // Check if it's a GPU memory error
      else if (errorMsg.toLowerCase().includes('memory') ||
               errorMsg.toLowerCase().includes('gpu') ||
               errorMsg.toLowerCase().includes('disposed') ||
               errorMsg.toLowerCase().includes('device')) {
        const currentModel = selectedModelInfo.value
        const modelSize = currentModel?.size || 'unknown size'
        const isGemma = localSettings.value.selectedModel === 'gemma-2-2b'

        testResult.value = {
          success: false,
          message: 'GPU memory insufficient',
          details: isGemma
            ? `Your GPU doesn't have enough memory for Gemma 2 (${modelSize}), which is already the smallest model available. Try: 1) Close other browser tabs and applications to free GPU memory, 2) Restart your browser, or 3) Use a device with more GPU memory.`
            : `Your GPU doesn't have enough memory for ${currentModel?.name || 'this model'} (${modelSize}). Try Gemma 2 (1.4GB) which is the smallest available, or close other browser tabs/applications to free GPU memory.`
        }
      }
      else {
        testResult.value = {
          success: false,
          message: `Model initialization failed: ${errorMsg}`
        }
      }
      isLoading.value = false
      isDownloading.value = false
      return
    }

    // Test with a simple prompt
    isDownloading.value = false
    const result = await aiController.generateCurl(
      'GET request to https://api.example.com',
      localSettings.value.selectedModel
    )

    if (result.success) {
      testResult.value = {
        success: true,
        message: 'Model is working correctly!',
        output: result.command?.substring(0, 100) + '...'
      }
      modelInstalled.value = true
    } else {
      testResult.value = {
        success: false,
        message: `Model test failed: ${result.error}`
      }
    }
  } catch (error) {
    const errorMsg = String(error?.message || error || 'Unknown error')

    // Check if it's a quota error
    if (errorMsg.toLowerCase().includes('quota')) {
      testResult.value = {
        success: false,
        message: 'Storage quota exceeded',
        details: 'Your browser has run out of storage space for AI models. Please clear your browser cache or use the "Clear Model Cache" button below to free up space.'
      }
    }
    // Check if it's a GPU memory error
    else if (errorMsg.toLowerCase().includes('memory') ||
             errorMsg.toLowerCase().includes('gpu') ||
             errorMsg.toLowerCase().includes('disposed') ||
             errorMsg.toLowerCase().includes('device')) {
      const currentModel = selectedModelInfo.value
      const modelSize = currentModel?.size || 'unknown size'
      const isGemma = localSettings.value.selectedModel === 'gemma-2-2b'

      testResult.value = {
        success: false,
        message: 'GPU memory insufficient',
        details: isGemma
          ? `Your GPU doesn't have enough memory for Gemma 2 (${modelSize}), which is already the smallest model available. Try: 1) Close other browser tabs and applications to free GPU memory, 2) Restart your browser, or 3) Use a device with more GPU memory.`
          : `Your GPU doesn't have enough memory for ${currentModel?.name || 'this model'} (${modelSize}). Try Gemma 2 (1.4GB) which is the smallest available, or close other browser tabs/applications to free GPU memory.`
      }
    }
    else {
      testResult.value = {
        success: false,
        message: `Error: ${errorMsg}`
      }
    }
  } finally {
    isLoading.value = false
    isDownloading.value = false
  }
}

async function clearModelCache() {
  if (!confirm('This will delete all downloaded AI models. You will need to download them again. Continue?')) {
    return
  }

  try {
    // Clear IndexedDB cache for WebLLM
    const databases = await indexedDB.databases()
    const webllmDbs = databases.filter(db => db.name?.includes('webllm') || db.name?.includes('model'))

    for (const db of webllmDbs) {
      indexedDB.deleteDatabase(db.name)
    }

    testResult.value = {
      success: true,
      message: 'Model cache cleared successfully!',
      details: 'All AI models have been deleted. You can now download a new model.'
    }

    modelInstalled.value = false
  } catch (error) {
    testResult.value = {
      success: false,
      message: `Failed to clear cache: ${error.message}`
    }
  }
}
</script>

<style scoped>
.ai-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.section-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.setting-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
}

.setting-value {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.model-dropdown {
  min-width: 200px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--color-success, #22c55e);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error, #ef4444);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.warning-box,
.result-box {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.warning-box {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.result-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.result-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.warning-icon,
.result-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.warning-content,
.result-content {
  flex: 1;
  min-width: 0;
}

.warning-text,
.result-text {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.5;
  font-weight: 500;
}

.result-details {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.result-output {
  margin-top: 8px;
  padding: 8px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
  overflow-x: auto;
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: 6px;
  margin-top: 8px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.detail-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 90px;
}

.detail-value {
  color: var(--color-text-primary);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
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
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
  text-align: center;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--color-success);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--color-button-bg);
  border: 1px solid var(--color-border-dark);
  color: var(--color-button-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-button-bg-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-danger {
  padding: 8px 16px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  transform: translateY(-1px);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .setting-value {
    width: 100%;
  }

  .model-dropdown {
    width: 100%;
    min-width: 0;
  }

  .btn-primary,
  .btn-danger {
    width: 100%;
  }

  .detail-row {
    flex-direction: column;
    gap: 2px;
  }

  .detail-label {
    min-width: 0;
  }
}
</style>
