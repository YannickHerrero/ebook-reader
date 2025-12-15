<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintInOut } from 'svelte/easing';
  import { faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import { clickOutside } from '$lib/functions/use-click-outside';
  import { wordLookupState$, closeWordLookup } from './word-lookup';
  import { skipKeyDownListener$, deeplApiKey$, theme$, customThemes$ } from '$lib/data/store';
  import { availableThemes } from '$lib/data/theme-option';
  import {
    addFuriganaWithHighlight,
    isFuriganaReady
  } from '$lib/functions/furigana/furigana-generator';
  import { translateSentence } from '$lib/functions/translation/translate';

  const MAX_INITIAL_DEFINITIONS = 5;
  const MAX_TOP_RESULTS = 10;

  /**
   * Adjust the opacity of an rgba color string
   */
  function adjustColorOpacity(color: string, alpha: number): string {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    return color;
  }

  // Theme colors - match the book content theme
  $: themeOption =
    availableThemes.get($theme$) || $customThemes$[$theme$] || availableThemes.get('light-theme');
  $: backgroundColor = themeOption?.backgroundColor || 'rgba(255, 255, 255, 1)';
  $: fontColor = themeOption?.fontColor || 'rgba(0, 0, 0, 0.87)';
  $: borderColor = adjustColorOpacity(fontColor, 0.15);
  $: secondaryTextColor = adjustColorOpacity(fontColor, 0.6);
  $: mutedTextColor = adjustColorOpacity(fontColor, 0.4);
  $: sectionBgColor = adjustColorOpacity(fontColor, 0.05);
  $: highlightColor = adjustColorOpacity(fontColor, 0.2);
  $: hoverBgColor = adjustColorOpacity(fontColor, 0.1);
  $: tagBgColor = adjustColorOpacity(fontColor, 0.08);

  let showAllDefinitions = false;
  let showMoreEntries = false;
  let furiganaHtml = '';
  let isLoadingFurigana = false;
  let translation = '';
  let translationError = '';
  let isLoadingTranslation = false;

  // Primary result (first/best match)
  $: result = $wordLookupState$.results[0];
  $: definitions = result?.definitions || [];
  $: visibleDefinitions = showAllDefinitions
    ? definitions
    : definitions.slice(0, MAX_INITIAL_DEFINITIONS);
  $: hasMoreDefinitions = definitions.length > MAX_INITIAL_DEFINITIONS;
  $: showDictionaryForm =
    result && result.dictionaryForm !== result.selectedWord && result.dictionaryForm !== '';

  // Additional results (for "show more entries")
  $: additionalResults = $wordLookupState$.results.slice(1, MAX_TOP_RESULTS + 1);
  $: hasMoreEntries = additionalResults.length > 0;

  // Generate furigana for the sentence when it changes
  $: if ($wordLookupState$.sentence && $wordLookupState$.selectedWord) {
    generateFurigana($wordLookupState$.sentence, $wordLookupState$.selectedWord);
  } else {
    furiganaHtml = '';
  }

  // Fetch translation when sentence changes and API key is configured
  $: if ($wordLookupState$.sentence && $deeplApiKey$) {
    fetchTranslation($wordLookupState$.sentence, $deeplApiKey$);
  } else {
    translation = '';
    translationError = '';
  }

  // Disable page navigation when sheet is open
  $: if ($wordLookupState$.isOpen) {
    $skipKeyDownListener$ = true;
  }

  async function generateFurigana(sentence: string, selectedWord: string): Promise<void> {
    if (!isFuriganaReady()) {
      // Fallback to simple highlighting if furigana engine not ready
      furiganaHtml = highlightWord(sentence, selectedWord);
      return;
    }

    isLoadingFurigana = true;
    try {
      furiganaHtml = await addFuriganaWithHighlight(sentence, selectedWord);
    } catch {
      // Fallback on error
      furiganaHtml = highlightWord(sentence, selectedWord);
    } finally {
      isLoadingFurigana = false;
    }
  }

  async function fetchTranslation(sentence: string, apiKey: string): Promise<void> {
    if (!sentence || !apiKey) {
      translation = '';
      translationError = '';
      return;
    }

    isLoadingTranslation = true;
    translationError = '';
    try {
      const result = await translateSentence(sentence, apiKey);
      translation = result.translation || '';
      translationError = result.error || '';
    } catch {
      translationError = 'Translation failed. Please try again.';
      translation = '';
    } finally {
      isLoadingTranslation = false;
    }
  }

  function highlightWord(sentence: string, word: string): string {
    if (!sentence || !word) return sentence;

    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'g');
    return sentence.replace(regex, '<mark class="word-highlight">$1</mark>');
  }

  function handleClose() {
    showAllDefinitions = false;
    showMoreEntries = false;
    furiganaHtml = '';
    translation = '';
    translationError = '';
    $skipKeyDownListener$ = false;
    closeWordLookup();
  }

  function toggleDefinitions() {
    showAllDefinitions = !showAllDefinitions;
  }

  function toggleMoreEntries() {
    showMoreEntries = !showMoreEntries;
  }
