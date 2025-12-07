/**
 * Google Analytics 4 Event Constants
 * Centralized event definitions for ToastMan
 *
 * Naming Convention:
 * - Categories use SCREAMING_SNAKE_CASE
 * - Event names use snake_case (GA4 convention)
 */

/**
 * Event Categories
 */
export const ANALYTICS_CATEGORIES = {
  NAVIGATION: 'navigation',
  UI: 'ui'
}

/**
 * Navigation Events
 */
export const NAV_EVENTS = {
  APP_LOAD: 'app_load',
  TAB_SWITCH: 'tab_switch'
}

/**
 * UI Events (modals, dialogs, actions)
 */
export const UI_EVENTS = {
  SETTINGS_OPEN: 'settings_open',
  CORS_MODAL_OPEN: 'cors_modal_open',
  CURL_TUTORIAL_OPEN: 'curl_tutorial_open',
  NEW_REQUEST: 'new_request'
}

/**
 * Tab name to display title mapping
 */
export const TAB_TITLES = {
  collections: 'Collections',
  environments: 'Environments',
  history: 'History'
}
