import { BaseController } from './BaseController.js'
import { useAnalytics } from '../composables/useAnalytics.js'
import { NAV_EVENTS } from '../lib/analytics/AnalyticsEvents.js'

/**
 * Controller for Sidebar component - handles only tab switching
 */
export class SidebarController extends BaseController {
  constructor() {
    super('sidebar')

    this.createState({
      activeTab: 'collections'
    })
  }

  init() {
    this.logger.debug(`${this.name} controller initialized`)
  }

  /**
   * Switch active tab
   */
  switchTab(tabName) {
    if (!['collections', 'environments', 'history'].includes(tabName)) {
      this.logger.warn(`Invalid tab name: ${tabName}`)
      return
    }

    this.state.activeTab = tabName
    this.logger.debug(`Switched to tab: ${tabName}`)

    // Track tab switch
    const { trackNavigation } = useAnalytics()
    trackNavigation(NAV_EVENTS.TAB_SWITCH, { tab_name: tabName })
  }
}