<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { CollectionsTabController } from '../../controllers/CollectionsTabController.js'
import NewCollectionDialog from '../dialogs/NewCollectionDialog.vue'
import NewFolderDialog from '../dialogs/NewFolderDialog.vue'
import CollectionContextMenu from '../menu/CollectionContextMenu.vue'
import RequestContextMenu from '../menu/RequestContextMenu.vue'
import FolderContextMenu from '../menu/FolderContextMenu.vue'
import CollectionItem from '../CollectionItem.vue'

// Controller instance
let controller = null

// Reactive refs that will be bound to controller state
const state = ref({})

// Context menu references
const contextMenuRef = ref(null)
const requestContextMenuRef = ref(null)
const folderContextMenuRef = ref(null)

// Initialize controller
onMounted(() => {
  // Create controller instance
  controller = new CollectionsTabController()

  // Bind reactive state to controller state
  state.value = controller.getCollectionsState()

  // Set context menu references
  controller.setContextMenuRefs(
    contextMenuRef.value,
    requestContextMenuRef.value,
    folderContextMenuRef.value
  )

  // Setup event handlers
  controller.on('collectionCreated', (data) => {
    // Collection created, no additional handling needed
  })

  controller.on('collectionDeleted', (collectionId) => {
    // Collection deleted, no additional handling needed
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

// Watch for context menu ref changes
watch([contextMenuRef, requestContextMenuRef, folderContextMenuRef], () => {
  if (controller) {
    controller.setContextMenuRefs(
      contextMenuRef.value,
      requestContextMenuRef.value,
      folderContextMenuRef.value
    )
  }
})

// Component methods that delegate to controller
const toggleCollection = (id) => controller?.toggleCollection(id)
const openRequest = (collectionId, requestId) => controller?.openRequest(collectionId, requestId)
const createNewCollection = () => controller?.toggleNewCollectionDialog(true)

// Context menu methods
const showContextMenu = (event, collection) => controller?.showContextMenu(event, collection)
const showRequestContextMenu = (event, collection, request) => controller?.showRequestContextMenu(event, collection, request)
const showFolderContextMenu = (event, collection, folder) => controller?.showFolderContextMenu(event, collection, folder)

const handleContextAction = (event) => controller?.handleContextAction(event)
const handleRequestContextAction = (event) => controller?.handleRequestContextAction(event)

// Utility methods
const getMethodColor = (method) => controller?.getMethodColor(method) || '#6b7280'
const getCollections = () => controller?.getCollections() || []
const getFilteredCollections = () => controller?.getFilteredCollections() || []
const isCollectionExpanded = (id) => controller?.isCollectionExpanded(id) || false
</script>

<template>
  <div class="collections-tab">
    <div class="section-header">
      <span class="section-title">Collections</span>
      <button class="btn-icon" title="New Collection" @click="createNewCollection">+</button>
    </div>

    <div class="collections-list">
      <div v-if="!getCollections()" class="empty-state">
        <div class="loading-spinner">⏳</div>
        <p>Loading collections...</p>
      </div>
      <div v-else-if="getCollections().length === 0" class="empty-state welcome-state">
        <div class="welcome-icon">📁</div>
        <h3>Welcome to ToastMan!</h3>
        <p>Get started by creating your first collection to organize your API requests.</p>
        <button class="btn-primary" @click="createNewCollection">
          Create Your First Collection
        </button>
        <div class="quick-tips">
          <h4>Quick Tips:</h4>
          <ul>
            <li>Collections help organize related requests</li>
            <li>Use environments to manage variables</li>
            <li>Import from Postman collections</li>
          </ul>
        </div>
      </div>
      <template v-else>
        <div
          v-for="collection in getFilteredCollections()"
          :key="collection?.info?.id || Date.now()"
          class="collection-item"
        >
          <div
            v-if="collection && collection.info"
            class="collection-header"
            @click="toggleCollection(collection.info.id)"
            @contextmenu="showContextMenu($event, collection)"
          >
            <span class="expand-icon">
              {{ isCollectionExpanded(collection.info.id) ? '📂' : '📁' }}
            </span>
            <span class="collection-name">{{ collection.info.name }}</span>
            <span class="request-count">{{ (collection.item || []).length }}</span>
          </div>

          <div
            v-if="collection && collection.info && isCollectionExpanded(collection.info.id) && collection.item"
            class="requests-list"
          >
            <CollectionItem
              v-for="item in collection.item"
              :key="item.id"
              :item="item"
              :collection-id="collection.info.id"
              :controller="controller?.collectionsController"
              @open-request="(collectionId, requestId) => openRequest(collectionId, requestId)"
              @show-context-menu="(event, request) => showRequestContextMenu(event, collection, request)"
              @show-folder-context-menu="(event, folder) => showFolderContextMenu(event, collection, folder)"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- New Collection Dialog -->
    <NewCollectionDialog
      v-if="state.showNewCollectionDialog"
      @close="() => controller?.toggleNewCollectionDialog(false)"
    />

    <!-- New Folder Dialog -->
    <NewFolderDialog
      v-if="controller?.state?.showNewFolderDialog && controller?.state?.newFolderDialogData"
      :collection-id="controller.state.newFolderDialogData.collectionId"
      :parent-folder-id="controller.state.newFolderDialogData.parentFolderId"
      @close="() => controller?.hideNewFolderDialog()"
      @create="() => controller?.hideNewFolderDialog()"
    />

    <!-- Context Menus - only render after controller is ready -->
    <template v-if="controller">
      <!-- Collection Context Menu -->
      <CollectionContextMenu
        ref="contextMenuRef"
        :collections-controller="controller.collectionsController"
        @action="handleContextAction"
      />

      <!-- Request Context Menu -->
      <RequestContextMenu
        ref="requestContextMenuRef"
        :collections-controller="controller.collectionsController"
        @action="handleRequestContextAction"
      />

      <!-- Folder Context Menu -->
      <FolderContextMenu
        ref="folderContextMenuRef"
        :collections-controller="controller.collectionsController"
        @action="handleContextAction"
      />
    </template>
  </div>
</template>

<style scoped>
.collections-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-light);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn-icon {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.collections-list {
  flex: 1;
  overflow-y: auto;
}

.collection-item {
  margin-bottom: 8px;
}

.collection-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.collection-header:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.expand-icon {
  font-size: 14px;
}

.collection-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.request-count {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
}

.requests-list {
  margin-left: 24px;
  border-left: 1px solid var(--color-border-light);
  padding-left: 12px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 2px;
}

.request-item:hover {
  background: var(--color-bg-hover);
}

.method-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 35px;
  text-align: left;
}

.request-name {
  font-size: 13px;
  color: var(--color-text-primary);
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
}

.welcome-state {
  padding: 32px 24px;
  font-style: normal;
  max-width: 300px;
  margin: 0 auto;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.welcome-state h3 {
  font-size: 18px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
  font-weight: 600;
}

.welcome-state p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-bottom: 24px;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.quick-tips {
  text-align: left;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border-light);
}

.quick-tips h4 {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quick-tips ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-tips li {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
}

.quick-tips li:before {
  content: "•";
  color: var(--color-primary);
  position: absolute;
  left: 0;
}

.loading-spinner {
  font-size: 24px;
  animation: spin 2s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>