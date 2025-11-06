import type { Recording, StorageSettings } from '$lib/types';
import * as db from '$lib/db/indexeddb';
import { recordings } from '$lib/stores/recordings';

function getRecordingsToDeleteIds(allRecordings: Recording[], settings: StorageSettings): Set<string> {
	const toDelete = new Set<string>();

	if (settings.autoDeleteAfterDays !== null && settings.autoDeleteAfterDays > 0) {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - settings.autoDeleteAfterDays);
		allRecordings.forEach(r => {
			if (r.createdAt < cutoffDate) toDelete.add(r.id);
		});
	}

	if (settings.autoDeleteAfterDownload) {
		allRecordings.forEach(r => {
			if (r.isDownloaded) toDelete.add(r.id);
		});
	}

	if (settings.keepOnlyLastN !== null && settings.keepOnlyLastN > 0) {
		const sorted = [...allRecordings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		sorted.slice(settings.keepOnlyLastN).forEach(r => toDelete.add(r.id));
	}

	return toDelete;
}

export async function runAutoCleanup(storageSettings: StorageSettings): Promise<number> {
	const allRecordings = await db.getAllRecordings();
	const toDelete = Array.from(getRecordingsToDeleteIds(allRecordings, storageSettings));
	if (toDelete.length > 0) {
		await recordings.deleteMultiple(toDelete);
	}
	return toDelete.length;
}

export async function getRecordingsToDelete(storageSettings: StorageSettings): Promise<Recording[]> {
	const allRecordings = await db.getAllRecordings();
	const toDelete = getRecordingsToDeleteIds(allRecordings, storageSettings);
	return allRecordings.filter(r => toDelete.has(r.id));
}
