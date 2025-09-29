<script setup>
import { ref, computed } from 'vue'
import { useCollections } from '../../stores/useCollections.js'
import BaseDialog from '../base/BaseDialog.vue'

const props = defineProps({
  requestName: {
    type: String,
    default: 'New Request'
  }
})

const emit = defineEmits(['close', 'save'])

const collectionsStore = useCollections()
const selectedCollectionId = ref(null)
const requestNameInput = ref(props.requestName)
const showNewCollection = ref(false)
const newCollectionName = ref('')

// Get all collections
const collections = computed(() => {
  return collectionsStore.collections.value || []
})

// Initialize with first collection if available
if (collections.value.length > 0 && !selectedCollectionId.value) {
  selectedCollectionId.value = collections.value[0].info.id
}

const handleSave = () => {
  if (showNewCollection.value && newCollectionName.value.trim()) {
    // Create new collection first, then save request to it
    const newCollection = collectionsStore.createCollection(newCollectionName.value.trim())
    emit('save', {
      collectionId: newCollection.info.id,
      requestName: requestNameInput.value.trim() || 'New Request',
      isNewCollection: true
    })
  } else if (selectedCollectionId.value) {
    emit('save', {
      collectionId: selectedCollectionId.value,
      requestName: requestNameInput.value.trim() || 'New Request',
      isNewCollection: false
    })
  }
}

const selectCollection = (collectionId) => {
  selectedCollectionId.value = collectionId
  showNewCollection.value = false
}

const toggleNewCollection = () => {
  showNewCollection.value = !showNewCollection.value
  if (showNewCollection.value) {
    selectedCollectionId.value = null
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <BaseDialog
    title="Save Request"
    width="500px"
    @close="handleClose"
  >
    <!-- Request Name Input -->
    <div class="form-group">
      <label>Request Name</label>
      <input
        v-model="requestNameInput"
        type="text"
        placeholder="Enter request name"
        class="form-input"
        @keyup.enter="handleSave"
      >
    </div>

    <!-- Collection Selection -->
    <div class="form-group">
      <label>Select Collection</label>

      <!-- Existing Collections -->
      <div class="collections-list">
        <div
          v-for="collection in collections"
          :key="collection.info.id"
          :class="['collection-option', { selected: selectedCollectionId === collection.info.id && !showNewCollection }]"
          @click="selectCollection(collection.info.id)"
        >
          <span class="collection-icon">📁</span>
          <span class="collection-name">{{ collection.info.name }}</span>
          <span class="request-count">{{ collection.item?.length || 0 }} requests</span>
        </div>

        <!-- New Collection Option -->
        <div
          :class="['collection-option', 'new-collection', { selected: showNewCollection }]"
          @click="toggleNewCollection"
        >
          <span class="collection-icon">➕</span>
          <span class="collection-name">Create New Collection</span>
        </div>
      </div>

      <!-- New Collection Name Input -->
      <div v-if="showNewCollection" class="new-collection-input">
        <input
          v-model="newCollectionName"
          type="text"
          placeholder="Enter collection name"
          class="form-input"
          @keyup.enter="handleSave"
        >
      </div>
    </div>

    <!-- Footer slot -->
    <template #footer>
      <button class="btn-cancel" @click="handleClose">Cancel</button>
      <button
        class="btn-save"
        @click="handleSave"
        :disabled="!requestNameInput.trim() || (!selectedCollectionId && (!showNewCollection || !newCollectionName.trim()))"
      >
        Save Request
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
/* Only keep styles specific to this dialog content */

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

.collections-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
  max-height: 300px;
  overflow-y: auto;
}

.collection-option {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--color-border-light);
}

.collection-option:last-child {
  border-bottom: none;
}

.collection-option:hover {
  background: var(--color-bg-hover);
}

.collection-option.selected {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.collection-option.new-collection {
  background: var(--color-bg-tertiary);
  font-weight: 500;
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

.new-collection-input {
  margin-top: 12px;
}


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