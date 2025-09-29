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
  type: {
    type: String,
    default: 'input', // 'input' or 'textarea'
    validator: (value) => ['input', 'textarea'].includes(value)
  },
  rows: {
    type: Number,
    default: 3
  },
  disabled: {
    type: Boolean,
    default: false
  },
  class: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'enter'])

const { analyzeVariables, interpolateText, availableVariables, activeEnvironment } = useVariableInterpolation()

const inputRef = ref(null)
const highlightRef = ref(null)
const containerRef = ref(null)
const showTooltip = ref(false)
const showAutocomplete = ref(false)
const autocompletePosition = ref({ top: 0, left: 0 })
const autocompleteSearch = ref('')
const selectedAutocompleteIndex = ref(0)

// Analyze variables in current text
const variableAnalysis = computed(() => {
  const variables = analyzeVariables(props.modelValue)
  return {
    variables,
    hasVariables: variables.length > 0,
    interpolated: interpolateText(props.modelValue),
    unresolvedCount: variables.filter(v => !v.resolved).length
  }
})

// Filter available variables for autocomplete
const filteredVariables = computed(() => {
  if (!availableVariables.value) return []

  const search = autocompleteSearch.value.toLowerCase()
  return availableVariables.value
    .filter(variable =>
      variable.key.toLowerCase().includes(search)
    )
    .slice(0, 10) // Limit to 10 suggestions
})

// Create highlighted HTML for the background layer
const highlightedHtml = computed(() => {
  if (!props.modelValue || !variableAnalysis.value.hasVariables) {
    return props.modelValue
  }

  let html = ''
  let lastIndex = 0

  variableAnalysis.value.variables.forEach(variable => {
    // Add text before variable
    if (variable.start > lastIndex) {
      html += escapeHtml(props.modelValue.slice(lastIndex, variable.start))
    }

    // Add highlighted variable
    const cssClass = variable.resolved ? 'var-resolved' : 'var-unresolved'
    html += `<span class="${cssClass}" data-var="${escapeHtml(variable.name)}">${escapeHtml(variable.match)}</span>`

    lastIndex = variable.end
  })

  // Add remaining text
  if (lastIndex < props.modelValue.length) {
    html += escapeHtml(props.modelValue.slice(lastIndex))
  }

  return html
})

// Escape HTML for safe insertion
const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Handle input changes
const handleInput = (event) => {
  const newValue = event.target.value
  emit('update:modelValue', newValue)

  // Check for autocomplete trigger
  checkAutocomplete(event.target)

  syncScroll()
}

// Check if we should show autocomplete
const checkAutocomplete = (input) => {
  const cursorPosition = input.selectionStart
  const textBeforeCursor = props.modelValue.substring(0, cursorPosition)

  // Look for {{ at the end or partial variable
  const match = textBeforeCursor.match(/\{\{([^}]*)$/)

  if (match) {
    const searchTerm = match[1] || ''
    autocompleteSearch.value = searchTerm
    selectedAutocompleteIndex.value = 0
    showAutocomplete.value = true
    updateAutocompletePosition(input, cursorPosition)
  } else {
    showAutocomplete.value = false
  }
}

// Update autocomplete dropdown position
const updateAutocompletePosition = (input, cursorPosition) => {
  if (!input) return

  // Create a temporary span to measure text width
  const span = document.createElement('span')
  span.style.position = 'absolute'
  span.style.visibility = 'hidden'
  span.style.fontFamily = window.getComputedStyle(input).fontFamily
  span.style.fontSize = window.getComputedStyle(input).fontSize
  span.style.whiteSpace = 'pre'

  // Text up to cursor
  span.textContent = props.modelValue.substring(0, cursorPosition)
  document.body.appendChild(span)

  const textWidth = span.offsetWidth
  document.body.removeChild(span)

  // Calculate position relative to input
  const inputRect = input.getBoundingClientRect()
  const inputStyle = window.getComputedStyle(input)
  const paddingLeft = parseInt(inputStyle.paddingLeft)

  autocompletePosition.value = {
    top: inputRect.height + 2,
    left: Math.min(paddingLeft + textWidth, inputRect.width - 200) // Prevent overflow
  }
}

// Handle special keys
const handleKeydown = (event) => {
  // Handle autocomplete navigation
  if (showAutocomplete.value && filteredVariables.value.length > 0) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedAutocompleteIndex.value = Math.min(
          selectedAutocompleteIndex.value + 1,
          filteredVariables.value.length - 1
        )
        return
      case 'ArrowUp':
        event.preventDefault()
        selectedAutocompleteIndex.value = Math.max(
          selectedAutocompleteIndex.value - 1,
          0
        )
        return
      case 'Enter':
      case 'Tab':
        event.preventDefault()
        selectVariable(filteredVariables.value[selectedAutocompleteIndex.value])
        return
      case 'Escape':
        event.preventDefault()
        showAutocomplete.value = false
        return
    }
  }

  // Normal key handling
  if (event.key === 'Enter' && props.type === 'input') {
    emit('enter')
  }
}

