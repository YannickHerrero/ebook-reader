/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

const CACHE_KEY = 'ttu-translation-cache';

interface CacheEntry {
  translation: string;
  timestamp: number;
}

interface TranslationCache {
  [hash: string]: CacheEntry;
}

interface TranslateResponse {
  translation?: string;
  error?: string;
}

export interface TranslationResult {
  translation: string | null;
  error: string | null;
}

/**
 * Generate a simple hash for cache key
 */
async function hashSentence(sentence: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sentence);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get translation cache from localStorage
 */
function getCache(): TranslationCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save translation to cache
 */
function saveToCache(hash: string, translation: string): void {
  try {
    const cache = getCache();
    cache[hash] = {
      translation,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Get cached translation if available
 */
function getCachedTranslation(hash: string): string | null {
  const cache = getCache();
  const entry = cache[hash];
  return entry?.translation ?? null;
}

/**
 * Translate a Japanese sentence to English using the local API endpoint
 */
export async function translateSentence(
  sentence: string,
  apiKey: string
): Promise<TranslationResult> {
  if (!sentence?.trim() || !apiKey?.trim()) {
    return { translation: null, error: null };
  }

  try {
    // Check cache first
    const hash = await hashSentence(sentence);
    const cached = getCachedTranslation(hash);
    if (cached) {
      return { translation: cached, error: null };
    }

    // Call local API endpoint (which proxies to DeepL)
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sentence,
        apiKey
      })
    });

    const data: TranslateResponse = await response.json();

    if (!response.ok || data.error) {
      return { translation: null, error: data.error || `Translation failed (${response.status})` };
    }

    if (!data.translation) {
      return { translation: null, error: null };
    }

    // Cache the result
    saveToCache(hash, data.translation);

    return { translation: data.translation, error: null };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { translation: null, error: 'Failed to connect to translation service.' };
    }
    return { translation: null, error: 'Translation failed. Please try again.' };
  }
}
