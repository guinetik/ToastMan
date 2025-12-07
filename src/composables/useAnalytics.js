/**
 * Analytics Composable for Vue
 * Provides Google Analytics 4 tracking functionality
 *
 * @example
 * import { useAnalytics } from '@/composables/useAnalytics';
 * const { trackEvent } = useAnalytics();
 * trackEvent('button_click', { button_name: 'submit' });
 */

import { createLogger } from '../core/logger.js'
import { ANALYTICS_CATEGORIES } from '../lib/analytics/AnalyticsEvents.js'

const logger = createLogger({ prefix: 'Analytics' })

// Analytics state
let isInitialized = false
let isEnabled = false
let measurementId = null

/**
 * Check if analytics should be enabled
 * @returns {boolean}
 */
const shouldEnableAnalytics = () => {
  // In production: always enable if measurement ID exists
  if (!import.meta.env.DEV) {
    return !!import.meta.env.VITE_GA_MEASUREMENT_ID
  }
  // In development: only enable if debug mode is explicitly set
  return import.meta.env.VITE_GA_DEBUG === 'true'
}

/**
 * Initialize Google Analytics 4
 * Should be called once at app startup (in main.js)
 */
export const initializeAnalytics = () => {
  if (isInitialized) {
    logger.warn('Analytics already initialized')
    return
  }

  measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
  const isDev = import.meta.env.DEV

  logger.info('Analytics init:', {
    measurementId: measurementId ? `${measurementId.substring(0, 5)}...` : 'NOT SET',
    isDev,
    debugFlag: import.meta.env.VITE_GA_DEBUG
  })

  if (!measurementId) {
    logger.warn('GA Measurement ID not configured - add VITE_GA_MEASUREMENT_ID to .env and rebuild')
    isInitialized = true
    isEnabled = false
    return
  }

  isEnabled = shouldEnableAnalytics()

  if (!isEnabled) {
    logger.info('Analytics disabled in development mode (set VITE_GA_DEBUG=true to enable)')
    isInitialized = true
    return
  }

  // Initialize gtag immediately (must be before script loads)
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    // Enable automatic page_view for initial load
    send_page_view: true,
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title
  })

  // Dynamically load gtag.js
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  isInitialized = true
  console.log('[GA] Initialized with ID:', measurementId, '| isEnabled:', isEnabled)
}

/**
 * Track a custom event
 * @param {string} eventName - The event name (snake_case)
 * @param {Object} [params={}] - Event parameters
 */
const trackEvent = (eventName, params = {}) => {
  if (!isInitialized) {
    logger.warn('Analytics not initialized, call initializeAnalytics() first')
    return
  }

  // Always log events for debugging (enable Analytics logging to see)
  logger.info('Event:', eventName, params)

  if (!isEnabled) {
    logger.debug('Analytics disabled, event not sent')
    return
  }

  try {
    // Direct console.log to always show (bypass logger filter)
    console.log('[GA Event]', eventName, params)
    window.gtag('event', eventName, params)
  } catch (error) {
    console.error('[GA Error]', eventName, error.message)
  }
}

/**
 * Track a page view
 * @param {string} pagePath - The page path (e.g., '/explorer')
 * @param {string} pageTitle - The page title
 */
const trackPageView = (pagePath, pageTitle) => {
  if (!isInitialized) {
    logger.warn('Analytics not initialized')
    return
  }

  if (import.meta.env.DEV) {
    logger.debug('Page view:', { pagePath, pageTitle })
  }

  if (!isEnabled) {
    return
  }

  try {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      page_location: window.location.href
    })
  } catch (error) {
    logger.error('Failed to track page view', { pagePath, error: error.message })
  }
}

/**
 * Composable for using analytics in Vue components
 * @returns {Object} Analytics methods
 */
export function useAnalytics() {
  return {
    trackEvent,
    trackPageView,
    isEnabled: () => isEnabled,

    // Navigation helper
    trackNavigation: (action, details = {}) => {
      trackEvent(action, {
        event_category: ANALYTICS_CATEGORIES.NAVIGATION,
        ...details
      })
    },

    // UI interaction helper (modals, dialogs, buttons)
    trackUI: (action, details = {}) => {
      trackEvent(action, {
        event_category: ANALYTICS_CATEGORIES.UI,
        ...details
      })
    }
  }
}
