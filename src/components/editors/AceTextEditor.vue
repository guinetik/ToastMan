<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BaseTextEditor from '../base/BaseTextEditor.vue'
import { createLogger } from '../../core/logger.js'
import { initCurlMode } from '../../ace/mode-curl.js'
import { curlCompleter } from '../../ace/curl-completer.js'
import { getFlagDoc } from '../../ace/curl-documentation.js'
import { validateCurl } from '../../ace/curl-validator.js'
import { useVariableInterpolation } from '../../composables/useVariableInterpolation.js'
import { useEnvironments } from '../../stores/useEnvironments.js'
import { useSettingsStorage } from '../../composables/useStorage.js'
import { getAceThemePath } from '../../config/editors.js'

// Import ACE dynamically to handle Vite properly
let ace = null

// Variable interpolation for tooltips and highlighting
const variableInterpolation = useVariableInterpolation()
const environmentsStore = useEnvironments()

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

// Variable tooltip state
const variableTooltipVisible = ref(false)
const variableTooltipX = ref(0)
const variableTooltipY = ref(0)
const variableTooltipData = ref(null)

// Variable markers for blue/red highlighting
let variableMarkers = []
let variableMarkersTimeout = null

// Validation state for error highlighting
let validationTimeout = null

// Settings for editor theme
const { data: settings } = useSettingsStorage()

// Track loaded themes to avoid re-loading
const loadedThemes = new Set(['gob', 'textmate'])

