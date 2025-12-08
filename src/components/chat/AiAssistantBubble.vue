<template>
  <div class="message-bubble ai-assistant">
    <div class="bubble-header">
      <div class="header-left">
        <span class="ai-icon">🤖</span>
        <span class="label">AI Assistant</span>
        <span class="model-badge">{{ modelName }}</span>
      </div>
      <div class="header-right">
        <span class="timing">{{ inferenceTime }}ms</span>
        <span class="timestamp">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- cURL Command Section -->
    <div class="command-section">
      <div class="section-label">Generated cURL Command</div>
      <div class="command-editor">
        <component
          :is="TextEditor"
          :model-value="command"
          language="sh"
          theme="dark"
          :readonly="true"
          :height="editorHeight"
          :options="{ ...editorDefaults.options, showGutter: false, highlightActiveLine: false }"
        />
      </div>
      <div class="command-actions">
        <button @click="copyCurl" title="Copy to clipboard">
          📋 Copy
        </button>
        <button class="primary" @click="sendToComposer" title="Load into composer">
          ✨ Send to Composer
        </button>
      </div>
    </div>

    <!-- Guidance Section (Collapsible) -->
    <div v-if="hasGuidance" class="guidance-section">
      <div class="section-header" @click="toggleGuidance">
        <span class="section-label">💡 Guidance</span>
        <span class="toggle-icon">{{ guidanceExpanded ? '−' : '+' }}</span>
      </div>
      <div v-if="guidanceExpanded" class="guidance-content">
        {{ guidance }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../config/editors.js'
import { useAlert } from '../../composables/useAlert.js'

const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()
const { showAlert } = useAlert()

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['send-to-composer', 'delete'])

const guidanceExpanded = ref(true)

const command = computed(() => props.message.data?.command || '')
const guidance = computed(() => props.message.data?.guidance || null)
const model = computed(() => props.message.data?.model || 'phi-3.5-mini')
const inferenceTime = computed(() => {
  const time = props.message.data?.inferenceTime || 0
  return Math.round(time)
})

const hasGuidance = computed(() => !!guidance.value)

const modelName = computed(() => {
  const modelNames = {
    'phi-3.5-mini': 'Phi-3.5',
    'qwen2.5-3b': 'Qwen 2.5',
    'llama-3.2-3b': 'Llama 3.2',
    'gemma-2-2b': 'Gemma 2'
  }
  return modelNames[model.value] || model.value
})

const formattedTime = computed(() => {
  if (!props.message.timestamp) return ''
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const editorHeight = computed(() => {
  // Estimate height based on command length
  const lines = command.value.split('\n').length
  const minHeight = 80
  const lineHeight = 20
  const calculatedHeight = Math.max(minHeight, lines * lineHeight + 20)
  return `${Math.min(calculatedHeight, 300)}px`
})

function toggleGuidance() {
  guidanceExpanded.value = !guidanceExpanded.value
}

function copyCurl() {
  navigator.clipboard.writeText(command.value)
  showAlert('cURL command copied to clipboard', 'success')
}

function sendToComposer() {
  emit('send-to-composer', command.value)
}
</script>

<style scoped>
.message-bubble.ai-assistant {
  align-self: flex-start;
  width: 70%;
  max-width: 70%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-right: auto;
}

.bubble-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-icon {
  font-size: 16px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-badge {
  padding: 2px 6px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.timing {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: 'Monaco', 'Menlo', monospace;
}

.timestamp {
  font-size: 11px;
  color: var(--color-text-muted);
}

.command-section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.command-editor {
  background: var(--color-bg-primary);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border-light);
}

.command-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.guidance-section {
  border-top: 1px solid var(--color-border-light);
  padding-top: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}

.section-header:hover .section-label {
  color: var(--color-text-primary);
}

.toggle-icon {
  font-weight: bold;
  font-size: 14px;
  color: var(--color-text-muted);
}

.guidance-content {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-bg-primary);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .message-bubble.ai-assistant {
    width: 100%;
    max-width: 100%;
    margin-right: 0;
  }
}
</style>
