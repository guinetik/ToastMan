/**
 * Global settings utility for opening the settings dialog
 * Uses custom events to communicate with App.vue
 */

/**
 * Opens the settings dialog on a specific tab
 * @param {string} tab - The tab to open ('general', 'request', 'ui', 'proxy', 'certificates', 'ai')
 */
export function openSettings(tab = 'general') {
  const event = new CustomEvent('toastman:open-settings', {
    detail: { tab }
  })
  window.dispatchEvent(event)
}

/**
 * Closes the settings dialog
 */
export function closeSettings() {
  const event = new CustomEvent('toastman:close-settings')
  window.dispatchEvent(event)
}
