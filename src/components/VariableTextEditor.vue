<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useVariableInterpolation } from '../composables/useVariableInterpolation.js'

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
  },
  multiline: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 1
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter'])

const { analyzeVariables, interpolateText } = useVariableInterpolation()

const editorRef = ref(null)
const showTooltip = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })

// Parse text into segments for highlighting
const textSegments = computed(() => {
  if (!props.modelValue) return []

  const variables = analyzeVariables(props.modelValue)
  if (variables.length === 0) {
    return [{ type: 'text', content: props.modelValue }]
  }

  const segments = []
  let lastIndex = 0

  variables.forEach(variable => {
    // Add text before variable
    if (variable.start > lastIndex) {
      segments.push({
        type: 'text',
        content: props.modelValue.slice(lastIndex, variable.start)
      })
    }

    // Add variable segment
    segments.push({
      type: 'variable',
      content: variable.match,
      name: variable.name,
      exists: variable.exists,
      resolved: variable.resolved,
      value: variable.value
    })

    lastIndex = variable.end
  })

  // Add remaining text
  if (lastIndex < props.modelValue.length) {
    segments.push({
      type: 'text',
      content: props.modelValue.slice(lastIndex)
    })
  }

  return segments
})

// Handle content changes
const handleInput = (event) => {
  const text = event.target.innerText || ''
  emit('update:modelValue', text)
}

// Handle special keys
const handleKeydown = (event) => {
  if (event.key === 'Enter' && !props.multiline) {
    event.preventDefault()
    emit('enter')
  }

  // Handle tab for accessibility
  if (event.key === 'Tab') {
    event.preventDefault()
    // Allow tab to work normally
    return
  }
}

// Handle focus/blur
const handleFocus = (event) => {
  emit('focus', event)
  if (textSegments.value.some(s => s.type === 'variable')) {
    showTooltip.value = true
    updateTooltipPosition(event)
  }
}

const handleBlur = (event) => {
  emit('blur', event)
  setTimeout(() => {
    showTooltip.value = false
  }, 200)
}

// Update tooltip position
const updateTooltipPosition = (event) => {
  if (editorRef.value) {
    const rect = editorRef.value.getBoundingClientRect()
    tooltipPosition.value = {
      x: rect.left,
      y: rect.bottom + 5
    }
  }
}

// Sync content when modelValue changes externally
watch(() => props.modelValue, (newValue) => {
  if (editorRef.value && editorRef.value.innerText !== newValue) {
    editorRef.value.innerText = newValue
  }
})

// Set initial content
onMounted(() => {
  if (editorRef.value && props.modelValue) {
    editorRef.value.innerText = props.modelValue
  }
})

// Get interpolation preview for tooltip
const interpolationPreview = computed(() => {
  const variables = analyzeVariables(props.modelValue)
  return {
    original: props.modelValue,
    interpolated: interpolateText(props.modelValue),
    variables,
    hasVariables: variables.length > 0,
    unresolvedCount: variables.filter(v => !v.resolved).length
  }
})

// Restore cursor position after content update
const restoreCursor = (position) => {
  if (editorRef.value) {
    const range = document.createRange()
    const sel = window.getSelection()

    try {
      // Simple cursor restoration - place at end
      range.selectNodeContents(editorRef.value)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    } catch (e) {
      // Fallback - just focus
      editorRef.value.focus()
    }
  }
}

// Update display with highlighted content
const updateHighlightedContent = () => {
  if (!editorRef.value) return

  const currentText = editorRef.value.innerText || ''
  if (currentText === props.modelValue) return

  // Save cursor position
  const selection = window.getSelection()
  const cursorPosition = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0

  // Clear and rebuild content
  editorRef.value.innerHTML = ''

  textSegments.value.forEach(segment => {
    if (segment.type === 'text') {
      const textNode = document.createTextNode(segment.content)
      editorRef.value.appendChild(textNode)
    } else if (segment.type === 'variable') {
      const span = document.createElement('span')
      span.textContent = segment.content
      span.className = segment.resolved ? 'variable-highlight variable-resolved' : 'variable-highlight variable-unresolved'
      span.setAttribute('data-variable', segment.name)
      span.setAttribute('data-value', segment.value || '')
      editorRef.value.appendChild(span)
    }
  })

  // Restore cursor (simplified)
  nextTick(() => {
    restoreCursor(cursorPosition)
  })
}

