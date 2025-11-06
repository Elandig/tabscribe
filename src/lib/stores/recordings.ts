import { writable } from 'svelte/store';
import type { Recording } from '$lib/types';
import * as db from '$lib/db/indexeddb';

function createRecordingsStore() {
	const { subscribe, set, update } = writable<Recording[]>([]);

	return {
		subscribe,

		async load() {
			const recordings = await db.getAllRecordings();
			set(recordings);
		},

		async add(recording: Recording) {
			await db.saveRecording(recording);
			update(recordings => [recording, ...recordings]);
		},

		async update(id: string, updates: Partial<Recording>) {
			await db.updateRecording(id, updates);
			update(recordings =>
				recordings.map(r => (r.id === id ? { ...r, ...updates } : r))
			);
		},

		async delete(id: string) {
			await db.deleteRecording(id);
			update(recordings => recordings.filter(r => r.id !== id));
		},

		async deleteMultiple(ids: string[]) {
			await db.deleteRecordings(ids);
			update(recordings => recordings.filter(r => !ids.includes(r.id)));
		},

		async clear() {
			await db.clearAllRecordings();
			set([]);
		},

		async getTotalSize(): Promise<number> {
			return db.getTotalStorageSize();
		}
	};
}

export const recordings = createRecordingsStore();
