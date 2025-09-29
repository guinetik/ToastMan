# ToastMan Development Guidelines

## Architecture Principles

### Separation of Concerns
We should provide clear separation of concerns between the Vue.js stuff and our business stuff.
This translates to each vue component needs to have its controller and the vue component should delegate logic to their appropriate controller.

**Examples from codebase:**
- `CollectionsTab.vue` → `CollectionsController.js`
- `RequestTabs.vue` → Business logic delegated to stores and HTTP clients
- Controllers handle business logic, Vue components handle presentation

### Controller Pattern
Each major feature should follow the MVC pattern:
- **Model**: Data structures in `src/models/` (Collection.js, Request.js)
- **View**: Vue components that focus purely on presentation
- **Controller**: Business logic that connects models and views

**Best Practices:**
- Controllers should extend `BaseController.js` for consistency
- Use reactive state management with `createState()`
- Emit events for component communication
- Keep Vue components lightweight - delegate complex logic to controllers

## Logging Standards
We should not use console.log. The project has a logger class and we should use it throughout.

**Usage:**
```javascript
import { createLogger } from '../core/logger.js'
const logger = createLogger('ComponentName')

logger.debug('Debug information')
logger.info('General information')
logger.warn('Warning messages')
logger.error('Error messages')
```

## Documentation Standards
Code needs to have comprehensive JSDoc comments and line comments.

**Required JSDoc for:**
- All public methods and functions
- Class constructors
- Complex algorithms
- API interfaces

## Event Handling & Component Communication

### Proper Event Parameter Forwarding
When dealing with nested components, ensure proper parameter forwarding:

```javascript
// ❌ Wrong - loses parameter structure
@open-request="$emit('open-request', $event)"

// ✅ Correct - preserves parameters
@open-request="(collectionId, requestId) => $emit('open-request', collectionId, requestId)"
```

### Context Menu Pattern
All context menus should follow the established pattern:
1. Extend `BaseContextMenuController.js`
2. Implement `handleAction()` method
3. Use computed menu items
4. Handle show/hide states properly

## Data Management

### Store Pattern
Use the established store pattern for data management:
- Reactive refs with computed getters
- CRUD operations with consistent naming
- Error handling with try/catch
- Event emission for state changes

### Model Consistency
When updating models, ensure backward compatibility:
- Support both old and new field names during transitions
- Use data migration patterns for breaking changes
- Validate data structures with schemas

## UI/UX Patterns

### Flexible Height Layouts
For fluid layouts that need to fill available space:
```css
.parent-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px; /* Ensure minimum usable space */
}

.child-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex shrinking */
}
```

### Component Abstraction
Create base components for reusable functionality:
- `BaseTextEditor.vue` → `AceTextEditor.vue`
- Configuration-driven component selection
- Graceful fallback mechanisms
- Pluggable architecture for easy swapping

## Folder Structure Standards

### Organized by Type and Function
```
src/
├── components/
│   ├── base/           # Base/abstract components
│   ├── editors/        # Specialized editor components
│   └── tabs/           # Tab-specific components
├── controllers/        # Business logic controllers
├── stores/            # Data management
├── models/            # Data structures
├── core/              # Core utilities (logger, http)
└── config/            # Configuration files
```

## Error Handling

### Graceful Degradation
Always implement fallback mechanisms:
- Text editor fallback if ACE fails to load
- Error boundaries in Vue components
- Network error handling with user feedback
- Validation with clear error messages

### User Feedback
Provide clear feedback for all user actions:
- Loading states for async operations
- Success/error alerts for CRUD operations
- Progress indication for long-running tasks
- Validation errors with specific guidance

## Testing Strategy

### Manual Testing Checkpoints
Before committing changes:
1. Test all CRUD operations work correctly
2. Verify responsive layout on different screen sizes
3. Check console for errors/warnings
4. Test keyboard navigation and accessibility
5. Verify data persistence across page reloads

## Performance Considerations

### Reactive Data
- Use computed properties for derived data
- Implement proper watchers with `deep: true` when needed
- Avoid excessive reactive operations in tight loops
- Clean up watchers and event listeners on component unmount

### Bundle Size
- Use dynamic imports for large dependencies
- Implement code splitting for feature modules
- Monitor bundle size impact of new dependencies
- Use CDN for optional enhancements when appropriate

## Git Workflow

### Commit Standards
- Keep commits focused and atomic
- Use descriptive commit messages
- Test thoroughly before committing
- Document any breaking changes

### Branch Strategy
- Feature branches for major changes
- Test integration before merging to main
- Keep branches up to date with main
- Clean up merged branches

---

*These guidelines evolve with the project. Update them when establishing new patterns or learning better approaches.*