<script setup>
import { computed } from 'vue'
import BaseContextMenu from '../base/BaseContextMenu.vue'
import { CollectionContextMenuController } from '../../controllers/CollectionContextMenuController.js'

const props = defineProps({
  collectionsController: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'action'])

// Create controller instance
const controller = new CollectionContextMenuController(props.collectionsController)

// Initialize controller
controller.init()

// Get menu configuration
const menuItems = computed(() => controller.getMenuItems())

// Handle actions
const handleAction = (event) => {
  emit('action', event)
}

// Handle close
const handleClose = () => {
  emit('close')
}

// Expose controller methods for parent component
defineExpose({
  show: (event, collection) => controller.show(event, collection),
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
  />
</template>