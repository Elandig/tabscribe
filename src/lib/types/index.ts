export interface Recording {
	id: string;
	filename: string;
	blob: Blob;
	mimeType: string;
	size: number;
	duration: number;
	createdAt: Date;
	isDownloaded: boolean;
	recordingMode: RecordingMode;
	liveTranscription?: string;
	transcription?: TranscriptionData;
}

export interface TranscriptionData {
	status: TranscriptionStatus;
	text?: string;
	error?: string;
	service: string;
	jobId?: string;
	startedAt?: Date;
	completedAt?: Date;
}

export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'error';
export type RecordingMode = 'screen-audio' | 'audio-only';

export interface RecordingConfig {
	mode: RecordingMode;
	videoCodec?: VideoCodec;
	audioCodec: AudioCodec;
	audioBitrate: number;
	videoBitrate?: number;
}

export type VideoCodec = 'vp8' | 'vp9' | 'h264';
export type AudioCodec = 'opus' | 'aac';

export interface AppSettings {
	recording: RecordingSettings;
	storage: StorageSettings;
	transcription: TranscriptionSettings;
}

export interface RecordingSettings {
	defaultMode: RecordingMode;
	defaultVideoCodec: VideoCodec;
	defaultAudioCodec: AudioCodec;
	defaultAudioBitrate: number;
	defaultVideoBitrate: number;
}

export interface StorageSettings {
	autoDeleteAfterDays: number | null;
	autoDeleteAfterDownload: boolean;
	keepOnlyLastN: number | null;
}

export interface TranscriptionSettings {
	enabled: boolean;
	autoTranscribe: boolean;
	service: TranscriptionService;
	assemblyAIKey: string;
	language: string;
	speaker_labels: boolean;
	speakers_expected: number;
	enableLiveTranscription: boolean;
}

export type TranscriptionService = 'assemblyai';

export interface TranscriptionAdapter {
	name: string;
	transcribe(
		audioBlob: Blob,
		options?: TranscriptionOptions
	): Promise<TranscriptionResult>;
	checkStatus?(jobId: string): Promise<TranscriptionStatusResult>;
}

export interface TranscriptionOptions {
	language?: string;
	speaker_labels?: boolean;
	speakers_expected?: number;
	[key: string]: unknown;
}

export interface TranscriptionResult {
	jobId?: string;
	status: TranscriptionStatus;
	text?: string;
	error?: string;
}

export interface TranscriptionStatusResult {
	status: TranscriptionStatus;
	text?: string;
	error?: string;
}

export type Tab = 'home' | 'settings';

export interface RecorderState {
	isRecording: boolean;
	isPaused: boolean;
	duration: number;
	error: string | null;
}

export interface CleanupRule {
	type: 'age' | 'downloaded' | 'count';
	value: number;
}
