import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

export async function extractAudio(videoBlob: Blob): Promise<Blob> {
	try {
		const ffmpeg = await loadFFmpeg();

		const inputData = await fetchFile(videoBlob);

		await ffmpeg.writeFile('input.webm', inputData);
		await ffmpeg.exec(['-i', 'input.webm', '-vn', '-acodec', 'copy', 'output.webm']);
		const outputData = await ffmpeg.readFile('output.webm');
		await ffmpeg.deleteFile('input.webm');
		await ffmpeg.deleteFile('output.webm');

		const audioBlob = new Blob([new Uint8Array(outputData as Uint8Array)], {
			type: 'audio/webm;codecs=opus'
		});

		return audioBlob;
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
