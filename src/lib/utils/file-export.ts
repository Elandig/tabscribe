import type { Recording } from '$lib/types';
import { extractAudio } from './audio-extractor';

export async function downloadRecording(recording: Recording): Promise<boolean> {
	try {
		if ('showSaveFilePicker' in window) {
			return await downloadWithFileSystemAPI(recording);
		}
		return downloadWithAnchor(recording);
	} catch (error) {
		console.error('Download failed:', error);
		return false;
	}
}

async function downloadWithFileSystemAPI(recording: Recording): Promise<boolean> {
	try {
		const baseMimeType = recording.mimeType.split(';')[0];
		const extension = getExtension(recording.filename);

		// @ts-expect-error - File System Access API not fully typed
		const handle = await window.showSaveFilePicker({
			suggestedName: recording.filename,
			types: [
				{
					description: 'Media Files',
					accept: {
						[baseMimeType]: [`.${extension}`]
					}
				}
			]
		});

		const writable = await handle.createWritable();
		await writable.write(recording.blob);
		await writable.close();

		return true;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return false;
		}
		console.warn('File System Access API failed, using fallback:', error);
		return downloadWithAnchor(recording);
	}
}

function downloadWithAnchor(recording: Recording): boolean {
	const url = URL.createObjectURL(recording.blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = recording.filename;
	a.style.display = 'none';

	document.body.appendChild(a);
	a.click();

	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);

	return true;
}

function getExtension(filename: string): string {
	const parts = filename.split('.');
	return parts.length > 1 ? parts[parts.length - 1] : 'webm';
}

export async function downloadMultipleRecordings(recordings: Recording[]): Promise<void> {
	for (const recording of recordings) {
		await downloadRecording(recording);
		await new Promise(resolve => setTimeout(resolve, 500));
	}
}

export function isFileSystemAccessSupported(): boolean {
	return 'showSaveFilePicker' in window;
}

export async function downloadAudioOnly(recording: Recording): Promise<boolean> {
	try {
		const audioBlob = await extractAudio(recording.blob);

		const audioFilename = recording.filename.replace(/\.(webm|mp4)$/, '-audio.webm');
		const audioRecording: Recording = {
			...recording,
			blob: audioBlob,
			filename: audioFilename,
			mimeType: 'audio/webm;codecs=opus'
		};

		if ('showSaveFilePicker' in window) {
			return await downloadWithFileSystemAPI(audioRecording);
		}
		return downloadWithAnchor(audioRecording);
	} catch (error) {
		console.error('Audio download failed:', error);
		throw new Error(
			error instanceof Error
				? error.message
				: 'Failed to extract and download audio. Please try again.'
		);
	}
}
