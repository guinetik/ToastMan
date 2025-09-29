<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useVariableInterpolation } from '../composables/useVariableInterpolation.js'
import { Logger } from '../core/Logger.js'

// Create logger instance
const logger = new Logger({ prefix: 'VariableHighlightInput', level: 'debug' })

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

// Try to load composable with error handling
let splitTextForHighlighting, previewInterpolation
try {
  const composable = useVariableInterpolation()
  splitTextForHighlighting = composable.splitTextForHighlighting
  previewInterpolation = composable.previewInterpolation
} catch (error) {
  logger.error('Failed to load composable:', error)
  // Fallback functions
  splitTextForHighlighting = (text) => [{ type: 'text', content: text }]
  previewInterpolation = (text) => ({ hasVariables: false, original: text, interpolated: text, variables: [] })
}

const inputRef = ref(null)
const highlightRef = ref(null)
const showPreview = ref(false)

// Handle input changes
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

// Split text for highlighting
const highlightedParts = computed(() => {
  const parts = splitTextForHighlighting(props.modelValue)
  return parts
})

// Preview information
const interpolationPreview = computed(() => {
  const preview = previewInterpolation(props.modelValue)
  return preview
})

// Sync scroll between input and highlight layers
const syncScroll = () => {
  if (inputRef.value && highlightRef.value) {
    highlightRef.value.scrollLeft = inputRef.value.scrollLeft
    highlightRef.value.scrollTop = inputRef.value.scrollTop
  }
}

// Handle focus/blur for preview
const handleFocus = () => {
  if (interpolationPreview.value.hasVariables) {
    showPreview.value = true
  }
}

const handleBlur = () => {
  // Delay hiding to allow click on preview
  setTimeout(() => {
    showPreview.value = false
  }, 200)
}

// Also show preview on input if variables are detected
const handleInputWithPreview = (event) => {
  handleInput(event)
  // Small delay to let reactivity update, then check for variables
  nextTick(() => {
    if (interpolationPreview.value.hasVariables) {
      showPreview.value = true
    } else {
      showPreview.value = false
    }
  })
}

// Create background highlighting effect
const getBackgroundHighlight = () => {
  // Simple approach - just add a subtle accent to the input when variables are detected
  if (interpolationPreview.value.hasVariables) {
    return 'linear-gradient(90deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)'
  }
  return 'none'
}

// Watch for changes to sync highlighting
watch(() => props.modelValue, () => {
  nextTick(() => {
    syncScroll()
  })
})
</script>

<template>
  <div class="variable-input-container">
    <!-- Actual input -->
    <input
      ref="inputRef"
      :value="props.modelValue"
      @input="handleInputWithPreview"
      @focus="handleFocus"
      @blur="handleBlur"
      type="text"
      :placeholder="props.placeholder"
      :class="['variable-input', props.class]"
      :style="{ backgroundImage: getBackgroundHighlight() }"
    />

    <!-- Alternative: Show highlighted version above input -->
    <div
      v-if="highlightedParts.length > 1"
      class="highlight-overlay"
    >
      <span
        v-for="(part, index) in highlightedParts"
        :key="index"
        :class="{
          'highlight-text': part.type === 'text',
          'highlight-variable': part.type === 'variable',
          'highlight-variable--resolved': part.type === 'variable' && part.resolved,
          'highlight-variable--unresolved': part.type === 'variable' && !part.resolved
        }"
      >{{ part.content }}</span>
    </div>

    <!-- Variable preview tooltip -->
    <div
      v-if="showPreview && interpolationPreview.hasVariables"
      class="variable-preview"
    >
      <div class="preview-header">
        <span class="preview-title">Variables Preview</span>
        <span
          v-if="interpolationPreview.unresolvedCount > 0"
          class="preview-warning"
        >
          {{ interpolationPreview.unresolvedCount }} unresolved
        </span>
      </div>

      <div class="preview-content">
        <div class="preview-original">
          <strong>Original:</strong> {{ interpolationPreview.original }}
        </div>
        <div class="preview-interpolated">
          <strong>Result:</strong> {{ interpolationPreview.interpolated }}
        </div>
      </div>

      <div class="preview-variables">
        <div
          v-for="variable in interpolationPreview.variables"
          :key="variable.name"
          :class="[
            'preview-variable',
            { 'preview-variable--resolved': variable.resolved }
          ]"
        >
          <span class="variable-name">{{ variable.name }}</span>
          <span class="variable-arrow">→</span>
          <span class="variable-value">
            {{ variable.resolved ? variable.value : 'undefined' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variable-input-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.variable-input {
  width: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text-primary);
  outline: none;
  transition: all 0.2s ease;
}

.variable-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.variable-input::placeholder {
  color: var(--color-text-muted);
}

/* Highlight overlay */
.highlight-overlay {
  position: absolute;
  top: -25px;
  left: 0;
  right: 0;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

/* Highlighting styles */
.highlight-text {
  color: var(--color-text-secondary);
}

.highlight-variable {
  border-radius: 3px;
  padding: 2px 4px;
  margin: 0 1px;
  font-weight: 600;
}

.highlight-variable--resolved {
  background-color: rgba(34, 197, 94, 0.2);
  color: rgba(34, 197, 94, 0.8);
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.highlight-variable--unresolved {
  background-color: rgba(239, 68, 68, 0.2);
  color: rgba(239, 68, 68, 0.8);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Preview tooltip */
.variable-preview {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 300px;
  max-width: 500px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.preview-warning {
  font-size: 11px;
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.preview-content {
  padding: 12px;
  font-size: 12px;
}

.preview-original,
.preview-interpolated {
  margin-bottom: 8px;
  word-break: break-all;
  line-height: 1.4;
}

.preview-original {
  color: var(--color-text-secondary);
}

.preview-interpolated {
  color: var(--color-text-primary);
}

.preview-variables {
  border-top: 1px solid var(--color-border-light);
  padding: 8px 12px;
  max-height: 120px;
  overflow-y: auto;
}

.preview-variable {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 11px;
  font-family: monospace;
}

.variable-name {
  color: var(--color-primary);
  font-weight: 600;
  min-width: 80px;
}

.variable-arrow {
  color: var(--color-text-muted);
}

.variable-value {
  color: var(--color-text-primary);
  flex: 1;
  word-break: break-all;
}

.preview-variable--resolved .variable-value {
  color: var(--color-success);
}

.preview-variable:not(.preview-variable--resolved) .variable-value {
  color: var(--color-error);
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .variable-preview {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: none;
  }
}
</style>