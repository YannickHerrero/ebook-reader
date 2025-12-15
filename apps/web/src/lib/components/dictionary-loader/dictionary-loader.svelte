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
  import { isKuromojiCached } from '$lib/data/database/kuromoji-db/kuromoji-db';
  import type { KuromojiLoadProgress } from '$lib/data/database/kuromoji-db/kuromoji-loader';

  const dispatch = createEventDispatcher<{ complete: void; error: Error }>();

  type LoadingStage = 'jmdict' | 'kuromoji';

  let stage: LoadingStage = 'jmdict';
  let jmdictProgress: LoadProgress = { current: 0, total: 52, phase: 'checking' };
  let kuromojiProgress: KuromojiLoadProgress = { current: 0, total: 12, phase: 'checking' };
  let errorMessage = '';

  onMount(async () => {
    try {
      // Stage 1: Load JMdict
      stage = 'jmdict';
      const status = await checkDictionaryStatus();

      if (status.needsLoad) {
        await loadDictionary((p) => {
          jmdictProgress = p;
        });
      }

      // Stage 2: Load Kuromoji for furigana
      stage = 'kuromoji';
      const kuromojiCached = await isKuromojiCached();

      if (!kuromojiCached) {
        kuromojiProgress = { current: 0, total: 12, phase: 'checking' };
      }

      await initFuriganaGenerator((p) => {
        kuromojiProgress = p;
      });

      dispatch('complete');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch('error', error instanceof Error ? error : new Error(errorMessage));
    }
  });

  $: currentProgress = stage === 'jmdict' ? jmdictProgress : kuromojiProgress;
  $: totalSteps = stage === 'jmdict' ? 52 : 12;
  $: percentage = Math.round((currentProgress.current / totalSteps) * 100);

  $: phaseText = getPhaseText(stage, currentProgress);

  function getPhaseText(
    currentStage: LoadingStage,
    progress: LoadProgress | KuromojiLoadProgress
  ): string {
    if (currentStage === 'jmdict') {
      const p = progress as LoadProgress;
      if (p.phase === 'checking') return 'Checking dictionary...';
      if (p.phase === 'loading') return `Loading dictionary files... (${p.current + 1}/${p.total})`;
      if (p.phase === 'storing') return `Storing entries... (${p.current + 1}/${p.total})`;
      return 'Dictionary ready!';
    } else {
      const p = progress as KuromojiLoadProgress;
      if (p.phase === 'checking') return 'Checking furigana engine...';
      if (p.phase === 'downloading')
        return `Downloading ${p.filename || 'files'}... (${p.current + 1}/${p.total})`;
      if (p.phase === 'caching') return `Caching ${p.filename || 'files'}...`;
      if (p.phase === 'loading') return `Loading furigana engine... (${p.current}/${p.total})`;
      return 'Furigana engine ready!';
    }
  }

  $: stageTitle = stage === 'jmdict' ? 'Setting up Japanese Dictionary' : 'Setting up Furigana';
  $: stageDescription =
    stage === 'jmdict'
      ? 'Loading JMdict dictionary (~50MB) for word lookup'
      : 'Loading morphological analyzer (~18MB) for furigana';
  $: stageIcon = stage === 'jmdict' ? faBook : faLanguage;
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
          class:bg-blue-500={stage === 'jmdict'}
          class:bg-green-500={stage === 'kuromoji'}
        />
        <div
          class="h-2 w-2 rounded-full transition-colors"
          class:bg-gray-600={stage === 'jmdict'}
          class:bg-blue-500={stage === 'kuromoji'}
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
