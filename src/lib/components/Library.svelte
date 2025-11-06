<script lang="ts">
	import type { Recording } from '$lib/types';
	import { recordings } from '$lib/stores/recordings';
	import { settings } from '$lib/stores/settings';
	import { formatFileSize } from '$lib/utils/formatters';
	import { transcriptionManager } from '$lib/transcription/manager';
	import RecordingItem from './RecordingItem.svelte';

	let searchQuery = $state('');
	let filterStatus = $state<'all' | 'transcribed' | 'not-transcribed'>('all');
	let sortBy = $state<'date' | 'size' | 'duration'>('date');
	let selectedIds = $state<Set<string>>(new Set());

	let filteredRecordings = $derived(() => {
		let items = $recordings;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter(
				(r) =>
					r.filename.toLowerCase().includes(query) ||
					r.transcription?.text?.toLowerCase().includes(query)
			);
		}

		// Status filter
		if (filterStatus === 'transcribed') {
			items = items.filter((r) => r.transcription?.status === 'completed');
		} else if (filterStatus === 'not-transcribed') {
			items = items.filter((r) => !r.transcription || r.transcription.status !== 'completed');
		}

		// Sort
		items = [...items].sort((a, b) => {
			switch (sortBy) {
				case 'date':
					return b.createdAt.getTime() - a.createdAt.getTime();
				case 'size':
					return b.size - a.size;
				case 'duration':
					return b.duration - a.duration;
				default:
					return 0;
			}
		});

		return items;
	});

	let totalSize = $derived(() => {
		return $recordings.reduce((sum, r) => sum + r.size, 0);
	});

	function toggleSelection(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	function selectAll() {
		selectedIds = new Set(filteredRecordings().map((r) => r.id));
	}

	function clearSelection() {
		selectedIds = new Set();
	}

	async function deleteSelected() {
		if (selectedIds.size === 0) return;

		if (!confirm(`Are you sure you want to delete ${selectedIds.size} recording(s)?`)) {
			return;
		}

		await recordings.deleteMultiple([...selectedIds]);
		selectedIds = new Set();
	}

	async function clearAllRecordings() {
		if (!confirm('Are you sure you want to delete ALL recordings?')) {
			return;
		}

		await recordings.clear();
		selectedIds = new Set();
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;

		if (!files || files.length === 0) return;

		for (const file of Array.from(files)) {
			const url = URL.createObjectURL(file);
			const video = document.createElement('video');

			video.onloadedmetadata = async () => {
				const duration = Math.floor(video.duration);
				URL.revokeObjectURL(url);

				const recording: Recording = {
					id: crypto.randomUUID(),
					filename: file.name,
					blob: file,
					mimeType: file.type,
					size: file.size,
					duration,
					createdAt: new Date(),
					isDownloaded: false,
					recordingMode: 'screen-audio'
				};

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
			};

			video.src = url;
		}

		input.value = '';
	}
</script>

<div class="max-w-4xl mx-auto">
	<div class="bg-white rounded-lg p-6 mb-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-2xl font-bold text-gray-900">Library</h2>
			<div class="flex items-center gap-4">
				<label class="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm">
					Upload File
					<input
						type="file"
						accept="audio/*,video/*"
						multiple
						onchange={handleFileUpload}
						class="hidden"
					/>
				</label>
				<div class="text-sm text-gray-600">
					{$recordings.length} recording{$recordings.length !== 1 ? 's' : ''}
					{formatFileSize(totalSize())}
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search recordings..."
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
			/>

			<select
				bind:value={filterStatus}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
			>
				<option value="all">All recordings</option>
				<option value="transcribed">Transcribed only</option>
				<option value="not-transcribed">Not transcribed</option>
			</select>

			<select
				bind:value={sortBy}
				class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
			>
				<option value="date">Sort by date</option>
				<option value="size">Sort by size</option>
				<option value="duration">Sort by duration</option>
			</select>
		</div>

		<!-- Batch actions -->
		{#if selectedIds.size > 0}
			<div class="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
				<span class="text-sm text-blue-900 font-medium">
					{selectedIds.size} recording{selectedIds.size !== 1 ? 's' : ''} selected
				</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={deleteSelected}
						class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
					>
						Delete Selected
					</button>
					<button
						type="button"
						onclick={clearSelection}
						class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
					>
						Clear Selection
					</button>
				</div>
			</div>
		{:else}
			<div class="mt-4 flex items-center justify-between">
				<button
					type="button"
					onclick={selectAll}
					disabled={filteredRecordings().length === 0}
					class="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					Select all
				</button>
				<button
					type="button"
					onclick={clearAllRecordings}
					disabled={$recordings.length === 0}
					class="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
				>
					Delete all recordings
				</button>
			</div>
		{/if}
	</div>

	<!-- Recordings list -->
	<div class="space-y-4">
		{#if filteredRecordings().length === 0}
			<div class="bg-white rounded-lg border-t border-gray-200 p-12 text-center">
				<h3 class="text-xl font-medium text-gray-900 mb-2">No recordings found</h3>
				<p class="text-gray-600">
					{#if searchQuery || filterStatus !== 'all'}
						Try adjusting your search or filters
					{:else}
						Start recording to see your recordings here
					{/if}
				</p>
			</div>
		{:else}
			{#each filteredRecordings() as recording (recording.id)}
				<div class="relative">
					<!-- Selection checkbox -->
					<div class="absolute top-4 left-4 z-10">
						<input
							type="checkbox"
							checked={selectedIds.has(recording.id)}
							onchange={() => toggleSelection(recording.id)}
							class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div class="pl-12 pr-6 pb-6">
						<RecordingItem {recording} />
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
