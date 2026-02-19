import type {
	TranscriptionOptions,
	TranscriptionResult,
	TranscriptionStatusResult
} from '$lib/types';

interface AssemblyAIUploadResponse {
	upload_url: string;
}

interface AssemblyAIUtterance {
	speaker: string;
	text: string;
	confidence: number;
	start: number;
	end: number;
}

interface AssemblyAITranscriptResponse {
	id: string;
	status: 'queued' | 'processing' | 'completed' | 'error';
	text?: string;
	error?: string;
	utterances?: AssemblyAIUtterance[];
	speaker_labels?: boolean;
}

export class AssemblyAIAdapter {
	name = 'AssemblyAI';
	private apiKey: string;
	private baseURL = 'https://api.assemblyai.com/v2';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async transcribe(
		audioBlob: Blob,
		options?: TranscriptionOptions
	): Promise<TranscriptionResult> {
		try {
			const uploadUrl = await this.uploadFile(audioBlob);
			const transcriptId = await this.createTranscript(uploadUrl, options);
			return {
				jobId: transcriptId,
				status: 'processing'
			};
		} catch (error) {
			console.error('AssemblyAI transcription error:', error);
			return {
				status: 'error',
				error: error instanceof Error ? error.message : 'Transcription failed'
			};
		}
	}

	async checkStatus(jobId: string): Promise<TranscriptionStatusResult> {
		try {
			const response = await fetch(`${this.baseURL}/transcript/${jobId}`, {
				headers: {
					authorization: this.apiKey
				}
			});

			if (!response.ok) {
				const errorBody = await response.text();
				console.error('AssemblyAI status check error response:', errorBody);
				throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
			}

			const data: AssemblyAITranscriptResponse = await response.json();

			let formattedText = data.text;
			if (data.speaker_labels && data.utterances && data.utterances.length > 0) {
				formattedText = this.formatUtterances(data.utterances);
			}

			return {
				status: this.mapStatus(data.status),
				text: formattedText,
				error: data.error
			};
		} catch (error) {
			console.error('Failed to check status:', error);
			return {
				status: 'error',
				error: error instanceof Error ? error.message : 'Failed to check status'
			};
		}
	}

	private async uploadFile(blob: Blob): Promise<string> {
		const response = await fetch(`${this.baseURL}/upload`, {
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': blob.type || 'application/octet-stream'
			},
			body: blob
		});

		if (!response.ok) {
			throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
		}

		const data: AssemblyAIUploadResponse = await response.json();
		return data.upload_url;
	}

	private async createTranscript(
		audioUrl: string,
		options?: TranscriptionOptions
	): Promise<string> {
		const body: Record<string, unknown> = {
			audio_url: audioUrl
		};

		if (options?.language) {
			if (options.language === 'auto') {
				body.language_detection = true;
			} else {
				body.language_code = options.language;
			}
		}

		if (options?.speaker_labels) {
			body.speaker_labels = true;
			if (options.speakers_expected) {
				body.speakers_expected = options.speakers_expected;
			}
		}

		body.punctuate = true;
		body.format_text = true;
		body.speech_model = 'universal-2';

		const response = await fetch(`${this.baseURL}/transcript`, {
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error('AssemblyAI error response:', errorBody);
			throw new Error(
				`Transcription request failed: ${response.status} ${response.statusText} - ${errorBody}`
			);
		}

		const data: AssemblyAITranscriptResponse = await response.json();
		return data.id;
	}

	private mapStatus(status: AssemblyAITranscriptResponse['status']): TranscriptionStatusResult['status'] {
		switch (status) {
			case 'completed':
				return 'completed';
			case 'error':
				return 'error';
			case 'queued':
			case 'processing':
				return 'processing';
			default:
				return 'pending';
		}
	}

	private formatUtterances(utterances: AssemblyAIUtterance[]): string {
		return utterances
			.map((utterance) => {
				const startTime = this.formatTimestamp(utterance.start);
				const endTime = this.formatTimestamp(utterance.end);
				return `[${startTime} - ${endTime}] Speaker ${utterance.speaker}:\n${utterance.text}\n`;
			})
			.join('\n');
	}

	private formatTimestamp(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		}
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
}
