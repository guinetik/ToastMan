<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { CollectionPickerDialogController } from '../../controllers/CollectionPickerDialogController.js'
import BaseDialog from '../base/BaseDialog.vue'
import FolderNode from './FolderNode.vue'

const props = defineProps({
  requestName: {
    type: String,
    default: 'New Request'
  }
})

const emit = defineEmits(['close', 'save'])

// Controller instance
let controller = null

// Reactive refs that will be bound to controller state
const state = ref({})

// Initialize controller
onMounted(() => {
  // Create controller instance
  controller = new CollectionPickerDialogController()

  // Bind reactive state to controller state
  state.value = controller.state

  // Initialize from props
  controller.initializeFromProps(props.requestName)

  // Setup event handlers
  controller.on('save', (data) => {
    emit('save', data)
  })

  controller.on('close', () => {
    emit('close')
  })

  controller.on('error', (error) => {
    console.error('CollectionPickerDialog error:', error)
  })

  // Setup reactive binding for computed properties
  const updateComputedValues = () => {
    // These are handled by the controller's reactive state
    // No additional computed updates needed
  }

  // Update computed values periodically (simple reactive binding)
  const intervalId = setInterval(updateComputedValues, 100)

  // Store interval ID for cleanup
  controller._intervalId = intervalId
})

onUnmounted(() => {
  // Clean up controller
  if (controller) {
    if (controller._intervalId) {
      clearInterval(controller._intervalId)
    }
    controller.dispose()
    controller = null
  }
})

// Watch for prop changes
watch(() => props.requestName, (newName) => {
  if (controller && newName) {
    controller.initializeFromProps(newName)
  }
})

// Delegate all methods to controller
const handleSave = () => controller?.handleSave()
const handleClose = () => controller?.handleClose()
const selectCollection = (collectionId) => controller?.selectCollection(collectionId)
const selectFolder = (collectionId, folderId) => controller?.selectFolder(collectionId, folderId)
const showCreateCollection = () => controller?.showCreateCollection()
const showCreateFolder = (collectionId) => controller?.showCreateFolder(collectionId)
const cancelCreation = () => controller?.cancelCreation()
const toggleFolderExpansion = (folderId) => controller?.toggleFolderExpansion(folderId)
const isFolderExpanded = (folderId) => controller?.isFolderExpanded(folderId) || false
const getFolderHierarchy = (collectionId) => controller?.getFolderHierarchy(collectionId) || []
const getCollectionRequestCount = (collection) => controller?.getCollectionRequestCount(collection) || 0
const getSelectionDisplayPath = () => controller?.getSelectionDisplayPath() || ''

// Utility methods
const getCollections = () => controller?.getComputed('collections') || []
const canSave = () => controller?.getComputed('canSave') || false
</script>

