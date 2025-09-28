<script setup>
import { onMounted, onUnmounted } from 'vue'
import { EnvironmentsController } from '../../controllers/EnvironmentsController.js'

// Create controller instance
const controller = new EnvironmentsController()

// Access reactive state from controller
const state = controller.state

// Access computed properties from controller
const environments = controller.getComputed('environments')
const activeEnvironment = controller.getComputed('activeEnvironment')

// Component methods that delegate to controller
const createNewEnvironment = () => controller.createEnvironment()
const setActiveEnvironment = (envId) => controller.setActiveEnvironment(envId)
const deleteEnvironment = (envId) => controller.deleteEnvironment(envId)
const duplicateEnvironment = (envId) => controller.duplicateEnvironment(envId)

// Lifecycle hooks
onMounted(() => {
  controller.init()
})

onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <div class="environments-tab">
    <div class="section-header">
      <span class="section-title">Environments</span>
      <button class="btn-icon" title="New Environment" @click="createNewEnvironment">+</button>
    </div>

    <div class="environments-list">
      <div v-if="!environments" class="empty-state">
        <div class="loading-spinner">⏳</div>
        <p>Loading environments...</p>
      </div>
      <div v-else-if="environments.length === 0" class="empty-state welcome-state">
        <div class="welcome-icon">🌍</div>
        <h3>No Environments Yet</h3>
        <p>Environments help manage variables like API URLs, tokens, and settings across different stages.</p>
        <button class="btn-primary" @click="createNewEnvironment">
          Create Your First Environment
        </button>
        <div class="quick-tips">
          <h4>Environment Examples:</h4>
          <ul>
            <li>Development (dev APIs)</li>
            <li>Staging (test environment)</li>
            <li>Production (live APIs)</li>
          </ul>
        </div>
      </div>
      <template v-else>
        <div
          v-for="environment in environments"
          :key="environment?.id || Date.now()"
          :class="['environment-item', { active: activeEnvironment?.id === environment?.id }]"
          @click="environment && setActiveEnvironment(environment.id)"
        >
          <div class="environment-indicator"></div>
          <div class="environment-content">
            <span class="environment-name">{{ environment?.name || 'Unnamed Environment' }}</span>
            <span class="variable-count">{{ (environment?.values || []).length }} variables</span>
          </div>
          <div class="environment-actions">
            <span v-if="activeEnvironment?.id === environment?.id" class="active-badge">Active</span>
            <button
              class="btn-action"
              title="Duplicate Environment"
              @click.stop="duplicateEnvironment(environment.id)"
            >
              📋
            </button>
            <button
              class="btn-action danger"
              title="Delete Environment"
              @click.stop="deleteEnvironment(environment.id)"
            >
              🗑️
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.environments-tab {
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
  border-radius: 50%;
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

.environments-list {
  flex: 1;
  overflow-y: auto;
}

.environment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.environment-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-light);
}

.environment-item.active {
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid var(--color-primary-light);
}

.environment-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border-dark);
  flex-shrink: 0;
}

.environment-item.active .environment-indicator {
  background: var(--color-primary);
}

.environment-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.environment-name {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.variable-count {
  font-size: 11px;
  color: var(--color-text-muted);
}

.environment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.environment-item:hover .environment-actions {
  opacity: 1;
}

.environment-item.active .environment-actions {
  opacity: 1;
}

.active-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(37, 99, 235, 0.1);
  padding: 2px 6px;
  border-radius: 8px;
  text-transform: uppercase;
}

.btn-action {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action:hover {
  background: var(--color-bg-hover);
  transform: scale(1.1);
}

.btn-action.danger:hover {
  background: var(--color-error);
  color: white;
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