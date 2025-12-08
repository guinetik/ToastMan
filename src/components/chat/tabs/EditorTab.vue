<template>
  <div class="editor-tab">
    <div class="curl-toolbar">
      <button
        class="curl-format-btn"
        :class="{ active: curlBeautified }"
        @click="toggleCurlFormat"
        :title="curlBeautified ? 'Minify cURL (single line)' : 'Beautify cURL (multi-line)'"
      >
        {{ curlBeautified ? '⊟ Minify' : '⊞ Beautify' }}
      </button>
    </div>
    <component
      :is="TextEditor"
      ref="curlInputRef"
      v-model="localCurlInput"
      language="curl"
      theme="dark"
      height="100%"
      placeholder="Paste cURL: https://api.example.com -X POST -H 'Content-Type: application/json'"
      :options="{ showGutter: true, wrap: !curlBeautified, fontSize: 13, showLineNumbers: false, showFoldWidgets: false }"
      @send="$emit('send')"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getCurrentEditor } from '../../../config/editors.js'

const TextEditor = getCurrentEditor()

const props = defineProps({
  curlInput: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:curlInput', 'send'])

const curlInputRef = ref(null)
const curlBeautified = ref(false)
const localCurlInput = ref(props.curlInput)

// Sync local state with prop
watch(() => props.curlInput, (val) => {
  localCurlInput.value = val
})

// Emit changes to parent
watch(localCurlInput, (val) => {
  emit('update:curlInput', val)
})

function toggleCurlFormat() {
  if (curlBeautified.value) {
    localCurlInput.value = minifyCurl(localCurlInput.value)
  } else {
    localCurlInput.value = beautifyCurl(localCurlInput.value)
  }
  curlBeautified.value = !curlBeautified.value
}

function beautifyCurl(curl) {
  if (!curl.trim()) return curl

  let normalized = curl
    .replace(/\s*\\\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const breakBefore = [
    '-X', '--request',
    '-H', '--header',
    '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
    '-F', '--form',
    '-u', '--user',
    '-A', '--user-agent',
    '-b', '--cookie',
    '-c', '--cookie-jar',
    '-e', '--referer',
    '-o', '--output',
    '-L', '--location',
    '-k', '--insecure',
    '-v', '--verbose',
    '-s', '--silent',
    '--compressed',
    '--connect-timeout',
    '--max-time'
  ]

  const optionsPattern = breakBefore.map(opt => opt.replace(/-/g, '\\-')).join('|')
  const regex = new RegExp(`\\s+(${optionsPattern})(?=\\s|$)`, 'g')
  const beautified = normalized.replace(regex, ' \\\n  $1')

  return beautified
}

function minifyCurl(curl) {
  if (!curl.trim()) return curl

  return curl
    .replace(/\s*\\\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
</script>

<style scoped>
.editor-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 60px;
  max-height: 100%;
}

.curl-toolbar {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 6px;
  flex-shrink: 0;
}

.curl-format-btn {
  padding: 4px 10px;
  font-size: 11px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.curl-format-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

.curl-format-btn.active {
  background: var(--color-bg-tertiary);
  border-color: var(--color-text-secondary);
  color: var(--color-text-primary);
}

.editor-tab :deep(.ace-text-editor) {
  height: 100%;
  max-height: 100%;
}

.editor-tab :deep(.ace-editor-container) {
  min-height: 60px;
  max-height: 100%;
}
</style>
