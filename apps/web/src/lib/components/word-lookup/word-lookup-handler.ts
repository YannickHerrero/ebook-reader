/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { fromEvent, NEVER, debounceTime, filter, switchMap, of } from 'rxjs';
import { isJapaneseWord } from '$lib/functions/japanese/segmenter';
import { lookupWord } from '$lib/functions/japanese/dictionary-lookup';
import { openWordLookup } from './word-lookup';
import { getTokenAtPosition } from '$lib/functions/furigana/furigana-generator';

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
    switchMap(async ({ sentence, sentenceOffset }) => {
      // Use Kuromoji to find the word at the click position
      const token = await getTokenAtPosition(sentence, sentenceOffset);
      if (!token) return;

      // Skip non-Japanese tokens
      if (!isJapaneseWord(token.surface_form)) return;

      // Use base form for dictionary lookup if available, otherwise surface form
      const lookupForm =
        token.basic_form && token.basic_form !== '*' ? token.basic_form : token.surface_form;

      const results = await lookupWord(lookupForm, token.reading);

      if (results.length > 0) {
        // Display the surface form (what user clicked) but lookup used base form
        openWordLookup(results, sentence, token.surface_form);
      }
    })
  );
}

interface TextClickResult {
  sentence: string;
  sentenceOffset: number;
}

/**
 * Process a click event to extract the sentence and click offset
 */
function processTextClick(event: MouseEvent, _contentEl: HTMLElement): TextClickResult | null {
  const { clientX, clientY } = event;

  // Get the text node at the click position
  const textInfo = getTextAtPoint(clientX, clientY);
  if (!textInfo) return null;

  const { offset, node } = textInfo;

  // Get the containing paragraph for sentence extraction
  const paragraph = node.parentElement?.closest('p');
  const paragraphText = paragraph ? getTextContent(paragraph) : node.textContent || '';

  // Calculate the offset of the clicked character within the paragraph
  const clickOffsetInParagraph = calculateOffsetInParagraph(node, offset, paragraph);

  // Find the sentence containing the click and get the offset within it
  const sentenceInfo = getSentenceWithOffset(paragraphText, clickOffsetInParagraph);
  if (!sentenceInfo) return null;

  return {
    sentence: sentenceInfo.sentence,
    sentenceOffset: sentenceInfo.offsetInSentence
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
 * Get clean text content of an element (for paragraphs)
 */
function getTextContent(element: Element): string {
  // Get text content, preserving ruby base text but excluding furigana and ruby parentheses
  let text = '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      // Skip furigana text and ruby parentheses
      if (
        parent?.tagName === 'RT' ||
        parent?.closest('rt') ||
        parent?.tagName === 'RP' ||
        parent?.closest('rp')
      ) {
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
 * Calculate the character offset within a paragraph for a click position
 */
function calculateOffsetInParagraph(
  clickedNode: Node,
  offsetInNode: number,
  paragraph: Element | null | undefined
): number {
  if (!paragraph) {
    return offsetInNode;
  }

  // Walk through all text nodes in the paragraph to find the offset
  let totalOffset = 0;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      // Skip furigana text and ruby parentheses
      if (
        parent?.tagName === 'RT' ||
        parent?.closest('rt') ||
        parent?.tagName === 'RP' ||
        parent?.closest('rp')
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let current = walker.nextNode();
  while (current) {
    if (current === clickedNode) {
      return totalOffset + offsetInNode;
    }
    totalOffset += current.textContent?.length || 0;
    current = walker.nextNode();
  }

  return offsetInNode;
}

/**
 * Find the sentence containing a character position and return offset within it
 */
function getSentenceWithOffset(
  text: string,
  charIndex: number
): { sentence: string; offsetInSentence: number } | null {
  if (charIndex < 0 || charIndex >= text.length) {
    return null;
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
      const sentence = text.slice(start, end).trim();
      // Adjust offset for leading whitespace that was trimmed
      const leadingWhitespace =
        text.slice(start, end).length - text.slice(start, end).trimStart().length;
      const offsetInSentence = charIndex - start - leadingWhitespace;

      return {
        sentence,
        offsetInSentence: Math.max(0, offsetInSentence)
      };
    }
  }

  return null;
}