<template>
  <BaseDialog
    title="Save Request"
    width="600px"
    @close="handleClose"
  >
    <!-- Request Name Input -->
    <div class="form-group">
      <label>Request Name</label>
      <input
        v-model="state.requestName"
        type="text"
        placeholder="Enter request name"
        class="form-input"
        @keyup.enter="handleSave"
      >
    </div>

    <!-- Selection Display -->
    <div v-if="state.mode === 'select' && state.selectedCollectionId" class="selection-display">
      <div class="selection-label">Saving to:</div>
      <div class="selection-path">
        <span class="path-icon">📁</span>
        {{ getSelectionDisplayPath() }}
      </div>
    </div>

    <!-- Mode Selection -->
    <div class="mode-selector">
      <button
        :class="['mode-btn', { active: state.mode === 'select' }]"
        @click="cancelCreation"
      >
        📁 Select Location
      </button>
      <button
        :class="['mode-btn', { active: state.mode === 'create-collection' }]"
        @click="showCreateCollection"
      >
        ➕ New Collection
      </button>
      <button
        :class="['mode-btn', { active: state.mode === 'create-folder' }]"
        @click="showCreateFolder()"
      >
        📂 New Folder
      </button>
    </div>

    <!-- Collection/Folder Selection -->
    <div v-if="state.mode === 'select'" class="form-group">
      <label>Choose Location</label>

      <div class="collections-container">
        <div
          v-for="collection in getCollections()"
          :key="collection.info.id"
          class="collection-group"
        >
          <!-- Collection Header -->
          <div
            :class="[
              'collection-option',
              {
                selected: state.selectedCollectionId === collection.info.id && !state.selectedFolderId
              }
            ]"
            @click="selectCollection(collection.info.id)"
          >
            <span class="collection-icon">📁</span>
            <span class="collection-name">{{ collection.info.name }}</span>
            <span class="request-count">{{ getCollectionRequestCount(collection) }} requests</span>
          </div>

          <!-- Folder Hierarchy -->
          <div class="folder-hierarchy">
            <FolderNode
              v-for="folder in getFolderHierarchy(collection.info.id)"
              :key="folder.id"
              :folder="folder"
              :collection-id="collection.info.id"
              :selected-folder-id="state.selectedFolderId"
              :expanded-folders="state.expandedFolders"
              @select-folder="selectFolder"
              @toggle-expansion="toggleFolderExpansion"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="getCollections().length === 0" class="empty-collections">
          <div class="empty-icon">📭</div>
          <p>No collections available</p>
          <p class="empty-hint">Create a new collection to save your request</p>
        </div>
      </div>
    </div>

    <!-- New Collection Form -->
    <div v-if="state.mode === 'create-collection'" class="form-group">
      <label>New Collection Name</label>
      <input
        v-model="state.newCollectionName"
        type="text"
        placeholder="Enter collection name"
        class="form-input"
        @keyup.enter="handleSave"
      >
      <p class="form-hint">Your request will be saved to the new collection</p>
    </div>

    <!-- New Folder Form -->
    <div v-if="state.mode === 'create-folder'" class="form-group">
      <label>New Folder Name</label>
      <input
        v-model="state.newFolderName"
        type="text"
        placeholder="Enter folder name"
        class="form-input"
        @keyup.enter="handleSave"
      >

      <!-- Parent Collection Selection -->
      <div class="parent-selection">
        <label>Parent Collection</label>
        <div class="collections-list">
          <div
            v-for="collection in getCollections()"
            :key="collection.info.id"
            :class="[
              'collection-option', 'small',
              { selected: state.selectedCollectionId === collection.info.id }
            ]"
            @click="selectCollection(collection.info.id)"
          >
            <span class="collection-icon">📁</span>
            <span class="collection-name">{{ collection.info.name }}</span>
          </div>
        </div>
      </div>

      <p class="form-hint">The folder will be created in the selected collection</p>
    </div>

    <!-- Footer slot -->
    <template #footer>
      <button class="btn-cancel" @click="handleClose">Cancel</button>
      <button
        class="btn-save"
        @click="handleSave"
        :disabled="!canSave()"
      >
        <span v-if="state.mode === 'create-collection'">Create & Save</span>
        <span v-else-if="state.mode === 'create-folder'">Create Folder & Save</span>
        <span v-else>Save Request</span>
      </button>
    </template>
  </BaseDialog>
</template>


<style scoped>
.form-group {
  margin-bottom: 24px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Selection Display */
.selection-display {
  padding: 12px 16px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  margin-bottom: 20px;
}

.selection-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.selection-path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.path-icon {
  font-size: 16px;
}

/* Mode Selector */
.mode-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--color-bg-tertiary);
  padding: 4px;
  border-radius: var(--radius-md);
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.mode-btn.active {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
}

/* Collections Container */
.collections-container {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  max-height: 400px;
  overflow-y: auto;
}

.collection-group {
  border-bottom: 1px solid var(--color-border-light);
}

.collection-group:last-child {
  border-bottom: none;
}

.collection-option {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collection-option:hover {
  background: var(--color-bg-hover);
}

.collection-option.selected {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.collection-option.small {
  padding: 8px 12px;
  font-size: 13px;
}

.collection-icon {
  font-size: 16px;
  margin-right: 12px;
}

.collection-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.request-count {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
}

/* Folder Hierarchy */
.folder-hierarchy {
  background: var(--color-bg-secondary);
}

/* Collections List (for parent selection) */
.collections-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-top: 8px;
}

/* Parent Selection */
.parent-selection {
  margin-top: 16px;
}

/* Empty State */
.empty-collections {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-hint {
  font-size: 12px;
  margin-top: 4px;
}

/* Footer Buttons */
.btn-cancel,
.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background: var(--color-bg-hover);
}

.btn-save {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-save:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>