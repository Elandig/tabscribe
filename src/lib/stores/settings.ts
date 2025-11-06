import { writable, get } from 'svelte/store';
import type { AppSettings } from '$lib/types';

const SETTINGS_KEY = 'tabscribe-settings';

const defaultSettings: AppSettings = {
	recording: {
		defaultMode: 'audio-only',
		defaultVideoCodec: 'vp9',
		defaultAudioCodec: 'opus',
		defaultAudioBitrate: 128,
		defaultVideoBitrate: 2500
	},
	storage: {
		autoDeleteAfterDays: null,
		autoDeleteAfterDownload: false,
		keepOnlyLastN: null
	},
	transcription: {
		enabled: true,
		autoTranscribe: true,
		service: 'assemblyai',
		assemblyAIKey: '',
		language: 'auto',
		speaker_labels: true,
		speakers_expected: 2,
		enableLiveTranscription: true
	}
};

function loadSettings(): AppSettings {
	if (typeof window === 'undefined') {
		return defaultSettings;
	}

	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				...defaultSettings,
				...parsed,
				recording: { ...defaultSettings.recording, ...parsed.recording },
				storage: { ...defaultSettings.storage, ...parsed.storage },
				transcription: { ...defaultSettings.transcription, ...parsed.transcription }
			};
		}
	} catch (error) {
		console.error('Failed to load settings:', error);
	}

	return defaultSettings;
}

function createSettingsStore() {
	const { subscribe, set, update } = writable<AppSettings>(loadSettings());

	return {
		subscribe,

		update(updater: (settings: AppSettings) => AppSettings) {
			update(settings => {
				const updated = updater(settings);
				this.save(updated);
				return updated;
			});
		},

		updateRecording(updates: Partial<AppSettings['recording']>) {
			this.update(settings => ({
				...settings,
				recording: { ...settings.recording, ...updates }
			}));
		},

		updateStorage(updates: Partial<AppSettings['storage']>) {
			this.update(settings => ({
				...settings,
				storage: { ...settings.storage, ...updates }
			}));
		},

		updateTranscription(updates: Partial<AppSettings['transcription']>) {
			this.update(settings => ({
				...settings,
				transcription: { ...settings.transcription, ...updates }
			}));
		},

		save(settings: AppSettings) {
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
				} catch (error) {
					console.error('Failed to save settings:', error);
				}
			}
		},

		reset() {
			set(defaultSettings);
			this.save(defaultSettings);
		},

		isTranscriptionReady(): boolean {
			const settings = get(this);
			return settings.transcription.enabled &&
				   settings.transcription.service === 'assemblyai' &&
				   settings.transcription.assemblyAIKey.length > 0;
		}
	};
}

export const settings = createSettingsStore();
