/**
 * Viewport breakpoints and reactive window size for the ToastMan shell.
 *
 * Compact phones and laptops share the overlay sidebar. Only wide, tall
 * screens dock the sidebar and treat split view as comfortable.
 */

import { computed, ref } from 'vue'

/**
 * Viewport breakpoints for the ToastMan shell.
 * Compact phones keep the same overlay sidebar as laptops.
 */
export const VIEWPORT = {
  compactMax: 768,
  dockSidebarMin: 1280,
  comfortableSplitMinHeight: 900
}

const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800

/**
 * Pure breakpoint resolver — unit-testable without window.
 * @param {number} width
 * @param {number} height
 * @returns {{ isCompact: boolean, canDockSidebar: boolean, canSplitComfortably: boolean }}
 */
export function resolveViewport(width, height) {
  const isCompact = width <= VIEWPORT.compactMax
  // Wide-and-tall only. A 1366×768 laptop is wider than dockSidebarMin
  // but still too short to spend width on a docked sidebar.
  const canDockSidebar =
    width >= VIEWPORT.dockSidebarMin &&
    height >= VIEWPORT.comfortableSplitMinHeight
  const canSplitComfortably = canDockSidebar
  return { isCompact, canDockSidebar, canSplitComfortably }
}

/**
 * Read the current window size, with jsdom/SSR-safe defaults.
 * @returns {{ width: number, height: number }}
 */
function readWindowSize() {
  if (typeof window === 'undefined') {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  }
  return {
    width: window.innerWidth || DEFAULT_WIDTH,
    height: window.innerHeight || DEFAULT_HEIGHT
  }
}

// Singleton reactive state — shared across every useViewport() caller
const initial = readWindowSize()
const width = ref(initial.width)
const height = ref(initial.height)
let listenerAttached = false

/**
 * Keep singleton width/height in sync with the window.
 */
function attachResizeListener() {
  if (listenerAttached || typeof window === 'undefined') {
    return
  }
  listenerAttached = true
  window.addEventListener('resize', () => {
    const size = readWindowSize()
    width.value = size.width
    height.value = size.height
  })
}

/**
 * Reactive viewport flags derived from window size.
 * First call attaches a shared resize listener.
 * @returns {{
 *   width: import('vue').Ref<number>,
 *   height: import('vue').Ref<number>,
 *   isCompact: import('vue').ComputedRef<boolean>,
 *   canDockSidebar: import('vue').ComputedRef<boolean>,
 *   canSplitComfortably: import('vue').ComputedRef<boolean>
 * }}
 */
export function useViewport() {
  attachResizeListener()

  const flags = computed(() => resolveViewport(width.value, height.value))

  return {
    width,
    height,
    isCompact: computed(() => flags.value.isCompact),
    canDockSidebar: computed(() => flags.value.canDockSidebar),
    canSplitComfortably: computed(() => flags.value.canSplitComfortably)
  }
}
