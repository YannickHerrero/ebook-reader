/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

/**
 * Japanese word segmenter using Intl.Segmenter
 */

let segmenter: Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter {
  if (!segmenter) {
    segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
  }
  return segmenter;
}

export interface WordAtPosition {
  word: string;
  start: number;
  end: number;
  isWordLike: boolean;
}

/**
 * Get the word at a specific character position in the text
 */
export function getWordAtPosition(text: string, charIndex: number): WordAtPosition | null {
  if (charIndex < 0 || charIndex >= text.length) {
    return null;
  }

  const seg = getSegmenter();
  const segments = seg.segment(text);

  for (const segment of segments) {
    const start = segment.index;
    const end = start + segment.segment.length;

    if (charIndex >= start && charIndex < end) {
      return {
        word: segment.segment,
        start,
        end,
        isWordLike: segment.isWordLike ?? false
      };
    }
  }

  return null;
}

/**
 * Get all words in a text
 */
export function segmentText(text: string): WordAtPosition[] {
  const seg = getSegmenter();
  const segments = seg.segment(text);
  const result: WordAtPosition[] = [];

  for (const segment of segments) {
    result.push({
      word: segment.segment,
      start: segment.index,
      end: segment.index + segment.segment.length,
      isWordLike: segment.isWordLike ?? false
    });
  }

  return result;
}

/**
 * Get the sentence containing the character at the given position
 * Sentences are delimited by: 。！？\n and various Japanese punctuation
 */
export function getSentenceContaining(text: string, charIndex: number): string {
  if (charIndex < 0 || charIndex >= text.length) {
    return '';
  }

  // Japanese sentence-ending punctuation
  const sentenceEnders = /[。！？\n\r。？！‥…⋯]+/g;

  // Find sentence boundaries
  const matches = [...text.matchAll(sentenceEnders)];
  const boundaries: number[] = [0];

  for (const match of matches) {
    if (match.index !== undefined) {
      boundaries.push(match.index + match[0].length);
    }
  }
  boundaries.push(text.length);

  // Find which sentence contains our character
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];

    if (charIndex >= start && charIndex < end) {
      return text.slice(start, end).trim();
    }
  }

  return '';
}

/**
 * Check if a string contains Japanese characters (hiragana, katakana, or kanji)
 */
export function containsJapanese(text: string): boolean {
  // Hiragana: \u3040-\u309F
  // Katakana: \u30A0-\u30FF
  // CJK Unified Ideographs (Kanji): \u4E00-\u9FAF
  // CJK Extension A: \u3400-\u4DBF
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(text);
}

/**
 * Check if a string is purely Japanese (no Latin characters)
 */
export function isJapaneseWord(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Must contain at least one Japanese character
  if (!containsJapanese(text)) return false;

  // Should not be just punctuation
  const punctuation = /^[。、！？「」『』（）【】\s]+$/;
  if (punctuation.test(text)) return false;

  return true;
}

/**
 * Convert katakana to hiragana
 */
export function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30A1-\u30F6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/**
 * Convert hiragana to katakana
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}
