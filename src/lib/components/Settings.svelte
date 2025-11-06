<script lang="ts">
	import { settings } from '$lib/stores/settings';
	import { recordings } from '$lib/stores/recordings';
	import { runAutoCleanup, getRecordingsToDelete } from '$lib/utils/storage-cleanup';
	import { formatFileSize } from '$lib/utils/formatters';
	import { transcriptionManager } from '$lib/transcription/manager';
	import type { RecordingMode, VideoCodec, AudioCodec, TranscriptionService } from '$lib/types';

	let totalSize = $state(0);
	let recordingsToDelete = $state(0);
	let cleanupMessage = $state<string | null>(null);
	let transcriptionCleanupMessage = $state<string | null>(null);
	let isFirefox = $state(false);

	$effect(() => {
		if (typeof window !== 'undefined') {
			isFirefox = /firefox/i.test(navigator.userAgent);
		}
	});

	// Load initial values
	$effect(() => {
		loadStorageInfo();
	});

	async function loadStorageInfo() {
		totalSize = await recordings.getTotalSize();
		const toDelete = await getRecordingsToDelete($settings.storage);
		recordingsToDelete = toDelete.length;
	}

	async function handleRunCleanup() {
		const count = await runAutoCleanup($settings.storage);
		cleanupMessage = `Deleted ${count} recording${count !== 1 ? 's' : ''}`;
		await loadStorageInfo();

		setTimeout(() => {
			cleanupMessage = null;
		}, 3000);
	}

	function handleSettingsChange() {
		loadStorageInfo();
	}

	async function handleClearInProgressTranscriptions() {
		const count = await transcriptionManager.clearAllInProgressTranscriptions();
		transcriptionCleanupMessage = `Cleared ${count} in-progress transcription${count !== 1 ? 's' : ''}`;

		setTimeout(() => {
			transcriptionCleanupMessage = null;
		}, 3000);
	}
</script>