// Select a variable from autocomplete
const selectVariable = (variable) => {
  if (!variable || !inputRef.value) return

  const cursorPosition = inputRef.value.selectionStart
  const textBeforeCursor = props.modelValue.substring(0, cursorPosition)
  const textAfterCursor = props.modelValue.substring(cursorPosition)

  // Find the {{ that triggered autocomplete
  const match = textBeforeCursor.match(/\{\{([^}]*)$/)
  if (!match) return

  // Replace the partial variable with the selected one
  const startPos = cursorPosition - match[0].length
  const newText = props.modelValue.substring(0, startPos) +
                  `{{${variable.key}}}` +
                  textAfterCursor

  emit('update:modelValue', newText)
  showAutocomplete.value = false

  // Move cursor to after the inserted variable
  nextTick(() => {
    if (inputRef.value) {
      const newCursorPos = startPos + `{{${variable.key}}}`.length
      inputRef.value.focus()
      inputRef.value.setSelectionRange(newCursorPos, newCursorPos)
    }
  })
}

// Handle focus/blur
const handleFocus = (event) => {
  emit('focus', event)
  if (variableAnalysis.value.hasVariables) {
    showTooltip.value = true
  }
}

const handleBlur = (event) => {
  emit('blur', event)
  setTimeout(() => {
    showTooltip.value = false
    showAutocomplete.value = false
  }, 200)
}

// Sync scroll between input and highlight layer
const syncScroll = () => {
  if (inputRef.value && highlightRef.value) {
    highlightRef.value.scrollTop = inputRef.value.scrollTop
    highlightRef.value.scrollLeft = inputRef.value.scrollLeft
  }
}

// Watch for external value changes
watch(() => props.modelValue, () => {
  nextTick(() => {
    syncScroll()
  })
})

// Initialize
onMounted(() => {
  syncScroll()
})

// Component tag
const inputComponent = computed(() => props.type === 'textarea' ? 'textarea' : 'input')
</script>

<template>
  <div
    ref="containerRef"
    class="variable-input-wrapper"
    :class="{
      disabled: props.disabled,
      'has-variables': variableAnalysis.hasVariables
    }"
  >
    <!-- Highlight layer (behind input) -->
    <div
      ref="highlightRef"
      class="highlight-layer"
      :class="props.class"
      v-html="highlightedHtml"
    ></div>

    <!-- Actual input/textarea (transparent text, on top) -->
    <component
      :is="inputComponent"
      ref="inputRef"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :rows="props.type === 'textarea' ? props.rows : undefined"
      :class="['variable-input', props.class]"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
      @scroll="syncScroll"
    />

    <!-- Autocomplete dropdown -->
    <div
      v-if="showAutocomplete && filteredVariables.length > 0"
      class="autocomplete-dropdown"
      :style="{
        top: `${autocompletePosition.top}px`,
        left: `${autocompletePosition.left}px`
      }"
    >
      <div class="autocomplete-header">
        <span class="autocomplete-title">Environment Variables</span>
        <span class="autocomplete-hint">↑↓ navigate • Enter/Tab select • Esc close</span>
      </div>
      <div class="autocomplete-list">
        <div
          v-for="(variable, index) in filteredVariables"
          :key="variable.key"
          :class="[
            'autocomplete-item',
            { selected: index === selectedAutocompleteIndex }
          ]"
          @click="selectVariable(variable)"
          @mouseenter="selectedAutocompleteIndex = index"
        >
          <div class="variable-info">
            <span class="variable-key">{{ variable.key }}</span>
            <span class="variable-preview">{{variable.key}}</span>
          </div>
          <div class="variable-value">{{ variable.value }}</div>
        </div>
      </div>
      <div v-if="!activeEnvironment" class="autocomplete-empty">
        <span class="empty-message">No active environment</span>
        <span class="empty-hint">Set an environment as active to see variables</span>
      </div>
    </div>

    <!-- Variable tooltip -->
    <div
      v-if="showTooltip && variableAnalysis.hasVariables && !showAutocomplete"
      class="variable-tooltip"
    >
      <div class="tooltip-header">
        <span class="tooltip-title">Environment Variables</span>
        <span
          v-if="variableAnalysis.unresolvedCount > 0"
          class="tooltip-warning"
        >
          {{ variableAnalysis.unresolvedCount }} unresolved
        </span>
      </div>

      <div class="tooltip-content">
        <div class="preview-section">
          <div class="preview-label">Result:</div>
          <div class="preview-value">{{ variableAnalysis.interpolated }}</div>
        </div>

        <div class="variables-section">
          <div
            v-for="variable in variableAnalysis.variables"
            :key="variable.name"
            :class="['variable-item', { resolved: variable.resolved }]"
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
  </div>
