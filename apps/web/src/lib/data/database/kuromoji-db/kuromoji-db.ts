/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

const DB_NAME = 'kuromoji-dict-cache';
const DB_VERSION = 1;
const STORE_NAME = 'dictionaries';
const META_STORE = 'meta';

// Uncompressed .dat files from @aiktb/kuromoji CDN
const KUROMOJI_DICT_FILES = [
  'base.dat',
  'check.dat',
  'tid.dat',
  'tid_pos.dat',
  'tid_map.dat',
  'cc.dat',
  'unk.dat',
  'unk_pos.dat',
  'unk_map.dat',
  'unk_char.dat',
  'unk_compat.dat',
  'unk_invoke.dat'
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

export async function isKuromojiCached(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(META_STORE, 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.get('cached');

      request.onsuccess = () => resolve(request.result === true);
      request.onerror = () => resolve(false);

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

export async function setKuromojiCached(cached: boolean): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(META_STORE, 'readwrite');
    const store = transaction.objectStore(META_STORE);
    const request = store.put(cached, 'cached');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function getCachedDictionary(filename: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(filename);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function cacheDictionary(filename: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, filename);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

export async function clearKuromojiCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, META_STORE], 'readwrite');

    const dictStore = transaction.objectStore(STORE_NAME);
    dictStore.clear();

    const metaStore = transaction.objectStore(META_STORE);
    metaStore.delete('cached');

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export function getKuromojiDictFiles(): string[] {
  return KUROMOJI_DICT_FILES;
}
