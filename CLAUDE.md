# ToastMan - AI Assistant Guide

## Project Overview
ToastMan is a Postman-like API testing tool built with Vue 3, featuring:
- HTTP request composer (cURL, visual, and script modes)
- Conversation-based UI for request/response history
- Collection management (Postman v2.1 compatible)
- Environment variables and scripting support
- AI-powered cURL generation using WebLLM
- Mobile-responsive design

## Development Rules

### ⚠️ CRITICAL: Do NOT Auto-Run Dev Server
- **NEVER run `npm run dev` unless explicitly requested by the user**
- The dev server is often already running in the background
- Running it unnecessarily creates multiple conflicting instances
- If you need to verify code changes, ask the user to refresh their browser

### Background Processes
- Multiple background bash processes may be running (`npm run dev`)
- Check `BashOutput` if needed, but don't start new dev servers
- User will manually start/stop the dev server as needed

## Architecture & Key Patterns

### 🏗️ Separation of Concerns (MVC Pattern)
**CRITICAL**: ToastMan follows a strict separation between presentation and business logic:

- **Vue Components** (View): Handle only presentation, user interaction, and UI state
- **Controllers**: Contain all business logic, data manipulation, and complex operations
- **Models**: Define data structures and their factories

**Pattern to Follow:**
```javascript
// ❌ WRONG: Business logic in Vue component
<script setup>
const deleteCollection = (id) => {
  const index = collections.value.findIndex(c => c.id === id)
  collections.value.splice(index, 1)
  localStorage.setItem('collections', JSON.stringify(collections.value))
  showToast('Deleted')
}
</script>

// ✅ CORRECT: Delegate to controller
<script setup>
import CollectionsController from '../controllers/CollectionsController.js'

const controller = new CollectionsController()
const deleteCollection = (id) => {
  controller.deleteCollection(id)
}
</script>
```

**Examples in Codebase:**
- `CollectionsTab.vue` → `CollectionsController.js`
- `RequestTabs.vue` → Business logic in stores and HTTP clients
- Context menus extend `BaseContextMenuController.js`

### Component Structure
```
src/
├── components/
│   ├── base/           # Base/abstract components for reuse
│   ├── chat/           # Main request/response UI
│   │   ├── ChatView.vue       # Split pane container (conversation + composer)
│   │   ├── ChatTabs.vue       # Tab management
│   │   ├── ChatComposer.vue   # Request editor
│   │   └── ConversationThread.vue  # Message history
│   ├── editors/        # Specialized editor components (ACE, Monaco, etc.)
│   ├── dialogs/        # Modal dialogs
│   ├── tabs/           # Tab-specific components
│   └── Sidebar.vue     # Collections/history sidebar
├── controllers/        # Business logic controllers (extend BaseController.js)
├── stores/             # Pinia stores (reactive state management)
│   ├── useCollections.js
│   ├── useEnvironments.js
│   ├── useConversations.js
│   └── useTabs.js
├── models/             # Data structures and factories
│   ├── types.js        # Factory functions
│   ├── Collection.js   # Collection model
│   └── Request.js      # Request model
├── core/               # Core utilities
│   ├── logger.js       # Logging system
│   └── http.js         # HTTP client
└── config/             # Configuration files
```

### Controller Pattern
When creating new features that involve business logic:

1. **Extend BaseController**: All controllers should extend `BaseController.js`
2. **Use Reactive State**: Use `createState()` for reactive data management
3. **Emit Events**: Controllers emit events for component communication
4. **Keep Components Lightweight**: Vue components should be thin wrappers

```javascript
// Controller template
import BaseController from './BaseController.js'
import { createLogger } from '../core/logger.js'

const logger = createLogger('MyController')

export default class MyController extends BaseController {
  constructor() {
    super()
    this.state = this.createState({
      items: [],
      loading: false
    })
  }

  async loadItems() {
    logger.info('Loading items')
    this.state.loading = true
    try {
      const items = await fetchItems()
      this.state.items = items
      this.emit('items-loaded', items)
    } catch (error) {
      logger.error('Failed to load items', error)
      this.emit('error', error)
    } finally {
      this.state.loading = false
    }
  }
}
```

