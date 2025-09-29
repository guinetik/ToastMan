<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CollectionsController } from '../../controllers/CollectionsController.js'
import NewCollectionDialog from '../NewCollectionDialog.vue'
import CollectionContextMenu from '../CollectionContextMenu.vue'
import RequestContextMenu from '../RequestContextMenu.vue'

// Create controller instance and initialize immediately
const controller = new CollectionsController()
controller.init()

// Access reactive state from controller
const state = controller.state

// Access reactive computed properties from controller
const collections = computed(() => {
  const colls = controller.getComputed('collections')
  console.log('[CollectionsTab] Collections from controller:', colls)
  return colls || []
})

const filteredCollections = computed(() => {
  const filtered = controller.getComputed('filteredCollections')
  console.log('[CollectionsTab] Filtered collections from controller:', filtered)
  return filtered || []
})

// Context menu references
const contextMenuRef = ref(null)
const requestContextMenuRef = ref(null)

// Component methods that delegate to controller
const toggleCollection = (id) => controller.toggleCollection(id)
const openRequest = (collectionId, requestId) => controller.openRequest(collectionId, requestId)
const createNewCollection = () => controller.toggleNewCollectionDialog(true)

// Context menu methods
const showContextMenu = (event, collection) => {
  if (contextMenuRef.value) {
    contextMenuRef.value.show(event, collection)
  }
}

const showRequestContextMenu = (event, collection, request) => {
  event.stopPropagation() // Prevent triggering collection context menu
  if (requestContextMenuRef.value) {
    requestContextMenuRef.value.show(event, collection, request)
  }
}

const handleContextAction = (event) => {
  // Action is handled by the context menu controller
  console.log('Context action completed:', event)
}

const handleRequestContextAction = (event) => {
  // Action is handled by the request context menu controller
  console.log('Request context action completed:', event)
}

// Event handlers - no longer needed since dialog handles creation internally
// const handleCreateCollection = async (name) => {
//   const result = await controller.createCollection(name)
//   if (result.success) {
//     // Collection created successfully, dialog will close automatically
//   }
// }

// Utility methods
const getMethodColor = (method) => controller.getMethodColor(method)

// Lifecycle hooks
onMounted(() => {
  // Controller already initialized above
})

onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <div class="collections-tab">
    <div class="section-header">
      <span class="section-title">Collections</span>
      <button class="btn-icon" title="New Collection" @click="createNewCollection">+</button>
    </div>

    <div class="collections-list">
      <div v-if="!collections" class="empty-state">
        <div class="loading-spinner">⏳</div>
        <p>Loading collections...</p>
      </div>
      <div v-else-if="collections.length === 0" class="empty-state welcome-state">
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
          v-for="collection in filteredCollections"
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
              {{ controller.isCollectionExpanded(collection.info.id) ? '📂' : '📁' }}
            </span>
            <span class="collection-name">{{ collection.info.name }}</span>
            <span class="request-count">{{ (collection.item || []).length }}</span>
          </div>

          <div
            v-if="collection && collection.info && controller.isCollectionExpanded(collection.info.id) && collection.item"
            class="requests-list"
          >
            <div
              v-for="request in collection.item"
              :key="request.id"
              class="request-item"
              @click="openRequest(collection.info.id, request.id)"
              @contextmenu="showRequestContextMenu($event, collection, request)"
            >
              <span
                class="method-badge"
                :style="{ color: getMethodColor(request?.request?.method || 'GET') }"
              >
                {{ request?.request?.method || 'GET' }}
              </span>
              <span class="request-name">{{ request.name || 'Unnamed Request' }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- New Collection Dialog -->
    <NewCollectionDialog
      v-if="state.showNewCollectionDialog"
      @close="controller.toggleNewCollectionDialog(false)"
    />

    <!-- Collection Context Menu -->
    <CollectionContextMenu
      ref="contextMenuRef"
      :collections-controller="controller"
      @action="handleContextAction"
    />

    <!-- Request Context Menu -->
    <RequestContextMenu
      ref="requestContextMenuRef"
      :collections-controller="controller"
      @action="handleRequestContextAction"
    />
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