// Load a theme dynamically from CDN
const loadTheme = async (themeId) => {
  if (loadedThemes.has(themeId)) {
    return true
  }

  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/theme-${themeId}.js`
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    loadedThemes.add(themeId)
    logger.debug(`Loaded ACE theme: ${themeId}`)
    return true
  } catch (error) {
    logger.error(`Failed to load ACE theme: ${themeId}`, error)
    return false
  }
}

// Computed theme - reactive to user settings
// Handle both flat structure (useSettingsStorage) and nested structure (Settings model)
const aceTheme = computed(() => {
  const appTheme = props.theme || 'dark'
  // Check for nested structure first (settings.ui.editorThemeDark), then flat (settings.editorThemeDark)
  const darkTheme = settings.value?.ui?.editorThemeDark || settings.value?.editorThemeDark || 'gob'
  const lightTheme = settings.value?.ui?.editorThemeLight || settings.value?.editorThemeLight || 'textmate'
  const selectedTheme = appTheme === 'light' ? lightTheme : darkTheme
  return selectedTheme
})

// Watch for theme changes and apply them live
watch(aceTheme, async (newThemeId) => {
  if (aceEditor.value && ace) {
    // Load theme if not already loaded
    await loadTheme(newThemeId)
    aceEditor.value.setTheme(getAceThemePath(newThemeId))
    logger.debug(`Applied theme: ${newThemeId}`)
  }
}, { immediate: false })

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

const createEditor = async () => {
  if (!ace || !editorContainer.value || aceEditor.value) return

  try {
    aceEditor.value = ace.edit(editorContainer.value)

    // Load and set theme
    const themeId = aceTheme.value
    await loadTheme(themeId)
    aceEditor.value.setTheme(getAceThemePath(themeId))
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

      // Trigger validation and variable markers for curl mode
      if (props.language === 'curl') {
        scheduleValidation()
        scheduleVariableMarkerUpdate()
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

    // Initialize hover tooltips, validation, and variable markers for cURL mode
    if (props.language === 'curl') {
      initHoverTooltips()
      // Run initial validation and variable markers
      setTimeout(() => {
        runValidation()
        updateVariableMarkers()
      }, 100)
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

watch(() => props.theme, async () => {
  if (aceEditor.value && ace) {
    const themeId = aceTheme.value
    await loadTheme(themeId)
    aceEditor.value.setTheme(getAceThemePath(themeId))
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

// Watch for active environment changes to update variable highlighting
watch(() => environmentsStore.activeEnvironment.value, () => {
  if (aceEditor.value && props.language === 'curl') {
    updateVariableMarkers()
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
        hideVariableTooltip()
        showTooltip(doc, e.clientX, e.clientY)
        return
      }
    }

    // Check if we're over a variable (variable.language token type)
    if (token && token.type === 'variable.language') {
      // Extract variable name from {{varName}}
      const varName = token.value.slice(2, -2).trim()
      const exists = variableInterpolation.variableExists(varName)
      const value = variableInterpolation.getVariableValue(varName)

      hideTooltip()
      showVariableTooltip({
        name: varName,
        value: exists ? value : null,
        resolved: exists
      }, e.clientX, e.clientY)
      return
    }

    hideTooltip()
    hideVariableTooltip()
  })

  container.addEventListener('mouseleave', () => {
    hideTooltip()
    hideVariableTooltip()
  })
}

// Variable tooltip functions
const showVariableTooltip = (data, x, y) => {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = null
  }

  variableTooltipData.value = data
  variableTooltipX.value = x + 10
  variableTooltipY.value = y + 10
  variableTooltipVisible.value = true
}

const hideVariableTooltip = () => {
  tooltipTimeout = setTimeout(() => {
    variableTooltipVisible.value = false
    variableTooltipData.value = null
  }, 100)
}

// Update variable markers for blue/red highlighting based on resolution status
const updateVariableMarkers = () => {
  if (!aceEditor.value || props.language !== 'curl') return

  const session = aceEditor.value.session
  const content = aceEditor.value.getValue()

  // Clear previous variable markers
  variableMarkers.forEach(id => session.removeMarker(id))
  variableMarkers = []

  // Find all variables and their positions
  const variables = variableInterpolation.analyzeVariables(content)
  if (variables.length === 0) return

  // Get Range class from ACE
  const Range = ace.require('ace/range').Range

  // Convert character positions to row/column
  const lines = content.split('\n')

  variables.forEach(v => {
    // Find row and column from character position
    let charCount = 0
    let row = 0
    let startCol = 0
    let endCol = 0

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1 // +1 for newline
      if (charCount + lineLength > v.start) {
        row = i
        startCol = v.start - charCount
        endCol = startCol + v.match.length
        break
      }
      charCount += lineLength
    }

    // Create marker range
    const range = new Range(row, startCol, row, endCol)
    const markerClass = v.resolved
      ? 'ace_variable-resolved'
      : 'ace_variable-unresolved'

    const markerId = session.addMarker(range, markerClass, 'text', true)
    variableMarkers.push(markerId)
  })
}

// Debounced variable marker update
const scheduleVariableMarkerUpdate = () => {
  if (variableMarkersTimeout) {
    clearTimeout(variableMarkersTimeout)
  }
  variableMarkersTimeout = setTimeout(updateVariableMarkers, 200)
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

    <!-- Variable Tooltip -->
    <Teleport to="body">
      <div
        v-if="variableTooltipVisible && variableTooltipData"
        class="variable-tooltip"
        :style="{ left: variableTooltipX + 'px', top: variableTooltipY + 'px' }"
      >
        <span class="variable-tooltip-name">{{ variableTooltipData.name }}</span>
        <span v-if="variableTooltipData.resolved" class="variable-tooltip-value">
          = {{ variableTooltipData.value }}
        </span>
        <span v-else class="variable-tooltip-unresolved">
          (not found in environment)
        </span>
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

/* Variable markers in ACE editor */
:deep(.ace_variable-resolved) {
  color: #64B5F6 !important;
  text-decoration: underline dotted #64B5F6;
}

:deep(.ace_variable-unresolved) {
  color: #EF5350 !important;
  text-decoration: underline wavy #EF5350;
}
</style>

<!-- Global styles for tooltips (teleported to body) -->
<style>
.variable-tooltip {
  position: fixed;
  z-index: 10000;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  max-width: 400px;
  pointer-events: none;
}

.variable-tooltip-name {
  color: #64B5F6;
  font-weight: 600;
}

.variable-tooltip-value {
  color: #a0a0a0;
  margin-left: 4px;
}

.variable-tooltip-unresolved {
  color: #EF5350;
  font-style: italic;
  margin-left: 8px;
  font-size: 12px;
}
</style>