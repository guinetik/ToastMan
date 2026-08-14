<template>
  <div class="script-tab">
    <ComposerBar>
      <template #start>
        <SegmentedControl
          v-model="scriptType"
          :options="scriptTypeOptions"
          aria-label="Script type"
        />
        <span v-if="scriptType === 'prerequest'" class="prerequest-warning">
          Stored, not executed
        </span>
      </template>
      <template #end>
        <CustomDropdown
          v-model="selectedSnippet"
          :options="snippetOptions"
          placeholder="Insert snippet"
          class="snippet-select"
          @update:modelValue="insertSnippet"
        />
        <button
          v-if="canSave"
          type="button"
          class="bar-btn"
          @click="$emit('save')"
          title="Save to collection"
        >
          Save
        </button>
        <button
          type="button"
          class="bar-btn primary"
          :disabled="isLoading || !canSend"
          @click="$emit('send')"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>Send</span>
        </button>
      </template>
    </ComposerBar>

    <div class="script-editor-container">
      <component
        :is="TextEditor"
        ref="scriptEditorRef"
        v-model="activeScript"
        language="javascript"
        :theme="editorDefaults.theme"
        height="100%"
        :placeholder="scriptPlaceholder"
        :options="{ showGutter: true, wrap: true, fontSize: 12 }"
      />
    </div>

    <div class="script-help">
      <details>
        <summary>Available APIs</summary>
        <div class="api-list">
          <code>pm.response.code</code> - Status code<br>
          <code>pm.response.json()</code> - Parse body as JSON<br>
          <code>pm.response.text()</code> - Raw body text<br>
          <code>pm.response.responseTime</code> - Duration in ms<br>
          <code>pm.response.headers.get(name)</code> - Get header<br>
          <code>pm.environment.get(key)</code> - Get env variable<br>
          <code>pm.environment.set(key, value)</code> - Set env variable<br>
          <code>pm.test(name, fn)</code> - Run test assertion<br>
          <code>pm.expect(value)</code> - Chai-like assertions<br>
          <code>console.log(...)</code> - Log output
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCurrentEditor, getCurrentEditorDefaults } from '../../../config/editors.js'
import CustomDropdown from '../../base/CustomDropdown.vue'
import SegmentedControl from '../../base/SegmentedControl.vue'
import ComposerBar from '../ComposerBar.vue'
import { getSnippetsByCategory, findSnippet } from '../../../core/scripting/snippets.js'

const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()
const snippetsByCategory = getSnippetsByCategory()

const props = defineProps({
  script: {
    type: Object,
    required: true
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

const emit = defineEmits(['send', 'save'])

const scriptEditorRef = ref(null)
const scriptType = ref('test')
const selectedSnippet = ref('')

const scriptTypeOptions = [
  { value: 'test', label: 'Post-request' },
  { value: 'prerequest', label: 'Pre-request' }
]

const currentScriptKey = computed(() =>
  scriptType.value === 'prerequest' ? 'preRequest' : 'postRequest'
)

const activeScript = computed({
  get: () => props.script[currentScriptKey.value] || '',
  set: (value) => {
    props.script[currentScriptKey.value] = value
  }
})

const scriptPlaceholder = computed(() =>
  scriptType.value === 'prerequest'
    ? '// Runs before the request is sent\n// Example: pm.environment.set("timestamp", Date.now());'
    : '// Write your post-request script here\n// Example: pm.test("Status is 200", function() {\n//   pm.expect(pm.response.code).to.equal(200);\n// });'
)

const snippetOptions = computed(() => {
  const options = [{ value: '', label: 'Insert Snippet...' }]

  Object.entries(snippetsByCategory).forEach(([category, snippets]) => {
    snippets.forEach(snippet => {
      options.push({
        value: snippet.name,
        label: `${category}: ${snippet.name}`
      })
    })
  })

  return options
})

function insertSnippet(snippetName) {
  if (!snippetName) return

  const snippet = findSnippet(snippetName)
  if (snippet) {
    const currentScript = props.script[currentScriptKey.value] || ''
    const separator = currentScript.trim() ? '\n\n' : ''
    props.script[currentScriptKey.value] = currentScript + separator + snippet.code
  }

  selectedSnippet.value = ''
}
</script>

<style scoped>
.script-tab {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.prerequest-warning {
  display: inline-flex;
  align-items: center;
  align-self: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  white-space: nowrap;
}

.snippet-select {
  width: 220px;
  align-self: center;
}

.snippet-select :deep(.custom-dropdown-trigger) {
  min-height: 46px;
}

.script-editor-container {
  flex: 1;
  min-height: 150px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-bg-primary);
  box-shadow: var(--surface-highlight);
}

.script-editor-container :deep(.ace-text-editor) {
  height: 100%;
}

.script-editor-container :deep(.ace-editor-container) {
  min-height: 150px;
}

.script-help {
  flex-shrink: 0;
}

.script-help details {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--surface-highlight);
}

.script-help summary {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.script-help summary:hover {
  background: var(--color-bg-hover);
}

.script-help[open] summary {
  border-bottom: 1px solid var(--color-border);
}

.api-list {
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.api-list code {
  background: var(--color-bg-tertiary);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #a78bfa;
}
</style>
