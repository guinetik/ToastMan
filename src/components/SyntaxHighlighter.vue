<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'auto' // auto-detect, json, xml, html, javascript, css, etc.
  },
  theme: {
    type: String,
    default: 'github-dark' // Could be configurable later
  },
  showLineNumbers: {
    type: Boolean,
    default: false
  },
  copyable: {
    type: Boolean,
    default: true
  },
  maxHeight: {
    type: String,
    default: 'none'
  }
})

const codeRef = ref(null)
const copied = ref(false)

// Auto-detect language based on content
const detectLanguage = (code) => {
  if (!code) return 'plaintext'

  // Try to parse as JSON
  try {
    JSON.parse(code)
    return 'json'
  } catch (e) {
    // Not JSON, continue
  }

  // Check for XML/HTML
  if (code.trim().startsWith('<') && code.trim().endsWith('>')) {
    if (code.includes('<!DOCTYPE') || code.includes('<html')) {
      return 'html'
    }
    return 'xml'
  }

  // Check for common patterns
  if (code.includes('function') || code.includes('=>') || code.includes('const ') || code.includes('let ')) {
    return 'javascript'
  }

  if (code.includes('{') && code.includes('}') && code.includes(':')) {
    return 'json'
  }

  return 'plaintext'
}

// Get the language to use for highlighting
const effectiveLanguage = computed(() => {
  if (props.language === 'auto') {
    return detectLanguage(props.code)
  }
  return props.language
})

// Highlight the code
const highlightedCode = computed(() => {
  if (!props.code) return ''

  try {
    if (effectiveLanguage.value === 'plaintext') {
      return hljs.highlightAuto(props.code).value
    } else {
      return hljs.highlight(props.code, { language: effectiveLanguage.value }).value
    }
  } catch (error) {
    console.warn('Syntax highlighting failed:', error)
    // Fallback to escaped HTML
    return props.code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
})

// Generate line numbers
const lineNumbers = computed(() => {
  if (!props.showLineNumbers || !props.code) return []
  return props.code.split('\n').map((_, index) => index + 1)
})

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = props.code
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

// Watch for code changes and re-highlight
watch([() => props.code, () => props.language], () => {
  // Force reactivity update
}, { immediate: true })
</script>

<template>
  <div class="syntax-highlighter" :class="{ 'with-line-numbers': showLineNumbers }">
    <!-- Header with language info and copy button -->
    <div v-if="copyable || effectiveLanguage !== 'plaintext'" class="highlighter-header">
      <span class="language-label">{{ effectiveLanguage.toUpperCase() }}</span>
      <button
        v-if="copyable && code"
        @click="copyToClipboard"
        class="copy-button"
        :class="{ copied }"
        :title="copied ? 'Copied!' : 'Copy to clipboard'"
      >
        <span v-if="copied">✓</span>
        <span v-else>📋</span>
      </button>
    </div>

    <!-- Code container -->
    <div
      class="code-container"
      :style="{ maxHeight: maxHeight !== 'none' ? maxHeight : undefined }"
    >
      <!-- Line numbers -->
      <div v-if="showLineNumbers" class="line-numbers">
        <div
          v-for="lineNum in lineNumbers"
          :key="lineNum"
          class="line-number"
        >
          {{ lineNum }}
        </div>
      </div>

      <!-- Highlighted code -->
      <pre
        ref="codeRef"
        class="highlighted-code"
        :class="`language-${effectiveLanguage}`"
      ><code v-html="highlightedCode"></code></pre>
    </div>

    <!-- Empty state -->
    <div v-if="!code" class="empty-code">
      <span class="empty-message">No content to display</span>
    </div>
  </div>
</template>

<style scoped>
.syntax-highlighter {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  overflow: hidden;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.highlighter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.language-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.copy-button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.copy-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.copy-button.copied {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.code-container {
  display: flex;
  overflow: auto;
  max-height: 400px; /* Default max height */
}

.line-numbers {
  background: var(--color-bg-tertiary);
  border-right: 1px solid var(--color-border);
  padding: 12px 8px;
  text-align: right;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
  user-select: none;
  min-width: 40px;
}

.line-number {
  height: 1.5em;
}

.highlighted-code {
  flex: 1;
  margin: 0;
  padding: 12px;
  background: transparent;
  overflow-x: auto;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.highlighted-code code {
  background: transparent !important;
  padding: 0 !important;
  font-family: inherit;
  font-size: inherit;
}

.empty-code {
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-message {
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .syntax-highlighter {
    font-size: 12px;
  }

  .line-numbers {
    min-width: 30px;
    padding: 8px 4px;
  }

  .highlighted-code {
    padding: 8px;
  }
}

/* Override highlight.js theme for consistency */
.syntax-highlighter :deep(.hljs) {
  background: transparent !important;
  color: var(--color-text-primary) !important;
}

.syntax-highlighter :deep(.hljs-string) {
  color: var(--color-success) !important;
}

.syntax-highlighter :deep(.hljs-number) {
  color: var(--color-primary) !important;
}

.syntax-highlighter :deep(.hljs-keyword) {
  color: var(--color-warning) !important;
}

.syntax-highlighter :deep(.hljs-attr) {
  color: var(--color-primary) !important;
}

.syntax-highlighter :deep(.hljs-comment) {
  color: var(--color-text-muted) !important;
  font-style: italic;
}
</style>