</script>

{#if $wordLookupState$.isOpen && result}
  <!-- Backdrop -->
  <div
    class="writing-horizontal-tb fixed inset-0 z-[70] bg-black/30"
    on:click={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  />

  <!-- Bottom sheet -->
  <div
    class="writing-horizontal-tb fixed z-[71] flex flex-col shadow-2xl bottom-sheet"
    style="background-color: {backgroundColor}; color: {fontColor}; --highlight-color: {highlightColor}; --muted-color: {mutedTextColor};"
    in:fly|local={{ y: 100, duration: 200, easing: quintInOut }}
    out:fly|local={{ y: 100, duration: 150, easing: quintInOut }}
    use:clickOutside={handleClose}
  >
    <!-- Header -->
    <div class="flex items-start justify-between border-b p-4" style="border-color: {borderColor};">
      <div class="flex-1 pr-4">
        <!-- Selected word -->
        <div class="text-2xl font-medium">
          {$wordLookupState$.selectedWord}
        </div>

        <!-- Dictionary form and reading -->
        {#if showDictionaryForm || result.reading}
          <div class="mt-1 text-lg" style="color: {secondaryTextColor};">
            {#if showDictionaryForm}
              <span class="font-medium">{result.dictionaryForm}</span>
            {/if}
            {#if result.reading && result.reading !== result.dictionaryForm}
              <span style="color: {mutedTextColor};">【{result.reading}】</span>
            {/if}
          </div>
        {/if}

        <!-- Part of speech -->
        {#if result.partOfSpeech.length > 0}
          <div class="mt-1 flex flex-wrap gap-1">
            {#each result.partOfSpeech as pos}
              <span
                class="rounded px-2 py-0.5 text-xs"
                style="background-color: {tagBgColor}; color: {secondaryTextColor};"
              >
                {pos}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Inflection path -->
        {#if result.inflectionPath.length > 0}
          <div class="mt-1 text-xs" style="color: {mutedTextColor};">
            {result.inflectionPath.join(' → ')}
          </div>
        {/if}
      </div>

      <!-- Close button -->
      <button
        class="close-button flex h-8 w-8 items-center justify-center rounded-full"
        style="color: {mutedTextColor}; --hover-bg: {hoverBgColor}; --hover-color: {secondaryTextColor};"
        on:click={handleClose}
        aria-label="Close"
      >
        <Fa icon={faTimes} />
      </button>
    </div>

    <!-- Definitions -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if visibleDefinitions.length > 0}
        <ol class="list-inside list-decimal space-y-2">
          {#each visibleDefinitions as definition, i}
            <li class="leading-relaxed">
              {definition}
            </li>
          {/each}
        </ol>

        {#if hasMoreDefinitions}
          <button
            class="toggle-button mt-3 flex items-center gap-1 text-sm"
            style="color: {secondaryTextColor}; --hover-color: {fontColor};"
            on:click={toggleDefinitions}
          >
            <Fa icon={showAllDefinitions ? faChevronUp : faChevronDown} size="sm" />
            {showAllDefinitions
              ? 'Show less'
              : `Show ${definitions.length - MAX_INITIAL_DEFINITIONS} more`}
          </button>
        {/if}
      {:else}
        <p style="color: {mutedTextColor};">No definitions found</p>
      {/if}

      <!-- Additional dictionary entries -->
      {#if hasMoreEntries}
        <div class="mt-4 border-t pt-4" style="border-color: {borderColor};">
          <button
            class="toggle-button flex w-full items-center gap-1 text-sm"
            style="color: {secondaryTextColor}; --hover-color: {fontColor};"
            on:click={toggleMoreEntries}
          >
            <Fa icon={showMoreEntries ? faChevronUp : faChevronDown} size="sm" />
            {showMoreEntries
              ? 'Hide other entries'
              : `Show ${additionalResults.length} more ${additionalResults.length === 1 ? 'entry' : 'entries'}`}
          </button>

          {#if showMoreEntries}
            <div class="mt-3 space-y-3">
              {#each additionalResults as entry}
                <div class="rounded-lg p-3" style="background-color: {sectionBgColor};">
                  <!-- Entry header: word and reading -->
                  <div class="flex items-baseline gap-2">
                    <span class="font-medium">{entry.selectedWord}</span>
                    {#if entry.dictionaryForm && entry.dictionaryForm !== entry.selectedWord}
                      <span style="color: {secondaryTextColor};">→ {entry.dictionaryForm}</span>
                    {/if}
                    {#if entry.reading && entry.reading !== entry.dictionaryForm}
                      <span style="color: {mutedTextColor};">【{entry.reading}】</span>
                    {/if}
                  </div>

                  <!-- Inflection path -->
                  {#if entry.inflectionPath.length > 0}
                    <div class="mt-1 text-xs" style="color: {mutedTextColor};">
                      {entry.inflectionPath.join(' → ')}
                    </div>
                  {/if}

                  <!-- Definitions (up to 3) -->
                  {#if entry.definitions.length > 0}
                    <div class="mt-1 text-sm" style="color: {secondaryTextColor};">
                      {#each entry.definitions.slice(0, 3) as def, i}
                        <div>{i + 1}. {def}</div>
                      {/each}
                      {#if entry.definitions.length > 3}
                        <div style="color: {mutedTextColor};">
                          (+{entry.definitions.length - 3} more)
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Sentence context -->
    {#if $wordLookupState$.sentence}
      <div
        class="border-t p-4"
        style="border-color: {borderColor}; background-color: {sectionBgColor};"
      >
        <div class="text-xs font-medium uppercase tracking-wide" style="color: {mutedTextColor};">
          Context
        </div>
        <div class="mt-1 leading-relaxed sentence-context">
          {#if isLoadingFurigana}
            <span style="color: {mutedTextColor};">{$wordLookupState$.sentence}</span>
          {:else}
            {@html furiganaHtml}
          {/if}
        </div>
      </div>
    {/if}

    <!-- Translation -->
    {#if $deeplApiKey$ && $wordLookupState$.sentence}
      <div
        class="border-t p-4"
        style="border-color: {borderColor}; background-color: {sectionBgColor};"
      >
        <div class="text-xs font-medium uppercase tracking-wide" style="color: {mutedTextColor};">
          Translation
        </div>
        <div class="mt-1 leading-relaxed">
          {#if isLoadingTranslation}
            <span style="color: {mutedTextColor};">Translating...</span>
          {:else if translationError}
            <span class="text-sm text-red-500">{translationError}</span>
          {:else if translation}
            {translation}
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .bottom-sheet {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 70vh;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
  }

  @media (min-width: 640px) {
    .bottom-sheet {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
      max-width: 32rem;
      border-radius: 1rem 1rem 0 0;
    }
  }

  /* Close button hover */
  .close-button:hover {
    background-color: var(--hover-bg);
    color: var(--hover-color);
  }

  /* Toggle button hover */
  .toggle-button:hover {
    color: var(--hover-color);
  }

  /* Furigana styling */
  .sentence-context :global(ruby) {
    ruby-align: center;
  }

  .sentence-context :global(rt) {
    font-size: 0.6em;
    color: var(--muted-color);
  }

  .sentence-context :global(rp) {
    display: none;
  }

  /* Word highlight in context */
  .sentence-context :global(.word-highlight) {
    background-color: var(--highlight-color);
    border-radius: 0.125rem;
    padding: 0 0.125rem;
  }
</style>
