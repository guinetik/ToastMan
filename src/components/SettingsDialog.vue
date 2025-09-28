<script setup>
import { onMounted, onUnmounted } from 'vue'
import { SettingsDialogController } from '../controllers/SettingsDialogController.js'
import BaseDialog from './BaseDialog.vue'

const emit = defineEmits(['close'])

// Create controller instance
const controller = new SettingsDialogController()

// Access reactive state from controller
const {
  visible,
  loading,
  errors,
  formData,
  activeTab
} = controller.state

// Component methods that delegate to controller
const closeDialog = async () => {
  if (await controller.confirmClose()) {
    controller.close()
    emit('close')
  }
}

const saveSettings = () => controller.submit()
const switchTab = (tab) => controller.switchTab(tab)
const resetToDefaults = () => controller.resetToDefaults()
const exportSettings = () => controller.exportSettings()

// Proxy methods
const updateProxySettings = (updates) => controller.updateProxySettings(updates)
const testProxyConnection = () => controller.testProxyConnection()

// Certificate methods
const addCertificate = () => {
  controller.addCertificate({
    name: 'New Certificate',
    type: 'client',
    host: '',
    enabled: true
  })
}

const removeCertificate = (certId) => controller.removeCertificate(certId)
const updateCertificate = (certId, updates) => controller.updateCertificate(certId, updates)

const selectCertificateFile = async (certificate) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.p12,.pfx,.pem,.crt'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const result = await controller.importCertificate(file)
      if (result.success) {
        // File imported successfully
      }
    }
  }
  input.click()
}

const importSettingsFile = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await controller.importSettings(file)
    }
  }
  input.click()
}

// Event handlers
controller.on('submitted', () => {
  emit('close')
})

controller.on('closed', () => {
  emit('close')
})

// Open the dialog
onMounted(() => {
  controller.open()
})

onUnmounted(() => {
  controller.dispose()
})
</script>

