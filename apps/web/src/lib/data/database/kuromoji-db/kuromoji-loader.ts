/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import type { LoaderConfig } from '@patdx/kuromoji';
import {
  getCachedDictionary,
  cacheDictionary,
  isKuromojiCached,
  setKuromojiCached,
  getKuromojiDictFiles
} from './kuromoji-db';

const KUROMOJI_DICT_PATH = '/kuromoji-dict';

export interface KuromojiLoadProgress {
  phase: 'checking' | 'downloading' | 'caching' | 'loading' | 'complete';
  current: number;
  total: number;
  filename?: string;
}

export type KuromojiProgressCallback = (progress: KuromojiLoadProgress) => void;

/**
 * Create a custom loader for kuromoji that caches dictionaries in IndexedDB
 */
export function createCachingLoader(onProgress?: KuromojiProgressCallback): LoaderConfig {
  const dictFiles = getKuromojiDictFiles();
  let loadedCount = 0;

  return {
    async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
      // Extract filename from URL
      const filename = url.split('/').pop() || url;

      onProgress?.({
        phase: 'loading',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      // Try to get from cache first
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

      // Fetch from network
      onProgress?.({
        phase: 'downloading',
        current: loadedCount,
        total: dictFiles.length,
        filename
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Cache for future use
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

  // Check if already cached
  const alreadyCached = await isKuromojiCached();
  if (alreadyCached) {
    onProgress?.({
      phase: 'complete',
      current: dictFiles.length,
      total: dictFiles.length
    });
    return;
  }

  // Download and cache each file
  for (let i = 0; i < dictFiles.length; i++) {
    const filename = dictFiles[i];
    const url = `${KUROMOJI_DICT_PATH}/${filename}`;

    onProgress?.({
      phase: 'downloading',
      current: i,
      total: dictFiles.length,
      filename
    });

    // Check if this specific file is cached
    const cached = await getCachedDictionary(filename);
    if (cached) {
      continue;
    }

    // Fetch and cache
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
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
 * Get the dictionary path for kuromoji
 */
export function getKuromojiDictPath(): string {
  return KUROMOJI_DICT_PATH;
}
