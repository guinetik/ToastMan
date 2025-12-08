<template>
  <div class="chat-tab">
    <AiChatView />
  </div>
</template>

<script setup>
import AiChatView from '../AiChatView.vue'
</script>

<style scoped>
.chat-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