### State Management Pattern
- **Controllers** for feature-specific business logic and state
- **Pinia stores** for global state (collections, tabs, environments)
- **localStorage persistence** via `useStorage` composable (auto-saves with debouncing)
- **Reactive refs** for component-local UI state
- **Computed properties** for derived state

**Store Pattern Best Practices:**
```javascript
// Consistent CRUD operations
export function useMyStore() {
  const items = ref([])

  // Computed getters
  const getById = computed(() => (id) =>
    items.value.find(item => item.id === id)
  )

  // CRUD with error handling
  const createItem = (data) => {
    try {
      const item = createItemModel(data)
      items.value.push(item)
      return item
    } catch (error) {
      logger.error('Failed to create item', error)
      throw error
    }
  }

  return { items, getById, createItem }
}
```

### Data Models (models/types.js)
All data models use factory functions:
- `createTab()` - UI tab structure
- `createCollection()` - Postman v2.1 collection
- `createRequest()` - HTTP request
- `createEnvironment()` - Environment variables
- `createKeyValue()` - Generic key-value pairs

**Important**: These models are Postman-compatible for import/export

**Model Consistency**: When updating models, ensure backward compatibility:
- Support both old and new field names during transitions
- Use data migration patterns for breaking changes
- Validate data structures with schemas

## Critical Findings & Lessons Learned

### 1. Double Mounting Bug (RESOLVED)
**Problem**: ChatView component was mounting twice, causing:
- ViewMode toggle to fail
- State updates affecting wrong instance
- Performance issues

**Root Cause**: Both desktop and mobile layouts rendered `<ChatTabs>` simultaneously:
```vue
<!-- WRONG: Both exist in DOM, one hidden via CSS -->
<Splitpanes class="desktop-layout">
  <ChatTabs ref="chatTabsRef" />
</Splitpanes>
<div class="mobile-layout">
  <ChatTabs ref="chatTabsRef" />  <!-- Same ref name! -->
</div>
```

**Solution**: Conditional rendering with `v-if`:
```vue
<!-- CORRECT: Only one exists at a time -->
<Splitpanes v-if="!isOnMobile" class="desktop-layout">
  <ChatTabs ref="chatTabsRef" />
</Splitpanes>
<div v-if="isOnMobile" class="mobile-layout">
  <ChatTabs ref="mobileTabsRef" />  <!-- Different ref -->
</div>
```

**Key Lesson**: CSS `display: none` doesn't prevent Vue components from mounting. Use `v-if` for conditional rendering when components shouldn't exist simultaneously.

### 2. Per-Tab View State Implementation
**Requirement**: Each tab should remember its view mode (split/conversation/composer)

**Implementation**:
1. Added `viewMode` property to tab model (`models/types.js`)
2. Initialize ChatView's viewMode from active tab on mount
3. Watch activeTab changes to load new tab's viewMode
4. Watch viewMode changes to persist back to tab via `tabsStore.updateTab()`

**Pattern**:
```javascript
// Initialize from tab
const activeTab = computed(() => tabsStore.activeTab.value)
const initialViewMode = activeTab.value?.viewMode || 'split'
const viewMode = ref(initialViewMode)

// Load on tab switch
watch(activeTab, (newTab) => {
  if (newTab?.viewMode) {
    viewMode.value = newTab.viewMode
  }
})

// Save on change
watch(viewMode, (newMode) => {
  const currentTab = tabsStore.activeTab.value
  if (currentTab) {
    tabsStore.updateTab(currentTab.id, { viewMode: newMode })
  }
})
```

### 3. Component Lifecycle with :key
When using `:key` on components (e.g., `<ChatView :key="activeTab.id">`):
- Component is **completely destroyed and recreated** when key changes
- Watchers won't fire on key change (component didn't exist during change)
- **Initialization is critical** - must read state during setup
- Advantage: Perfect state isolation between tabs

