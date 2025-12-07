/**
 * Long Press Composable
 *
 * Provides touch-friendly long-press detection for mobile context menus
 */

import { ref, onUnmounted } from 'vue'

export function useLongPress(callback, options = {}) {
  const {
    delay = 500, // How long to hold before triggering (ms)
    moveThreshold = 10 // How many pixels of movement cancels the long-press
  } = options

  let longPressTimer = null
  let startX = 0
  let startY = 0
  const isLongPressing = ref(false)

  const handleTouchStart = (event) => {
    // Record starting position
    const touch = event.touches[0]
    startX = touch.clientX
    startY = touch.clientY

    // Start timer for long-press
    longPressTimer = setTimeout(() => {
      isLongPressing.value = true

      // Create a synthetic event with clientX/clientY from touch coordinates
      // Context menus expect these properties for positioning
      const syntheticEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY
      })

      // Copy target from original event
      Object.defineProperty(syntheticEvent, 'target', {
        value: event.target,
        enumerable: true
      })

      // Trigger callback with synthetic event
      callback(syntheticEvent)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50) // Short vibration
      }
    }, delay)
  }

  const handleTouchMove = (event) => {
    if (!longPressTimer) return

    // Check if finger moved too much
    const touch = event.touches[0]
    const deltaX = Math.abs(touch.clientX - startX)
    const deltaY = Math.abs(touch.clientY - startY)

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      // Cancel long-press if moved too far
      clearTimeout(longPressTimer)
      longPressTimer = null
      isLongPressing.value = false
    }
  }

  const handleTouchEnd = () => {
    // Clear timer if touch ended before delay
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    isLongPressing.value = false
  }

  const handleTouchCancel = () => {
    // Cancel long-press on interruption
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    isLongPressing.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }
  })

  return {
    isLongPressing,
    longPressHandlers: {
      onTouchstart: handleTouchStart,
      onTouchmove: handleTouchMove,
      onTouchend: handleTouchEnd,
      onTouchcancel: handleTouchCancel
    }
  }
}