<div class="max-w-3xl mx-auto">
	<div class="bg-white rounded-lg shadow p-6">
		<h2 class="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

		<!-- Storage Settings -->
		<section class="mb-8 pb-8 border-b border-gray-200">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Storage Management</h3>

			<div class="mb-4 p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-gray-700">Current Storage Usage</span>
					<span class="text-sm font-bold text-gray-900">{formatFileSize(totalSize)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-gray-700">Recording Count</span>
					<span class="text-sm font-bold text-gray-900">{$recordings.length}</span>
				</div>
				{#if recordingsToDelete > 0}
					<div class="mt-2 pt-2 border-t border-gray-200">
						<p class="text-sm text-amber-700">
							{recordingsToDelete} recording{recordingsToDelete !== 1 ? 's' : ''} will be deleted on the next
							cleanup
						</p>
					</div>
				{/if}
			</div>

			{#if cleanupMessage}
				<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
					<p class="text-sm text-green-800">{cleanupMessage}</p>
				</div>
			{/if}

			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="autoDeleteDays"
						checked={$settings.storage.autoDeleteAfterDays !== null}
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							if (target.checked) {
								settings.updateStorage({ autoDeleteAfterDays: 30 });
							} else {
								settings.updateStorage({ autoDeleteAfterDays: null });
							}
							handleSettingsChange();
						}}
						class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
					/>
					<label for="autoDeleteDays" class="flex-1 text-sm font-medium text-gray-700"
						>Auto-delete recordings older than</label
					>
					<input
						type="number"
						min="1"
						max="365"
						disabled={$settings.storage.autoDeleteAfterDays === null}
						value={$settings.storage.autoDeleteAfterDays ?? ''}
						oninput={(e) => {
							const target = e.target as HTMLInputElement;
							const value = parseInt(target.value);
							if (!isNaN(value) && value > 0) {
								settings.updateStorage({ autoDeleteAfterDays: value });
								handleSettingsChange();
							}
						}}
						class="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
					/>
					<span class="text-sm text-gray-600">days</span>
				</div>

				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="autoDeleteDownloaded"
						checked={$settings.storage.autoDeleteAfterDownload}
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							settings.updateStorage({ autoDeleteAfterDownload: target.checked });
							handleSettingsChange();
						}}
						class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
					/>
					<label for="autoDeleteDownloaded" class="flex-1 text-sm font-medium text-gray-700"
						>Auto-delete recordings after download</label
					>
				</div>

				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="keepOnlyLast"
						checked={$settings.storage.keepOnlyLastN !== null}
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							if (target.checked) {
								settings.updateStorage({ keepOnlyLastN: 10 });
							} else {
								settings.updateStorage({ keepOnlyLastN: null });
							}
							handleSettingsChange();
						}}
						class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
					/>
					<label for="keepOnlyLast" class="flex-1 text-sm font-medium text-gray-700"
						>Keep only last</label
					>
					<input
						type="number"
						min="1"
						max="100"
						disabled={$settings.storage.keepOnlyLastN === null}
						value={$settings.storage.keepOnlyLastN ?? ''}
						oninput={(e) => {
							const target = e.target as HTMLInputElement;
							const value = parseInt(target.value);
							if (!isNaN(value) && value > 0) {
								settings.updateStorage({ keepOnlyLastN: value });
								handleSettingsChange();
							}
						}}
						class="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
					/>
					<span class="text-sm text-gray-600">recordings</span>
				</div>
			</div>

			<button
				type="button"
				onclick={handleRunCleanup}
				class="mt-4 w-full py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
			>
				Run Cleanup Now
			</button>
		</section>

		<!-- Transcription Settings -->
		<section class="mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Transcription</h3>

			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<input
						type="checkbox"
						id="enableTranscription"
						checked={$settings.transcription.enabled}
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							settings.updateTranscription({ enabled: target.checked });
						}}
						class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
					/>
					<label for="enableTranscription" class="text-sm font-medium text-gray-700"
						>Enable transcription</label
					>
				</div>

				{#if $settings.transcription.enabled}
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="autoTranscribe"
							checked={$settings.transcription.autoTranscribe}
							onchange={(e) => {
								const target = e.target as HTMLInputElement;
								settings.updateTranscription({ autoTranscribe: target.checked });
							}}
							class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
						/>
						<label for="autoTranscribe" class="text-sm font-medium text-gray-700"
							>Auto-transcribe after recording</label
						>
					</div>

					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="enableLiveTranscription"
							checked={$settings.transcription.enableLiveTranscription}
							onchange={(e) => {
								const target = e.target as HTMLInputElement;
								settings.updateTranscription({ enableLiveTranscription: target.checked });
							}}
							class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
						/>
						<label for="enableLiveTranscription" class="text-sm font-medium text-gray-700"
							>Enable Live Transcription (Browser)</label
						>
					</div>
					{#if $settings.transcription.enableLiveTranscription && isFirefox}
						<p class="text-xs text-orange-600">
							<strong>Warning:</strong> Browser speech recognition is not supported in Firefox. Use Chrome, Edge, or Brave.
						</p>
					{/if}

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-gray-700 mb-2">Cloud Transcription Service</label>
						<select
							value={$settings.transcription.service}
							onchange={(e) => {
								const target = e.target as HTMLSelectElement;
								settings.updateTranscription({ service: target.value as any });
							}}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						>
							<option value="assemblyai">AssemblyAI</option>
						</select>
						<p class="mt-1 text-xs text-gray-500">
							Select the cloud transcription service provider. Configure your API key below.
						</p>
					</div>

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
						<select
							value={$settings.transcription.language}
							onchange={(e) => {
								const target = e.target as HTMLSelectElement;
								settings.updateTranscription({ language: target.value });
							}}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						>
							<option value="en">English</option>
							<option value="es">Spanish</option>
							<option value="fr">French</option>
							<option value="de">German</option>
							<option value="it">Italian</option>
							<option value="pt">Portuguese</option>
							<option value="nl">Dutch</option>
							<option value="hi">Hindi</option>
							<option value="ja">Japanese</option>
							<option value="zh">Chinese</option>
							<option value="ko">Korean</option>
							<option value="ru">Russian</option>
							<option value="ar">Arabic</option>
							<option value="tr">Turkish</option>
							<option value="pl">Polish</option>
							<option value="uk">Ukrainian</option>
							<option value="vi">Vietnamese</option>
							<option value="auto">Auto-detect</option>
						</select>
						<p class="mt-1 text-xs text-gray-500">
							Select the primary language of your audio for better transcription accuracy.
						</p>
					</div>

					{#if $settings.transcription.service === 'assemblyai'}
						<div class="space-y-3">
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={$settings.transcription.speaker_labels}
									onchange={(e) =>
										settings.updateTranscription({
											speaker_labels: (e.target as HTMLInputElement).checked
										})}
									class="rounded"
								/>
								<span class="text-sm font-medium text-gray-700">Speaker labels</span>
							</label>

							{#if $settings.transcription.speaker_labels}
								<div class="ml-6">
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="text-xs text-gray-600">Expected speakers:</label>
									<input
										type="number"
										min="1"
										max="10"
										value={$settings.transcription.speakers_expected}
										oninput={(e) =>
											settings.updateTranscription({
												speakers_expected: parseInt((e.target as HTMLInputElement).value)
											})}
										class="ml-2 w-16 px-2 py-1 border rounded text-sm"
									/>
								</div>
							{/if}
						</div>
					{/if}

					{#if $settings.transcription.service === 'assemblyai'}
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium text-gray-700 mb-2">AssemblyAI API Key</label>
							<input
								type="password"
								value={$settings.transcription.assemblyAIKey}
								oninput={(e) => {
									const target = e.target as HTMLInputElement;
									settings.updateTranscription({ assemblyAIKey: target.value });
								}}
								placeholder="Enter your AssemblyAI API key"
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							/>
							<p class="mt-1 text-xs text-gray-500">
								Get your API key from
								<a
									href="https://www.assemblyai.com/dashboard/signup"
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-600 hover:text-blue-700">AssemblyAI Dashboard</a
								>
							</p>
						</div>
					{/if}

					<!-- Clear in-progress transcriptions -->
					<div class="mt-4 pt-4 border-t border-gray-200">
						<button
							type="button"
							onclick={handleClearInProgressTranscriptions}
							class="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
						>
							Clear In-Progress Transcriptions
						</button>
						<p class="mt-2 text-xs text-gray-500">
							Clear all in-progress or pending transcriptions
						</p>
						{#if transcriptionCleanupMessage}
							<div class="mt-2 p-2 bg-green-50 text-green-700 rounded text-sm">
								{transcriptionCleanupMessage}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<!-- Reset button -->
		<div class="mt-8 pt-8 border-t border-gray-200">
			<button
				type="button"
				onclick={() => {
					if (confirm('Are you sure you want to reset all settings to defaults?')) {
						settings.reset();
					}
				}}
				class="w-full py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
			>
				Reset to Defaults
			</button>
		</div>
	</div>
</div>
