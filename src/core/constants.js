/**
 * ToastMan Logging Constants
 * Defines log levels and default configuration for the logging system
 */

export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

export const DEFAULT_LOG_LEVEL = 'debug'; // More verbose for development

export const TOASTMAN_COMPONENTS = {
  // Core systems
  STORAGE: 'storage',
  LOGGER: 'logger',

  // Stores
  COLLECTIONS: 'collections',
  ENVIRONMENTS: 'environments',
  TABS: 'tabs',
  SETTINGS: 'settings',

  // UI Components
  SIDEBAR: 'sidebar',
  REQUEST_TABS: 'request-tabs',
  SETTINGS_DIALOG: 'settings-dialog',
  NEW_COLLECTION_DIALOG: 'new-collection-dialog',

  // Data Models
  TYPES: 'types',

  // HTTP/Network
  HTTP_CLIENT: 'http-client',
  HISTORY: 'history'
};

export const LOG_STORAGE_KEY = 'toastman_logging_filters';