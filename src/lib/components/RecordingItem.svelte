<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Recording } from '$lib/types';
	import { formatDuration, formatFileSize, formatRelativeTime } from '$lib/utils/formatters';
	import { downloadRecording } from '$lib/utils/file-export';
	import { recordings } from '$lib/stores/recordings';
	import { settings } from '$lib/stores/settings';
	import { transcriptionManager } from '$lib/transcription/manager';

	interface Props {
		recording: Recording;
	}

	let { recording }: Props = $props();

	let isDeleting = $state(false);
	let isTranscribing = $state(false);
	let showLiveTranscription = $state(false);
	let showCloudTranscription = $state(false);
	let videoUrl = $state<string | null>(null);
	let videoElement: HTMLVideoElement | null = $state(null);

	$effect(() => {
		videoUrl = URL.createObjectURL(recording.blob);
	});

	onDestroy(() => {
		if (videoUrl) {
			URL.revokeObjectURL(videoUrl);
		}
	});

	async function handleVideoMetadata() {
		if (videoElement && recording.duration === 0) {
			const videoDuration = videoElement.duration;
			if (isFinite(videoDuration) && videoDuration > 0) {
				await recordings.update(recording.id, { duration: Math.floor(videoDuration) });
			}
		}
	}

	async function handleDownload() {
		const success = await downloadRecording(recording);
		if (success) {
			await recordings.update(recording.id, { isDownloaded: true });
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this recording?')) {
			return;
		}

		isDeleting = true;
		await recordings.delete(recording.id);
	}

	async function handleTranscribe() {
		if (isTranscribing) return;

		if (!transcriptionManager.isAvailable()) {
			alert('Please configure your transcription service API key in Settings.');
			return;
		}

		isTranscribing = true;
		await transcriptionManager.transcribe(recording, {
			language: $settings.transcription.language,
			speaker_labels: $settings.transcription.speaker_labels,
			speakers_expected: $settings.transcription.speakers_expected
		});
		isTranscribing = false;
	}

	async function handleRetranscribe() {
		if (isTranscribing) return;

		if (!confirm('This will replace the existing transcription. Continue?')) {
			return;
		}

		isTranscribing = true;
		await transcriptionManager.retryTranscription(recording, {
			language: $settings.transcription.language,
			speaker_labels: $settings.transcription.speaker_labels,
			speakers_expected: $settings.transcription.speakers_expected
		});
		isTranscribing = false;
	}

	async function downloadTranscription(text: string, suffix: string) {
		if (!text) return;

		const blob = new Blob([text], { type: 'text/plain' });
		const filename = recording.filename.replace(/\.[^/.]+$/, '') + `_${suffix}.txt`;

		if ('showSaveFilePicker' in window) {
			try {
				const handle = await (window as any).showSaveFilePicker({
					suggestedName: filename,
					types: [
						{
							description: 'Text Files',
							accept: { 'text/plain': ['.txt'] }
						}
					]
				});
				const writable = await handle.createWritable();
				await writable.write(blob);
				await writable.close();
			} catch (error) {
				if ((error as Error).name !== 'AbortError') {
					console.error('Error saving file:', error);
				}
			}
		} else {
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'processing':
				return 'bg-blue-100 text-blue-800';
			case 'error':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow overflow-x-auto overflow-y-hidden">
	<div class="flex items-start justify-between mb-3">
		<div class="flex-1">
			<h3 class="font-medium text-gray-900 mb-1">{recording.filename}</h3>
			<div class="flex items-center gap-3 text-sm text-gray-600">
				<span>{formatDuration(recording.duration)}</span>
				<span>|</span>
				<span>{formatFileSize(recording.size)}</span>
				<span>|</span>
				<span>{formatRelativeTime(recording.createdAt)}</span>
				{#if recording.isDownloaded}
					<span>|</span>
					<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">Downloaded</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={handleDownload}
				class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
				title="Download"
			>
				Download
			</button>

			<button
				type="button"
				onclick={handleDelete}
				disabled={isDeleting}
				class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
				title="Delete"
			>
				Delete
			</button>
		</div>
	</div>

	{#if videoUrl}
		<div class="mb-3">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={videoElement}
				src={videoUrl}
				controls
				class="w-full rounded"
				preload="auto"
				onloadedmetadata={handleVideoMetadata}
			></video>
		</div>
	{/if}

	{#if recording.liveTranscription}
		<div class="mt-3 pt-3 border-t border-gray-200">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-gray-700">Live Transcription (Browser)</span>
					<span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">Available</span>
				</div>

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (showLiveTranscription = !showLiveTranscription)}
						class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
					>
						{showLiveTranscription ? 'Hide' : 'Show'} Live Transcript
					</button>
					<button
						type="button"
						onclick={() => downloadTranscription(recording.liveTranscription!, 'live_transcript')}
						class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
					>
						Download
					</button>
				</div>
			</div>

			{#if showLiveTranscription}
				<div
					class="mt-2 p-3 bg-blue-50 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto"
				>
					{recording.liveTranscription}
				</div>
			{/if}
		</div>
	{/if}

	<div class="mt-3 pt-3 border-t border-gray-200">
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-700"
					>Cloud Transcription (3rd Party Service)</span
				>
				{#if recording.transcription}
					<span
						class="px-2 py-0.5 rounded text-xs {getStatusBadgeClass(recording.transcription.status)}"
					>
						{recording.transcription.status}
					</span>
				{/if}
			</div>

			{#if !recording.transcription || recording.transcription.status === 'error'}
				<button
					type="button"
					onclick={handleTranscribe}
					disabled={isTranscribing || !transcriptionManager.isAvailable()}
					class="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isTranscribing ? 'Transcribing...' : 'Transcribe via 3rd Party Service'}
				</button>
			{/if}

			{#if recording.transcription?.status === 'completed' && recording.transcription.text}
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (showCloudTranscription = !showCloudTranscription)}
						class="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
					>
						{showCloudTranscription ? 'Hide' : 'Show'} Cloud Transcript
					</button>
					<button
						type="button"
						onclick={() =>
							downloadTranscription(
								recording.transcription!.text!,
								'cloud_transcript'
							)}
						class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
					>
						Download
					</button>
					<button
						type="button"
						onclick={handleRetranscribe}
						disabled={isTranscribing || !transcriptionManager.isAvailable()}
						class="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isTranscribing ? 'Re-transcribing...' : 'Re-transcribe'}
					</button>
				</div>
			{/if}
		</div>

		{#if recording.transcription?.status === 'processing'}
			<p class="text-sm text-gray-600">Transcription in progress...</p>
		{:else if recording.transcription?.status === 'error'}
			<p class="text-sm text-red-600">Error: {recording.transcription.error || 'Unknown error'}</p>
		{:else if recording.transcription?.status === 'completed' && showCloudTranscription && recording.transcription.text}
			<div
				class="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto"
			>
				{recording.transcription.text}
			</div>
		{:else if !recording.transcription}
			<p class="text-sm text-gray-500">No transcription available</p>
		{/if}
	</div>
</div>
