/**
 * WebGPU Capability Detection Utility
 *
 * Checks for WebGPU API availability and provides appropriate error messages
 * for browsers that don't support the AI chat feature.
 */

/**
 * Check if WebGPU is available in the current browser
 * @returns {Promise<boolean>} True if WebGPU is available
 */
export async function checkWebGPU() {
  if (!('gpu' in navigator)) {
    return false
  }

  try {
    // Try to request an adapter to ensure GPU is actually accessible
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch (error) {
    console.warn('WebGPU adapter request failed:', error)
    return false
  }
}

/**
 * Get WebGPU capability status with detailed messaging
 * @returns {Promise<{available: boolean, message: string, browserSupport: boolean}>}
 */
export async function getWebGPUStatus() {
  // Check if the API exists
  if (!('gpu' in navigator)) {
    return {
      available: false,
      browserSupport: false,
      message: "AI Chat requires WebGPU. Your browser doesn't support it. Try Chrome/Edge 113+ or Safari 17+."
    }
  }

  // Check if we can get an adapter
  try {
    const adapter = await navigator.gpu.requestAdapter()

    if (!adapter) {
      return {
        available: false,
        browserSupport: true,
        message: "WebGPU is available but no compatible GPU adapter found. Your device may not support it."
      }
    }

    // Check for minimum features
    const device = await adapter.requestDevice()

    if (!device) {
      return {
        available: false,
        browserSupport: true,
        message: "Could not initialize WebGPU device. Your GPU may not have sufficient capabilities."
      }
    }

    // Clean up
    device.destroy()

    return {
      available: true,
      browserSupport: true,
      message: "WebGPU is available and ready for AI Chat."
    }
  } catch (error) {
    console.error('WebGPU capability check error:', error)

    return {
      available: false,
      browserSupport: true,
      message: `WebGPU initialization failed: ${error.message}. Your GPU may not support the required features.`
    }
  }
}

/**
 * Get browser compatibility information
 * @returns {{name: string, supported: boolean, minimumVersion: string}}
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent

  // Chrome/Chromium
  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    const match = userAgent.match(/Chrome\/(\d+)/)
    const version = match ? parseInt(match[1]) : 0

    return {
      name: 'Chrome',
      supported: version >= 113,
      minimumVersion: '113',
      currentVersion: version
    }
  }

  // Edge
  if (userAgent.includes('Edg/')) {
    const match = userAgent.match(/Edg\/(\d+)/)
    const version = match ? parseInt(match[1]) : 0

    return {
      name: 'Edge',
      supported: version >= 113,
      minimumVersion: '113',
      currentVersion: version
    }
  }

  // Safari
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    const match = userAgent.match(/Version\/(\d+)/)
    const version = match ? parseInt(match[1]) : 0

    return {
      name: 'Safari',
      supported: version >= 17,
      minimumVersion: '17',
      currentVersion: version
    }
  }

  // Firefox (experimental support only)
  if (userAgent.includes('Firefox/')) {
    const match = userAgent.match(/Firefox\/(\d+)/)
    const version = match ? parseInt(match[1]) : 0

    return {
      name: 'Firefox',
      supported: false, // Experimental only, not recommended
      minimumVersion: 'Not supported',
      currentVersion: version
    }
  }

  return {
    name: 'Unknown',
    supported: false,
    minimumVersion: 'N/A',
    currentVersion: 0
  }
}

/**
 * Estimate VRAM requirements based on model size
 * @param {string} modelId - Model identifier
 * @returns {{required: string, recommended: string}}
 */
export function getVRAMRequirements(modelId) {
  const requirements = {
    'phi-3.5-mini': { required: '2GB', recommended: '4GB' },
    'qwen2.5-3b': { required: '2GB', recommended: '3GB' },
    'llama-3.2-3b': { required: '2GB', recommended: '3GB' },
    'gemma-2-2b': { required: '1.5GB', recommended: '2GB' }
  }

  return requirements[modelId] || { required: '2GB', recommended: '4GB' }
}