### 4. Ref Access Patterns
Nested component refs require careful unwrapping:
```javascript
// Accessing nested exposed properties
const chatTabs = chatTabsRef.value  // Get ChatTabs instance
const chatView = chatTabs?.chatViewRef  // Get nested ChatView ref (already unwrapped by Vue)
chatView?.toggleViewMode()  // Call exposed method
```

## Coding Standards

### 📝 Documentation Requirements
**REQUIRED**: All code must have comprehensive JSDoc comments and inline comments

**JSDoc Required For:**
- All public methods and functions
- Class constructors
- Complex algorithms
- API interfaces
- Component props and emits

```javascript
/**
 * Processes a request and updates the conversation history
 * @param {Object} request - The HTTP request object
 * @param {string} request.method - HTTP method (GET, POST, etc.)
 * @param {string} request.url - Target URL
 * @returns {Promise<Object>} Response object with status and data
 * @throws {Error} If request validation fails
 */
async function processRequest(request) {
  // Validate URL format before sending
  if (!isValidUrl(request.url)) {
    throw new Error('Invalid URL format')
  }
  // ... implementation
}
```

### 🪵 Logging Standards
**CRITICAL**: NEVER use `console.log()` - Always use the logger system

```javascript
import { createLogger } from '../core/logger.js'

// Create component-specific logger
const logger = createLogger('ComponentName')

// Use appropriate log levels
logger.debug('Detailed debugging information')  // Development only
logger.info('General information')              // Normal operations
logger.warn('Warning messages')                 // Potential issues
logger.error('Error messages', errorObject)     // Actual errors
```

**Enable logging in browser console:**
```javascript
window.toastmanLog.enableAll()        // Enable all loggers
window.toastmanLog.enable('tabs')     // Enable specific logger
window.toastmanLog.disable('http')    // Disable specific logger
window.toastmanLog.status()           // View logger status
```

### 🔗 Event Handling & Component Communication

**Proper Event Parameter Forwarding:**
When dealing with nested components, preserve parameter structure:

```vuejs
<!-- ❌ WRONG: Loses parameter structure -->
<ChildComponent @open-request="$emit('open-request', $event)" />

<!-- ✅ CORRECT: Preserves all parameters -->
<ChildComponent
  @open-request="(collectionId, requestId) => $emit('open-request', collectionId, requestId)"/>
```

```vuejs
<!-- ✅ ALSO CORRECT: Direct method call -->
<ChildComponent @open-request="handleOpenRequest" />
```

**Context Menu Pattern:**
All context menus must follow this pattern:

1. Extend `BaseContextMenuController.js`
2. Implement `handleAction(action, data)` method
3. Use computed menu items
4. Handle show/hide states properly

```javascript
import BaseContextMenuController from './BaseContextMenuController.js'

export default class MyContextMenuController extends BaseContextMenuController {
  constructor() {
    super()
    this.menuItems = computed(() => [
      { id: 'edit', label: 'Edit', icon: 'edit' },
      { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
    ])
  }

  handleAction(action, data) {
    switch (action) {
      case 'edit':
        this.editItem(data)
        break
      case 'delete':
        this.deleteItem(data)
        break
    }
  }
}
```

## Common Patterns in Codebase

### 1. Storage Pattern
```javascript
import { useCollectionsStorage } from '../composables/useStorage.js'

const { data: collections } = useCollectionsStorage()
// Auto-saves to localStorage with debouncing
// Reactive - changes trigger saves automatically
```

### 2. Factory Functions for Data
```javascript
import { createTab } from '../models/types.js'

const newTab = createTab({
  name: 'My Request',
  method: 'GET',
  viewMode: 'split'  // Custom properties supported
})
```

### 3. Component Communication
- **Props down**: Parent → Child data flow
- **Events up**: Child → Parent via `emit()`
- **Stores**: Shared state across unrelated components
- **defineExpose**: Expose methods/state to parent refs

### 4. Mobile/Desktop Responsiveness
```javascript
const { isMobile } = useMobileView()

// Conditional logic
const component = isMobile() ? mobileRef.value : desktopRef.value

// Conditional rendering in template
<Splitpanes v-if="!isOnMobile" />
<div v-if="isOnMobile" class="mobile-layout" />
```

