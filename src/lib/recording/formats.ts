import type { AudioCodec, VideoCodec, RecordingConfig } from '$lib/types';

export interface CodecOption {
	value: AudioCodec | VideoCodec;
	label: string;
	mimeType: string;
}

export const audioCodecs: CodecOption[] = [
	{ value: 'opus', label: 'Opus (Recommended)', mimeType: 'audio/webm;codecs=opus' },
	{ value: 'aac', label: 'AAC', mimeType: 'audio/mp4;codecs=mp4a.40.2' }
];

export const videoCodecs: CodecOption[] = [
	{ value: 'vp9', label: 'VP9 (Best quality)', mimeType: 'video/webm;codecs=vp9,opus' },
	{ value: 'vp8', label: 'VP8 (Better compatibility)', mimeType: 'video/webm;codecs=vp8,opus' },
	{ value: 'h264', label: 'H.264 (Universal)', mimeType: 'video/webm;codecs=h264,opus' }
];

export const audioBitrates = [
	{ value: 64, label: '64 kbps (Low)' },
	{ value: 96, label: '96 kbps (Medium)' },
	{ value: 128, label: '128 kbps (High)' },
	{ value: 192, label: '192 kbps (Very High)' },
	{ value: 256, label: '256 kbps (Maximum)' },
	{ value: 320, label: '320 kbps (Extreme)' }
];

export const videoBitrates = [
	{ value: 1000, label: '1 Mbps (Low)' },
	{ value: 2500, label: '2.5 Mbps (Medium)' },
	{ value: 5000, label: '5 Mbps (High)' },
	{ value: 8000, label: '8 Mbps (Very High)' },
	{ value: 10000, label: '10 Mbps (Maximum)' }
];

export function getMimeType(config: RecordingConfig): string {
	const codec = videoCodecs.find(c => c.value === config.videoCodec);
	return codec?.mimeType || 'video/webm;codecs=vp8,opus';
}

export function getFileExtension(mimeType: string): string {
	if (mimeType.includes('mp4')) {
		return 'mp4';
	}
	return 'webm';
}

export function checkCodecSupport(mimeType: string): boolean {
	if (typeof MediaRecorder === 'undefined') {
		return false;
	}
	return MediaRecorder.isTypeSupported(mimeType);
}

export function getSupportedAudioCodecs(): CodecOption[] {
	return audioCodecs.filter(codec => checkCodecSupport(codec.mimeType));
}

export function getSupportedVideoCodecs(): CodecOption[] {
	return videoCodecs.filter(codec => checkCodecSupport(codec.mimeType));
}

export function getDefaultSupportedAudioCodec(): AudioCodec {
	const supported = getSupportedAudioCodecs();
	return supported.length > 0 ? (supported[0].value as AudioCodec) : 'opus';
}

export function getDefaultSupportedVideoCodec(): VideoCodec {
	const supported = getSupportedVideoCodecs();
	return supported.length > 0 ? (supported[0].value as VideoCodec) : 'vp8';
}

export function getRecorderOptions(config: RecordingConfig): MediaRecorderOptions {
	const mimeType = getMimeType(config);

	return {
		mimeType,
		audioBitsPerSecond: config.audioBitrate * 1000,
		videoBitsPerSecond: config.videoBitrate ? config.videoBitrate * 1000 : undefined
	};
}
