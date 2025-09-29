<script setup>
const props = defineProps({
  folder: {
    type: Object,
    required: true
  },
  collectionId: {
    type: String,
    required: true
  },
  selectedFolderId: {
    type: String,
    default: null
  },
  expandedFolders: {
    type: Set,
    default: () => new Set()
  },
  level: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['select-folder', 'toggle-expansion'])

const handleSelectFolder = () => {
  emit('select-folder', props.collectionId, props.folder.id)
}

const handleToggleExpansion = (event) => {
  event.stopPropagation()
  emit('toggle-expansion', props.folder.id)
}

const isExpanded = () => {
  return props.expandedFolders.has(props.folder.id)
}
</script>

<template>
  <div class="folder-node">
    <div
      :class="[
        'folder-option',
        {
          selected: selectedFolderId === folder.id,
          expanded: isExpanded()
        }
      ]"
      :style="{ paddingLeft: (12 + folder.level * 20) + 'px' }"
      @click="handleSelectFolder"
    >
      <button
        v-if="folder.children.length > 0"
        class="expand-btn"
        @click="handleToggleExpansion"
      >
        {{ isExpanded() ? '📂' : '📁' }}
      </button>
      <span v-else class="folder-spacer"></span>
      <span class="folder-name">{{ folder.name }}</span>
      <span class="request-count">{{ folder.requestCount }} requests</span>
    </div>

    <!-- Recursive children -->
    <div v-if="isExpanded()" class="folder-children">
      <FolderNode
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :collection-id="collectionId"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        @select-folder="(collectionId, folderId) => $emit('select-folder', collectionId, folderId)"
        @toggle-expansion="$emit('toggle-expansion', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.folder-node {
  border-left: 1px solid var(--color-border-light);
  margin-left: 16px;
}

.folder-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--color-border-light);
}

.folder-option:hover {
  background: var(--color-bg-hover);
}

.folder-option.selected {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  margin-right: 8px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.expand-btn:hover {
  background: var(--color-bg-tertiary);
}

.folder-spacer {
  width: 20px;
  margin-right: 8px;
}

.folder-name {
  flex: 1;
  font-size: 13px;
}

.request-count {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
}

.folder-children {
  border-left: 1px solid var(--color-border-light);
  margin-left: 10px;
}
</style>