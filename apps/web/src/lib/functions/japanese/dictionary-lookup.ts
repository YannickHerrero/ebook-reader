/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import {
  lookupByTermOrReading,
  type DictionaryEntry
} from '$lib/data/database/dictionary-db/dictionary-db';
import { deinflect, type DeinflectionResult } from './deinflector';
import { katakanaToHiragana } from './segmenter';

export interface LookupResult {
  selectedWord: string;
  dictionaryForm: string;
  reading: string;
  partOfSpeech: string[];
  definitions: string[];
  inflectionPath: string[];
  score: number;
  matchLength: number;
}

/**
 * Look up a word in the dictionary, trying deinflected forms
 * @param word The word to look up
 * @param readingHint Optional reading hint from morphological analysis (in hiragana or katakana)
 */
export async function lookupWord(word: string, readingHint?: string): Promise<LookupResult[]> {
  // Normalize reading hint to hiragana for comparison
  const normalizedHint = readingHint ? katakanaToHiragana(readingHint) : undefined;

  // Generate deinflection candidates
  const deinflectionResults = deinflect(word);

  // Also try katakana -> hiragana conversion
  const hiraganaWord = katakanaToHiragana(word);
  if (hiraganaWord !== word) {
    const hiraganaDeinflections = deinflect(hiraganaWord);
    for (const d of hiraganaDeinflections) {
      if (!deinflectionResults.some((r) => r.term === d.term)) {
        deinflectionResults.push(d);
      }
    }
  }

  const results: LookupResult[] = [];
  const seenSequences = new Set<number>();

  // Try each deinflection candidate
  for (const deinflection of deinflectionResults) {
    const entries = await lookupByTermOrReading(deinflection.term);

    for (const entry of entries) {
      // Skip if we've already seen this entry
      if (seenSequences.has(entry.sequence)) {
        continue;
      }

      // Validate that the deinflection rules match the entry's grammar
      if (!validateDeinflection(deinflection, entry)) {
        continue;
      }

      seenSequences.add(entry.sequence);

      const result = convertToLookupResult(word, deinflection, entry);
      results.push(result);
    }
  }

  // Sort results: matching reading hint first, then by score
  results.sort((a, b) => {
    if (normalizedHint) {
      const aMatches = katakanaToHiragana(a.reading) === normalizedHint;
      const bMatches = katakanaToHiragana(b.reading) === normalizedHint;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }
    // Within same match status, sort by score (higher is better)
    return b.score - a.score;
  });

  return results;
}

/**
 * Look up words with progressively shorter substrings, deinflecting at each step
 * This mimics Yomitan's behavior of showing matches from longest to shortest
 * @param text The full text containing the word
 * @param startIndex The character index where the word starts
 * @param maxLength Maximum substring length to try (default 20)
 * @param readingHint Optional reading hint from morphological analysis
 */
export async function lookupWordWithSubstrings(
  text: string,
  startIndex: number,
  maxLength: number = 20,
  readingHint?: string
): Promise<LookupResult[]> {
  const normalizedHint = readingHint ? katakanaToHiragana(readingHint) : undefined;
  const results: LookupResult[] = [];
  const seenSequences = new Set<number>();

  // Try progressively shorter substrings
  const endIndex = Math.min(startIndex + maxLength, text.length);

  for (let len = endIndex - startIndex; len >= 1; len--) {
    const substring = text.slice(startIndex, startIndex + len);

    // Skip if substring contains sentence-ending punctuation
    if (/[。！？\n\r]/.test(substring)) continue;

    // Generate deinflection candidates for this substring
    const deinflectionResults = deinflect(substring);

    // Also try katakana -> hiragana conversion
    const hiraganaSubstring = katakanaToHiragana(substring);
    if (hiraganaSubstring !== substring) {
      const hiraganaDeinflections = deinflect(hiraganaSubstring);
      for (const d of hiraganaDeinflections) {
        if (!deinflectionResults.some((r) => r.term === d.term)) {
          deinflectionResults.push(d);
        }
      }
    }

    // Try each deinflection candidate
    for (const deinflection of deinflectionResults) {
      const entries = await lookupByTermOrReading(deinflection.term);

      for (const entry of entries) {
        // Skip if we've already seen this entry
        if (seenSequences.has(entry.sequence)) {
          continue;
        }

        // Validate that the deinflection rules match the entry's grammar
        if (!validateDeinflection(deinflection, entry)) {
          continue;
        }

        seenSequences.add(entry.sequence);

        const result = convertToLookupResult(substring, deinflection, entry, len);
        results.push(result);
      }
    }
  }

  // Sort: longest match first, then reading hint match, then score
  results.sort((a, b) => {
    // 1. Longer matches first
    const lengthDiff = b.matchLength - a.matchLength;
    if (lengthDiff !== 0) return lengthDiff;

    // 2. Reading hint matches first
    if (normalizedHint) {
      const aMatches = katakanaToHiragana(a.reading) === normalizedHint;
      const bMatches = katakanaToHiragana(b.reading) === normalizedHint;
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
    }

    // 3. Higher score (frequency) wins
    return b.score - a.score;
  });

  return results;
}

/**
 * Validate that the deinflection rules match the dictionary entry's grammar
 */
function validateDeinflection(deinflection: DeinflectionResult, entry: DictionaryEntry): boolean {
  // If no rules were applied, any entry is valid
  if (deinflection.rules.length === 0) {
    return true;
  }

  // Check if entry's rules match any of the deinflection rules
  const entryRules = entry.rules.split(' ').filter((r) => r.length > 0);

  // If entry has no rules specified, accept it
  if (entryRules.length === 0) {
    return true;
  }

  // Check for matching verb/adjective types
  for (const rule of deinflection.rules) {
    if (entryRules.includes(rule)) {
      return true;
    }

    // Handle v5 variants (v5u, v5k, etc. should match v5)
    if (rule === 'v5' && entryRules.some((r) => r.startsWith('v5'))) {
      return true;
    }

    // Check tags as well
    const entryTags = entry.tags.split(' ').filter((t) => t.length > 0);
    if (entryTags.includes(rule)) {
      return true;
    }

    if (rule === 'v5' && entryTags.some((t) => t.startsWith('v5'))) {
      return true;
    }

    if (rule === 'v1' && entryTags.includes('v1')) {
      return true;
    }

    if (rule === 'adj-i' && entryTags.includes('adj-i')) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a dictionary entry to a lookup result
 */
function convertToLookupResult(
  selectedWord: string,
  deinflection: DeinflectionResult,
  entry: DictionaryEntry,
  matchLength?: number
): LookupResult {
  // Extract all definitions as plain text
  const definitions: string[] = [];

  for (const def of entry.definitions) {
    for (const glossary of def.glossary) {
      if (glossary && !definitions.includes(glossary)) {
        definitions.push(glossary);
      }
    }
  }

  // Get part of speech from the first definition or tags
  const partOfSpeech: string[] = [];
  if (entry.definitions.length > 0 && entry.definitions[0].partOfSpeech.length > 0) {
    partOfSpeech.push(...entry.definitions[0].partOfSpeech);
  }

  return {
    selectedWord,
    dictionaryForm: entry.term,
    reading: entry.reading,
    partOfSpeech,
    definitions,
    inflectionPath: deinflection.reasons,
    score: entry.score,
    matchLength: matchLength ?? selectedWord.length
  };
}

/**
 * Get a single best result for a word lookup
 */
export async function lookupWordBest(
  word: string,
  readingHint?: string
): Promise<LookupResult | null> {
  const results = await lookupWord(word, readingHint);
  return results.length > 0 ? results[0] : null;
}
