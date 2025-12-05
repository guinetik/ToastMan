/**
 * Editor Configuration
 *
 * Single source of truth for all editor settings including:
 * - Editor component selection (ACE vs fallback)
 * - Theme configuration (ACE themes mapped to app themes)
 * - Default options for each editor type
 *
 * Change themes here to update them app-wide.
 */

import AceTextEditor from '../components/editors/AceTextEditor.vue'
import BaseTextEditor from '../components/base/BaseTextEditor.vue'

// ============================================================================
// EDITOR SELECTION
// ============================================================================

export const AVAILABLE_EDITORS = {
  ACE: 'ace',
  FALLBACK: 'fallback'
}

// Current editor - change this to switch editors app-wide
export const CURRENT_EDITOR = AVAILABLE_EDITORS.ACE

// Editor component mapping
export const EDITOR_COMPONENTS = {
  [AVAILABLE_EDITORS.ACE]: AceTextEditor,
  [AVAILABLE_EDITORS.FALLBACK]: BaseTextEditor
}

// Get the current editor component
export function getCurrentEditor() {
  return EDITOR_COMPONENTS[CURRENT_EDITOR] || BaseTextEditor
}

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

/**
 * ACE Editor theme options
 * Available themes for user selection in settings
 *
 * Reference: https://ace.c9.io/build/kitchen-sink.html
 */
export const ACE_DARK_THEMES = [
  { id: 'terminal', name: 'Terminal', description: 'Classic green-on-black terminal' },
  { id: 'monokai', name: 'Monokai', description: 'Popular dark theme with vibrant colors' },
  { id: 'dracula', name: 'Dracula', description: 'Purple-tinted dark theme' },
  { id: 'tomorrow_night', name: 'Tomorrow Night', description: 'Soft muted colors' },
  { id: 'tomorrow_night_eighties', name: 'Tomorrow Night 80s', description: 'Retro dark theme' },
  { id: 'twilight', name: 'Twilight', description: 'Subdued warm tones' },
  { id: 'cobalt', name: 'Cobalt', description: 'Deep blue background' },
  { id: 'idle_fingers', name: 'Idle Fingers', description: 'Muted earth tones' },
  { id: 'kr_theme', name: 'krTheme', description: 'High contrast dark' },
  { id: 'merbivore', name: 'Merbivore', description: 'Dark with red accents' },
  { id: 'mono_industrial', name: 'Mono Industrial', description: 'Industrial monochrome' },
  { id: 'pastel_on_dark', name: 'Pastel on Dark', description: 'Soft pastel colors' },
  { id: 'clouds_midnight', name: 'Clouds Midnight', description: 'Dark cloud theme' },
  { id: 'ambiance', name: 'Ambiance', description: 'Warm amber tones' },
  { id: 'chaos', name: 'Chaos', description: 'Vibrant chaos theme' },
  { id: 'gob', name: 'Gob', description: 'Golden/amber theme' }
]

export const ACE_LIGHT_THEMES = [
  { id: 'textmate', name: 'TextMate', description: 'Clean and readable' },
  { id: 'chrome', name: 'Chrome', description: 'Crisp browser-style' },
  { id: 'github', name: 'GitHub', description: 'GitHub-inspired' },
  { id: 'xcode', name: 'Xcode', description: 'Apple Xcode style' },
  { id: 'tomorrow', name: 'Tomorrow', description: 'Soft light theme' },
  { id: 'kuroir', name: 'Kuroir', description: 'Warm light theme' },
  { id: 'katzenmilch', name: 'Katzenmilch', description: 'Creamy light theme' },
  { id: 'sqlserver', name: 'SQL Server', description: 'SQL Server Management Studio' },
  { id: 'eclipse', name: 'Eclipse', description: 'Eclipse IDE style' },
  { id: 'dreamweaver', name: 'Dreamweaver', description: 'Adobe Dreamweaver' },
  { id: 'clouds', name: 'Clouds', description: 'Light and airy' },
  { id: 'crimson_editor', name: 'Crimson Editor', description: 'Classic editor style' },
  { id: 'dawn', name: 'Dawn', description: 'Soft morning colors' },
  { id: 'iplastic', name: 'IPlastic', description: 'Modern plastic look' },
  { id: 'solarized_light', name: 'Solarized Light', description: 'Solarized color scheme' }
]

/**
 * Get the ACE theme identifier for a given theme ID
 * @param {string} themeId - Theme ID (e.g., 'terminal', 'monokai')
 * @returns {string} Full ACE theme path
 */
export function getAceThemePath(themeId) {
  return `ace/theme/${themeId}`
}

/**
 * Get the ACE theme based on app theme mode and user selection
 * @param {string} appTheme - 'dark' or 'light'
 * @param {string} darkThemeId - User's selected dark theme ID
 * @param {string} lightThemeId - User's selected light theme ID
 * @returns {string} ACE theme identifier
 */
export function getAceTheme(appTheme = 'dark', darkThemeId = 'terminal', lightThemeId = 'textmate') {
  const themeId = appTheme === 'light' ? lightThemeId : darkThemeId
  return getAceThemePath(themeId)
}

// ============================================================================
// EDITOR DEFAULTS
// ============================================================================

export const EDITOR_DEFAULTS = {
  [AVAILABLE_EDITORS.ACE]: {
    theme: 'dark',
    options: {
      fontSize: 14,
      showPrintMargin: false,
      wrap: true
    }
  },
  [AVAILABLE_EDITORS.FALLBACK]: {
    theme: 'light',
    options: {}
  }
}

// Get default options for current editor
export function getCurrentEditorDefaults() {
  return EDITOR_DEFAULTS[CURRENT_EDITOR] || EDITOR_DEFAULTS[AVAILABLE_EDITORS.FALLBACK]
}