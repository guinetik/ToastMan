<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BaseTextEditor from '../base/BaseTextEditor.vue'
import { createLogger } from '../../core/logger.js'
import { initCurlMode } from '../../ace/mode-curl.js'
import { curlCompleter } from '../../ace/curl-completer.js'
import { getFlagDoc } from '../../ace/curl-documentation.js'
import { validateCurl } from '../../ace/curl-validator.js'

// Import ACE dynamically to handle Vite properly
let ace = null

const logger = createLogger('AceTextEditor')

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'json', 'xml', 'html', 'javascript', 'css', 'curl'].includes(value)
  },
  theme: {
    type: String,
    default: 'dark',
    validator: (value) => ['dark', 'light'].includes(value)
  },
  readonly: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '400px'
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur', 'send'])

// State
const editorContainer = ref(null)
const aceEditor = ref(null)
const isAceLoaded = ref(false)
const fallbackMode = ref(false)

// Tooltip state for cURL flag documentation
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipDoc = ref(null)
let tooltipTimeout = null

// Validation state for error highlighting
let validationTimeout = null

// Computed theme mapping
const aceTheme = computed(() => {
  const themeMap = {
    dark: 'ace/theme/gob',           // Dark theme with black background
    light: 'ace/theme/textmate'      // Clean light theme
  }
  return themeMap[props.theme] || 'ace/theme/gob'
})

// Computed mode mapping
const aceMode = computed(() => {
  const modeMap = {
    text: 'ace/mode/text',
    json: 'ace/mode/json',
    xml: 'ace/mode/xml',
    html: 'ace/mode/html',
    javascript: 'ace/mode/javascript',
    css: 'ace/mode/css',
    curl: 'ace/mode/curl'
  }
  return modeMap[props.language] || 'ace/mode/text'
})

// ACE initialization
const initializeAce = async () => {
  try {
    // Load ACE from CDN - this approach works reliably
    if (!window.ace) {
      // Load ACE from CDN
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/ace.js'
      script.onload = () => {
        ace = window.ace
        loadAceComponents()
      }
      script.onerror = () => {
        logger.error('Failed to load ACE from CDN')
        fallbackMode.value = true
      }
      document.head.appendChild(script)
    } else {
      ace = window.ace
      loadAceComponents()
    }
  } catch (error) {
    logger.error('Failed to load ACE editor, falling back to textarea:', error)
    fallbackMode.value = true
  }
}

