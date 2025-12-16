<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { faBook, faLanguage } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import {
    loadDictionary,
    checkDictionaryStatus,
    type LoadProgress
  } from '$lib/data/database/dictionary-db/dictionary-loader';
  import { initFuriganaGenerator } from '$lib/functions/furigana/furigana-generator';
  import type { KuromojiLoadProgress } from '$lib/data/database/kuromoji-db/kuromoji-loader';

  const dispatch = createEventDispatcher<{ complete: void; error: Error }>();

  type LoadingStage = 'kuromoji' | 'jmdict';

  let stage: LoadingStage = 'kuromoji';
  let jmdictProgress: LoadProgress = { current: 0, total: 52, phase: 'checking' };
  let kuromojiProgress: KuromojiLoadProgress = { current: 0, total: 12, phase: 'loading' };
  let errorMessage = '';

  onMount(async () => {
    try {
      // Stage 1: Load Kuromoji for furigana (~18MB, cached by service worker)
      stage = 'kuromoji';

      await initFuriganaGenerator((p) => {
        kuromojiProgress = p;
      });

      // Stage 2: Load JMdict (larger, ~50MB)
      stage = 'jmdict';
      const status = await checkDictionaryStatus();

      if (status.needsLoad) {
        await loadDictionary((p) => {
          jmdictProgress = p;
        });
      }

      dispatch('complete');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch('error', error instanceof Error ? error : new Error(errorMessage));
    }
  });

  $: currentProgress = stage === 'kuromoji' ? kuromojiProgress : jmdictProgress;
  $: totalSteps = stage === 'kuromoji' ? 12 : 52;
  $: percentage = Math.round((currentProgress.current / totalSteps) * 100);

  $: phaseText = getPhaseText(stage, currentProgress);

  function getPhaseText(
    currentStage: LoadingStage,
    progress: LoadProgress | KuromojiLoadProgress
  ): string {
    if (currentStage === 'kuromoji') {
      const p = progress as KuromojiLoadProgress;
      if (p.phase === 'loading') return `Loading furigana engine... (${p.current}/${p.total})`;
      return 'Furigana engine ready!';
    } else {
      const p = progress as LoadProgress;
      if (p.phase === 'checking') return 'Checking dictionary...';
      if (p.phase === 'loading') return `Loading dictionary files... (${p.current + 1}/${p.total})`;
      if (p.phase === 'storing') return `Storing entries... (${p.current + 1}/${p.total})`;
      return 'Dictionary ready!';
    }
  }

  $: stageTitle = stage === 'kuromoji' ? 'Setting up Furigana' : 'Setting up Japanese Dictionary';
  $: stageDescription =
    stage === 'kuromoji'
      ? 'Loading morphological analyzer (~18MB) for furigana'
      : 'Loading JMdict dictionary (~50MB) for word lookup';
  $: stageIcon = stage === 'kuromoji' ? faLanguage : faBook;
</script>

<div
  class="writing-horizontal-tb fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95"
>
  <div class="w-full max-w-md px-6 text-center text-white">
    <div class="mb-6">
      <Fa icon={stageIcon} class="text-6xl opacity-80" />
    </div>

    <h2 class="mb-2 text-2xl font-medium">{stageTitle}</h2>
    <p class="mb-8 text-sm text-gray-400">This only happens once</p>

    {#if errorMessage}
      <div class="mb-4 rounded bg-red-900/50 p-4 text-red-200">
        <p class="font-medium">Error loading</p>
        <p class="text-sm">{errorMessage}</p>
      </div>
    {:else}
      <!-- Stage indicators -->
      <div class="mb-6 flex justify-center gap-2">
        <div
          class="h-2 w-2 rounded-full transition-colors"
          class:bg-blue-500={stage === 'kuromoji'}
          class:bg-green-500={stage === 'jmdict'}
        />
        <div
          class="h-2 w-2 rounded-full transition-colors"
          class:bg-gray-600={stage === 'kuromoji'}
          class:bg-blue-500={stage === 'jmdict'}
        />
      </div>

      <div class="mb-4">
        <div class="mb-2 h-2 overflow-hidden rounded-full bg-gray-700">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            style="width: {percentage}%"
          />
        </div>
        <p class="text-sm text-gray-400">{phaseText}</p>
      </div>

      <p class="text-xs text-gray-500">
        {stageDescription}
      </p>
    {/if}
  </div>
</div>
