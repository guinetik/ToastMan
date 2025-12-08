<template>
  <div class="script-tab">
    <div class="script-header">
      <div class="script-type-selector">
        <CustomDropdown
          v-model="scriptType"
          :options="scriptTypeOptions"
          class="script-type-select"
        />
        <span v-if="scriptType === 'prerequest'" class="prerequest-warning">
          Pre-request scripts are stored but not executed
        </span>
      </div>
      <div class="script-actions">
        <CustomDropdown
          v-model="selectedSnippet"
          :options="snippetOptions"
          placeholder="Insert Snippet..."
          @update:modelValue="insertSnippet"
          class="snippet-select"
        />
      </div>
    </div>

    <div class="script-editor-container">
      <component
        :is="TextEditor"
        ref="scriptEditorRef"
        v-model="script.postRequest"
        language="javascript"
        :theme="editorDefaults.theme"
        height="100%"
        placeholder="// Write your post-request script here&#10;// Example: pm.test('Status is 200', function() {&#10;//   pm.expect(pm.response.code).to.equal(200);&#10;// });"
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
import { getSnippetsByCategory, findSnippet } from '../../../core/scripting/snippets.js'

const TextEditor = getCurrentEditor()
const editorDefaults = getCurrentEditorDefaults()
const snippetsByCategory = getSnippetsByCategory()

const props = defineProps({
  script: {
    type: Object,
    required: true
  }
})

const scriptEditorRef = ref(null)
const scriptType = ref('test')
const selectedSnippet = ref('')

const scriptTypeOptions = [
  { value: 'test', label: 'Post-Request Script' },
  { value: 'prerequest', label: 'Pre-Request Script' }
]

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
    const currentScript = props.script.postRequest || ''
    const separator = currentScript.trim() ? '\n\n' : ''
    props.script.postRequest = currentScript + separator + snippet.code
  }

  selectedSnippet.value = ''
}
</script>

<style scoped>
.script-tab {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.script-type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.script-type-select {
  min-width: 180px;
}

.prerequest-warning {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning, #f59e0b);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}

.script-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snippet-select {
  min-width: 200px;
}

.script-editor-container {
  flex: 1;
  min-height: 150px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-primary);
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
  border-radius: 6px;
  overflow: hidden;
}

.script-help summary {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
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
