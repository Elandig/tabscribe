<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { RecordingConfig } from '$lib/types';
	import { ScreenRecorder, createRecording } from '$lib/recording/recorder';
	import { recorderState } from '$lib/stores/recorder';
	import { recordings } from '$lib/stores/recordings';
	import { settings } from '$lib/stores/settings';
	import { transcriptionManager } from '$lib/transcription/manager';
	import { LiveSpeechRecognition } from '$lib/transcription/live-speech';
	import { formatDuration } from '$lib/utils/formatters';
	import {
		getSupportedAudioCodecs,
		getSupportedVideoCodecs,
		getDefaultSupportedAudioCodec,
		getDefaultSupportedVideoCodec
	} from '$lib/recording/formats';

	interface Props {
		onRecordingStopped?: () => void;
	}

	let { onRecordingStopped = undefined }: Props = $props();

	let recorder = new ScreenRecorder();
	let liveTranscription = new LiveSpeechRecognition();

	let supportedAudioCodecs = $state(getSupportedAudioCodecs());
	let supportedVideoCodecs = $state(getSupportedVideoCodecs());

	let config = $state<RecordingConfig>({
		mode: $settings.recording.defaultMode,
		videoCodec:
			(supportedVideoCodecs.find((c) => c.value === $settings.recording.defaultVideoCodec)
				?.value as any) || getDefaultSupportedVideoCodec(),
		audioCodec:
			(supportedAudioCodecs.find((c) => c.value === $settings.recording.defaultAudioCodec)
				?.value as any) || getDefaultSupportedAudioCodec(),
		audioBitrate: $settings.recording.defaultAudioBitrate,
		videoBitrate: $settings.recording.defaultVideoBitrate
	});

	let codecWarning = $state<string | null>(null);
	let liveTranscript = $state<string>('');

	onMount(() => {
		if (supportedAudioCodecs.length === 0) {
			codecWarning = 'No supported audio codecs found.';
		} else if (supportedVideoCodecs.length === 0) {
			codecWarning = 'No supported video codecs found.';
		}
	});

	async function startRecording() {
		try {
			liveTranscript = '';

			await recorder.start(config);

			if (
				$settings.transcription.enabled &&
				$settings.transcription.enableLiveTranscription &&
				liveTranscription.isSupported()
			) {
				try {
					const audioTrack = recorder.getAudioTrack();

					liveTranscription.start(
						$settings.transcription.language,
						(text) => {
							liveTranscript = text;
						},
						audioTrack || undefined
					);
				} catch (error) {
					console.error('Failed to start live transcription:', error);
				}
			}
		} catch (error) {
			console.error('Failed to start recording:', error);
		}
	}

	async function stopRecording() {
		try {
			let finalLiveTranscript = '';
			if (liveTranscription.isActive()) {
				finalLiveTranscript = liveTranscription.stop();
			}

			const blob = await recorder.stop();
			const recording = createRecording(blob, config, $recorderState.duration);

			if (finalLiveTranscript) {
				recording.liveTranscription = finalLiveTranscript;
			}

			await recordings.add(recording);

			if ($settings.transcription.enabled && $settings.transcription.autoTranscribe) {
				if (transcriptionManager.isAvailable()) {
					transcriptionManager.transcribe(recording, {
						language: $settings.transcription.language,
						speaker_labels: $settings.transcription.speaker_labels,
						speakers_expected: $settings.transcription.speakers_expected
					});
				}
			}

			liveTranscript = '';

			if (onRecordingStopped) {
				onRecordingStopped();
			}
		} catch (error) {
			console.error('Failed to stop recording:', error);
		}
	}

	function pauseRecording() {
		recorder.pause();
	}

	function resumeRecording() {
		recorder.resume();
	}

	onDestroy(() => {
	});
</script>

<div class="max-w-2xl mx-auto">
	<div class="bg-white rounded-lg p-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-6">Recording Studio</h2>

		{#if $recorderState.error}
			<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
				<p class="text-red-800 text-sm">
					<strong>Error:</strong>
					{$recorderState.error}
				</p>
			</div>
		{/if}

		{#if codecWarning}
			<div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
				<p class="text-yellow-800 text-sm">
					<strong>Warning:</strong>
					{codecWarning}
				</p>
			</div>
		{/if}

		{#if $recorderState.isRecording}
			<div class="mb-6 p-6 bg-red-50 border-2 border-red-500 rounded-lg">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
						<span class="text-lg font-bold text-red-900">
							{$recorderState.isPaused ? 'PAUSED' : 'RECORDING'}
						</span>
					</div>
					<div class="text-2xl font-mono font-bold text-red-900">
						{formatDuration($recorderState.duration)}
					</div>
				</div>

				<p class="text-sm text-red-800">
					Screen + Audio
					{config.audioCodec.toUpperCase()} @ {config.audioBitrate} kbps
					{config.videoCodec?.toUpperCase()}
				</p>
			</div>

			{#if $settings.transcription.enabled && $settings.transcription.enableLiveTranscription && liveTranscript}
				<div class="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
					<h3 class="text-sm font-semibold text-blue-900 mb-2">Live Transcription (Browser)</h3>
					<div class="text-sm text-gray-800 max-h-40 overflow-y-auto">
						{liveTranscript}
					</div>
				</div>
			{/if}
		{/if}

		<div class="flex gap-3">
			{#if !$recorderState.isRecording}
				<button
					type="button"
					onclick={startRecording}
					class="flex-1 py-3 px-6 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
				>
					Start Recording
				</button>
			{:else}
				{#if !$recorderState.isPaused}
					<button
						type="button"
						onclick={pauseRecording}
						class="flex-1 py-3 px-6 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
					>
						Pause
					</button>
				{:else}
					<button
						type="button"
						onclick={resumeRecording}
						class="flex-1 py-3 px-6 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
					>
						Resume
					</button>
				{/if}

				<button
					type="button"
					onclick={stopRecording}
					class="flex-1 py-3 px-6 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
				>
					Stop & Save
				</button>
			{/if}
		</div>
	</div>
</div>
