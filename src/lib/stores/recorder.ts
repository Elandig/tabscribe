import { writable } from 'svelte/store';
import type { RecorderState } from '$lib/types';

function createRecorderStore() {
	const { subscribe, set, update } = writable<RecorderState>({
		isRecording: false,
		isPaused: false,
		duration: 0,
		error: null
	});

	return {
		subscribe,

		startRecording() {
			update(state => ({
				...state,
				isRecording: true,
				isPaused: false,
				duration: 0,
				error: null
			}));
		},

		stopRecording() {
			update(state => ({
				...state,
				isRecording: false,
				isPaused: false,
				duration: 0
			}));
		},

		pauseRecording() {
			update(state => ({
				...state,
				isPaused: true
			}));
		},

		resumeRecording() {
			update(state => ({
				...state,
				isPaused: false
			}));
		},

		updateDuration(duration: number) {
			update(state => ({
				...state,
				duration
			}));
		},

		setError(error: string | null) {
			update(state => ({
				...state,
				error,
				isRecording: error ? false : state.isRecording
			}));
		},

		reset() {
			set({
				isRecording: false,
				isPaused: false,
				duration: 0,
				error: null
			});
		}
	};
}

export const recorderState = createRecorderStore();
