/**
 * Constants for ToastMan application
 */

// Log levels with numeric values for comparison
export const LOG_LEVELS = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

// Default log level
export const DEFAULT_LOG_LEVEL = 'info';

// Application constants
export const APP_NAME = 'ToastMan';
export const APP_VERSION = '1.0.0';

// HTTP related constants
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const MAX_REDIRECTS = 5;

// Storage keys
export const STORAGE_KEYS = {
  COLLECTIONS: 'toastman_collections',
  ENVIRONMENTS: 'toastman_environments',
  SETTINGS: 'toastman_settings',
  HISTORY: 'toastman_history',
  LOGGING_FILTERS: 'toastman_logging_filters'
};