</template>

<style scoped>
.variable-input-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
  color: transparent;
  background: transparent;
}

.variable-input {
  position: relative;
  z-index: 2;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.4;
  outline: none;
  resize: none;
  transition: all 0.2s ease;
}

.variable-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.variable-input::placeholder {
  color: var(--color-text-muted);
}

.disabled .variable-input {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

/* Variable highlighting in the background layer */
.highlight-layer :deep(.var-resolved) {
  background-color: rgba(34, 197, 94, 0.25);
  color: transparent;
  border-radius: 3px;
  padding: 0 2px;
  margin: 0 1px;
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.highlight-layer :deep(.var-unresolved) {
  background-color: rgba(239, 68, 68, 0.25);
  color: transparent;
  border-radius: 3px;
  padding: 0 2px;
  margin: 0 1px;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

/* Enhanced highlighting when input has focus */
.variable-input-wrapper:focus-within .highlight-layer :deep(.var-resolved) {
  background-color: rgba(34, 197, 94, 0.35);
  border-color: rgba(34, 197, 94, 0.7);
}

.variable-input-wrapper:focus-within .highlight-layer :deep(.var-unresolved) {
  background-color: rgba(239, 68, 68, 0.35);
  border-color: rgba(239, 68, 68, 0.7);
}

/* Variable tooltip */
.variable-tooltip {
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
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  letter-spacing: 0.5px;
}

.tooltip-warning {
  font-size: 11px;
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.tooltip-content {
  padding: 12px;
}

.preview-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}

.preview-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.preview-value {
  font-size: 13px;
  color: var(--color-text-primary);
  word-break: break-all;
  font-family: monospace;
  background: var(--color-bg-tertiary);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.variables-section {
  max-height: 120px;
  overflow-y: auto;
}

.variable-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  font-family: monospace;
}

.variable-name {
  color: var(--color-primary);
  font-weight: 600;
  min-width: 80px;
}

.variable-arrow {
  color: var(--color-text-muted);
  font-size: 10px;
}

.variable-value {
  flex: 1;
  word-break: break-all;
}

.variable-item.resolved .variable-value {
  color: var(--color-success);
}

.variable-item:not(.resolved) .variable-value {
  color: var(--color-error);
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .variable-tooltip {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: none;
  }
}
</style>