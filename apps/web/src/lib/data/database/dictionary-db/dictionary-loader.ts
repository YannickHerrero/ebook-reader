/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import {
  addDictionaryEntries,
  clearDictionary,
  getDictionaryVersion,
  setDictionaryVersion,
  type DictionaryDefinition,
  type DictionaryEntry
} from './dictionary-db';

const DICTIONARY_PATH = '/JMdict_english';
const TERM_BANK_COUNT = 52;

export interface LoadProgress {
  current: number;
  total: number;
  phase: 'checking' | 'loading' | 'storing' | 'complete';
}

export type ProgressCallback = (progress: LoadProgress) => void;

interface JMdictIndex {
  title: string;
  format: number;
  revision: string;
  sequenced: boolean;
}

// Yomitan term bank entry format:
// [term, reading, tags, rules, score, definitions, sequence, term_tags]
type YomitanTermEntry = [
  string, // term
  string, // reading
  string, // tags (part of speech, etc.)
  string, // rules (deinflection rules)
  number, // score
  YomitanDefinition[], // definitions
  number, // sequence (entry ID)
  string // term_tags
];

type YomitanDefinition =
  | string
  | { type: 'structured-content'; content: unknown }
  | { type: 'text'; text: string };

/**
 * Check if dictionary needs to be loaded or updated
 */
export async function checkDictionaryStatus(): Promise<{
  needsLoad: boolean;
  currentVersion: string | null;
  bundledVersion: string | null;
}> {
  const currentVersion = await getDictionaryVersion();

  // Fetch the index to get bundled version
  const indexResponse = await fetch(`${DICTIONARY_PATH}/index.json`);
  if (!indexResponse.ok) {
    throw new Error('Failed to fetch dictionary index');
  }

  const index: JMdictIndex = await indexResponse.json();
  const bundledVersion = index.revision;

  return {
    needsLoad: currentVersion !== bundledVersion,
    currentVersion,
    bundledVersion
  };
}

/**
 * Load the JMdict dictionary into IndexedDB
 */
export async function loadDictionary(onProgress?: ProgressCallback): Promise<void> {
  // Get bundled version
  onProgress?.({ current: 0, total: TERM_BANK_COUNT, phase: 'checking' });

  const indexResponse = await fetch(`${DICTIONARY_PATH}/index.json`);
  if (!indexResponse.ok) {
    throw new Error('Failed to fetch dictionary index');
  }

  const index: JMdictIndex = await indexResponse.json();
  const bundledVersion = index.revision;

  // Clear existing dictionary
  await clearDictionary();

  // Load all term banks
  for (let i = 1; i <= TERM_BANK_COUNT; i++) {
    onProgress?.({ current: i - 1, total: TERM_BANK_COUNT, phase: 'loading' });

    const termBankResponse = await fetch(`${DICTIONARY_PATH}/term_bank_${i}.json`);
    if (!termBankResponse.ok) {
      throw new Error(`Failed to fetch term_bank_${i}.json`);
    }

    const termBank: YomitanTermEntry[] = await termBankResponse.json();

    onProgress?.({ current: i - 1, total: TERM_BANK_COUNT, phase: 'storing' });

    // Convert and store entries
    const entries = termBank.map(parseYomitanEntry).filter((e): e is DictionaryEntry => e !== null);

    await addDictionaryEntries(entries);
  }

  // Save version
  await setDictionaryVersion(bundledVersion);

  onProgress?.({ current: TERM_BANK_COUNT, total: TERM_BANK_COUNT, phase: 'complete' });
}

/**
 * Parse a Yomitan term entry into our format
 */
function parseYomitanEntry(entry: YomitanTermEntry): DictionaryEntry | null {
  const [term, reading, tags, rules, score, definitions, sequence] = entry;

  // Skip entries that are just form references (no real definitions)
  if (tags === 'forms') {
    return null;
  }

  const parsedDefinitions = parseDefinitions(definitions, tags);

  // Skip if no valid definitions
  if (parsedDefinitions.length === 0) {
    return null;
  }

  return {
    term,
    reading: reading || term, // If no reading, use term (for kana-only words)
    tags,
    rules,
    score,
    definitions: parsedDefinitions,
    sequence
  };
}

/**
 * Parse Yomitan structured-content definitions into plain text
 */
function parseDefinitions(definitions: YomitanDefinition[], tags: string): DictionaryDefinition[] {
  const result: DictionaryDefinition[] = [];

  // Extract part of speech from tags
  const partOfSpeech = extractPartOfSpeech(tags);

  for (const def of definitions) {
    const glossary = extractGlossary(def);
    if (glossary.length > 0) {
      result.push({ glossary, partOfSpeech });
    }
  }

  return result;
}

/**
 * Extract glossary text from a Yomitan definition
 */
function extractGlossary(def: YomitanDefinition): string[] {
  if (typeof def === 'string') {
    return [def];
  }

  if (def.type === 'text') {
    return [def.text];
  }

  if (def.type === 'structured-content') {
    return extractTextFromStructuredContent(def.content);
  }

  return [];
}

/**
 * Recursively extract text from Yomitan structured-content
 */
function extractTextFromStructuredContent(content: unknown): string[] {
  if (typeof content === 'string') {
    return [content];
  }

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const item of content) {
      texts.push(...extractTextFromStructuredContent(item));
    }
    return texts;
  }

  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;

    // Skip reference/link elements
    if (obj.data && (obj.data as Record<string, unknown>).content === 'references') {
      return [];
    }

    // Handle list items
    if (obj.tag === 'li' && obj.content) {
      const text = extractTextFromStructuredContent(obj.content);
      return text;
    }

    // Handle lists
    if ((obj.tag === 'ul' || obj.tag === 'ol') && obj.content) {
      return extractTextFromStructuredContent(obj.content);
    }

    // Handle spans and other containers
    if (obj.content) {
      return extractTextFromStructuredContent(obj.content);
    }
  }

  return [];
}

/**
 * Extract part of speech tags from the tags string
 */
function extractPartOfSpeech(tags: string): string[] {
  const posMap: Record<string, string> = {
    n: 'noun',
    v1: 'ichidan verb',
    v5: 'godan verb',
    v5u: 'godan verb (u)',
    v5k: 'godan verb (ku)',
    v5g: 'godan verb (gu)',
    v5s: 'godan verb (su)',
    v5t: 'godan verb (tsu)',
    v5n: 'godan verb (nu)',
    v5b: 'godan verb (bu)',
    v5m: 'godan verb (mu)',
    v5r: 'godan verb (ru)',
    vs: 'suru verb',
    vk: 'kuru verb',
    vz: 'zuru verb',
    'adj-i': 'i-adjective',
    'adj-na': 'na-adjective',
    'adj-no': 'no-adjective',
    adv: 'adverb',
    prt: 'particle',
    conj: 'conjunction',
    int: 'interjection',
    pn: 'pronoun',
    suf: 'suffix',
    pref: 'prefix',
    exp: 'expression',
    vi: 'intransitive',
    vt: 'transitive'
  };

  const parts: string[] = [];
  const tagList = tags.split(' ');

  for (const tag of tagList) {
    // Handle numbered tags like "1" which are just entry markers
    if (/^\d+$/.test(tag)) continue;

    if (posMap[tag]) {
      parts.push(posMap[tag]);
    }
  }

  return parts;
}
