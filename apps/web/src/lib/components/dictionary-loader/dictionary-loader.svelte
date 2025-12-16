<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { faBook } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import {
    loadDictionary,
    checkDictionaryStatus,
    type LoadProgress
  } from '$lib/data/database/dictionary-db/dictionary-loader';

  const dispatch = createEventDispatcher<{ complete: void; error: Error }>();

  let progress: LoadProgress = { current: 0, total: 52, phase: 'checking' };
  let errorMessage = '';

  onMount(async () => {
    try {
      const status = await checkDictionaryStatus();

      if (status.needsLoad) {
        await loadDictionary((p) => {
          progress = p;
        });
      }

      dispatch('complete');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch('error', error instanceof Error ? error : new Error(errorMessage));
    }
  });

  $: percentage = Math.round((progress.current / progress.total) * 100);

  $: phaseText = getPhaseText(progress);

  function getPhaseText(p: LoadProgress): string {
    if (p.phase === 'checking') return 'Checking dictionary...';
    if (p.phase === 'loading') return `Loading dictionary files... (${p.current + 1}/${p.total})`;
    if (p.phase === 'storing') return `Storing entries... (${p.current + 1}/${p.total})`;
    return 'Dictionary ready!';
  }
</script>

<div
  class="writing-horizontal-tb fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95"
>
  <div class="w-full max-w-md px-6 text-center text-white">
    <div class="mb-6">
      <Fa icon={faBook} class="text-6xl opacity-80" />
    </div>

    <h2 class="mb-2 text-2xl font-medium">Setting up Word Lookup</h2>
    <p class="mb-8 text-sm text-gray-400">This only happens once</p>

    {#if errorMessage}
      <div class="mb-4 rounded bg-red-900/50 p-4 text-red-200">
        <p class="font-medium">Error loading</p>
        <p class="text-sm">{errorMessage}</p>
      </div>
    {:else}
      <div class="mb-4">
        <div class="mb-2 h-2 overflow-hidden rounded-full bg-gray-700">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            style="width: {percentage}%"
          />
        </div>
        <p class="text-sm text-gray-400">{phaseText}</p>
      </div>

      <p class="text-xs text-gray-500">Loading JMdict dictionary (~50MB) for word lookup</p>
    {/if}
  </div>
</div>
