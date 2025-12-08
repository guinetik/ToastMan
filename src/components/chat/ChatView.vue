<template>
  <div class="chat-view">
    <Splitpanes class="default-theme" horizontal>
      <Pane :size="threadSize" min-size="20">
        <ConversationThread
          :conversation="activeConversation"
          :messages="messages"
          :is-loading="isLoading"
          @edit-request="handleEditRequest"
          @clear="handleClear"
          @maximize-response="handleMaximizeResponse"
          @send-to-composer="handleSendToComposer"
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

    <!-- Save to Collection Dialog -->
    <CollectionPickerDialog
      v-if="showSaveDialog"
      :request-name="pendingRequestName"
      @close="closeSaveDialog"
      @save="handleSaveToNewCollection"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import ConversationThread from './ConversationThread.vue'
import ChatComposer from './ChatComposer.vue'
import ResponseBubble from './ResponseBubble.vue'
import CollectionPickerDialog from '../dialogs/CollectionPickerDialog.vue'
import { ChatController } from '../../controllers/ChatController.js'
import { useConversations } from '../../stores/useConversations.js'
import { useCollections } from '../../stores/useCollections.js'
import { useTabs } from '../../stores/useTabs.js'
import { useAlert } from '../../composables/useAlert.js'
import aiController from '../../controllers/AiController.js'
import { requestToCurl } from '../../utils/curlGenerator.js'

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

// Initialize controller and stores
const controller = new ChatController()
const conversationsStore = useConversations()
const collectionsStore = useCollections()
const tabsStore = useTabs()
const { alertSuccess } = useAlert()

// Save dialog state
const showSaveDialog = ref(false)
const pendingRequestName = ref('')

// Pane sizes - adjusts based on composer mode
const composerMode = ref('curl')
const composerSize = computed(() => {
  if (composerMode.value === 'visual') return 50
  if (composerMode.value === 'ai') return 40  // 30% larger than default 30%
  return 30  // curl, script
})
const threadSize = computed(() => 100 - composerSize.value)

// Maximized response state
const maximizedResponse = ref(null)

const activeConversation = computed(() => conversationsStore.activeConversation.value)
const messages = computed(() => conversationsStore.activeMessages.value)

// Combined loading state - HTTP request OR AI generation
const isLoading = computed(() => controller.state.isLoading || aiController.state.isGenerating || aiController.state.isModelLoading)

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
  // Reset aiController state to prevent stale loading flags from previous operations
  aiController.resetState()

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
  console.log('SAVE BUTTON CLICKED')
  console.log('currentRequestId:', controller.state.currentRequestId)
  console.log('currentCollectionId:', controller.state.currentCollectionId)
  console.log('activeConversation:', activeConversation.value)

  // If already linked to a collection, directly save
  if (controller.state.currentRequestId && controller.state.currentCollectionId) {
    console.log('Updating existing request in collection')
    controller.saveToCollection()
    alertSuccess('Request updated in collection')
  } else {
    // Show dialog to choose collection
    // Generate a default name from the URL or active conversation name
    const defaultName = activeConversation.value?.name || 'New Request'
    console.log('Showing save dialog with default name:', defaultName)
    pendingRequestName.value = defaultName
    showSaveDialog.value = true
  }
}

function closeSaveDialog() {
  showSaveDialog.value = false
  pendingRequestName.value = ''
}

function handleSaveToNewCollection(data) {
  console.log('SAVING TO COLLECTION - data:', data)
  console.log('SAVING TO COLLECTION - requestName:', data.requestName)

  const requestName = data.requestName || 'New Request'

  // Build request object from current state
  const request = controller.buildRequestFromVisual()

  // Build event array for scripts (Postman format)
  const event = []

  if (controller.state.script.preRequest?.trim()) {
    event.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: controller.state.script.preRequest.split('\n')
      }
    })
  }

  if (controller.state.script.postRequest?.trim()) {
    event.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: controller.state.script.postRequest.split('\n')
      }
    })
  }

  // Add request to collection
  const savedRequest = collectionsStore.addRequest(
    data.collectionId,
    {
      name: requestName,
      request,
      event: event.length > 0 ? event : undefined
    },
    data.folderId
  )

  // Link the current view to the saved request
  controller.state.currentRequestId = savedRequest.id
  controller.state.currentCollectionId = data.collectionId
  controller.state.currentFolderId = data.folderId || null

  // Update conversation with collection info AND name
  if (activeConversation.value) {
    conversationsStore.updateConversation(activeConversation.value.id, {
      name: requestName, // Use the requestName from save dialog
      requestId: savedRequest.id,
      collectionId: data.collectionId,
      folderId: data.folderId
    })
  }

  // Update the active tab with the new name and link it to the saved request
  const activeTab = tabsStore.activeTab
  if (activeTab) {
    tabsStore.updateTab(activeTab.id, {
      name: requestName,
      itemId: savedRequest.id,
      collectionId: data.collectionId,
      method: request.method || 'GET'
    })
    tabsStore.markTabAsSaved(activeTab.id)
  }

  closeSaveDialog()
  alertSuccess(`Request saved to ${collectionsStore.getCollection(data.collectionId)?.name || 'collection'}`)
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

function handleSendToComposer(curlCommand) {
  // Load the AI-generated cURL command into the composer
  controller.setCurlInput(curlCommand)

  // Switch to cURL mode
  composerMode.value = 'curl'
  controller.setComposerMode('curl')

  // Show success notification
  alertSuccess('cURL command loaded into composer')
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
