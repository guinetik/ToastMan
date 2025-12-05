<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useVariableInterpolation } from '../composables/useVariableInterpolation.js'
import { useEnvironments } from '../stores/useEnvironments.js'
import { Logger } from '../core/logger.js'

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

const emit = defineEmits(['update:modelValue', 'keydown'])

// Get environments store for reactivity
const environmentsStore = useEnvironments()

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

// Hover tooltip state
const hoverTooltipVisible = ref(false)
const hoverTooltipX = ref(0)
const hoverTooltipY = ref(0)
const hoverTooltipData = ref(null)
let hoverTimeout = null

// Handle input changes
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

// Split text for highlighting
// Note: We reference activeEnvironment to create a reactive dependency
// so this recomputes when the environment changes
const highlightedParts = computed(() => {
  // Access environment to establish dependency (triggers recompute on env change)
  const _env = environmentsStore.activeEnvironment.value
  const parts = splitTextForHighlighting(props.modelValue)
  return parts
})

// Preview information
const interpolationPreview = computed(() => {
  // Access environment to establish dependency
  const _env = environmentsStore.activeEnvironment.value
  const preview = previewInterpolation(props.modelValue)
  return preview
})

// Check if there are any variables in the text
const hasVariables = computed(() => {
  return highlightedParts.value.some(p => p.type === 'variable')
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

// Watch for changes to sync highlighting
watch(() => props.modelValue, () => {
  nextTick(() => {
    syncScroll()
  })
})

// Hover tooltip functions
const showHoverTooltip = (part, event) => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }

  hoverTooltipData.value = {
    name: part.name,
    value: part.value,
    resolved: part.resolved
  }
  hoverTooltipX.value = event.clientX + 10
  hoverTooltipY.value = event.clientY + 10
  hoverTooltipVisible.value = true
}

const hideHoverTooltip = () => {
  hoverTimeout = setTimeout(() => {
    hoverTooltipVisible.value = false
    hoverTooltipData.value = null
  }, 100)
}
</script>

<template>
  <div :class="['variable-input-container', props.class]">
    <!-- Highlight layer (behind input) - shows colored text -->
    <div
      ref="highlightRef"
      class="highlight-backdrop"
      aria-hidden="true"
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
        @mouseenter="part.type === 'variable' ? showHoverTooltip(part, $event) : null"
        @mouseleave="hideHoverTooltip"
      >{{ part.content }}</span>
      <!-- Placeholder when empty -->
      <span v-if="!props.modelValue" class="highlight-placeholder">{{ props.placeholder }}</span>
    </div>

    <!-- Actual input (transparent text, captures events) -->
    <input
      ref="inputRef"
      :value="props.modelValue"
      @input="handleInputWithPreview"
      @scroll="syncScroll"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="$emit('keydown', $event)"
      type="text"
      :placeholder="props.placeholder"
      :class="['variable-input', { 'has-variables': hasVariables }]"
    />

    <!-- Variable Hover Tooltip -->
    <Teleport to="body">
      <div
        v-if="hoverTooltipVisible && hoverTooltipData"
        class="variable-hover-tooltip"
        :style="{ left: hoverTooltipX + 'px', top: hoverTooltipY + 'px' }"
      >
        <span class="tooltip-name">{{ hoverTooltipData.name }}</span>
        <span v-if="hoverTooltipData.resolved" class="tooltip-value">
          = {{ hoverTooltipData.value }}
        </span>
        <span v-else class="tooltip-unresolved">
          (not found)
        </span>
      </div>
    </Teleport>

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

/* Highlight backdrop - positioned behind the input */
.highlight-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Match input styling exactly */
  padding: var(--input-padding, 6px 8px);
  font-size: var(--input-font-size, 12px);
  font-family: var(--input-font-family, inherit);
  white-space: pre; /* Preserve spaces exactly like the input */
  overflow: hidden;
  pointer-events: none; /* Let clicks pass through to input */
  z-index: 1;
  border-radius: var(--input-radius, 4px);
  border: 1px solid transparent; /* Match input border space */
}

/* Allow pointer events on variable spans for tooltips */
.highlight-backdrop span.highlight-variable {
  pointer-events: auto;
  cursor: default;
}

.variable-input {
  position: relative;
  z-index: 2;
  width: 100%;
  background: transparent; /* Transparent to show backdrop */
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius, 4px);
  padding: var(--input-padding, 6px 8px);
  font-size: var(--input-font-size, 12px);
  font-family: var(--input-font-family, inherit);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  /* Keep caret visible */
  caret-color: var(--color-text-primary);
}

/* When variables present, make input text transparent */
.variable-input.has-variables {
  color: transparent;
}

.variable-input:focus {
  border-color: var(--color-primary, #666);
  box-shadow: 0 0 0 2px var(--color-primary-light, rgba(100, 100, 100, 0.2));
}

/* Hide placeholder when using backdrop */
.variable-input.has-variables::placeholder {
  color: transparent;
}

.variable-input::placeholder {
  color: var(--color-text-muted);
}

/* Placeholder in backdrop */
.highlight-placeholder {
  color: var(--color-text-muted);
}

/* Highlighting styles */
.highlight-text {
  color: var(--color-text-primary, #e0e0e0);
}

.highlight-variable {
  border-radius: 2px;
  font-weight: 600;
}

.highlight-variable--resolved {
  color: #64B5F6 !important;
}

.highlight-variable--unresolved {
  color: #EF5350 !important;
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
  background: var(--color-error-bg);
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

<!-- Global styles for hover tooltip (teleported to body) -->
<style>
.variable-hover-tooltip {
  position: fixed;
  z-index: 10000;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  max-width: 300px;
  pointer-events: none;
  white-space: nowrap;
}

.variable-hover-tooltip .tooltip-name {
  color: #64B5F6;
  font-weight: 600;
}

.variable-hover-tooltip .tooltip-value {
  color: #a0a0a0;
  margin-left: 4px;
}

.variable-hover-tooltip .tooltip-unresolved {
  color: #EF5350;
  font-style: italic;
  margin-left: 6px;
}
</style>