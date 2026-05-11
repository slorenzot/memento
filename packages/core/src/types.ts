export interface Observation {
  id: number;
  uuid: string;
  sessionId: number;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'discovery' | 'note' | 'summary' | 'learning' | 'pattern' | 'architecture' | 'config' | 'preference';
  topicKey: string | null;
  projectId: string;
  createdAt: Date;
  deletedAt: Date | null;
  metadata: Record<string, unknown>;
  scope: 'project' | 'personal';
  pinned: boolean;
  revisionCount: number;
  duplicatesCount?: number;
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
  scope?: 'project' | 'personal';
  mode?: 'keyword' | 'semantic' | 'hybrid';
}

export interface SearchResult {
  observations: Observation[];
  total: number;
  scores?: Map<number, number>; // observation id → relevance score (for semantic/hybrid)
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

// --- TUI Explorer types ---

export interface ListSessionsParams {
  projectId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListSessionsResult {
  sessions: Session[];
  total: number;
}

export interface ProjectStats {
  name: string;
  activeCount: number;
  deletedCount: number;
  lastActivity: Date | null;
  byType: Record<Observation['type'], number>;
}

export interface DashboardStats {
  totalObservations: number;
  activeObservations: number;
  deletedObservations: number;
  byType: Record<Observation['type'], number>;
  byProject: Record<string, number>;
  activeSessions: number;
  recentObservations: Observation[];
}

// --- Import/Export data types ---

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

// --- Journal types (append-only, evidence-first) ---

export interface JournalEntry {
  id: number;
  uuid: string;
  projectId: string;
  sessionId: number | null;
  title: string;
  body: string;
  tags: string[];
  model: string | null;
  provider: string | null;
  agent: string | null;
  supersededBy: number | null;
  invalidatedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface WriteJournalParams {
  projectId: string;
  sessionId?: number | null;
  title: string;
  body: string;
  tags?: string[];
  model?: string | null;
  provider?: string | null;
  agent?: string | null;
  supersedes?: number | null;
  metadata?: Record<string, unknown>;
}

export interface JournalSearchParams {
  query?: string;
  tags?: string[];
  projectId?: string;
  sessionId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface JournalSearchResult {
  entries: JournalEntry[];
  total: number;
}

// --- Prompt Injection types (OpenCode Plugin) ---

export type PromptInjectionStrategy = 'recent-pinned' | 'pinned-only';

export interface PromptInjectionConfig {
  enabled: boolean;
  maxObservations: number;
  maxTokens: number;
  strategy: PromptInjectionStrategy;
  types: Observation['type'][];
  projectId?: string;
}

export interface RenderedPromptContext {
  xml: string;
  observationCount: number;
  tokenCount: number;
  budgetExceeded: boolean;
}
