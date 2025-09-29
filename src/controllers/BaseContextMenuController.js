import { BaseController } from './BaseController.js'

/**
 * Base Context Menu Controller
 * Provides common functionality for all context menus
 */
export class BaseContextMenuController extends BaseController {
  constructor(name) {
    super(name)

    this.createState({
      show: false,
      item: null,
      x: 0,
      y: 0,
      menuRef: null
    })
  }

  init() {
    super.init()

    // Bind event handlers to maintain context
    this.handleClickOutside = this.handleClickOutside.bind(this)
    this.handleEscape = this.handleEscape.bind(this)
  }

  /**
   * Show the context menu at specified coordinates
   */
  show(event, item) {
    this.logger.debug('Showing context menu for:', item)

    event.preventDefault()
    event.stopPropagation()

    this.state.show = true
    this.state.item = item
    this.state.x = event.clientX
    this.state.y = event.clientY

    // Add event listeners
    document.addEventListener('click', this.handleClickOutside)
    document.addEventListener('keydown', this.handleEscape)

    // Position adjustment will be handled in the component
    this.emit('shown', { item, x: event.clientX, y: event.clientY })
  }

  /**
   * Hide the context menu
   */
  hide() {
    this.logger.debug('Hiding context menu')

    this.state.show = false
    this.state.item = null

    // Remove event listeners
    document.removeEventListener('click', this.handleClickOutside)
    document.removeEventListener('keydown', this.handleEscape)

    this.emit('hidden')
  }

  /**
   * Handle click outside menu
   */
  handleClickOutside(event) {
    if (this.state.menuRef && !this.state.menuRef.contains(event.target)) {
      this.hide()
    }
  }

  /**
   * Handle escape key
   */
  handleEscape(event) {
    if (event.key === 'Escape') {
      this.hide()
    }
  }

  /**
   * Set menu DOM reference for click outside detection
   */
  setMenuRef(ref) {
    this.state.menuRef = ref
  }

  /**
   * Execute a menu action
   * Subclasses should override this method
   */
  async executeAction(action, item) {
    this.logger.debug(`Executing action: ${action} for:`, item)

    try {
      const result = await this.handleAction(action, item)
      this.hide()
      this.emit('actionCompleted', { action, item, result })
      return result
    } catch (error) {
      this.logger.error(`Failed to execute action ${action}:`, error)
      this.emit('actionFailed', { action, item, error })
      throw error
    }
  }

  /**
   * Handle specific actions - to be overridden by subclasses
   */
  async handleAction(action, item) {
    throw new Error(`Action '${action}' not implemented in ${this.constructor.name}`)
  }

  /**
   * Get menu items configuration - to be overridden by subclasses
   */
  getMenuItems() {
    return []
  }

  /**
   * Get menu title - to be overridden by subclasses
   */
  getMenuTitle(item) {
    return item?.name || 'Item'
  }

  /**
   * Position the menu to avoid going off-screen
   */
  positionMenu(menuElement) {
    if (!menuElement) return

    const rect = menuElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = this.state.x
    let adjustedY = this.state.y

    // Adjust horizontal position if menu would go off-screen
    if (this.state.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10
    }

    // Adjust vertical position if menu would go off-screen
    if (this.state.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10
    }

    // Ensure menu doesn't go negative
    adjustedX = Math.max(10, adjustedX)
    adjustedY = Math.max(10, adjustedY)

    menuElement.style.left = `${adjustedX}px`
    menuElement.style.top = `${adjustedY}px`

    this.logger.debug(`Positioned menu at: (${adjustedX}, ${adjustedY})`)
  }

  /**
   * Clean up when controller is disposed
   */
  dispose() {
    this.hide()
    super.dispose()
  }
}