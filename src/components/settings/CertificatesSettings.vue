<script setup>
import { ref } from 'vue'
import { CertificatesSettingsController } from '../../controllers/settings/CertificatesSettingsController.js'

const props = defineProps({
  certificates: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:certificates'])

// Create controller instance
const controller = new CertificatesSettingsController()
controller.init(props.certificates)

// Handle certificates changes
controller.on('certificatesChanged', (newCertificates) => {
  emit('update:certificates', newCertificates)
})

// Access reactive state from controller
const { errors } = controller.state

// Methods
const addCertificate = () => {
  controller.addCertificate()
}

const removeCertificate = (certId) => {
  controller.removeCertificate(certId)
}

const updateCertificate = (certId, updates) => {
  controller.updateCertificate(certId, updates)
}

const selectCertificateFile = async (certificate) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.p12,.pfx,.pem,.crt,.cer'

  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const result = await controller.importCertificate(file, certificate.id)
      if (result.success) {
        // File imported successfully - could show toast notification
      } else {
        // Handle error - could show error toast
      }
    }
  }

  input.click()
}
</script>

<template>
  <div class="certificates-settings">
    <div class="setting-group">
      <div class="section-header">
        <span class="section-title">Client Certificates</span>
        <button @click="addCertificate" class="btn-add">+ Add Certificate</button>
      </div>
      <div class="setting-description">
        Configure client certificates for domain-specific authentication
      </div>
    </div>

    <div class="certificates-list">
      <div
        v-for="certificate in controller.state.certificates"
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
            v-if="controller.state.certificates.length > 1"
            title="Remove certificate"
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
                  :value="certificate.cert ? `${certificate.fileName || 'Certificate'} loaded` : 'No certificate'"
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

          <div v-if="errors[certificate.id]" class="error-text">
            {{ errors[certificate.id] }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="errors.add" class="error-text">
      {{ errors.add }}
    </div>
  </div>
</template>

<style scoped>
.certificates-settings {
  padding: 0;
}

.setting-group {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.setting-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
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
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.setting-description {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
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

.setting-checkbox {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.domain-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: monospace;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-error);
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: var(--color-error-dark);
  transform: scale(1.1);
}

.certificate-details {
  padding-left: 28px;
}

.setting-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
}

.setting-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.file-input-group {
  display: flex;
  gap: 8px;
}

.file-select-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.file-select-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary);
}

.flex-1 {
  flex: 1;
}

.error-text {
  color: var(--color-error);
  font-size: 12px;
  margin-top: 8px;
}
</style>