### 5. Flexible Height Layouts (CSS Pattern)
For fluid layouts that need to fill available space:

```css
/* Parent container establishes flex context */
.parent-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px; /* Ensure minimum usable space */
}

/* Content fills remaining space */
.child-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* CRITICAL: Allows flex shrinking */
  overflow: auto; /* Handle overflow */
}

/* Fixed-height sections */
.header {
  flex-shrink: 0; /* Don't shrink */
  height: 60px;
}
```

**Why `min-height: 0` is critical:**
- By default, flex items won't shrink below their content size
- `min-height: 0` allows them to shrink and enables proper scrolling
- Without it, content can overflow the parent container

### 6. Component Abstraction Pattern
Create base components for pluggable functionality:

```javascript
// Base component defines interface
// BaseTextEditor.vue
export default {
  props: {
    modelValue: String,
    language: String
  },
  emits: ['update:modelValue']
}

// Concrete implementations
// AceTextEditor.vue - extends BaseTextEditor
// MonacoEditor.vue - extends BaseTextEditor

// Usage with fallback
<component
  :is="editorComponent"
  v-model="code"
  @error="handleEditorError"
/>

const editorComponent = computed(() => {
  return aceAvailable.value ? AceTextEditor : SimpleTextarea
})
```

## Error Handling & Performance

### 🛡️ Graceful Degradation
Always implement fallback mechanisms:

```javascript
// Example: Editor with fallback
let aceEditor = null
const useSimpleFallback = ref(false)

onMounted(async () => {
  try {
    aceEditor = await loadAceEditor()
  } catch (error) {
    logger.warn('ACE editor failed to load, using fallback', error)
    useSimpleFallback.value = true
  }
})

// In template
<AceEditor v-if="!useSimpleFallback" />
<textarea v-else />
```

**Fallback Checklist:**
- [ ] Text editor fallback if ACE/Monaco fails
- [ ] Network error handling with user-friendly messages
- [ ] Validation errors with specific guidance
- [ ] Default values for missing data
- [ ] Error boundaries in critical components

### 📢 User Feedback Patterns
Provide clear feedback for all user actions:

```javascript
// Loading states
const isLoading = ref(false)

async function saveCollection() {
  isLoading.value = true
  try {
    await api.save(collection)
    showToast('Collection saved successfully', 'success')
  } catch (error) {
    logger.error('Failed to save collection', error)
    showToast(`Failed to save: ${error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}
```

**Required Feedback:**
- ⏳ Loading states for async operations
- ✅ Success notifications for CRUD operations
- ❌ Error alerts with actionable messages
- 📊 Progress indication for long-running tasks
- ⚠️ Validation errors with field-specific guidance

### ⚡ Performance Best Practices

**Reactive Data:**
```javascript
// ✅ Use computed for derived data
const filteredItems = computed(() =>
  items.value.filter(item => item.active)
)

// ✅ Use watchers with proper cleanup
const stopWatch = watch(
  () => route.params.id,
  (newId) => loadData(newId),
  { deep: true }
)

onUnmounted(() => {
  stopWatch() // Clean up watchers
})

// ❌ Avoid reactive operations in loops
// Bad: items.value.forEach(item => item.processed = true)
// Good: items.value = items.value.map(item => ({ ...item, processed: true }))
```

**Bundle Size:**
- Use dynamic imports for large dependencies
- Implement code splitting for feature modules
- Monitor bundle size impact of new dependencies
- Load optional enhancements from CDN when appropriate

```javascript
// Dynamic import for large dependency
const loadChartLibrary = async () => {
  const { Chart } = await import('chart.js')
  return Chart
}
```

## File Locations

### Key Configuration
- `vite.config.js` - Build configuration
- `package.json` - Dependencies and scripts
- `index.html` - Entry point

### Important Utilities
- `src/composables/useStorage.js` - localStorage persistence
- `src/composables/useMobileView.js` - Mobile detection
- `src/core/logger.js` - Debug logging system
- `src/utils/curlGenerator.js` - cURL command generation

### Styling
- CSS variables defined in `src/assets/variables.css`
- Dark theme (primary design)
- Component-scoped styles using `<style scoped>`

## Debugging Tips

### Enable Debug Logging
```javascript
// In browser console:
window.toastmanLog.enableAll()
window.toastmanLog.enable('tabs')
window.toastmanLog.status()
```

### Check localStorage Data
```javascript
// View tabs
JSON.parse(localStorage.getItem('toastman_tabs'))

