/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { writableSubject } from '$lib/functions/svelte/store';
import type { LookupResult } from '$lib/functions/japanese/dictionary-lookup';

export interface WordLookupState {
  isOpen: boolean;
  results: LookupResult[];
  sentence: string;
  selectedWord: string;
}

const initialState: WordLookupState = {
  isOpen: false,
  results: [],
  sentence: '',
  selectedWord: ''
};

export const wordLookupState$ = writableSubject<WordLookupState>(initialState);

export function openWordLookup(
  results: LookupResult[],
  sentence: string,
  selectedWord: string
): void {
  wordLookupState$.next({
    isOpen: true,
    results,
    sentence,
    selectedWord
  });
}

export function closeWordLookup(): void {
  wordLookupState$.next(initialState);
}
