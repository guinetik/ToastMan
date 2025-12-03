<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import BaseTextEditor from '../base/BaseTextEditor.vue'
import { createLogger } from '../../core/logger.js'

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
    validator: (value) => ['text', 'json', 'xml', 'html', 'javascript', 'css'].includes(value)
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

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur'])

// State
const editorContainer = ref(null)
const aceEditor = ref(null)
const isAceLoaded = ref(false)
const fallbackMode = ref(false)

// Computed theme mapping
const aceTheme = computed(() => {
  const themeMap = {
    dark: 'ace/theme/one_dark',      // Closer to modern dark themes
    light: 'ace/theme/textmate'      // Clean light theme
  }
  return themeMap[props.theme] || 'ace/theme/one_dark'
})

// Computed mode mapping
const aceMode = computed(() => {
  const modeMap = {
    text: 'ace/mode/text',
    json: 'ace/mode/json',
    xml: 'ace/mode/xml',
    html: 'ace/mode/html',
    javascript: 'ace/mode/javascript',
    css: 'ace/mode/css'
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
    // Load required modes and themes from CDN
    const components = [
      'mode-text', 'mode-json', 'mode-xml', 'mode-html',
      'mode-javascript', 'mode-css',
      'theme-one_dark', 'theme-textmate', 'theme-monokai', 'theme-github'
    ]

    for (const component of components) {
      const script = document.createElement('script')
      script.src = `https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/${component}.js`
      document.head.appendChild(script)
    }

    // Configure ACE
    ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/')
    ace.config.set('workerPath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-noconflict/')

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

    aceEditor.value.setOptions({
      ...defaultOptions,
      ...props.options
    })

    // Set initial content
    aceEditor.value.setValue(props.modelValue, -1)

    // Listen for changes
    aceEditor.value.on('change', () => {
      const content = aceEditor.value.getValue()
      emit('update:modelValue', content)
      emit('change', content)
    })

    // Focus/blur events
    aceEditor.value.on('focus', (event) => {
      emit('focus', event)
    })

    aceEditor.value.on('blur', (event) => {
      emit('blur', event)
    })

    // Force resize to ensure proper dimensions
    setTimeout(() => {
      aceEditor.value.resize()
    }, 100)

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