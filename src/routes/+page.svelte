<script lang="ts">
	import { onMount } from 'svelte';
	import type { Tab } from '$lib/types';
	import { recordings } from '$lib/stores/recordings';
	import { settings } from '$lib/stores/settings';
	import { recorderState } from '$lib/stores/recorder';
	import { runAutoCleanup } from '$lib/utils/storage-cleanup';
	import { transcriptionManager } from '$lib/transcription/manager';
	import TabNavigation from '$lib/components/TabNavigation.svelte';
	import Recorder from '$lib/components/Recorder.svelte';
	import Library from '$lib/components/Library.svelte';
	import Settings from '$lib/components/Settings.svelte';

	let activeTab = $state<Tab>('home');
	let isFirefox = $state(false);

	onMount(async () => {
		isFirefox = /firefox/i.test(navigator.userAgent);
		await recordings.load();

		const inProgressRecordings = $recordings.filter(
			(r) => r.transcription?.status === 'processing' || r.transcription?.status === 'pending'
		);

		if (inProgressRecordings.length > 0) {
			console.log(`Resuming polling for ${inProgressRecordings.length} in-progress transcription(s)`);
			for (const recording of inProgressRecordings) {
				await transcriptionManager.resumePolling(recording);
			}
		}

		if (
			$settings.storage.autoDeleteAfterDays !== null ||
			$settings.storage.autoDeleteAfterDownload ||
			$settings.storage.keepOnlyLastN !== null
		) {
			const deletedCount = await runAutoCleanup($settings.storage);
			if (deletedCount > 0) {
				console.log(`Auto-cleanup: Deleted ${deletedCount} recording(s)`);
			}
		}
	});

	$effect(() => {
		function handleBeforeUnload(e: BeforeUnloadEvent) {
			if ($recorderState.isRecording) {
				e.preventDefault();
				return (e.returnValue = 'Recording in progress. Are you sure you want to leave?');
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', handleBeforeUnload);

			return () => {
				window.removeEventListener('beforeunload', handleBeforeUnload);
			};
		}
	});

	function handleTabChange(tab: Tab) {
		activeTab = tab;
	}
</script>

<svelte:head>
	<title>TabScribe - Offline-first meeting transcription in your browser</title>
	<meta name="description" content="Transcribe your meetings directly in your browser without third-party services. Privacy-first with optional cloud transcription support." />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://tabscribe.sestudio.org/" />
	<meta property="og:title" content="TabScribe - Offline-first meeting transcription in your browser" />
	<meta property="og:description" content="Transcribe your meetings directly in your browser without third-party services. Privacy-first with optional cloud transcription support." />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary" />
	<meta property="twitter:url" content="https://tabscribe.sestudio.org/" />
	<meta property="twitter:title" content="TabScribe - Offline-first meeting transcription in your browser" />
	<meta property="twitter:description" content="Transcribe your meetings directly in your browser without third-party services. Privacy-first with optional cloud transcription support." />

	<!-- Additional SEO -->
	<meta name="keywords" content="offline transcription, browser transcription, privacy-first transcription, meeting transcription, tab audio recording, live transcription, local transcription, no cloud required, AssemblyAI optional" />
	<meta name="author" content="TabScribe" />
	<link rel="canonical" href="https://tabscribe.sestudio.org/" />

	<script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>

<div class="min-h-screen bg-gray-100">
	<header class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">TabScribe</h1>
				<div class="flex items-center gap-4">
					<p class="text-sm text-gray-600">Offline-first meeting transcription in your browser</p>
					<a class="github-button" href="https://github.com/Elandig/tabscribe" data-color-scheme="no-preference: light; light: light; dark: light;" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star Elandig/tabscribe on GitHub">Star</a>
				</div>
			</div>
		</div>
	</header>

	{#if isFirefox}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<p class="text-sm text-yellow-900">
					<strong>Firefox detected:</strong> Tab audio recording only works in Chromium browsers (Chrome, Edge, Brave). Firefox does not support capturing tab audio.
				</p>
			</div>
		</div>
	{/if}

	{#if !$settings.transcription.assemblyAIKey?.length}
						<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<p class="text-sm text-yellow-900">
					<strong>Optional:</strong> Set your AssemblyAI API key in the settings tab to use the third-party transcription service.
				</p>
			</div>
		</div>
	{/if}

	{#if $settings.transcription.enableLiveTranscription && $settings.transcription.language === 'auto'}
						<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<p class="text-sm text-yellow-900">
					<strong>Warning:</strong> Set the language in the settings tab to use in-browser live transcription.
				</p>
			</div>
		</div>
	{/if}

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
		<div class="bg-white rounded-lg shadow">
			<TabNavigation {activeTab} onTabChange={handleTabChange} />

			<div class="p-6">
				{#if activeTab === 'home'}
					<div class="space-y-8">
						<Recorder />
						<div class="border-t border-gray-200 pt-8">
							<Library />
						</div>
					</div>
				{:else if activeTab === 'settings'}
					<Settings />
				{/if}
			</div>
		</div>
	</div>

	<footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
		<div class="text-center text-sm text-gray-500">
			<p>
				Who needs Fathom?
			</p>
		</div>
	</footer>
</div>
