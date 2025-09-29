<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  collectionId: {
    type: String,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  },
  controller: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-request', 'show-context-menu', 'show-folder-context-menu'])

// Track folder expansion state
const isExpanded = ref(false)

// Determine if this is a folder or request
const isFolder = computed(() => {
  return props.item.type === 'folder' || (!props.item.type && props.item.item && Array.isArray(props.item.item))
})

const isRequest = computed(() => {
  return props.item.type === 'request' || (!props.item.type && props.item.request)
})

// Get item count for folders
const itemCount = computed(() => {
  if (!isFolder.value) return 0

  const countItems = (items) => {
    let count = 0
    for (const item of items || []) {
      if (item.type === 'request' || (!item.type && item.request)) {
        count++
      } else if (item.type === 'folder' || (!item.type && item.item)) {
        count += countItems(item.item)
      }
    }
    return count
  }

  return countItems(props.item.item)
})

// Toggle folder expansion
const toggleFolder = () => {
  if (isFolder.value) {
    isExpanded.value = !isExpanded.value
  }
}

// Handle item click
const handleClick = () => {
  if (isRequest.value) {
    emit('open-request', props.collectionId, props.item.id)
  } else if (isFolder.value) {
    toggleFolder()
  }
}

// Handle context menu
const handleContextMenu = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (isRequest.value) {
    emit('show-context-menu', event, props.item)
  } else if (isFolder.value) {
    emit('show-folder-context-menu', event, props.item)
  }
}

// Get method color for requests
const getMethodColor = (method) => {
  const colors = {
    'GET': '#22c55e',
    'POST': '#3b82f6',
    'PUT': '#f59e0b',
    'PATCH': '#a855f7',
    'DELETE': '#ef4444',
    'HEAD': '#6b7280',
    'OPTIONS': '#06b6d4'
  }
  return colors[method] || '#6b7280'
}
</script>

<template>
  <div class="collection-item-wrapper">
    <!-- Folder -->
    <div v-if="isFolder" class="folder-container">
      <div
        class="folder-item"
        :style="{ paddingLeft: `${depth * 20}px` }"
        @click="handleClick"
        @contextmenu="handleContextMenu"
      >
        <span class="expand-icon">
          {{ isExpanded ? '📂' : '📁' }}
        </span>
        <span class="folder-name">{{ item.name || 'Unnamed Folder' }}</span>
        <span class="item-count">{{ itemCount }}</span>
      </div>

      <!-- Folder Children -->
      <div v-if="isExpanded && item.item" class="folder-children">
        <CollectionItem
          v-for="childItem in item.item"
          :key="childItem.id"
          :item="childItem"
          :collection-id="collectionId"
          :depth="depth + 1"
          :controller="controller"
          @open-request="(collectionId, requestId) => $emit('open-request', collectionId, requestId)"
          @show-context-menu="(event, request) => $emit('show-context-menu', event, request)"
          @show-folder-context-menu="(event, folder) => $emit('show-folder-context-menu', event, folder)"
        />
      </div>
    </div>

    <!-- Request -->
    <div
      v-else-if="isRequest"
      class="request-item"
      :style="{ paddingLeft: `${(depth + 1) * 20}px` }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <span
        class="method-badge"
        :style="{ color: getMethodColor(item.request?.method || 'GET') }"
      >
        {{ item.request?.method || 'GET' }}
      </span>
      <span class="request-name">{{ item.name || 'Unnamed Request' }}</span>
    </div>
  </div>
</template>

<style scoped>
.collection-item-wrapper {
  width: 100%;
}

.folder-container {
  width: 100%;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
}

.folder-item:hover {
  background-color: var(--color-bg-hover);
}

.expand-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-count {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.folder-children {
  border-left: 1px solid var(--color-border-light);
  margin-left: 20px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  user-select: none;
}

.request-item:hover {
  background-color: var(--color-bg-hover);
}

.method-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 40px;
}

.request-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>