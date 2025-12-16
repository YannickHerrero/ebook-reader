/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import type { LoaderConfig } from '@patdx/kuromoji';

const KUROMOJI_DICT_PATH = '/kuromoji-dict';

const KUROMOJI_DICT_FILES = [
  'base.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_pos.dat.gz',
  'tid_map.dat.gz',
  'cc.dat.gz',
  'unk.dat.gz',
  'unk_pos.dat.gz',
  'unk_map.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz'
];

export interface KuromojiLoadProgress {
  phase: 'loading' | 'complete';
  current: number;
  total: number;
  filename?: string;
}

export type KuromojiProgressCallback = (progress: KuromojiLoadProgress) => void;

/**
 * Create a loader for kuromoji that fetches dictionaries
 * Files are cached by the service worker
 */
export function createCachingLoader(onProgress?: KuromojiProgressCallback): LoaderConfig {
  let loadedCount = 0;
  const total = KUROMOJI_DICT_FILES.length;

  return {
    async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
      const filename = url.split('/').pop() || url;

      onProgress?.({
        phase: 'loading',
        current: loadedCount,
        total,
        filename
      });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      loadedCount++;
      onProgress?.({
        phase: 'loading',
        current: loadedCount,
        total,
        filename
      });

      return arrayBuffer;
    }
  };
}

/**
 * Get the dictionary path for kuromoji
 */
export function getKuromojiDictPath(): string {
  return KUROMOJI_DICT_PATH;
}
