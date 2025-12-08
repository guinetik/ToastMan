<template>
  <div class="chat-composer">
    <!-- Tab Navigation -->
    <div class="composer-tabs" role="tablist">
      <button
        role="tab"
        class="tab-btn"
        :class="{ active: mode === 'curl' }"
        :aria-selected="mode === 'curl'"
        @click="setMode('curl')"
      >
        Editor
      </button>
      <button
        role="tab"
        class="tab-btn"
        :class="{ active: mode === 'visual' }"
        :aria-selected="mode === 'visual'"
        @click="setMode('visual')"
      >
        Visual
      </button>
      <button
        role="tab"
        class="tab-btn"
        :class="{ active: mode === 'script', 'has-indicator': hasScript }"
        :aria-selected="mode === 'script'"
        @click="setMode('script')"
      >
        Script
        <span v-if="hasScript" class="indicator-dot"></span>
      </button>
      <button
        role="tab"
        class="tab-btn"
        :class="{ active: mode === 'ai' }"
        :aria-selected="mode === 'ai'"
        @click="setMode('ai')"
      >
        Chat
      </button>
    </div>

    <!-- Tab Panels -->
    <div class="tab-content">
      <!-- Editor Tab (cURL) -->
      <div
        v-show="mode === 'curl'"
        role="tabpanel"
        class="tab-panel"
      >
        <EditorTab
          :curlInput="curlInput"
          @update:curlInput="handleCurlUpdate"
          @send="send"
        />
      </div>

      <!-- Visual Tab -->
      <div
        v-show="mode === 'visual'"
        role="tabpanel"
        class="tab-panel"
      >
        <VisualTab
          :method="method"
          :url="url"
          :headers="headers"
          :params="params"
          :body="body"
          :auth="auth"
          :methodColor="methodColor"
          @update:method="method = $event"
          @update:url="url = $event"
          @send="send"
        />
      </div>

      <!-- Script Tab -->
      <div
        v-show="mode === 'script'"
        role="tabpanel"
        class="tab-panel"
      >
        <ScriptTab :script="script" />
      </div>

      <!-- Chat Tab (AI) -->
      <div
        v-show="mode === 'ai'"
        role="tabpanel"
        class="tab-panel"
      >
        <ChatTab />
      </div>
    </div>

    <!-- Action Buttons (hide in AI/Chat mode) -->
    <div v-if="mode !== 'ai'" class="composer-actions">
      <button
        v-if="canSave"
        class="save-btn"
        @click="save"
        title="Save to collection"
      >
        Save
      </button>
      <button
        class="send-btn"
        :disabled="isLoading || !canSend"
        @click="send"
      >
        <span v-if="isLoading" class="loading-spinner"></span>
        <span v-else>Send</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import EditorTab from './tabs/EditorTab.vue'
import VisualTab from './tabs/VisualTab.vue'
import ScriptTab from './tabs/ScriptTab.vue'
import ChatTab from './tabs/ChatTab.vue'

const props = defineProps({
  controller: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['send', 'save', 'mode-change'])

// Local state that syncs with controller
const mode = ref(props.controller.state.composerMode)
const curlInput = ref(props.controller.state.curlInput)
const method = ref(props.controller.state.method)
const url = ref(props.controller.state.url)
const headers = ref(props.controller.state.headers)
const params = ref(props.controller.state.params)
const body = ref(props.controller.state.body)
const auth = ref(props.controller.state.auth || {
  type: 'none',
  bearer: { token: '' },
  basic: { username: '', password: '' },
  apikey: { key: 'X-API-Key', value: '', in: 'header' }
})
const script = ref(props.controller.state.script || {
  preRequest: '',
  postRequest: ''
})

const isLoading = computed(() => props.controller.state.isLoading)
const methodColor = computed(() => props.controller.getMethodColor(method.value))

const canSend = computed(() => {
  if (mode.value === 'curl') {
    return curlInput.value.trim().length > 0
  }
  return url.value.trim().length > 0
})

const canSave = computed(() => {
  // Allow saving if either:
  // 1. Linked to an existing collection request (for updating)
  // 2. Has a valid URL or cURL input (for saving as new request)
  const hasExisting = props.controller.state.currentRequestId && props.controller.state.currentCollectionId
  const hasCurlContent = mode.value === 'curl' && curlInput.value.trim().length > 0
  const hasUrlContent = mode.value !== 'curl' && url.value.trim().length > 0

  const result = hasExisting || hasCurlContent || hasUrlContent

  console.log('[ChatComposer] canSave:', {
    mode: mode.value,
    hasExisting,
    hasCurlContent,
    hasUrlContent,
    result
  })

  return result
})

const hasScript = computed(() => {
  return (script.value.postRequest && script.value.postRequest.trim().length > 0) ||
         (script.value.preRequest && script.value.preRequest.trim().length > 0)
})

// Sync local state to controller
watch(mode, (val) => props.controller.setComposerMode(val))
watch(curlInput, (val) => props.controller.setCurlInput(val))
watch(method, (val) => props.controller.updateField('method', val))
watch(url, (val) => props.controller.updateField('url', val))
watch(headers, (val) => props.controller.updateField('headers', val), { deep: true })
watch(params, (val) => props.controller.updateField('params', val), { deep: true })
watch(body, (val) => props.controller.updateField('body', val), { deep: true })
watch(auth, (val) => props.controller.updateField('auth', val), { deep: true })
watch(script, (val) => props.controller.updateField('script', val), { deep: true })

// Sync controller state to local (for when controller loads a request)
watch(() => props.controller.state.composerMode, (val) => { mode.value = val })
watch(() => props.controller.state.curlInput, (val) => { curlInput.value = val })
watch(() => props.controller.state.method, (val) => { method.value = val })
watch(() => props.controller.state.url, (val) => { url.value = val })
watch(() => props.controller.state.headers, (val) => { headers.value = val }, { deep: true })
watch(() => props.controller.state.params, (val) => { params.value = val }, { deep: true })
watch(() => props.controller.state.body, (val) => { body.value = val }, { deep: true })
watch(() => props.controller.state.auth, (val) => {
  if (val) auth.value = val
}, { deep: true })
watch(() => props.controller.state.script, (val) => {
  if (val) script.value = val
}, { deep: true })

function setMode(m) {
  mode.value = m
  emit('mode-change', m)
}

function handleCurlUpdate(val) {
  curlInput.value = val
}

function send() {
  if (!canSend.value || isLoading.value) return
  emit('send')
}

function save() {
  if (!canSave.value) return
  emit('save')
}
</script>

<style scoped>
.chat-composer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px 12px;
  background: var(--composer-bg, var(--color-bg-secondary));
  height: 100%;
  overflow: hidden;
}

/* Tab Navigation */
.composer-tabs {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.tab-btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  position: relative;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.tab-btn.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
  background: transparent;
}

.tab-btn[aria-selected="true"] {
  font-weight: 600;
}

/* Indicator for Script tab */
.tab-btn.has-indicator {
  position: relative;
}

.indicator-dot {
  width: 6px;
  height: 6px;
  background: var(--color-warning, #f59e0b);
  border-radius: 50%;
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
}

/* Tab Content */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Action Buttons */
.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.save-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-text-secondary);
}

.send-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
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
</style>
