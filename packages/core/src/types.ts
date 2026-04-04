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
