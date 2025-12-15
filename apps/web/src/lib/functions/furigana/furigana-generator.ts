/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import Kuroshiro from 'kuroshiro';
import { CachingKuromojiAnalyzer } from '$lib/data/database/kuromoji-db/kuromoji-analyzer';
import type { KuromojiProgressCallback } from '$lib/data/database/kuromoji-db/kuromoji-loader';

let kuroshiroInstance: Kuroshiro | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the furigana generator
 * This should be called once during app startup when word lookup is enabled
 */
export async function initFuriganaGenerator(onProgress?: KuromojiProgressCallback): Promise<void> {
  if (kuroshiroInstance) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const analyzer = new CachingKuromojiAnalyzer({ onProgress });
    kuroshiroInstance = new Kuroshiro();
    await kuroshiroInstance.init(analyzer);
  })();

  return initPromise;
}

/**
 * Check if the furigana generator is initialized
 */
export function isFuriganaReady(): boolean {
  return kuroshiroInstance !== null;
}

/**
 * Convert Japanese text to HTML with furigana (ruby tags)
 * Returns the original text if not initialized or on error
 */
export async function addFurigana(text: string): Promise<string> {
  if (!kuroshiroInstance) {
    return text;
  }

  try {
    const result = await kuroshiroInstance.convert(text, {
      mode: 'furigana',
      to: 'hiragana'
    });
    return result;
  } catch {
    // Return original text on error
    return text;
  }
}

/**
 * Convert Japanese text to HTML with furigana, with highlighted word
 * The selectedWord will be wrapped in a mark tag
 */
export async function addFuriganaWithHighlight(
  text: string,
  selectedWord: string
): Promise<string> {
  if (!kuroshiroInstance) {
    return highlightWord(text, selectedWord);
  }

  try {
    const result = await kuroshiroInstance.convert(text, {
      mode: 'furigana',
      to: 'hiragana'
    });

    // After furigana conversion, we need to find and highlight the selected word
    // The word might now be wrapped in ruby tags, so we need to handle that
    return highlightWordInFurigana(result, selectedWord);
  } catch {
    return highlightWord(text, selectedWord);
  }
}

/**
 * Simple word highlighting without furigana
 */
function highlightWord(text: string, word: string): string {
  if (!text || !word) return text;

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'g');
  return text.replace(regex, '<mark class="bg-yellow-300/50 rounded px-0.5">$1</mark>');
}

/**
 * Highlight a word in furigana-annotated HTML
 * This is tricky because the word might be split across ruby tags
 */
function highlightWordInFurigana(html: string, word: string): string {
  if (!html || !word) return html;

  // Strategy: Find the word in the base text (ignoring ruby annotations)
  // and wrap the corresponding HTML in a mark tag

  // First, let's try a simple approach: if the word appears as-is in the HTML
  // (either as plain text or as the base of a ruby tag), highlight it
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Try to match the word as the base text of a ruby element
  // Pattern: <ruby>WORD<rp>...<rt>...<rp>...</ruby>
  const rubyPattern = new RegExp(
    `(<ruby>)(${escaped})(<rp>\\([^)]*\\)</rp><rt>[^<]*</rt><rp>\\)[^)]*\\)</rp></ruby>)`,
    'g'
  );

  let result = html.replace(rubyPattern, '<mark class="bg-yellow-300/50 rounded">$1$2$3</mark>');

  // If no ruby match, try plain text match (but not inside tags)
  if (result === html) {
    // Match word that's not inside a tag
    const plainPattern = new RegExp(`(?<![<\\w])(${escaped})(?![\\w>])`, 'g');
    result = html.replace(plainPattern, '<mark class="bg-yellow-300/50 rounded px-0.5">$1</mark>');
  }

  // If still no match, the word might be split across multiple ruby tags
  // In this case, we'll just return the html without highlighting
  // This is a limitation, but handles most common cases

  return result;
}

/**
 * Reset the furigana generator (for testing or cleanup)
 */
export function resetFuriganaGenerator(): void {
  kuroshiroInstance = null;
  initPromise = null;
}
