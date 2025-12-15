/**
 * @license BSD-3-Clause
 * Copyright (c) 2025, ッツ Reader Authors
 * All rights reserved.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

interface TranslateRequest {
  sentence: string;
  apiKey: string;
}

interface DeepLResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export const prerender = false;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { sentence, apiKey }: TranslateRequest = await request.json();

    if (!sentence?.trim()) {
      return json({ error: 'Sentence is required' }, { status: 400 });
    }

    if (!apiKey?.trim()) {
      return json({ error: 'API key is required' }, { status: 400 });
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [sentence],
        source_lang: 'JA',
        target_lang: 'EN'
      })
    });

    if (!response.ok) {
      if (response.status === 403) {
        return json({ error: 'Invalid API key. Please check your settings.' }, { status: 403 });
      }
      if (response.status === 429) {
        return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
      }
      if (response.status === 456) {
        return json({ error: 'Quota exceeded. Please check your DeepL account.' }, { status: 456 });
      }
      return json(
        { error: `Translation failed (${response.status})` },
        { status: response.status }
      );
    }

    const data: DeepLResponse = await response.json();
    const translation = data.translations?.[0]?.text;

    if (!translation) {
      return json({ error: 'No translation returned' }, { status: 500 });
    }

    return json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
};
