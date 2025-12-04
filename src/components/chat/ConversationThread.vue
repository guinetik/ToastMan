<template>
  <div class="conversation-thread">
    <!-- Thread Header -->
    <div v-if="conversation" class="thread-header">
      <h3 class="thread-title">{{ conversation.name }}</h3>
      <div class="thread-actions">
        <button class="action-btn" @click="clearConversation" title="Clear conversation">
          Clear
        </button>
      </div>
    </div>

    <!-- Messages List -->
    <div ref="messagesContainer" class="messages-container">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <p class="empty-title">Start a conversation</p>
        <p class="empty-subtitle">
          Send a request to see the response here
        </p>
      </div>

      <TransitionGroup name="message" tag="div" class="messages-list">
        <template v-for="message in messages" :key="message.id">
          <RequestBubble
            v-if="message.type === 'request'"
            :message="message"
            @edit="handleEditRequest(message)"
          />
          <ResponseBubble
            v-else-if="message.type === 'response'"
            :message="message"
            @maximize="handleMaximize(message)"
          />
          <ValidationBubble
            v-else-if="message.type === 'validation'"
            :message="message"
          />
        </template>
      </TransitionGroup>

      <!-- Loading Indicator -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="loading-text">Sending request...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import RequestBubble from './RequestBubble.vue'
import ResponseBubble from './ResponseBubble.vue'
import ValidationBubble from './ValidationBubble.vue'

const props = defineProps({
  conversation: {
    type: Object,
    default: null
  },
  messages: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit-request', 'clear', 'maximize-response'])

const messagesContainer = ref(null)

// Auto-scroll to bottom when new messages arrive
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

watch(
  () => props.isLoading,
  async (loading) => {
    if (loading) {
      await nextTick()
      scrollToBottom()
    }
  }
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleEditRequest(message) {
  emit('edit-request', message)
}

function clearConversation() {
  emit('clear')
}

function handleMaximize(message) {
  emit('maximize-response', message)
}
</script>

<style scoped>
.conversation-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.thread-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.thread-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 14px;
  margin: 0;
  max-width: 300px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-top: 16px;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  max-width: 200px;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-text {
  font-size: 13px;
  color: var(--color-text-secondary);
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Transition animations */
.message-enter-active {
  animation: slideIn 0.3s ease-out;
}

.message-leave-active {
  animation: slideOut 0.2s ease-in;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
