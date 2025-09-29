// Editor configuration
// Change this to switch between different text editor implementations

import AceTextEditor from '../components/editors/AceTextEditor.vue'
import BaseTextEditor from '../components/base/BaseTextEditor.vue'

// Available editors
export const AVAILABLE_EDITORS = {
  ACE: 'ace',
  FALLBACK: 'fallback'
}

// Current editor selection - change this to switch editors
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

// Editor-specific default options
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