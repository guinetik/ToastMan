<template>
  <div class="chat-view">
    <Splitpanes class="default-theme" horizontal>
      <Pane v-if="viewMode !== 'composer'" :size="threadSize" min-size="20">
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
      <Pane v-if="viewMode !== 'conversation'" :size="composerSize" :min-size="15" :max-size="viewMode === 'composer' ? 100 : 70">
        <ChatComposer
          :controller="chatController"
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
/**
 * ChatView Component
 *
 * Main request/response view with split pane layout.
 * Presentation layer for chat interface - delegates all business logic
 * to ChatViewController following the MVC pattern.
 *
 * Responsibilities:
 * - Render UI components (thread, composer, dialogs)
 * - Handle user interactions and delegate to controller
 * - Manage component lifecycle
 * - React to controller state changes
 */
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import ConversationThread from './ConversationThread.vue'
import ChatComposer from './ChatComposer.vue'
import ResponseBubble from './ResponseBubble.vue'
import CollectionPickerDialog from '../dialogs/CollectionPickerDialog.vue'
import { ChatViewController } from '../../controllers/ChatViewController.js'
import { useConversations } from '../../stores/useConversations.js'
import { useAlert } from '../../composables/useAlert.js'
import aiController from '../../controllers/AiController.js'
import { createLogger } from '../../core/logger.js'

// Initialize logger
const logger = createLogger('ChatView')

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

// Initialize view controller (which wraps ChatController)
const viewController = new ChatViewController()

// Get the underlying chat controller for composer
const chatController = viewController.getChatController()

// Stores
const conversationsStore = useConversations()
const { alertSuccess, alertError } = useAlert()

// Computed refs to controller state (reactive)
const showSaveDialog = computed(() => viewController.state.showSaveDialog)
const pendingRequestName = computed(() => viewController.state.pendingRequestName)
const viewMode = computed(() => viewController.state.viewMode)
const maximizedResponse = computed(() => viewController.state.maximizedResponse)

// Pane sizes - adjusts based on composer mode and view mode
const composerMode = computed(() => viewController.state.composerMode)
const composerSize = computed(() => {
  // View mode overrides
  if (viewMode.value === 'conversation') return 0
  if (viewMode.value === 'composer') return 100

  // Split mode - adjust based on composer mode
  if (composerMode.value === 'visual') return 50
  if (composerMode.value === 'ai') return 35
  return 25  // curl, script
})
const threadSize = computed(() => 100 - composerSize.value)

// Conversation data
const activeConversation = computed(() => conversationsStore.activeConversation.value)
const messages = computed(() => conversationsStore.activeMessages.value)

// Combined loading state - HTTP request OR AI generation
const isLoading = computed(() => chatController.state.isLoading || aiController.state.isGenerating || aiController.state.isModelLoading)

// Watch for request changes and load
watch(
  () => [props.requestId, props.collectionId],
  ([requestId, collectionId]) => {
    if (requestId && collectionId) {
      logger.debug('Loading request from props', { requestId, collectionId })
      viewController.loadRequest(collectionId, requestId, props.folderId)
      emit('request-loaded')
    }
  },
  { immediate: true }
)

/**
 * Component initialization
 */
onMounted(() => {
  logger.debug('ChatView mounted')

  // Initialize view mode from active tab
  viewController.initializeViewMode()

  // Reset aiController state to prevent stale loading flags
  aiController.resetState()

  // Load request/conversation based on props
  if (props.conversationId) {
    // Opening from history - load existing session
    logger.info('Loading conversation from history', { conversationId: props.conversationId })
    viewController.loadSession(props.conversationId)
  } else if (!props.requestId && !props.collectionId) {
    // New request with no context
    logger.debug('Initializing new request')
    viewController.newRequest()
  }

  // Set up controller event listeners
  setupControllerListeners()
})

/**
 * Component cleanup
 */
onUnmounted(() => {
  logger.debug('ChatView unmounted')
  viewController.dispose()
})

/**
 * Set up event listeners for controller events
 */
function setupControllerListeners() {
  // Listen for save success
  viewController.on('saveSuccess', ({ message }) => {
    alertSuccess(message)
  })

  // Listen for errors
  viewController.on('error', ({ message, error }) => {
    logger.error(message, error)
    alertError?.(message) || alertSuccess(message)  // Fallback to alertSuccess if alertError not available
  })
}

// ============================================================================
// Event Handlers - Delegate to Controller
// ============================================================================

function handleSend() {
  viewController.handleSend()
}

function handleSave() {
  viewController.handleSave()
}

function closeSaveDialog() {
  viewController.closeSaveDialog()
}

function handleSaveToNewCollection(data) {
  viewController.handleSaveToCollection(data)
}

function handleEditRequest(message) {
  viewController.handleEditRequest(message)
}

function handleClear() {
  viewController.handleClear()
}

function handleModeChange(mode) {
  viewController.setComposerMode(mode)
}

function handleViewModeToggle() {
  viewController.toggleViewMode()
}

function handleMaximizeResponse(message) {
  viewController.handleMaximizeResponse(message)
}

function closeMaximized() {
  viewController.closeMaximized()
}

function handleSendToComposer(curlCommand) {
  viewController.handleSendToComposer(curlCommand)
  alertSuccess('cURL command loaded into composer')
}

// ============================================================================
// Exposed API
// ============================================================================

/**
 * Expose controller methods and state for parent component access
 */
defineExpose({
  // View controller instance
  viewController,

  // Chat controller instance (for backward compatibility)
  controller: chatController,

  // View state
  viewMode,

  // Methods
  toggleViewMode: handleViewModeToggle,
  loadRequest: (collectionId, requestId, folderId) => viewController.loadRequest(collectionId, requestId, folderId),
  newRequest: () => viewController.newRequest()
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
