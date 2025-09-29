<script setup>
import { computed } from 'vue'
import BaseContextMenu from './BaseContextMenu.vue'
import { EnvironmentContextMenuController } from '../controllers/EnvironmentContextMenuController.js'

const props = defineProps({
  environmentsController: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'action'])

// Create controller instance
const controller = new EnvironmentContextMenuController(props.environmentsController)

// Initialize controller
controller.init()

// Get menu configuration
const menuItems = computed(() => controller.getMenuItems())

// Handle actions
const handleAction = (event) => {
  emit('action', event)
}

// Expose controller methods for parent component
defineExpose({
  show: (event, environment) => controller.show(event, environment),
  hide: () => controller.hide(),
  controller
})
</script>

<template>
  <BaseContextMenu
    v-if="controller.state.show"
    :controller="controller"
    :menu-items="menuItems"
    @action="handleAction"
  >
    <!-- Custom slot for active environment indicator -->
    <template #items="{ item, handleAction }">
      <!-- Show active indicator if this environment is active -->
      <div
        v-if="environmentsController.environmentsStore.activeEnvironment?.value?.id === item?.id ||
              environmentsController.environmentsStore.activeEnvironment?.id === item?.id"
        class="active-indicator"
      >
        <span class="active-icon">✓</span>
        <span class="active-text">Currently Active</span>
      </div>
    </template>
  </BaseContextMenu>
</template>

<style scoped>
.active-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  border-top: 1px solid var(--color-border-light);
  margin-top: 4px;
}

.active-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  font-size: 10px;
  flex-shrink: 0;
}

.active-text {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>