/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { TokenizerBuilder, type IpadicFeatures } from '@patdx/kuromoji';
import {
  createCachingLoader,
  getKuromojiDictPath,
  type KuromojiProgressCallback
} from './kuromoji-loader';

/**
 * Token format expected by kuroshiro
 */
interface KuroshiroToken {
  surface_form: string;
  pos: string;
  reading?: string;
  pronunciation?: string;
}

/**
 * Custom kuromoji analyzer for kuroshiro with IndexedDB caching
 */
export class CachingKuromojiAnalyzer {
  private tokenizer: Awaited<ReturnType<TokenizerBuilder['build']>> | null = null;
  private onProgress?: KuromojiProgressCallback;

  constructor(options?: { onProgress?: KuromojiProgressCallback }) {
    this.onProgress = options?.onProgress;
  }

  /**
   * Initialize the analyzer (required by kuroshiro)
   */
  async init(): Promise<void> {
    if (this.tokenizer) {
      return;
    }

    const loader = createCachingLoader(this.onProgress);

    const builder = new TokenizerBuilder({
      loader: {
        async loadArrayBuffer(url: string): Promise<ArrayBufferLike> {
          // The URL from kuromoji is just the filename, we need to prepend the path
          const fullUrl = url.startsWith('/') ? url : `${getKuromojiDictPath()}/${url}`;
          return loader.loadArrayBuffer(fullUrl);
        }
      }
    });

    this.tokenizer = await builder.build();

    this.onProgress?.({
      phase: 'complete',
      current: 12,
      total: 12
    });
  }

  /**
   * Parse text into tokens (required by kuroshiro)
   */
  async parse(text: string): Promise<KuroshiroToken[]> {
    if (!this.tokenizer) {
      throw new Error('Analyzer not initialized. Call init() first.');
    }

    const tokens: IpadicFeatures[] = this.tokenizer.tokenize(text);

    // Convert to kuroshiro format
    return tokens.map((token) => ({
      surface_form: token.surface_form,
      pos: token.pos,
      reading: token.reading,
      pronunciation: token.pronunciation
    }));
  }
}
