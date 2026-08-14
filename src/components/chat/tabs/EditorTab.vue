<template>
  <div class="editor-tab">
    <div class="editor-bar">
      <button
        type="button"
        class="curl-format-btn"
        :class="{ active: curlBeautified }"
        @click="toggleCurlFormat"
        :title="curlBeautified ? 'Minify cURL (single line)' : 'Beautify cURL (multi-line)'"
      >
        {{ curlBeautified ? 'Minify' : 'Beautify' }}
      </button>
      <div class="editor-bar-actions">
        <button
          v-if="canSave"
          type="button"
          class="save-btn"
          @click="$emit('save')"
          title="Save to collection"
        >
          Save
        </button>
        <button
          type="button"
          class="send-btn"
          :disabled="isLoading || !canSend"
          @click="$emit('send')"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>Send</span>
        </button>
      </div>
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
  },
  canSave: {
    type: Boolean,
    default: false
  },
  canSend: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:curlInput', 'send', 'save'])

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

.editor-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.editor-bar-actions {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.curl-format-btn,
.save-btn {
  padding: 0 18px;
  min-height: 48px;
  font-size: 14px;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-text-primary);
  transition:
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

.curl-format-btn:hover,
.save-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-dark);
}

.curl-format-btn.active {
  background: var(--color-bg-elevated);
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.send-btn {
  padding: 0 28px;
  min-height: 48px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.editor-tab :deep(.ace-text-editor),
.editor-tab :deep(.ace-editor-container) {
  flex: 1;
  min-height: 0;
  height: 100%;
  max-height: 100%;
}
</style>
