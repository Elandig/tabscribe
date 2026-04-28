import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { AudioDownloadFormat } from '$lib/types';

export interface ExtractAudioOptions {
	format?: AudioDownloadFormat;
	mp3Bitrate?: number;
	sourceMimeType?: string;
}

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

async function loadFFmpeg(): Promise<FFmpeg> {
	if (ffmpegInstance && ffmpegInstance.loaded) {
		return ffmpegInstance;
	}

	if (isLoading && loadPromise) {
		await loadPromise;
		return ffmpegInstance!;
	}

	isLoading = true;
	ffmpegInstance = new FFmpeg();

	loadPromise = (async () => {
		try {
			const baseURL = '/ffmpeg';

			await ffmpegInstance!.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
			});

			console.log('FFmpeg loaded successfully');
		} catch (error) {
			console.error('Failed to load FFmpeg:', error);
			ffmpegInstance = null;
			throw error;
		} finally {
			isLoading = false;
			loadPromise = null;
		}
	})();

	await loadPromise;
	return ffmpegInstance!;
}

export async function extractAudio(
	videoBlob: Blob,
	options: ExtractAudioOptions = {}
): Promise<Blob> {
	const format: AudioDownloadFormat = options.format ?? 'webm';
	const mp3Bitrate = options.mp3Bitrate ?? 128;
	const sourceIsWebm = (options.sourceMimeType ?? '').toLowerCase().includes('webm');

	try {
		const ffmpeg = await loadFFmpeg();

		const inputData = await fetchFile(videoBlob);
		await ffmpeg.writeFile('input.webm', inputData);

		const outputName = format === 'mp3' ? 'output.mp3' : 'output.webm';
		// WebM container only accepts Opus/Vorbis. -c:a copy is safe (and fast) only
		// when the source is already a WebM/Opus stream; for uploads of other formats
		// we must re-encode to Opus or the muxer drops the audio (264-byte output).
		const args =
			format === 'mp3'
				? ['-i', 'input.webm', '-vn', '-acodec', 'libmp3lame', '-b:a', `${mp3Bitrate}k`, outputName]
				: sourceIsWebm
					? ['-i', 'input.webm', '-vn', '-acodec', 'copy', outputName]
					: ['-i', 'input.webm', '-vn', '-c:a', 'libvorbis', '-q:a', '5', outputName];

		await ffmpeg.exec(args);
		const outputData = await ffmpeg.readFile(outputName);
		await ffmpeg.deleteFile('input.webm');
		await ffmpeg.deleteFile(outputName);

		const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/webm;codecs=opus';
		return new Blob([new Uint8Array(outputData as Uint8Array)], { type: mimeType });
	} catch (error) {
		console.error('Error extracting audio:', error);
		throw new Error(
			'Failed to extract audio. Please ensure your recording contains an audio track.'
		);
	}
}

export function isFFmpegLoaded(): boolean {
	return ffmpegInstance !== null && ffmpegInstance.loaded;
}
