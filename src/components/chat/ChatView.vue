<template>
  <div class="chat-view">
    <Splitpanes class="default-theme" horizontal>
      <Pane :size="threadSize" min-size="20">
        <ConversationThread
          :conversation="activeConversation"
          :messages="messages"
          :is-loading="controller.state.isLoading"
          @edit-request="handleEditRequest"
          @clear="handleClear"
          @maximize-response="handleMaximizeResponse"
        />
      </Pane>
      <Pane :size="composerSize" min-size="15" max-size="70">
        <ChatComposer
          :controller="controller"
          @send="handleSend"
          @save="handleSave"
          @mode-change="handleModeChange"
        />
      </Pane>
    </Splitpanes>

    <!-- Maximized Response Overlay -->
    <Teleport to="body">
      <div v-if="maximizedResponse" class="response-overlay" @click.self="closeMaximized">
        <div class="response-overlay-content">
          <ResponseBubble
            :message="maximizedResponse"
            :maximized="true"
            @minimize="closeMaximized"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import ConversationThread from './ConversationThread.vue'
import ChatComposer from './ChatComposer.vue'
import ResponseBubble from './ResponseBubble.vue'
import { ChatController } from '../../controllers/ChatController.js'
import { useConversations } from '../../stores/useConversations.js'

const props = defineProps({
  requestId: {
    type: String,
    default: null
  },
  collectionId: {
    type: String,
    default: null
  },
  folderId: {
    type: String,
    default: null
  },
  conversationId: {
    type: String,
    default: null
  },
  requestName: {
    type: String,
    default: 'New Request'
  }
})

const emit = defineEmits(['request-loaded'])

// Initialize controller
const controller = new ChatController()
const conversationsStore = useConversations()

// Pane sizes - adjusts based on composer mode
const composerMode = ref('curl')
const composerSize = computed(() => composerMode.value === 'visual' ? 50 : 30)
const threadSize = computed(() => 100 - composerSize.value)

// Maximized response state
const maximizedResponse = ref(null)

const activeConversation = computed(() => conversationsStore.activeConversation.value)
const messages = computed(() => conversationsStore.activeMessages.value)

// Watch for request changes and load
watch(
  () => [props.requestId, props.collectionId],
  ([requestId, collectionId]) => {
    if (requestId && collectionId) {
      controller.loadRequest(collectionId, requestId, props.folderId)
      emit('request-loaded')
    }
  },
  { immediate: true }
)

// Handle initialization based on what props are provided
onMounted(() => {
  if (props.conversationId) {
    // Opening from history - load existing session
    controller.loadSession(props.conversationId)
  } else if (!props.requestId && !props.collectionId) {
    // New request with no context
    controller.newRequest()
  }
})

function handleSend() {
  controller.sendRequest()
  // Reset composer to curl mode (smaller size) after sending
  composerMode.value = 'curl'
  controller.setComposerMode('curl')
}

function handleSave() {
  controller.saveToCollection()
}

function handleEditRequest(message) {
  // Load the request from the message back into the composer
  if (message.data?.request) {
    controller.state.method = message.data.request.method || 'GET'
    controller.state.url = message.data.request.url?.raw || ''
    controller.state.headers = [...(message.data.request.header || [])]
    controller.syncVisualToCurl()
  }
}

function handleClear() {
  conversationsStore.clearActiveConversation()
}

function handleModeChange(mode) {
  composerMode.value = mode
}

function handleMaximizeResponse(message) {
  maximizedResponse.value = message
}

function closeMaximized() {
  maximizedResponse.value = null
}

// Expose controller for parent component access
defineExpose({
  controller,
  loadRequest: (collectionId, requestId, folderId) => {
    controller.loadRequest(collectionId, requestId, folderId)
  },
  newRequest: () => {
    controller.newRequest()
  }
})
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
}

.chat-view :deep(.splitpanes) {
  height: 100%;
}

.chat-view :deep(.splitpanes__pane) {
  overflow: hidden;
}

.chat-view :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 4px;
  min-height: 4px;
  background: var(--color-border);
  cursor: row-resize;
}

.chat-view :deep(.splitpanes--horizontal > .splitpanes__splitter:hover) {
  background: var(--color-border-dark);
}

/* Response Overlay */
.response-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

.response-overlay-content {
  width: 100%;
  max-width: 1200px;
  max-height: 100%;
  overflow: auto;
}

.response-overlay-content :deep(.message-bubble.response) {
  max-width: 100%;
  margin: 0;
}

.response-overlay-content :deep(.body-preview) {
  max-height: none !important;
}

.response-overlay-content :deep(.body-preview::after) {
  display: none !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
