/**
 * Mobile View State Composable
 *
 * Shared state for managing mobile view toggling between sidebar and composer
 */

import { ref } from 'vue'

// Shared state (singleton pattern)
const mobileView = ref('composer')

export function useMobileView() {
  const toggleMobileView = () => {
    mobileView.value = mobileView.value === 'sidebar' ? 'composer' : 'sidebar'
  }

  const setMobileView = (view) => {
    if (view === 'sidebar' || view === 'composer') {
      mobileView.value = view
    }
  }

  const showComposer = () => {
    mobileView.value = 'composer'
  }

  const showSidebar = () => {
    mobileView.value = 'sidebar'
  }

  const isMobile = () => {
    return window.innerWidth <= 768
  }

  return {
    mobileView,
    toggleMobileView,
    setMobileView,
    showComposer,
    showSidebar,
    isMobile
  }
}
