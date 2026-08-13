/**
 * Pure view-mode transitions for ChatView.
 * Kept free of Vue/store so send-after behavior can be unit-tested.
 */

/**
 * Next view state after a successful Send.
 * Composer-first: stay on composer and open the conversation sheet.
 * Split / conversation-only stay as they are.
 * @param {{ viewMode: string, conversationSheetOpen: boolean }} state
 * @returns {{ viewMode: string, conversationSheetOpen: boolean }}
 */
export function nextStateAfterSend(state) {
  if (state.viewMode === 'split') {
    return { viewMode: 'split', conversationSheetOpen: false }
  }
  if (state.viewMode === 'conversation') {
    return { viewMode: 'conversation', conversationSheetOpen: true }
  }
  return { viewMode: 'composer', conversationSheetOpen: true }
}

/**
 * Next mode in the composer-first cycle:
 * composer → conversation → split → composer
 * @param {string} currentMode
 * @returns {'composer'|'conversation'|'split'}
 */
export function nextViewMode(currentMode) {
  if (currentMode === 'composer') return 'conversation'
  if (currentMode === 'conversation') return 'split'
  return 'composer'
}

/**
 * Resolve the view mode to apply when a tab opens.
 * Persisted split is kept on wide/tall screens and deferred to composer
 * when the viewport cannot split comfortably. The stored value is not rewritten.
 * @param {string|null|undefined} storedMode
 * @param {boolean} canSplitComfortably
 * @returns {'composer'|'conversation'|'split'}
 */
export function resolveInitialViewMode(storedMode, canSplitComfortably) {
  if (!storedMode) return 'composer'
  if (storedMode === 'split' && !canSplitComfortably) return 'composer'
  return storedMode
}
