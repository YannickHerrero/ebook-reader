/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'kuromoji-dict-cache';
const DB_VERSION = 1;
const STORE_NAME = 'dictionaries';
const META_STORE = 'meta';

interface KuromojiDbSchema {
  dictionaries: {
    key: string;
    value: ArrayBuffer;
  };
  meta: {
    key: string;
    value: string | number | boolean;
  };
}

let dbPromise: Promise<IDBPDatabase<KuromojiDbSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<KuromojiDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<KuromojiDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Get a cached dictionary file from IndexedDB
 */
export async function getCachedDictionary(filename: string): Promise<ArrayBuffer | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, filename);
}

/**
 * Store a dictionary file in IndexedDB
 */
export async function cacheDictionary(filename: string, data: ArrayBuffer): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, data, filename);
}

/**
 * Check if kuromoji dictionaries are cached
 */
export async function isKuromojiCached(): Promise<boolean> {
  const db = await getDb();
  const cached = await db.get(META_STORE, 'cached');
  return cached === true;
}

/**
 * Mark kuromoji dictionaries as cached
 */
export async function setKuromojiCached(cached: boolean): Promise<void> {
  const db = await getDb();
  await db.put(META_STORE, cached, 'cached');
}

/**
 * Clear all cached kuromoji dictionaries
 */
export async function clearKuromojiCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
  await db.put(META_STORE, false, 'cached');
}

/**
 * Get all dictionary filenames that should be cached
 */
export function getKuromojiDictFiles(): string[] {
  return [
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
}
