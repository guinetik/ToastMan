# ToastMan UI Improvements & Fixes

## Current Issues & Required Features

### 1. Collections Tab Issues

#### Missing Interactions
- **No context menu for collections**: Currently collections display but have no interaction options
- **Required actions needed**:
  - Rename Collection
  - Delete Collection
  - Create Request (in collection)
  - Duplicate Collection
  - Import/Export Collection

#### Implementation Plan
- Add right-click context menu to collection headers
- Add dropdown menu button (⋮) to each collection
- Create CollectionContextMenu component

---

### 2. Global Request Creation System

#### Current Problem
- No unified way to create requests across the app
- Need builder pattern for request creation
- Requests should automatically create new tabs

#### Required Features
- **Global request builder**: Accessible from anywhere in the app
- **New tab creation**: Each new request opens in a new tab
- **Request template system**: Pre-configured request types (GET, POST, etc.)
- **Collection assignment**: Ability to assign request to a collection during creation

#### Implementation Plan
- Create `CreateRequestDialog` component
- Create `RequestBuilder` service/composable
- Integrate with tabs system for automatic tab creation
- Add global + button or keyboard shortcut

---

### 3. Request Tabs Issues

#### Current Problems
- **New Tab shows "loading"**: Should show proper new tab interface
- **+ button not working**: Cannot create new tabs
- **No empty tab state**: Missing proper empty/new tab template

#### Required Features
- Proper new tab interface with request builder
- Working + button functionality
- Default request template in new tabs
- Tab management (close, rename, duplicate)

#### Implementation Plan
- Fix NewTab component to show request builder instead of loading
- Connect + button to tab creation logic
- Create proper empty tab state with request form

---

### 4. Environments Tab Issues

#### Current Problems
- **+ button not working**: Cannot create new environments
- **No add environment dialog**: Missing environment creation UI
- **No active environment indicator**: Cannot see which environment is active
- **No way to activate environment**: Missing activation mechanism

#### Required Features
- Create Environment dialog
- Environment activation/deactivation
- Active environment indicator in UI
- Environment management (edit, delete, duplicate)
- Variable management within environments

#### Implementation Plan
- Create `NewEnvironmentDialog` component
- Add environment activation logic
- Create environment context menu
- Add active environment indicator to UI header

---

## Implementation Priority

### Phase 1: Critical Functionality
1. **Fix New Tab loading issue** (blocking user workflow)
2. **Fix + buttons** (basic creation functionality)
3. **Add Environment creation dialog**
4. **Add environment activation**

### Phase 2: Enhanced Interactions
1. **Collections context menu** (rename, delete, create request)
2. **Global request creation system**
3. **Request builder pattern**

### Phase 3: Polish & Advanced Features
1. **Keyboard shortcuts**
2. **Import/Export functionality**
3. **Advanced request templates**
4. **Bulk operations**

---

## Technical Architecture

### New Components Needed
- `CollectionContextMenu.vue`
- `NewEnvironmentDialog.vue`
- `CreateRequestDialog.vue`
- `RequestBuilder.vue` (or composable)
- `EnvironmentActivator.vue`

### Services/Composables Needed
- `useRequestBuilder.js` - Global request creation
- `useEnvironmentManager.js` - Environment activation/management
- `useTabManager.js` - Enhanced tab management

### Controller Updates Needed
- `RequestTabsController.js` - Fix new tab handling
- `EnvironmentsController.js` - Add creation and activation logic
- `CollectionsController.js` - Add context menu actions

---

## UI/UX Improvements

### Visual Indicators
- Active environment highlight in sidebar
- Collection item counts
- Request method color coding (already exists, verify working)
- Loading states for async operations

### User Experience
- Right-click context menus
- Keyboard shortcuts (Ctrl+N for new request, etc.)
- Drag and drop for organizing
- Consistent button styling and behavior

---

## Testing Checklist

### Collections
- [ ] Right-click shows context menu
- [ ] Rename collection works
- [ ] Delete collection works
- [ ] Create request in collection works
- [ ] Collection expansion/collapse works

### Environments
- [ ] + button creates new environment
- [ ] Environment activation works
- [ ] Active environment is visually indicated
- [ ] Environment variables are editable
- [ ] Environment deletion works

### Request Tabs
- [ ] + button creates new tab
- [ ] New tab shows request builder (not loading)
- [ ] Request creation from tab works
- [ ] Tab closing works
- [ ] Tab switching works

### Global Functionality
- [ ] Create request from any location works
- [ ] Requests are properly assigned to collections
- [ ] All + buttons work consistently
- [ ] Loading states are appropriate