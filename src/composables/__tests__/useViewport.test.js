import { describe, it, expect } from 'vitest'
import { resolveViewport } from '../useViewport.js'

describe('resolveViewport', () => {
  it('treats 390×844 as compact, no dock, no comfortable split', () => {
    const v = resolveViewport(390, 844)
    expect(v.isCompact).toBe(true)
    expect(v.canDockSidebar).toBe(false)
    expect(v.canSplitComfortably).toBe(false)
  })

  it('treats 1366×768 as laptop: no dock, no comfortable split', () => {
    const v = resolveViewport(1366, 768)
    expect(v.isCompact).toBe(false)
    expect(v.canDockSidebar).toBe(false)
    expect(v.canSplitComfortably).toBe(false)
  })

  it('treats 1440×900 as dockable but not comfortable split (height boundary)', () => {
    const v = resolveViewport(1440, 900)
    expect(v.canDockSidebar).toBe(true)
    expect(v.canSplitComfortably).toBe(true)
  })

  it('treats 1920×1080 as dockable + comfortable split', () => {
    const v = resolveViewport(1920, 1080)
    expect(v.isCompact).toBe(false)
    expect(v.canDockSidebar).toBe(true)
    expect(v.canSplitComfortably).toBe(true)
  })

  it('does not dock sidebar at 1279px', () => {
    expect(resolveViewport(1279, 1080).canDockSidebar).toBe(false)
  })
})