// View collections
JSON.parse(localStorage.getItem('toastman_collections'))
```

### Common Issues
1. **ViewMode not persisting**: Check tab has `viewMode` property in localStorage
2. **Double mounting**: Verify only one component instance with `v-if`
3. **Ref not working**: Ensure component is mounted and ref is properly exposed via `defineExpose`

## Best Practices

### When Adding Features
1. ✅ **Follow MVC**: Create/use controller for business logic - keep Vue components lightweight
2. ✅ **Check data models**: Update `models/types.js` if needed, ensure backward compatibility
3. ✅ **Mobile + Desktop**: Consider both layouts, use `v-if` not CSS hiding
4. ✅ **Document thoroughly**: Add JSDoc comments for all public methods
5. ✅ **Use logger**: Never use `console.log()`, always use `createLogger()`
6. ✅ **Error handling**: Implement try/catch with user feedback and fallbacks
7. ✅ **Event forwarding**: Preserve parameter structure in nested components
8. ✅ **Use patterns**: Follow existing patterns (stores, composables, factories, controllers)
9. ✅ **Test fresh state**: Test with localStorage cleared
10. ✅ **Postman compat**: Verify compatibility if touching collections

### When Debugging
1. ✅ **Read first**: Always read files before editing
2. ✅ **Check storage**: Examine localStorage for persisted data
3. ✅ **Enable logging**: Use `window.toastmanLog.enableAll()` in console
4. ✅ **Inspect reactivity**: Use browser console for reactive state
5. ✅ **Look for patterns**: Find similar existing implementations
6. ✅ **Verify assumptions**: Check with logs, don't assume
7. ❌ **No console.log**: Use logger instead
8. ❌ **No dev server**: Don't start unless explicitly requested

## Git Workflow

### Commit Standards
- **Main branch**: `master`
- **Format**: `feat: description`, `fix: description`, `refactor: description`, `docs: description`
- **Include**: `🤖 Generated with Claude Code` in commit messages
- **Co-Authored-By**: `Claude <noreply@anthropic.com>` when appropriate
- **Atomic commits**: Keep commits focused on single changes
- **Test before commit**: Ensure all CRUD operations work and no console errors
- **Check status**: Always run `git status` before committing

### Branch Strategy
- Use feature branches for major changes
- Test integration before merging to main
- Keep branches up to date with main
- Clean up merged branches
- Document any breaking changes in commit messages

## Testing Checklist

### Before Committing Changes
**Manual testing required:**
1. [ ] All CRUD operations work correctly
2. [ ] Responsive layout on different screen sizes (mobile + desktop)
3. [ ] No errors or warnings in browser console
4. [ ] Keyboard navigation and accessibility tested
5. [ ] Data persistence across page reloads verified
6. [ ] localStorage updates correctly
7. [ ] No duplicate component mounting (check with Vue DevTools)

### View-Related Features
When implementing UI/view features:
- [ ] Works on desktop (>768px)
- [ ] Works on mobile (<768px)
- [ ] State persists across page refresh
- [ ] State persists across tab switches
- [ ] Proper `v-if` usage (not CSS hiding for conditional rendering)
- [ ] Loading states implemented
- [ ] Error states with user feedback

### Controller/Business Logic
When implementing controllers or business logic:
- [ ] Controller extends `BaseController.js`
- [ ] All methods have JSDoc documentation
- [ ] Error handling with try/catch
- [ ] Logger used instead of console.log
- [ ] Events emitted for state changes
- [ ] Unit tests considered for complex logic

---

## Additional Resources
- **Development Guidelines**: See `docs/guidelines.md` for detailed architectural patterns
- **Project Docs**: Check `docs/` folder for feature-specific documentation

Last Updated: 2025-12-08
