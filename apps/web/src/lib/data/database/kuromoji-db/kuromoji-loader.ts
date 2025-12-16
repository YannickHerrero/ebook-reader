/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import type { LoaderConfig } from '@patdx/kuromoji';
import {
  getCachedDictionary,
  cacheDictionary,
  getKuromojiDictFiles,
  setKuromojiCached
} from './kuromoji-db';

// CDN URL for uncompressed .dat files from @aiktb/kuromoji
const KUROMOJI_CDN_URL = 'https://cdn.jsdelivr.net/npm/@aiktb/kuromoji@1.0.2/dict';

export interface KuromojiLoadProgress {
  phase: 'checking' | 'downloading' | 'caching' | 'loading' | 'complete';
  current: number;
  total: number;
  filename?: string;
}

export type KuromojiProgressCallback = (progress: KuromojiLoadProgress) => void;

/**
 * Create a loader for kuromoji that caches dictionaries in IndexedDB
 * Fetches uncompressed .dat files from CDN to avoid iOS gzip issues
 */
export function createCachingLoader(onProgress?: KuromojiProgressCallback): LoaderConfig {
  const dictFiles = getKuromojiDictFiles();
  let loadedCount = 0;

  return {
    async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
      // Extract filename from URL (e.g., "base.dat.gz" -> "base.dat")
      let filename = url.split('/').pop() || url;
      // Convert .dat.gz to .dat for CDN lookup
      if (filename.endsWith('.dat.gz')) {
        filename = filename.replace('.dat.gz', '.dat');
      }

      onProgress?.({
        phase: 'loading',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      // Try to get from IndexedDB cache first
      const cached = await getCachedDictionary(filename);
      if (cached) {
        loadedCount++;
        onProgress?.({
          phase: 'loading',
          current: loadedCount,
          total: dictFiles.length,
          filename
        });
        return cached;
      }

      // Fetch from CDN
      onProgress?.({
        phase: 'downloading',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      const cdnUrl = `${KUROMOJI_CDN_URL}/${filename}`;
      const response = await fetch(cdnUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${cdnUrl}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Cache in IndexedDB for future use
      onProgress?.({
        phase: 'caching',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      await cacheDictionary(filename, arrayBuffer);

      loadedCount++;
      onProgress?.({
        phase: 'loading',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      return arrayBuffer;
    }
  };
}

/**
 * Preload and cache all kuromoji dictionary files
 * This can be called during initial setup to cache everything upfront
 */
export async function preloadKuromojiDictionaries(
  onProgress?: KuromojiProgressCallback
): Promise<void> {
  const dictFiles = getKuromojiDictFiles();

  onProgress?.({
    phase: 'checking',
    current: 0,
    total: dictFiles.length
  });

  // Download and cache each file
  for (let i = 0; i < dictFiles.length; i++) {
    const filename = dictFiles[i];

    // Check if this specific file is cached
    const cached = await getCachedDictionary(filename);
    if (cached) {
      onProgress?.({
        phase: 'loading',
        current: i + 1,
        total: dictFiles.length,
        filename
      });
      continue;
    }

    // Fetch from CDN
    onProgress?.({
      phase: 'downloading',
      current: i,
      total: dictFiles.length,
      filename
    });

    const cdnUrl = `${KUROMOJI_CDN_URL}/${filename}`;
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${cdnUrl}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    onProgress?.({
      phase: 'caching',
      current: i,
      total: dictFiles.length,
      filename
    });

    await cacheDictionary(filename, arrayBuffer);
  }

  // Mark as fully cached
  await setKuromojiCached(true);

  onProgress?.({
    phase: 'complete',
    current: dictFiles.length,
    total: dictFiles.length
  });
}

/**
 * Get the dictionary path for kuromoji (CDN URL)
 */
export function getKuromojiDictPath(): string {
  return KUROMOJI_CDN_URL;
}