// Watch for changes that need highlighting update
watch(textSegments, () => {
  if (editorRef.value) {
    nextTick(() => {
      updateHighlightedContent()
    })
  }
}, { deep: true })
</script>

<template>
  <div class="variable-text-editor" :class="{ disabled: props.disabled }">
    <div
      ref="editorRef"
      class="editor-content"
      :class="[props.class, { multiline: props.multiline }]"
      :contenteditable="!props.disabled"
      :data-placeholder="props.placeholder"
      :style="{ minHeight: props.multiline ? `${props.rows * 1.5}em` : 'auto' }"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
      @click="updateTooltipPosition"
    ></div>

    <!-- Variable tooltip -->
    <div
      v-if="showTooltip && interpolationPreview.hasVariables"
      class="variable-tooltip"
      :style="{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`
      }"
    >
      <div class="tooltip-header">
        <span class="tooltip-title">Variables</span>
        <span
          v-if="interpolationPreview.unresolvedCount > 0"
          class="tooltip-warning"
        >
          {{ interpolationPreview.unresolvedCount }} unresolved
        </span>
      </div>

      <div class="tooltip-preview">
        <div class="preview-result">
          <strong>Result:</strong> {{ interpolationPreview.interpolated }}
        </div>
      </div>

      <div class="tooltip-variables">
        <div
          v-for="variable in interpolationPreview.variables"
          :key="variable.name"
          :class="['tooltip-variable', { resolved: variable.resolved }]"
        >
          <span class="var-name">{{ variable.name }}</span>
          <span class="var-arrow">→</span>
          <span class="var-value">
            {{ variable.resolved ? variable.value : 'undefined' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.variable-text-editor {
  position: relative;
  width: 100%;
}

.editor-content {
  min-height: 38px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.4;
  outline: none;
  cursor: text;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  transition: all 0.2s ease;
}

.editor-content:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.editor-content.multiline {
  resize: vertical;
  overflow-y: auto;
}

.editor-content:empty:before {
  content: attr(data-placeholder);
  color: var(--color-text-muted);
  pointer-events: none;
}

.disabled .editor-content {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

/* Variable highlighting within the editor */
.editor-content :global(.variable-highlight) {
  border-radius: 3px;
  padding: 2px 4px;
  margin: 0 1px;
  font-weight: 600;
  white-space: nowrap;
}

.editor-content :global(.variable-resolved) {
  background-color: rgba(34, 197, 94, 0.2);
  color: rgba(34, 197, 94, 0.9);
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.editor-content :global(.variable-unresolved) {
  background-color: rgba(239, 68, 68, 0.2);
  color: rgba(239, 68, 68, 0.9);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

/* Variable tooltip */
.variable-tooltip {
  position: fixed;
  z-index: 1000;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 300px;
  max-width: 500px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.tooltip-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.tooltip-warning {
  font-size: 11px;
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.tooltip-preview {
  padding: 12px;
  border-bottom: 1px solid var(--color-border-light);
}

.preview-result {
  font-size: 12px;
  color: var(--color-text-primary);
  word-break: break-all;
}

.tooltip-variables {
  padding: 8px 12px;
  max-height: 120px;
  overflow-y: auto;
}

.tooltip-variable {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 11px;
  font-family: monospace;
}

.var-name {
  color: var(--color-primary);
  font-weight: 600;
  min-width: 80px;
}

.var-arrow {
  color: var(--color-text-muted);
}

.var-value {
  flex: 1;
  word-break: break-all;
}

.tooltip-variable.resolved .var-value {
  color: var(--color-success);
}

.tooltip-variable:not(.resolved) .var-value {
  color: var(--color-error);
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .variable-tooltip {
    position: fixed;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: none;
  }
}
</style>