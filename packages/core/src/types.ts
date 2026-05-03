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
  deletedAt: Date | null;
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
  includeDeleted?: boolean;
}

export interface SearchResult {
  observations: Observation[];
  total: number;
}

// --- Merge types ---

export type MergeStrategy = 'by_topic' | 'by_similarity' | 'by_ids';

export interface MergeParams {
  projectId: string;
  topicKey?: string;
  observationIds?: number[];
  strategy: MergeStrategy;
  dryRun?: boolean;
}

export interface MergeCandidateGroup {
  reason: string;
  observations: Observation[];
  estimatedReduction: number;
}

export interface MergeCandidates {
  groups: MergeCandidateGroup[];
  totalCandidates: number;
  estimatedReduction: number;
}

export interface MergeResult {
  mergedObservation: Observation;
  deletedIds: number[];
  originalCount: number;
  strategy: MergeStrategy;
}

// --- Export types ---

export type ExportFormat = 'json' | 'xml' | 'txt';

export interface ExportParams {
  format: ExportFormat;
  projectId?: string;
  type?: Observation['type'];
  topicKey?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

export interface ExportResult {
  content: string;
  format: ExportFormat;
  recordCount: number;
  exportedAt: Date;
}
