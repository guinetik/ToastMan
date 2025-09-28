import { BaseController } from './BaseController.js'

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
    super.init()
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
  }
}