# Text Editor Configuration

ToastMan uses a pluggable text editor architecture that allows you to easily switch between different editor implementations.

## Current Setup

- **Base**: `BaseTextEditor.vue` - Fallback textarea implementation
- **ACE**: `AceTextEditor.vue` - Advanced Code Editor with syntax highlighting
- **Config**: `src/config/editors.js` - Central configuration

## Switching Editors

To change the text editor used throughout the application:

1. Edit `src/config/editors.js`
2. Change the `CURRENT_EDITOR` constant:

```javascript
// Use ACE editor (default)
export const CURRENT_EDITOR = AVAILABLE_EDITORS.ACE

// Use fallback textarea
export const CURRENT_EDITOR = AVAILABLE_EDITORS.FALLBACK
```

## Adding New Editors

1. Create a new editor component in `src/components/editors/`
2. Extend or implement the same interface as `BaseTextEditor.vue`
3. Add it to the configuration:

```javascript
// In src/config/editors.js
export const AVAILABLE_EDITORS = {
  ACE: 'ace',
  FALLBACK: 'fallback',
  YOUR_EDITOR: 'your-editor' // Add this
}

export const EDITOR_COMPONENTS = {
  [AVAILABLE_EDITORS.ACE]: AceTextEditor,
  [AVAILABLE_EDITORS.FALLBACK]: BaseTextEditor,
  [AVAILABLE_EDITORS.YOUR_EDITOR]: YourEditor // Add this
}
```

## Editor Interface

All editors should implement these props and methods:

### Props
- `modelValue: String` - Current content
- `language: String` - Language mode (text, json, xml, html, etc.)
- `theme: String` - Theme (dark, light)
- `readonly: Boolean` - Read-only mode
- `placeholder: String` - Placeholder text
- `height: String` - Editor height
- `options: Object` - Editor-specific options

### Events
- `update:modelValue` - Content changed
- `change` - Content changed (with new value)
- `focus` - Editor focused
- `blur` - Editor blurred

### Exposed Methods
- `focus()` - Focus the editor
- `blur()` - Blur the editor
- `setValue(value)` - Set editor content
- `getValue()` - Get editor content

## Benefits

- **Flexibility**: Easy to switch editors without changing code
- **Fallback**: If ACE fails to load, falls back to textarea
- **Consistency**: Same interface regardless of editor implementation
- **Performance**: Can choose lighter editors for mobile/low-end devices