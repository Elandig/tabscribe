import { openDB, type IDBPDatabase } from 'idb';
import type { Recording } from '$lib/types';

const DB_NAME = 'tabscribe-recordings';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
	if (dbInstance) {
		return dbInstance;
	}

	dbInstance = await openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				store.createIndex('createdAt', 'createdAt');
				store.createIndex('isDownloaded', 'isDownloaded');
				store.createIndex('transcription.status', 'transcription.status');
			}
		}
	});

	return dbInstance;
}

export async function saveRecording(recording: Recording): Promise<void> {
	const db = await getDB();
	await db.put(STORE_NAME, recording);
}

export async function getAllRecordings(): Promise<Recording[]> {
	const db = await getDB();
	const recordings = await db.getAll(STORE_NAME);
	return recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getRecording(id: string): Promise<Recording | undefined> {
	const db = await getDB();
	return db.get(STORE_NAME, id);
}

export async function updateRecording(id: string, updates: Partial<Recording>): Promise<void> {
	const db = await getDB();
	const recording = await db.get(STORE_NAME, id);

	if (!recording) {
		throw new Error(`Recording with id ${id} not found`);
	}

	const updated = { ...recording, ...updates };
	await db.put(STORE_NAME, updated);
}

export async function deleteRecording(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(STORE_NAME, id);
}

export async function deleteRecordings(ids: string[]): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done]);
}

export async function clearAllRecordings(): Promise<void> {
	const db = await getDB();
	await db.clear(STORE_NAME);
}

export async function getTotalStorageSize(): Promise<number> {
	const recordings = await getAllRecordings();
	return recordings.reduce((total, recording) => total + recording.size, 0);
}
