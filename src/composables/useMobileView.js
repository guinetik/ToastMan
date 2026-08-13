/**
 * Shell view state composable
 *
 * Shared sidebar open/closed state plus viewport flags.
 * Wide screens start with a docked sidebar; laptops and phones start closed.
 * Existing mobileView / showComposer / showSidebar / isMobile facades stay
 * so HistoryTab and useTabs keep compiling during the shell rewrite.
 */

import { computed, ref, watch } from 'vue'
import { useViewport } from './useViewport.js'

const sidebarOpen = ref(false)
let initialized = false

/**
 * Shared shell state: sidebar visibility and viewport flags.
 * @returns {object} sidebar controls, viewport flags, and legacy facades
 */
export function useMobileView() {
  const viewport = useViewport()

  if (!initialized) {
    initialized = true
    // Wide screens start with a docked sidebar; laptops/phones start closed.
    sidebarOpen.value = viewport.canDockSidebar.value
    watch(viewport.canDockSidebar, (canDock) => {
      if (!canDock) {
        sidebarOpen.value = false
      }
    })
  }

  const openSidebar = () => {
    sidebarOpen.value = true
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  /**
   * Restrict sidebar view to the two legacy values.
   * @param {'sidebar'|'composer'} view
   */
  const setMobileView = (view) => {
    if (view === 'sidebar') {
      openSidebar()
    } else if (view === 'composer') {
      closeSidebar()
    }
  }

  // Facades — do not leave callers on a dead API
  const mobileView = computed(() => (sidebarOpen.value ? 'sidebar' : 'composer'))
  const showComposer = closeSidebar
  const showSidebar = openSidebar
  const isMobile = () => viewport.isCompact.value
  const toggleMobileView = toggleSidebar

  return {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    setMobileView,
    mobileView,
    showComposer,
    showSidebar,
    toggleMobileView,
    isMobile,
    width: viewport.width,
    height: viewport.height,
    isCompact: viewport.isCompact,
    canDockSidebar: viewport.canDockSidebar,
    canSplitComfortably: viewport.canSplitComfortably
  }
}
