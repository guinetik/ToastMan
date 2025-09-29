<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  controller: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: null
  },
  menuItems: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['action'])

const menuRef = ref(null)

const handleAction = async (action) => {
  try {
    await props.controller.executeAction(action, props.controller.state.item)
    emit('action', { action, item: props.controller.state.item })
  } catch (error) {
    console.error('Menu action failed:', error)
  }
}

const close = () => {
  props.controller.hide()
}

onMounted(() => {
  // Set menu reference for click outside detection
  if (menuRef.value) {
    props.controller.setMenuRef(menuRef.value)
    props.controller.positionMenu(menuRef.value)
  }
})

onUnmounted(() => {
  // Clean up
  if (props.controller) {
    props.controller.setMenuRef(null)
  }
})
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="{
      left: `${controller.state.x}px`,
      top: `${controller.state.y}px`
    }"
  >
    <div class="menu-header" v-if="title || $slots.header">
      <slot name="header">
        <span class="menu-title">{{ title || controller.getMenuTitle(controller.state.item) }}</span>
      </slot>
    </div>

    <div class="menu-items">
      <template v-for="(item, index) in menuItems" :key="index">
        <!-- Separator -->
        <div v-if="item.type === 'separator'" class="menu-separator"></div>

        <!-- Menu Item -->
        <button
          v-else
          :class="['menu-item', { danger: item.danger, disabled: item.disabled }]"
          @click="handleAction(item.action)"
          :disabled="item.disabled"
        >
          <span class="menu-icon" v-if="item.icon">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
          <span class="menu-shortcut" v-if="item.shortcut">{{ item.shortcut }}</span>
        </button>
      </template>

      <!-- Custom slot for additional items -->
      <slot name="items" :item="controller.state.item" :handleAction="handleAction"></slot>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 180px;
  font-size: 14px;
  animation: contextMenuFadeIn 0.15s ease-out;
  max-width: 250px;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-5px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.menu-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.menu-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.menu-items {
  padding: 4px 0;
}

.menu-item {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
  text-align: left;
  min-height: 32px;
}

.menu-item:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.danger {
  color: var(--color-error);
}

.menu-item.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.menu-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.menu-text {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-shortcut {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  flex-shrink: 0;
}

.menu-separator {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 0;
}
</style>