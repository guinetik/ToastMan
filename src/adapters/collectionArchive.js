/**
 * Read a zipped API collection into a flat { path, content } file list.
 */

import JSZip from 'jszip'
import { createLogger } from '../core/logger.js'

const logger = createLogger('collectionArchive')

const SKIP_PREFIXES = ['__macosx/']
const SKIP_NAMES = ['.ds_store', 'thumbs.db']

/**
 * @typedef {{ path: string, content: string }} CollectionFile
 */

/**
 * Unzip a File/Blob/ArrayBuffer into text files.
 * @param {File|Blob|ArrayBuffer} archive
 * @returns {Promise<CollectionFile[]>}
 */
export async function readCollectionArchive(archive) {
  const zip = await JSZip.loadAsync(archive)
  const files = []

  const entries = Object.values(zip.files)
  for (const entry of entries) {
    if (entry.dir) continue
    const path = String(entry.name || '').replace(/\\/g, '/')
    if (shouldSkipArchivePath(path)) continue

    const content = await entry.async('string')
    files.push({ path, content })
  }

  logger.debug('Read collection archive', { files: files.length })
  return files
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function shouldSkipArchivePath(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase()
  if (SKIP_PREFIXES.some(prefix => normalized.startsWith(prefix))) return true
  const name = normalized.split('/').pop()
  return SKIP_NAMES.includes(name)
}
