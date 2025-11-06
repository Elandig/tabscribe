<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Recording } from '$lib/types';
	import { formatDuration } from '$lib/utils/formatters';

	interface Props {
		recording: Recording;
		autoPlay?: boolean;
	}

	let { recording, autoPlay = false }: Props = $props();

	let audio: HTMLAudioElement | null = $state(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(recording.duration);
	let volume = $state(1);
	let playbackRate = $state(1);
	let audioUrl = $state<string | null>(null);
	let hasAutoPlayed = $state(false);

	onMount(() => {
		audioUrl = URL.createObjectURL(recording.blob);
	});

	$effect(() => {
		if (autoPlay && audio && !hasAutoPlayed) {
			audio.play().catch(error => {
				console.warn('Auto-play failed:', error);
			});
			hasAutoPlayed = true;
		}
	});

	onDestroy(() => {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
		}
	});

	function togglePlay() {
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	}

	function handleTimeUpdate() {
		if (audio) {
			currentTime = audio.currentTime;
		}
	}

	function handleLoadedMetadata() {
		if (audio) {
			const audioDuration = audio.duration;
			if (isFinite(audioDuration) && audioDuration > 0) {
				duration = audioDuration;
			} else {
				duration = recording.duration;
			}
		}
	}

	function handlePlay() {
		isPlaying = true;
	}

	function handlePause() {
		isPlaying = false;
	}

	function handleEnded() {
		isPlaying = false;
		currentTime = 0;
	}

	function seek(e: Event) {
		const target = e.target as HTMLInputElement;
		const time = parseFloat(target.value);
		if (audio) {
			audio.currentTime = time;
			currentTime = time;
		}
	}

	function changeVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		const vol = parseFloat(target.value);
		volume = vol;
		if (audio) {
			audio.volume = vol;
		}
	}

	function changePlaybackRate(rate: number) {
		playbackRate = rate;
		if (audio) {
			audio.playbackRate = rate;
		}
	}
</script>

<div class="bg-gray-50 rounded-lg p-4">
	{#if audioUrl}
		<audio
			bind:this={audio}
			src={audioUrl}
			ontimeupdate={handleTimeUpdate}
			onloadedmetadata={handleLoadedMetadata}
			onplay={handlePlay}
			onpause={handlePause}
			onended={handleEnded}
		></audio>
	{/if}

	<div class="flex items-center gap-4 mb-3">
		<button
			type="button"
			onclick={togglePlay}
			class="w-10 h-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center"
		>
			{#if isPlaying}
				<span>⏸</span>
			{:else}
				<span>▶️</span>
			{/if}
		</button>

		<div class="flex-1">
			<input
				type="range"
				min="0"
				max={duration || 0}
				value={currentTime}
				oninput={seek}
				class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
			/>
			<div class="flex justify-between text-xs text-gray-600 mt-1">
				<span>{formatDuration(Math.floor(currentTime))}</span>
				<span>{formatDuration(Math.floor(duration))}</span>
			</div>
		</div>
	</div>

	<div class="flex items-center gap-4 text-sm">
		<div class="flex items-center gap-2">
			<span class="text-gray-600">🔊</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.1"
				value={volume}
				oninput={changeVolume}
				class="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
			/>
		</div>

		<div class="flex items-center gap-2">
			<span class="text-gray-600">Speed:</span>
			<div class="flex gap-1">
				{#each [0.5, 0.75, 1, 1.25, 1.5, 2] as rate}
					<button
						type="button"
						onclick={() => changePlaybackRate(rate)}
						class="px-2 py-1 rounded {playbackRate === rate
							? 'bg-blue-500 text-white'
							: 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						{rate}x
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
