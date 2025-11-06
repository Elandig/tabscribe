<script lang="ts">
	import type { Tab } from '$lib/types';
	import { recorderState } from '$lib/stores/recorder';

	interface Props {
		activeTab: Tab;
		onTabChange: (tab: Tab) => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'home', label: 'Home' },
		{ id: 'settings', label: 'Settings' }
	];
</script>

<div class="border-b border-gray-200">
	<nav class="flex -mb-px">
		{#each tabs as tab}
			{@const isDisabled = tab.id === 'settings' && $recorderState.isRecording}
			<button
				type="button"
				class="px-6 py-3 text-sm font-medium transition-colors {activeTab === tab.id
					? 'border-b-2 border-blue-500 text-blue-600'
					: 'text-gray-500 hover:text-gray-700 hover:border-gray-300'} {isDisabled
					? 'opacity-50 cursor-not-allowed'
					: ''}"
				disabled={isDisabled}
				onclick={() => onTabChange(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</nav>
</div>
