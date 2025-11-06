import type { RecordingConfig, Recording } from '$lib/types';
import { getMimeType, getRecorderOptions, getFileExtension } from './formats';
import { recorderState } from '$lib/stores/recorder';

export class ScreenRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private recordedChunks: Blob[] = [];
	private stream: MediaStream | null = null;
	private startTime: number = 0;
	private pausedTime: number = 0;
	private totalPausedDuration: number = 0;
	private durationInterval: number | null = null;
	private audioContext: AudioContext | null = null;
	private mixedAudioDestination: MediaStreamAudioDestinationNode | null = null;

	async start(config: RecordingConfig): Promise<void> {
		try {
			this.stream = await this.getScreenStream();
			const options = getRecorderOptions(config);

			this.mediaRecorder = new MediaRecorder(this.stream, options);
			this.recordedChunks = [];

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					this.recordedChunks.push(event.data);
				}
			};

			this.mediaRecorder.onstop = () => {
				this.stopDurationTimer();
			};

			this.mediaRecorder.onerror = (event) => {
				console.error('MediaRecorder error:', event);
				recorderState.setError('Recording error occurred');
				this.cleanup();
			};

			this.mediaRecorder.start(1000);
			this.startTime = Date.now();
			this.startDurationTimer();

			recorderState.startRecording();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to start recording';
			recorderState.setError(message);
			this.cleanup();
			throw error;
		}
	}

	async stop(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
				reject(new Error('No active recording'));
				return;
			}

			this.mediaRecorder.onstop = () => {
				const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
				const blob = new Blob(this.recordedChunks, { type: mimeType });

				this.cleanup();
				recorderState.stopRecording();

				resolve(blob);
			};

			this.mediaRecorder.stop();
		});
	}

	pause(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
			this.mediaRecorder.pause();
			this.pausedTime = Date.now();
			this.stopDurationTimer();
			recorderState.pauseRecording();
		}
	}

	resume(): void {
		if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
			this.mediaRecorder.resume();
			if (this.pausedTime > 0) {
				this.totalPausedDuration += Date.now() - this.pausedTime;
				this.pausedTime = 0;
			}
			this.startDurationTimer();
			recorderState.resumeRecording();
		}
	}

	isRecording(): boolean {
		return this.mediaRecorder?.state === 'recording';
	}

	isPaused(): boolean {
		return this.mediaRecorder?.state === 'paused';
	}

	getDuration(): number {
		if (!this.startTime) return 0;
		const elapsed = Date.now() - this.startTime - this.totalPausedDuration;
		return Math.floor(elapsed / 1000);
	}

	getAudioTrack(): MediaStreamTrack | null {
		if (!this.stream) return null;
		const audioTracks = this.stream.getAudioTracks();
		return audioTracks.length > 0 ? audioTracks[0] : null;
	}

	private async getScreenStream(): Promise<MediaStream> {
		let micStream: MediaStream | null = null;
		try {
			micStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});
		} catch (error) {
			console.warn('Could not get microphone audio, will try display audio only:', error);
		}

		const displayStream = await navigator.mediaDevices.getDisplayMedia({
			video: {
				width: { ideal: 1920 },
				height: { ideal: 1080 },
				frameRate: { ideal: 30 }
			},
			audio: true
		} as DisplayMediaStreamOptions);

		if (micStream) {
			try {
				this.audioContext = new AudioContext();
				const destination = this.audioContext.createMediaStreamDestination();
				this.mixedAudioDestination = destination;

				const displayAudioTracks = displayStream.getAudioTracks();
				if (displayAudioTracks.length > 0) {
					const displayAudioStream = new MediaStream([displayAudioTracks[0]]);
					const displaySource = this.audioContext.createMediaStreamSource(displayAudioStream);
					displaySource.connect(destination);
				}

				const micSource = this.audioContext.createMediaStreamSource(micStream);
				micSource.connect(destination);

				const combinedStream = new MediaStream([
					...displayStream.getVideoTracks(),
					...destination.stream.getAudioTracks()
				]);

				return combinedStream;
			} catch (error) {
				console.warn('Could not mix audio sources, using display audio only:', error);
				micStream.getTracks().forEach(track => track.stop());
				return displayStream;
			}
		} else {
			return displayStream;
		}
	}

	private startDurationTimer(): void {
		this.durationInterval = window.setInterval(() => {
			const duration = this.getDuration();
			recorderState.updateDuration(duration);
		}, 1000);
	}

	private stopDurationTimer(): void {
		if (this.durationInterval) {
			clearInterval(this.durationInterval);
			this.durationInterval = null;
		}
	}

	private cleanup(): void {
		this.stopDurationTimer();

		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}

		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}

		this.mixedAudioDestination = null;
		this.mediaRecorder = null;
		this.recordedChunks = [];
		this.startTime = 0;
		this.pausedTime = 0;
		this.totalPausedDuration = 0;
	}
}

export function createRecording(
	blob: Blob,
	config: RecordingConfig,
	duration: number
): Recording {
	const mimeType = getMimeType(config);
	const extension = getFileExtension(mimeType);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
	const filename = `recording-${timestamp}.${extension}`;

	return {
		id: crypto.randomUUID(),
		filename,
		blob,
		mimeType,
		size: blob.size,
		duration,
		createdAt: new Date(),
		isDownloaded: false,
		recordingMode: config.mode
	};
}
