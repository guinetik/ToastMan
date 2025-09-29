import { BaseController } from '../BaseController.js'
import { Certificate } from '../../models/Certificate.js'

/**
 * Controller for Certificates Settings tab
 */
export class CertificatesSettingsController extends BaseController {
  constructor() {
    super('certificates-settings')

    this.createState({
      certificates: [],
      errors: {}
    })
  }

  /**
   * Initialize with certificates data
   */
  init(certificates = []) {
    super.init()
    this.state.certificates = certificates.map(cert =>
      cert instanceof Certificate ? cert.toJSON() : new Certificate(cert).toJSON()
    )

    // Ensure at least one certificate exists
    if (this.state.certificates.length === 0) {
      this.addCertificate()
    }
  }

  /**
   * Add new certificate
   */
  addCertificate(certData = {}) {
    try {
      const defaultData = {
        name: 'New Certificate',
        type: 'client',
        host: '',
        enabled: false, // Start disabled until user configures it
        ...certData
      }

      const cert = new Certificate(defaultData)
      this.state.certificates.push(cert.toJSON())
      this.logger.info('Added certificate:', cert.name)
      this.emit('certificatesChanged', this.state.certificates)

      return cert.toJSON()
    } catch (error) {
      this.logger.error('Failed to add certificate:', error)
      this.setError('add', error.message)
      return null
    }
  }

  /**
   * Remove certificate
   */
  removeCertificate(certId) {
    const index = this.state.certificates.findIndex(c => c.id === certId)
    if (index > -1) {
      const removed = this.state.certificates.splice(index, 1)[0]
      this.logger.info('Removed certificate:', removed.name)
      this.emit('certificatesChanged', this.state.certificates)
      return true
    }
    return false
  }

  /**
   * Update certificate
   */
  updateCertificate(certId, updates) {
    const cert = this.state.certificates.find(c => c.id === certId)
    if (cert) {
      Object.assign(cert, updates)
      this.clearError(certId)
      this.logger.debug('Updated certificate:', certId, updates)
      this.emit('certificatesChanged', this.state.certificates)
      return true
    }
    return false
  }

  /**
   * Import certificate file
   */
  async importCertificate(file, certId) {
    try {
      // In a real app, this would read and parse the certificate file
      const cert = this.state.certificates.find(c => c.id === certId)
      if (!cert) {
        throw new Error('Certificate not found')
      }

      // Simulate file reading
      const fileData = await this.readCertificateFile(file)

      cert.cert = fileData
      cert.fileName = file.name

      this.logger.info('Imported certificate file:', file.name)
      this.emit('certificatesChanged', this.state.certificates)

      return { success: true, message: 'Certificate imported successfully' }
    } catch (error) {
      this.logger.error('Failed to import certificate:', error)
      this.setError(certId, error.message)
      return { success: false, message: error.message }
    }
  }

  /**
   * Read certificate file (simulated)
   */
  async readCertificateFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        // In a real app, you'd validate the certificate format here
        resolve(e.target.result)
      }

      reader.onerror = () => {
        reject(new Error('Failed to read certificate file'))
      }

      // Read as base64 for binary files (.p12, .pfx) or text for .pem
      if (file.name.endsWith('.pem')) {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
  }

  /**
   * Validate certificates
   */
  validate() {
    this.clearErrors()
    let isValid = true

    this.state.certificates.forEach(cert => {
      if (cert.enabled) {
        if (!cert.host) {
          this.setError(cert.id, 'Host is required for enabled certificates')
          isValid = false
        }

        if (!cert.name) {
          this.setError(cert.id, 'Certificate name is required')
          isValid = false
        }
      }
    })

    return isValid
  }

  /**
   * Set validation error
   */
  setError(field, message) {
    this.state.errors[field] = message
  }

  /**
   * Clear specific error
   */
  clearError(field) {
    delete this.state.errors[field]
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.state.errors = {}
  }

  /**
   * Get certificates data
   */
  getCertificates() {
    return this.state.certificates
  }
}