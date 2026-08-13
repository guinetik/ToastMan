import { describe, it, expect } from 'vitest'
import { nextStateAfterSend, nextViewMode, resolveInitialViewMode } from '../viewMode.js'

describe('nextStateAfterSend', () => {
  it('opens the sheet and stays on composer', () => {
    expect(nextStateAfterSend({ viewMode: 'composer', conversationSheetOpen: false }))
      .toEqual({ viewMode: 'composer', conversationSheetOpen: true })
  })

  it('does not leave split', () => {
    expect(nextStateAfterSend({ viewMode: 'split', conversationSheetOpen: false }))
      .toEqual({ viewMode: 'split', conversationSheetOpen: false })
  })

  it('keeps conversation-only as the full thread', () => {
    expect(nextStateAfterSend({ viewMode: 'conversation', conversationSheetOpen: false }))
      .toEqual({ viewMode: 'conversation', conversationSheetOpen: true })
  })
})

describe('nextViewMode', () => {
  it('cycles composer → conversation → split → composer', () => {
    expect(nextViewMode('composer')).toBe('conversation')
    expect(nextViewMode('conversation')).toBe('split')
    expect(nextViewMode('split')).toBe('composer')
  })
})

describe('resolveInitialViewMode', () => {
  it('defaults missing mode to composer', () => {
    expect(resolveInitialViewMode(null, false)).toBe('composer')
    expect(resolveInitialViewMode(undefined, true)).toBe('composer')
  })

  it('defers persisted split on a tight viewport without requiring a write-back', () => {
    expect(resolveInitialViewMode('split', false)).toBe('composer')
  })

  it('keeps persisted split on a comfortable viewport', () => {
    expect(resolveInitialViewMode('split', true)).toBe('split')
  })

  it('preserves conversation mode on every viewport', () => {
    expect(resolveInitialViewMode('conversation', false)).toBe('conversation')
    expect(resolveInitialViewMode('composer', false)).toBe('composer')
  })
})
