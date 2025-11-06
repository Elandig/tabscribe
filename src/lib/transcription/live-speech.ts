export class LiveSpeechRecognition {
	private recognition: SpeechRecognition | null = null;
	private transcript: string = '';
	private isRunning: boolean = false;
	private onTranscriptUpdate: ((text: string) => void) | null = null;
	private language: string = 'en-US';

	constructor() {
		if (!this.isSupported()) {
			console.warn('Speech Recognition not supported in this browser');
		}
	}

	isSupported(): boolean {
		return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
	}

	start(language: string = 'en-US', onUpdate: (text: string) => void, audioTrack?: MediaStreamTrack): void {
		if (!this.isSupported()) {
			throw new Error('Speech Recognition is not supported in this browser');
		}

		if (this.isRunning) {
			console.warn('Speech Recognition is already running');
			return;
		}

		const langMap: Record<string, string> = {
			en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT',
			nl: 'nl-NL', hi: 'hi-IN', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU',
			ar: 'ar-SA', tr: 'tr-TR', pl: 'pl-PL', uk: 'uk-UA', vi: 'vi-VN', auto: 'en-US'
		};

		this.language = langMap[language] || language;
		this.onTranscriptUpdate = onUpdate;
		this.transcript = '';

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.recognition = new SpeechRecognition();

		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = this.language;
		this.recognition.maxAlternatives = 1;

		this.recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interimTranscript = '';
			let finalTranscript = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				const transcript = result[0].transcript;

				if (result.isFinal) {
					finalTranscript += transcript + ' ';
				} else {
					interimTranscript += transcript;
				}
			}

			if (finalTranscript) {
				this.transcript += finalTranscript;
			}

			const currentText = this.transcript + interimTranscript;
			if (this.onTranscriptUpdate) {
				this.onTranscriptUpdate(currentText);
			}
		};

		this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			console.error('Speech recognition error:', event.error);

			if (event.error === 'no-speech') {
				return;
			}

			if (event.error !== 'aborted') {
				this.restart();
			}
		};

		this.recognition.onend = () => {
			if (this.isRunning) {
				this.recognition?.start();
			}
		};

		try {
			if (audioTrack) {
				// @ts-expect-error - Outdated type definitions
				this.recognition.start(audioTrack);
			} else {
				this.recognition.start();
			}
			this.isRunning = true;
		} catch (error) {
			console.error('Failed to start speech recognition:', error);
			throw error;
		}
	}

	stop(): string {
		if (this.recognition && this.isRunning) {
			this.isRunning = false;
			this.recognition.stop();
			this.onTranscriptUpdate = null;
		}

		return this.transcript.trim();
	}

	private restart(): void {
		if (this.isRunning && this.recognition) {
			try {
				this.recognition.stop();
				setTimeout(() => {
					if (this.isRunning) {
						this.recognition?.start();
					}
				}, 100);
			} catch (error) {
				console.error('Failed to restart speech recognition:', error);
			}
		}
	}

	getTranscript(): string {
		return this.transcript;
	}

	isActive(): boolean {
		return this.isRunning;
	}
}

declare global {
	interface Window {
		SpeechRecognition: typeof SpeechRecognition;
		webkitSpeechRecognition: typeof SpeechRecognition;
	}

	interface SpeechRecognition extends EventTarget {
		continuous: boolean;
		interimResults: boolean;
		lang: string;
		maxAlternatives: number;
		start(): void;
		stop(): void;
		abort(): void;
		onresult: ((event: SpeechRecognitionEvent) => void) | null;
		onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
		onend: (() => void) | null;
	}

	interface SpeechRecognitionEvent extends Event {
		resultIndex: number;
		results: SpeechRecognitionResultList;
	}

	interface SpeechRecognitionResultList {
		readonly length: number;
		item(index: number): SpeechRecognitionResult;
		[index: number]: SpeechRecognitionResult;
	}

	interface SpeechRecognitionResult {
		readonly isFinal: boolean;
		readonly length: number;
		item(index: number): SpeechRecognitionAlternative;
		[index: number]: SpeechRecognitionAlternative;
	}

	interface SpeechRecognitionAlternative {
		readonly transcript: string;
		readonly confidence: number;
	}

	interface SpeechRecognitionErrorEvent extends Event {
		error: string;
		message: string;
	}

	const SpeechRecognition: {
		prototype: SpeechRecognition;
		new(): SpeechRecognition;
	};

	const webkitSpeechRecognition: {
		prototype: SpeechRecognition;
		new(): SpeechRecognition;
	};
}