const loadAceComponents = async () => {
  try {
    // Load required modes, themes, and extensions from CDN
    const components = [
      'mode-text', 'mode-json', 'mode-xml', 'mode-html',
      'mode-javascript', 'mode-css',
      'theme-gob', 'theme-textmate',
      'ext-language_tools' // For autocomplete
    ]

    // Load all components
    const loadPromises = components.map(component => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/${component}.js`
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    })

    await Promise.all(loadPromises)

    // Configure ACE
    ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/')
    ace.config.set('workerPath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/')

    // Initialize custom curl mode
    initCurlMode()

    isAceLoaded.value = true
    await nextTick()

    if (editorContainer.value) {
      createEditor()
    }
  } catch (error) {
    logger.error('Failed to load ACE components:', error)
    fallbackMode.value = true
  }
}

const createEditor = () => {
  if (!ace || !editorContainer.value || aceEditor.value) return

  try {
    aceEditor.value = ace.edit(editorContainer.value)

    // Set theme and mode
    aceEditor.value.setTheme(aceTheme.value)
    aceEditor.value.session.setMode(aceMode.value)

    // Configure editor options
    const defaultOptions = {
      fontSize: 14,
      showPrintMargin: false,
      wrap: true,
      readOnly: props.readonly,
      placeholder: props.placeholder
    }

    // Enable autocomplete for curl mode
    if (props.language === 'curl') {
      defaultOptions.enableBasicAutocompletion = true
      defaultOptions.enableLiveAutocompletion = true
      defaultOptions.enableSnippets = false
    }

    aceEditor.value.setOptions({
      ...defaultOptions,
      ...props.options
    })

    // Set up curl-specific completer
    if (props.language === 'curl') {
      aceEditor.value.completers = [curlCompleter]
    }

    // Set initial content
    aceEditor.value.setValue(props.modelValue, -1)

    // Listen for changes
    aceEditor.value.on('change', () => {
      const content = aceEditor.value.getValue()
      emit('update:modelValue', content)
      emit('change', content)

      // Trigger validation for curl mode
      if (props.language === 'curl') {
        scheduleValidation()
      }
    })

    // Focus/blur events
    aceEditor.value.on('focus', (event) => {
      emit('focus', event)
    })

    aceEditor.value.on('blur', (event) => {
      emit('blur', event)
    })

    // Add custom command for Ctrl+Enter to send
    aceEditor.value.commands.addCommand({
      name: 'sendRequest',
      bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
      exec: () => {
        emit('send')
      }
    })

    // Force resize to ensure proper dimensions
    setTimeout(() => {
      aceEditor.value.resize()
    }, 100)

    // Initialize hover tooltips and validation for cURL mode
    if (props.language === 'curl') {
      initHoverTooltips()
      // Run initial validation
      setTimeout(runValidation, 100)
    }

    logger.debug('ACE editor initialized successfully')
  } catch (error) {
    logger.error('Failed to create ACE editor:', error)
    fallbackMode.value = true
  }
}

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (aceEditor.value && aceEditor.value.getValue() !== newValue) {
    aceEditor.value.setValue(newValue, -1)
  }
})

watch(() => props.language, (newLanguage) => {
  if (aceEditor.value) {
    aceEditor.value.session.setMode(aceMode.value)

    // Update autocomplete settings based on language
    if (newLanguage === 'curl') {
      aceEditor.value.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
      })
      aceEditor.value.completers = [curlCompleter]
    } else {
      aceEditor.value.setOptions({
        enableBasicAutocompletion: false,
        enableLiveAutocompletion: false
      })
      aceEditor.value.completers = []
    }
  }
})

watch(() => props.theme, (newTheme) => {
  if (aceEditor.value) {
    aceEditor.value.setTheme(aceTheme.value)
  }
})

watch(() => props.readonly, (readonly) => {
  if (aceEditor.value) {
    aceEditor.value.setReadOnly(readonly)
  }
})

// Watch for height changes and resize
watch(() => props.height, () => {
  if (aceEditor.value) {
    setTimeout(() => {
      aceEditor.value.resize()
    }, 50)
  }
})

// Exposed methods
const focus = () => {
  if (aceEditor.value) {
    aceEditor.value.focus()
  }
}

const blur = () => {
  if (aceEditor.value) {
    aceEditor.value.blur()
  }
}

const setValue = (value) => {
  if (aceEditor.value) {
    aceEditor.value.setValue(value, -1)
  }
}

const getValue = () => {
  if (aceEditor.value) {
    return aceEditor.value.getValue()
  }
  return props.modelValue
}

// Tooltip functions for cURL flag documentation
const showTooltip = (doc, x, y) => {
  // Clear any pending hide
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = null
  }

  tooltipDoc.value = doc
  tooltipX.value = x + 10
  tooltipY.value = y + 10
  tooltipVisible.value = true
}

const hideTooltip = () => {
  // Delay hiding to prevent flicker when moving between tokens
  tooltipTimeout = setTimeout(() => {
    tooltipVisible.value = false
    tooltipDoc.value = null
  }, 100)
}

const initHoverTooltips = () => {
  if (!aceEditor.value || props.language !== 'curl') return

  const editor = aceEditor.value
  const container = editor.container

  container.addEventListener('mousemove', (e) => {
    // Convert screen coordinates to text position
    const pos = editor.renderer.screenToTextCoordinates(e.clientX, e.clientY)
    const token = editor.session.getTokenAt(pos.row, pos.column)

    // Check if we're over a cURL flag (keyword.operator token type)
    if (token && token.type === 'keyword.operator') {
      const doc = getFlagDoc(token.value)
      if (doc) {
        showTooltip(doc, e.clientX, e.clientY)
        return
      }
    }

    hideTooltip()
  })

  container.addEventListener('mouseleave', () => {
    hideTooltip()
  })
}

// Track active error markers for cleanup
let activeMarkers = []

// Validation function for cURL syntax errors
const runValidation = () => {
  if (!aceEditor.value || props.language !== 'curl') return

  const session = aceEditor.value.session
  const content = aceEditor.value.getValue()
  const errors = validateCurl(content)

  // Clear previous markers
  activeMarkers.forEach(id => session.removeMarker(id))
  activeMarkers = []

  // Convert errors to ACE annotations format
  const annotations = errors.map(err => ({
    row: err.row,
    column: err.column,
    text: err.text,
    type: err.type // 'error' or 'warning'
  }))

  session.setAnnotations(annotations)

  // Add text markers (underlines) for each error
  const Range = ace.require('ace/range').Range

  errors.forEach(err => {
    const range = new Range(
      err.row,
      err.column,
      err.endRow,
      err.endColumn
    )

    const markerClass = err.type === 'error'
      ? 'ace_error-marker'
      : 'ace_warning-marker'

    const markerId = session.addMarker(range, markerClass, 'text', true)
    activeMarkers.push(markerId)
  })
}

// Debounced validation to avoid excessive processing
const scheduleValidation = () => {
  if (validationTimeout) {
    clearTimeout(validationTimeout)
  }
  validationTimeout = setTimeout(runValidation, 500)
}

// Lifecycle
onMounted(() => {
  initializeAce()
})

onUnmounted(() => {
  if (aceEditor.value) {
    aceEditor.value.destroy()
    aceEditor.value = null
  }
})

// Expose methods
defineExpose({
  focus,
  blur,
  setValue,
  getValue,
  editor: aceEditor
})
</script>

<template>
  <div class="ace-text-editor" :style="{ height }">
    <!-- ACE Editor Container -->
    <div
      v-if="!fallbackMode"
      ref="editorContainer"
      class="ace-editor-container"
      :style="{ height }"
    ></div>

    <!-- Fallback to BaseTextEditor if ACE fails to load -->
    <BaseTextEditor
      v-else
      :model-value="modelValue"
      :language="language"
      :theme="theme"
      :readonly="readonly"
      :placeholder="placeholder"
      :height="height"
      :options="options"
      @update:model-value="$emit('update:modelValue', $event)"
      @change="$emit('change', $event)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />

    <!-- cURL Flag Documentation Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipVisible && tooltipDoc"
        class="curl-tooltip"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      >
        <div class="curl-tooltip-header">
          <span class="curl-tooltip-name">{{ tooltipDoc.name }}</span>
          <span class="curl-tooltip-flags">
            <code v-if="tooltipDoc.short">{{ tooltipDoc.short }}</code>
            <code v-if="tooltipDoc.long">{{ tooltipDoc.long }}</code>
          </span>
        </div>
        <p class="curl-tooltip-desc">{{ tooltipDoc.description }}</p>
        <div v-if="tooltipDoc.example" class="curl-tooltip-example">
          <span class="curl-tooltip-label">Example:</span>
          <code>{{ tooltipDoc.example }}</code>
        </div>
        <p v-if="tooltipDoc.tip" class="curl-tooltip-tip">{{ tooltipDoc.tip }}</p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ace-text-editor {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.ace-editor-container {
  width: 100%;
  height: 100%;
  min-height: 300px; /* Fallback minimum height */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.ace-editor-container:focus-within {
  border-color: var(--color-primary);
}
</style>