export interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note';
  topicKey: string | null;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface Session {
  id: number;
  uuid: string;
  projectId: string;
  startedAt: Date;
  endedAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface Prompt {
  id: number;
  uuid: string;
  sessionId: number;
  content: string;
  projectId: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface Project {
  id: number;
  name: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface SearchParams {
  query?: string;
  type?: Observation['type'];
  projectId?: string;
  topicKey?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  observations: Observation[];
  total: number;
}

// Export types
export interface ExportData {
  version: string;
  exportedAt: string;
  project?: string;
  observations: ExportedObservation[];
  sessions?: ExportedSession[];
}

export interface ExportedObservation {
  uuid: string;
  title: string;
  content: string;
  type: Observation['type'];
  topicKey: string | null;
  projectId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ExportedSession {
  uuid: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
}

// Import types
export interface ImportData {
  version: string;
  project?: string;
  observations: ImportedObservation[];
}

export interface ImportedObservation {
  title: string;
  content: string;
  type: string;
  topicKey?: string | null;
  metadata?: Record<string, unknown>;
  uuid?: string;
}

export type ConflictStrategy = 'skip' | 'overwrite' | 'fail';

export interface ImportOptions {
  projectId?: string;
  conflictStrategy: ConflictStrategy;
  dryRun: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
  failed: number;
  errors: string[];
  observations: Observation[];
}
