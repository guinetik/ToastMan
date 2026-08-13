import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { readCollectionArchive, shouldSkipArchivePath } from '../collectionArchive.js'

describe('shouldSkipArchivePath', () => {
  it('skips macOS junk', () => {
    expect(shouldSkipArchivePath('__MACOSX/._opencollection.yml')).toBe(true)
    expect(shouldSkipArchivePath('demo/.DS_Store')).toBe(true)
  })

  it('keeps request files', () => {
    expect(shouldSkipArchivePath('demo/opencollection.yml')).toBe(false)
  })
})

describe('readCollectionArchive', () => {
  it('unzips yaml files into a path/content list', async () => {
    const zip = new JSZip()
    zip.file('demo/opencollection.yml', 'opencollection: 1.0.0\ninfo:\n  name: Zipped\n')
    zip.file('demo/ping.yml', 'info:\n  name: Ping\nhttp:\n  method: GET\n  url: https://example.com\n')
    zip.file('__MACOSX/._ping.yml', 'junk')
    const blob = await zip.generateAsync({ type: 'blob' })

    const files = await readCollectionArchive(blob)
    const paths = files.map(f => f.path).sort()
    expect(paths).toEqual(['demo/opencollection.yml', 'demo/ping.yml'])
    expect(files.find(f => f.path.endsWith('opencollection.yml')).content).toContain('Zipped')
  })
})
