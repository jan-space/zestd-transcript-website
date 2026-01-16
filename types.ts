
export interface TranscriptItem {
  startTime: number;
  text: string;
}

export interface ExtractionState {
  status: 'idle' | 'loading' | 'processing' | 'completed' | 'error';
  videoId: string | null;
  logs: string[];
  transcript: TranscriptItem[];
  error?: string;
}

export interface Language {
  code: string;
  name: string;
}
