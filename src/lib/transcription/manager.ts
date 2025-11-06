import type { Recording, TranscriptionOptions } from '$lib/types';
import { AssemblyAIAdapter } from './assemblyai';
import { settings } from '$lib/stores/settings';
import { recordings } from '$lib/stores/recordings';
import { get } from 'svelte/store';

export class TranscriptionManager {
	private getAdapter(): AssemblyAIAdapter | null {
		const currentSettings = get(settings);

		if (!currentSettings.transcription.enabled) {
			return null;
		}

		if (currentSettings.transcription.service !== 'assemblyai') {
			return null;
		}

		const apiKey = currentSettings.transcription.assemblyAIKey;
		if (!apiKey) {
			console.error('AssemblyAI API key not configured');
			return null;
		}

		return new AssemblyAIAdapter(apiKey);
	}

	async transcribe(
		recording: Recording,
		options?: TranscriptionOptions
	): Promise<void> {
		const adapter = this.getAdapter();

		if (!adapter) {
			console.error('No transcription adapter available');
			return;
		}

		// Update recording status to processing
		await recordings.update(recording.id, {
			transcription: {
				status: 'processing',
				service: adapter.name,
				startedAt: new Date()
			}
		});

		try {
			// Start transcription
			const result = await adapter.transcribe(recording.blob, options);

			// Update recording with result (including jobId if processing)
			await recordings.update(recording.id, {
				transcription: {
					status: result.status,
					text: result.text,
					error: result.error,
					service: adapter.name,
					jobId: result.jobId,
					startedAt: new Date(),
					completedAt: result.status === 'completed' ? new Date() : undefined
				}
			});

			// If processing, start polling
			if (result.status === 'processing' && result.jobId) {
				// Get the updated recording to pass to pollUntilComplete
				const updatedRecording = get(recordings).find(r => r.id === recording.id);
				if (updatedRecording) {
					this.pollUntilComplete(updatedRecording);
				}
			}
		} catch (error) {
			console.error('Transcription failed:', error);

			// Update recording with error
			await recordings.update(recording.id, {
				transcription: {
					status: 'error',
					error: error instanceof Error ? error.message : 'Transcription failed',
					service: adapter.name
				}
			});
		}
	}

	async retryTranscription(
		recording: Recording,
		options?: TranscriptionOptions
	): Promise<void> {
		return this.transcribe(recording, options);
	}

	async checkStatus(recording: Recording): Promise<void> {
		const adapter = this.getAdapter();

		if (!adapter || !adapter.checkStatus) {
			console.error('Status checking not supported by current adapter');
			return;
		}

		if (!recording.transcription?.jobId) {
			console.error('No job ID available for status check');
			return;
		}

		try {
			const status = await adapter.checkStatus(recording.transcription.jobId);

			await recordings.update(recording.id, {
				transcription: {
					...recording.transcription,
					status: status.status,
					text: status.text || recording.transcription.text,
					error: status.error,
					completedAt: status.status === 'completed' ? new Date() : undefined
				}
			});
		} catch (error) {
			console.error('Failed to check transcription status:', error);
		}
	}

	isAvailable(): boolean {
		return this.getAdapter() !== null;
	}

	getCurrentService(): string | null {
		const currentSettings = get(settings);
		return currentSettings.transcription.enabled ? currentSettings.transcription.service : null;
	}

	async resumePolling(recording: Recording): Promise<void> {
		if (!recording.transcription) return;

		const { status, startedAt, jobId } = recording.transcription;

		if (status !== 'processing' && status !== 'pending') return;
		if (!jobId) return;

		// Check if transcription has timed out (10 minutes)
		if (startedAt) {
			const elapsed = Date.now() - new Date(startedAt).getTime();
			const timeoutMs = 10 * 60 * 1000; // 10 minutes

			if (elapsed > timeoutMs) {
				await recordings.update(recording.id, {
					transcription: {
						...recording.transcription,
						status: 'error',
						error: 'Transcription timed out (10 minutes)'
					}
				});
				return;
			}
		}

		// Poll for status
		await this.pollUntilComplete(recording);
	}

	private async pollUntilComplete(recording: Recording): Promise<void> {
		const adapter = this.getAdapter();
		if (!adapter || !adapter.checkStatus || !recording.transcription?.jobId) return;

		const maxAttempts = 120; // 10 minutes with 5 second intervals
		let attempts = 0;

		while (attempts < maxAttempts) {
			try {
				const status = await adapter.checkStatus(recording.transcription.jobId);

				await recordings.update(recording.id, {
					transcription: {
						...recording.transcription,
						status: status.status,
						text: status.text || recording.transcription.text,
						error: status.error,
						completedAt: status.status === 'completed' ? new Date() : undefined
					}
				});

				if (status.status === 'completed' || status.status === 'error') {
					return;
				}

				// Still processing, wait and try again
				await new Promise(resolve => setTimeout(resolve, 5000));
				attempts++;
			} catch (error) {
				console.error('Polling error:', error);
				await recordings.update(recording.id, {
					transcription: {
						...recording.transcription!,
						status: 'error',
						error: error instanceof Error ? error.message : 'Failed to check status'
					}
				});
				return;
			}
		}

		// Timeout
		await recordings.update(recording.id, {
			transcription: {
				...recording.transcription!,
				status: 'error',
				error: 'Transcription polling timed out'
			}
		});
	}

	async clearTimedOutTranscriptions(): Promise<number> {
		const allRecordings = get(recordings);
		const timeoutMs = 10 * 60 * 1000; // 10 minutes
		let clearedCount = 0;

		for (const recording of allRecordings) {
			if (!recording.transcription) continue;

			const { status, startedAt } = recording.transcription;

			if ((status === 'processing' || status === 'pending') && startedAt) {
				const elapsed = Date.now() - new Date(startedAt).getTime();

				if (elapsed > timeoutMs) {
					await recordings.update(recording.id, {
						transcription: {
							...recording.transcription,
							status: 'error',
							error: 'Cleared - timed out'
						}
					});
					clearedCount++;
				}
			}
		}

		return clearedCount;
	}

	async clearAllInProgressTranscriptions(): Promise<number> {
		const allRecordings = get(recordings);
		let clearedCount = 0;

		for (const recording of allRecordings) {
			if (!recording.transcription) continue;

			const { status } = recording.transcription;

			if (status === 'processing' || status === 'pending') {
				await recordings.update(recording.id, {
					transcription: {
						...recording.transcription,
						status: 'error',
						error: 'Cleared by user'
					}
				});
				clearedCount++;
			}
		}

		return clearedCount;
	}
}

export const transcriptionManager = new TranscriptionManager();
