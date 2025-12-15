/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';

export interface DictionaryEntry {
  id?: number;
  term: string;
  reading: string;
  tags: string;
  rules: string;
  score: number;
  definitions: DictionaryDefinition[];
  sequence: number;
}

export interface DictionaryDefinition {
  glossary: string[];
  partOfSpeech: string[];
}

export interface DictionaryMetadata {
  key: string;
  value: string | number;
}

export interface DictionaryDb extends DBSchema {
  terms: {
    key: number;
    value: DictionaryEntry;
    indexes: {
      term: string;
      reading: string;
      'term-reading': [string, string];
    };
  };
  metadata: {
    key: string;
    value: DictionaryMetadata;
  };
}

const DB_NAME = 'dictionary';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DictionaryDb> | null = null;

export async function openDictionaryDb(): Promise<IDBPDatabase<DictionaryDb>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<DictionaryDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create terms store
      if (!db.objectStoreNames.contains('terms')) {
        const termsStore = db.createObjectStore('terms', {
          keyPath: 'id',
          autoIncrement: true
        });
        termsStore.createIndex('term', 'term', { unique: false });
        termsStore.createIndex('reading', 'reading', { unique: false });
        termsStore.createIndex('term-reading', ['term', 'reading'], { unique: false });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    }
  });

  return dbInstance;
}

export async function closeDictionaryDb(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getDictionaryVersion(): Promise<string | null> {
  const db = await openDictionaryDb();
  const metadata = await db.get('metadata', 'version');
  return metadata?.value as string | null;
}

export async function setDictionaryVersion(version: string): Promise<void> {
  const db = await openDictionaryDb();
  await db.put('metadata', { key: 'version', value: version });
}

export async function getDictionaryEntryCount(): Promise<number> {
  const db = await openDictionaryDb();
  return db.count('terms');
}

export async function clearDictionary(): Promise<void> {
  const db = await openDictionaryDb();
  const tx = db.transaction(['terms', 'metadata'], 'readwrite');
  await tx.objectStore('terms').clear();
  await tx.objectStore('metadata').clear();
  await tx.done;
}

export async function addDictionaryEntries(entries: DictionaryEntry[]): Promise<void> {
  const db = await openDictionaryDb();
  const tx = db.transaction('terms', 'readwrite');
  const store = tx.objectStore('terms');

  for (const entry of entries) {
    await store.add(entry);
  }

  await tx.done;
}

export async function lookupByTerm(term: string): Promise<DictionaryEntry[]> {
  const db = await openDictionaryDb();
  return db.getAllFromIndex('terms', 'term', term);
}

export async function lookupByReading(reading: string): Promise<DictionaryEntry[]> {
  const db = await openDictionaryDb();
  return db.getAllFromIndex('terms', 'reading', reading);
}

export async function lookupByTermOrReading(text: string): Promise<DictionaryEntry[]> {
  const db = await openDictionaryDb();
  const byTerm = await db.getAllFromIndex('terms', 'term', text);
  const byReading = await db.getAllFromIndex('terms', 'reading', text);

  // Combine and deduplicate by sequence number
  const seen = new Set<number>();
  const results: DictionaryEntry[] = [];

  for (const entry of [...byTerm, ...byReading]) {
    if (!seen.has(entry.sequence)) {
      seen.add(entry.sequence);
      results.push(entry);
    }
  }

  // Sort by score (higher is better/more common)
  results.sort((a, b) => b.score - a.score);

  return results;
}
