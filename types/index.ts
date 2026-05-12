export interface JournalEntry {
  id?: number;
  userId: string;
  audioBlob?: Blob;
  transcript: string;
  reflection: ReflectionResult;
  durationSeconds: number;
  createdAt: Date;
}

export interface ReflectionResult {
  summary: string;
  response: string;
  actionItems: string[];
  patterns: string[];
  suggestions: string[];
  category?: string;
}

export interface QuotaStatus {
  userUsed: number;
  userRemaining: number;
  globalUsed: number;
  globalRemaining: number;
  allowedMinutes: number;
  isBlocked: boolean;
}

export interface TranscribeResponse {
  transcript: string;
  minutesUsed: number;
}

export interface ReflectResponse {
  summary: string;
  response: string;
  actionItems: string[];
  patterns: string[];
  suggestions: string[];
  category?: string;
}

export type RecordingState = "idle" | "recording" | "paused" | "stopped" | "processing" | "done" | "error";
