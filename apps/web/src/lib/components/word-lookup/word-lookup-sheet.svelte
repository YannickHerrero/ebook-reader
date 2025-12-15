<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintInOut } from 'svelte/easing';
  import { faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import { clickOutside } from '$lib/functions/use-click-outside';
  import { wordLookupState$, closeWordLookup } from './word-lookup';
  import { skipKeyDownListener$ } from '$lib/data/store';
  import {
    addFuriganaWithHighlight,
    isFuriganaReady
  } from '$lib/functions/furigana/furigana-generator';

  const MAX_INITIAL_DEFINITIONS = 5;

  let showAllDefinitions = false;
  let furiganaHtml = '';
  let isLoadingFurigana = false;

  $: result = $wordLookupState$.results[0];
  $: definitions = result?.definitions || [];
  $: visibleDefinitions = showAllDefinitions
    ? definitions
    : definitions.slice(0, MAX_INITIAL_DEFINITIONS);
  $: hasMoreDefinitions = definitions.length > MAX_INITIAL_DEFINITIONS;
  $: showDictionaryForm =
    result && result.dictionaryForm !== result.selectedWord && result.dictionaryForm !== '';

  // Generate furigana for the sentence when it changes
  $: if ($wordLookupState$.sentence && $wordLookupState$.selectedWord) {
    generateFurigana($wordLookupState$.sentence, $wordLookupState$.selectedWord);
  } else {
    furiganaHtml = '';
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

  function highlightWord(sentence: string, word: string): string {
    if (!sentence || !word) return sentence;

    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'g');
    return sentence.replace(regex, '<mark class="bg-yellow-300/50 rounded px-0.5">$1</mark>');
  }

  function handleClose() {
    showAllDefinitions = false;
    furiganaHtml = '';
    $skipKeyDownListener$ = false;
    closeWordLookup();
  }

  function toggleDefinitions() {
    showAllDefinitions = !showAllDefinitions;
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
    class="writing-horizontal-tb fixed z-[71] flex flex-col bg-white shadow-2xl bottom-sheet"
    in:fly|local={{ y: 100, duration: 200, easing: quintInOut }}
    out:fly|local={{ y: 100, duration: 150, easing: quintInOut }}
    use:clickOutside={handleClose}
  >
    <!-- Header -->
    <div class="flex items-start justify-between border-b border-gray-200 p-4">
      <div class="flex-1 pr-4">
        <!-- Selected word -->
        <div class="text-2xl font-medium text-gray-900">
          {$wordLookupState$.selectedWord}
        </div>

        <!-- Dictionary form and reading -->
        {#if showDictionaryForm || result.reading}
          <div class="mt-1 text-lg text-gray-600">
            {#if showDictionaryForm}
              <span class="font-medium">{result.dictionaryForm}</span>
            {/if}
            {#if result.reading && result.reading !== result.dictionaryForm}
              <span class="text-gray-500">【{result.reading}】</span>
            {/if}
          </div>
        {/if}

        <!-- Part of speech -->
        {#if result.partOfSpeech.length > 0}
          <div class="mt-1 flex flex-wrap gap-1">
            {#each result.partOfSpeech as pos}
              <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {pos}
              </span>
            {/each}
          </div>
        {/if}

        <!-- Inflection path -->
        {#if result.inflectionPath.length > 0}
          <div class="mt-1 text-xs text-gray-400">
            {result.inflectionPath.join(' → ')}
          </div>
        {/if}
      </div>

      <!-- Close button -->
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        on:click={handleClose}
        aria-label="Close"
      >
        <Fa icon={faTimes} />
      </button>
    </div>

    <!-- Definitions -->
    <div class="flex-1 overflow-y-auto p-4">
      {#if visibleDefinitions.length > 0}
        <ol class="list-inside list-decimal space-y-2 text-gray-700">
          {#each visibleDefinitions as definition, i}
            <li class="leading-relaxed">
              {definition}
            </li>
          {/each}
        </ol>

        {#if hasMoreDefinitions}
          <button
            class="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            on:click={toggleDefinitions}
          >
            <Fa icon={showAllDefinitions ? faChevronUp : faChevronDown} size="sm" />
            {showAllDefinitions
              ? 'Show less'
              : `Show ${definitions.length - MAX_INITIAL_DEFINITIONS} more`}
          </button>
        {/if}
      {:else}
        <p class="text-gray-500">No definitions found</p>
      {/if}
    </div>

    <!-- Sentence context -->
    {#if $wordLookupState$.sentence}
      <div class="border-t border-gray-200 bg-gray-50 p-4">
        <div class="text-xs font-medium uppercase tracking-wide text-gray-400">Context</div>
        <div class="mt-1 leading-relaxed text-gray-700 sentence-context">
          {#if isLoadingFurigana}
            <span class="text-gray-400">{$wordLookupState$.sentence}</span>
          {:else}
            {@html furiganaHtml}
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

  /* Furigana styling */
  .sentence-context :global(ruby) {
    ruby-align: center;
  }

  .sentence-context :global(rt) {
    font-size: 0.6em;
    color: #6b7280;
  }

  .sentence-context :global(rp) {
    display: none;
  }
</style>