<template>
  <BaseDialog
    title="Settings"
    width="700px"
    height="600px"
    @close="closeDialog"
  >
    <!-- Dialog Content -->
    <div class="settings-container">
      <!-- Settings Tabs -->
      <div class="settings-tabs">
        <button
          :class="['settings-tab', { active: activeTab === 'general' }]"
          @click="switchTab('general')"
        >
          ⚙️ General
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'request' }]"
          @click="switchTab('request')"
        >
          🌐 Request
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'ui' }]"
          @click="switchTab('ui')"
        >
          🎨 UI
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'proxy' }]"
          @click="switchTab('proxy')"
        >
          🔗 Proxy
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'certificates' }]"
          @click="switchTab('certificates')"
        >
          🔒 Certificates
        </button>
        <button
          :class="['settings-tab', { active: activeTab === 'shortcuts' }]"
          @click="switchTab('shortcuts')"
        >
          ⌨️ Shortcuts
        </button>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="general-settings">
          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.general.autoSave"
                @change="controller.updateGeneralSettings({ autoSave: $event.target.checked })"
                class="setting-checkbox"
              >
              Auto-save changes
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-label">Auto-save interval (seconds)</label>
            <input
              type="number"
              v-model="formData.general.autoSaveInterval"
              @input="controller.updateGeneralSettings({ autoSaveInterval: parseInt($event.target.value) * 1000 })"
              min="10"
              max="300"
              class="setting-input"
            >
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.general.confirmOnDelete"
                @change="controller.updateGeneralSettings({ confirmOnDelete: $event.target.checked })"
                class="setting-checkbox"
              >
              Confirm before deleting items
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-label">Maximum history items</label>
            <input
              type="number"
              v-model="formData.general.maxHistoryItems"
              @input="controller.updateGeneralSettings({ maxHistoryItems: parseInt($event.target.value) })"
              min="0"
              max="1000"
              class="setting-input"
            >
          </div>
        </div>

        <!-- Request Settings -->
        <div v-if="activeTab === 'request'" class="request-settings">
          <div class="setting-group">
            <label class="setting-label">Request timeout (milliseconds)</label>
            <input
              type="number"
              v-model="formData.request.timeout"
              @input="controller.updateRequestSettings({ timeout: parseInt($event.target.value) })"
              min="1000"
              max="300000"
              class="setting-input"
            >
            <div v-if="errors['request.timeout']" class="error-text">{{ errors['request.timeout'] }}</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.request.followRedirects"
                @change="controller.updateRequestSettings({ followRedirects: $event.target.checked })"
                class="setting-checkbox"
              >
              Follow redirects automatically
            </label>
          </div>

          <div class="setting-group">
            <label class="setting-label">Maximum redirects</label>
            <input
              type="number"
              v-model="formData.request.maxRedirects"
              @input="controller.updateRequestSettings({ maxRedirects: parseInt($event.target.value) })"
              min="0"
              max="50"
              class="setting-input"
            >
            <div v-if="errors['request.maxRedirects']" class="error-text">{{ errors['request.maxRedirects'] }}</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.request.validateSSL"
                @change="controller.updateRequestSettings({ validateSSL: $event.target.checked })"
                class="setting-checkbox"
              >
              Validate SSL certificates
            </label>
          </div>
        </div>

        <!-- UI Settings -->
        <div v-if="activeTab === 'ui'" class="ui-settings">
          <div class="setting-group">
            <label class="setting-label">Theme</label>
            <select
              v-model="formData.ui.theme"
              @change="controller.updateUISettings({ theme: $event.target.value })"
              class="setting-input"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">Font size (px)</label>
            <input
              type="number"
              v-model="formData.ui.fontSize"
              @input="controller.updateUISettings({ fontSize: parseInt($event.target.value) })"
              min="10"
              max="24"
              class="setting-input"
            >
            <div v-if="errors['ui.fontSize']" class="error-text">{{ errors['ui.fontSize'] }}</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">Sidebar width (%)</label>
            <input
              type="number"
              v-model="formData.ui.sidebarWidth"
              @input="controller.updateUISettings({ sidebarWidth: parseInt($event.target.value) })"
              min="15"
              max="50"
              class="setting-input"
            >
            <div v-if="errors['ui.sidebarWidth']" class="error-text">{{ errors['ui.sidebarWidth'] }}</div>
          </div>

          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.ui.showLineNumbers"
                @change="controller.updateUISettings({ showLineNumbers: $event.target.checked })"
                class="setting-checkbox"
              >
              Show line numbers in code editor
            </label>
          </div>
        </div>

        <!-- Proxy Settings -->
        <div v-if="activeTab === 'proxy'" class="proxy-settings">
          <div class="setting-group">
            <label class="setting-label">
              <input
                type="checkbox"
                v-model="formData.proxy.enabled"
                @change="controller.updateProxySettings({ enabled: $event.target.checked })"
                class="setting-checkbox"
              >
              Enable Proxy
            </label>
          </div>

          <template v-if="formData.proxy.enabled">
            <div class="setting-group">
              <label class="setting-label">Protocol</label>
              <select
                v-model="formData.proxy.protocol"
                @change="controller.updateProxySettings({ protocol: $event.target.value })"
                class="setting-input"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>

            <div class="setting-row">
              <div class="setting-group flex-1">
                <label class="setting-label">Host</label>
                <input
                  type="text"
                  v-model="formData.proxy.host"
                  @input="controller.updateProxySettings({ host: $event.target.value })"
                  placeholder="proxy.company.com"
                  class="setting-input"
                >
                <div v-if="errors['proxy.host']" class="error-text">{{ errors['proxy.host'] }}</div>
              </div>
              <div class="setting-group">
                <label class="setting-label">Port</label>
                <input
                  type="number"
                  v-model="formData.proxy.port"
                  @input="controller.updateProxySettings({ port: parseInt($event.target.value) })"
                  placeholder="8080"
                  class="setting-input port-input"
                >
                <div v-if="errors['proxy.port']" class="error-text">{{ errors['proxy.port'] }}</div>
              </div>
            </div>

            <div class="setting-group">
              <label class="setting-label">Authentication (Optional)</label>
              <div class="setting-row">
                <input
                  type="text"
                  v-model="formData.proxy.auth.username"
                  @input="controller.updateProxySettings({ auth: { ...formData.proxy.auth, username: $event.target.value } })"
                  placeholder="Username"
                  class="setting-input flex-1"
                >
                <input
                  type="password"
                  v-model="formData.proxy.auth.password"
                  @input="controller.updateProxySettings({ auth: { ...formData.proxy.auth, password: $event.target.value } })"
                  placeholder="Password"
                  class="setting-input flex-1"
                >
              </div>
            </div>

            <div class="setting-group">
              <button @click="testProxyConnection" class="test-btn" :disabled="loading">
                {{ loading ? 'Testing...' : 'Test Connection' }}
              </button>
            </div>
          </template>
        </div>

        <!-- Certificate Settings -->
        <div v-if="activeTab === 'certificates'" class="certificate-settings">
          <div class="setting-group">
            <div class="section-header">
              <span class="section-title">Client Certificates</span>
              <button @click="addCertificate" class="btn-add">+ Add Certificate</button>
            </div>
            <div class="setting-hint">
              Configure client certificates for domain-specific authentication
            </div>
          </div>

          <div class="certificates-list">
            <div
              v-for="certificate in formData.certificates"
              :key="certificate.id"
              class="certificate-item"
            >
              <div class="certificate-header">
                <input
                  type="checkbox"
                  v-model="certificate.enabled"
                  @change="updateCertificate(certificate.id, { enabled: $event.target.checked })"
                  class="setting-checkbox"
                >
                <input
                  type="text"
                  v-model="certificate.host"
                  @input="updateCertificate(certificate.id, { host: $event.target.value })"
                  placeholder="*.example.com or example.com"
                  class="domain-input"
                >
                <button
                  @click="removeCertificate(certificate.id)"
                  class="btn-remove"
                  v-if="formData.certificates.length > 1"
                >
                  ×
                </button>
              </div>

              <div v-if="certificate.enabled" class="certificate-details">
                <div class="setting-row">
                  <div class="setting-group flex-1">
                    <label class="setting-label">Certificate Name</label>
                    <input
                      type="text"
                      v-model="certificate.name"
                      @input="updateCertificate(certificate.id, { name: $event.target.value })"
                      placeholder="Certificate name"
                      class="setting-input"
                    >
                  </div>
                </div>

                <div class="setting-row">
                  <div class="setting-group flex-1">
                    <label class="setting-label">Certificate File</label>
                    <div class="file-input-group">
                      <input
                        type="text"
                        :value="certificate.cert ? 'Certificate loaded' : 'No certificate'"
                        placeholder="Select certificate file (.p12, .pfx, .pem)"
                        class="setting-input"
                        readonly
                      >
                      <button
                        @click="selectCertificateFile(certificate)"
                        class="file-select-btn"
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                </div>

                <div class="setting-group">
                  <label class="setting-label">Certificate Password</label>
                  <input
                    type="password"
                    v-model="certificate.passphrase"
                    @input="updateCertificate(certificate.id, { passphrase: $event.target.value })"
                    placeholder="Enter certificate password"
                    class="setting-input"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shortcuts Settings -->
        <div v-if="activeTab === 'shortcuts'" class="shortcuts-settings">
          <div class="setting-group">
            <div class="section-header">
              <span class="section-title">Keyboard Shortcuts</span>
              <button @click="controller.resetKeyBindings()" class="btn-add">Reset to Defaults</button>
            </div>
          </div>

          <div class="shortcuts-list">
            <div
              v-for="binding in formData.keyBindings"
              :key="binding.action"
              class="shortcut-item"
            >
              <div class="shortcut-label">{{ binding.description }}</div>
              <div class="shortcut-keys">{{ binding.keys.join(' + ') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Footer -->
    <template #footer>
      <div class="footer-actions">
        <button @click="exportSettings" class="export-btn">
          Export
        </button>
        <button @click="importSettingsFile" class="import-btn">
          Import
        </button>
        <button @click="resetToDefaults" class="reset-btn">
          Reset to Defaults
        </button>
      </div>
      <div class="footer-actions">
        <button @click="closeDialog" class="cancel-btn" :disabled="loading">
          Cancel
        </button>
        <button @click="saveSettings" class="primary save-btn" :disabled="loading || controller.hasErrors()">
          {{ loading ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.settings-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.settings-tab {
  background: none;
  border: none;
  padding: 12px 20px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.settings-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
}

.setting-input, .setting-textarea {
  width: 100%;
  font-size: 13px;
}

.setting-textarea {
  resize: vertical;
  font-family: inherit;
}

.setting-row {
  display: flex;
  gap: 12px;
  align-items: end;
}

.flex-1 {
  flex: 1;
}

.port-input {
  width: 100px;
}

.setting-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
  font-style: italic;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn-add {
  font-size: 12px;
  padding: 6px 12px;
}

.certificates-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.certificate-item {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
}

.certificate-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.domain-input {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-remove:hover {
  background: var(--color-error);
  color: white;
}

.certificate-details {
  padding-left: 28px;
}

.file-input-group {
  display: flex;
  gap: 8px;
}

.file-select-btn {
  padding: 6px 12px;
  font-size: 12px;
  min-width: 80px;
}

.cancel-btn {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.cancel-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.save-btn {
  min-width: 120px;
}

.error-text {
  font-size: 12px;
  color: var(--color-error);
  margin-top: 4px;
}

.test-btn {
  padding: 8px 16px;
  font-size: 13px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.test-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.shortcut-label {
  font-size: 14px;
  color: var(--color-text-primary);
}

.shortcut-keys {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--color-bg-primary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.export-btn, .import-btn, .reset-btn {
  padding: 8px 12px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.import-btn {
  background: var(--color-info);
  color: white;
  border-color: var(--color-info);
}

.reset-btn {
  background: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.export-btn:hover, .import-btn:hover, .reset-btn:hover {
  opacity: 0.8;
}
</style>