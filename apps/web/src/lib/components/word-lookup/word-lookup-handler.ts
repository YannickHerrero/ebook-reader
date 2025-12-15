/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { fromEvent, NEVER, debounceTime, filter, switchMap, of } from 'rxjs';
import {
  getWordAtPosition,
  getSentenceContaining,
  isJapaneseWord
} from '$lib/functions/japanese/segmenter';
import { lookupWord } from '$lib/functions/japanese/dictionary-lookup';
import { openWordLookup } from './word-lookup';

/**
 * Create a word lookup click handler for the content element
 */
export function wordLookupHandler(contentEl: HTMLElement, enabled: boolean) {
  if (!enabled) {
    return NEVER;
  }

  return fromEvent<MouseEvent>(contentEl, 'click').pipe(
    debounceTime(50),
    // Filter out clicks on interactive elements
    filter((event) => {
      const target = event.target as HTMLElement;

      // Skip if clicked on interactive elements
      if (target.tagName === 'A' || target.closest('a')) return false;
      if (target.tagName === 'BUTTON' || target.closest('button')) return false;
      if (target.hasAttribute('data-ttu-spoiler-img') || target.closest('[data-ttu-spoiler-img]'))
        return false;

      // Skip if there's a text selection (user is selecting text)
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) return false;

      return true;
    }),
    switchMap((event) => {
      const result = processTextClick(event, contentEl);
      return of(result);
    }),
    filter((result): result is NonNullable<typeof result> => result !== null),
    switchMap(async ({ word, sentence }) => {
      const results = await lookupWord(word);

      if (results.length > 0) {
        openWordLookup(results, sentence, word);
      }
    })
  );
}

interface TextClickResult {
  word: string;
  sentence: string;
}

/**
 * Process a click event to extract the clicked word and sentence
 */
function processTextClick(event: MouseEvent, _contentEl: HTMLElement): TextClickResult | null {
  const { clientX, clientY } = event;

  // Get the text node at the click position
  const textInfo = getTextAtPoint(clientX, clientY);
  if (!textInfo) return null;

  const { text, offset, node } = textInfo;

  // Handle ruby elements - get the base text, not furigana
  const adjustedText = getRubyBaseText(node, text);

  // Get the word at the clicked position
  const wordInfo = getWordAtPosition(adjustedText, offset);
  if (!wordInfo || !wordInfo.isWordLike) return null;

  // Check if it's a Japanese word
  if (!isJapaneseWord(wordInfo.word)) return null;

  // Get the containing paragraph for sentence extraction
  const paragraph = node.parentElement?.closest('p');
  const paragraphText = paragraph ? getTextContent(paragraph) : adjustedText;

  // Find the sentence containing the word
  const sentence = getSentenceContaining(
    paragraphText,
    findWordInParagraph(paragraphText, wordInfo.word, offset)
  );

  return {
    word: wordInfo.word,
    sentence
  };
}

/**
 * Get text information at a specific point
 */
function getTextAtPoint(x: number, y: number): { text: string; offset: number; node: Node } | null {
  // Try caretPositionFromPoint first (Firefox, Chrome 128+)
  if ('caretPositionFromPoint' in document) {
    const position = (document as any).caretPositionFromPoint(x, y);
    if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
      return {
        text: position.offsetNode.textContent || '',
        offset: position.offset,
        node: position.offsetNode
      };
    }
  }

  // Fallback to caretRangeFromPoint (older Chrome, Safari)
  if ('caretRangeFromPoint' in document) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      return {
        text: range.startContainer.textContent || '',
        offset: range.startOffset,
        node: range.startContainer
      };
    }
  }

  return null;
}

/**
 * Handle ruby elements - return the base text without furigana
 */
function getRubyBaseText(node: Node, text: string): string {
  const parent = node.parentElement;

  // If we're inside an <rt> element (furigana), get the parent ruby's base text
  if (parent?.tagName === 'RT') {
    const ruby = parent.closest('ruby');
    if (ruby) {
      // Get text content excluding <rt> elements
      return getTextContentExcludingRt(ruby);
    }
  }

  // If we're inside a <ruby> element but not in <rt>
  if (parent?.closest('ruby')) {
    const ruby = parent.closest('ruby');
    if (ruby && !parent.closest('rt')) {
      return getTextContentExcludingRt(ruby);
    }
  }

  return text;
}

/**
 * Get text content of an element, excluding <rt> elements
 */
function getTextContentExcludingRt(element: Element): string {
  let text = '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent?.tagName === 'RT' || parent?.closest('rt')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let current = walker.nextNode();
  while (current) {
    text += current.textContent;
    current = walker.nextNode();
  }

  return text;
}

/**
 * Get clean text content of an element (for paragraphs)
 */
function getTextContent(element: Element): string {
  // Get text content, preserving ruby base text
  let text = '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      // Skip furigana text
      if (parent?.tagName === 'RT' || parent?.closest('rt')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let current = walker.nextNode();
  while (current) {
    text += current.textContent;
    current = walker.nextNode();
  }

  return text;
}

/**
 * Find the position of a word in paragraph text
 */
function findWordInParagraph(
  paragraphText: string,
  word: string,
  approximateOffset: number
): number {
  // First, try to find the word near the approximate offset
  const searchStart = Math.max(0, approximateOffset - word.length * 2);
  const searchEnd = Math.min(paragraphText.length, approximateOffset + word.length * 2);
  const searchRegion = paragraphText.slice(searchStart, searchEnd);

  const indexInRegion = searchRegion.indexOf(word);
  if (indexInRegion !== -1) {
    return searchStart + indexInRegion;
  }

  // Fallback: find first occurrence
  const index = paragraphText.indexOf(word);
  return index !== -1 ? index : approximateOffset;
}
