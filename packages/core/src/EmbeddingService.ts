/**
 * EmbeddingService.ts — Local embedding generation with graceful degradation.
 *
 * Uses @huggingface/transformers (optional peer dependency) to generate
 * 384-dim embeddings via Xenova/all-MiniLM-L6-v2.
 *
 * If the library is not installed, all operations return null/empty
 * and the system falls back to FTS5 keyword search.
 *
 * Privacy: Zero network requests after initial model download (cached).
 */

export interface EmbeddingResult {
  embedding: Float32Array;
  dimensions: number;
  model: string;
}

export interface EmbeddingStatus {
  available: boolean;
  model: string | null;
  error: string | null;
}

type EmbedFn = (text: string) => Promise<Float32Array>;

export class EmbeddingService {
  private embedFn: EmbedFn | null = null;
  private initPromise: Promise<void> | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private dimensions = 384;
  private _status: EmbeddingStatus = {
    available: false,
    model: null,
    error: null,
  };

  get status(): EmbeddingStatus {
    return this._status;
  }

  /**
   * Initialize the embedding model lazily.
   * Safe to call multiple times — only initializes once.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // Dynamic import — if @huggingface/transformers is not installed,
      // this will fail gracefully
      const transformers = await import('@huggingface/transformers');
      const pipeline = transformers.pipeline ||
        (transformers as unknown as { default?: { pipeline?: EmbedFn } }).default?.pipeline;

      if (!pipeline) {
        throw new Error('pipeline function not found in @huggingface/transformers');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractor = await (pipeline as any)(
        'feature-extraction',
        this.modelName,
        { quantized: true }
      );

      this.embedFn = async (text: string): Promise<Float32Array> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        // Extract the tensor data as Float32Array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = output.data || (output as any).tolist?.() || output;
        if (data instanceof Float32Array) return data;
        // Fallback: convert from regular array
        return new Float32Array(Array.isArray(data) ? data : Array.from(data as Iterable<number>));
      };

      this._status = {
        available: true,
        model: this.modelName,
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._status = {
        available: false,
        model: null,
        error: message,
      };
      // Don't throw — graceful degradation
    }
  }

  /**
   * Generate embedding for a text string.
   * Returns null if embedding service is unavailable.
   */
  async generate(text: string): Promise<EmbeddingResult | null> {
    if (!this.embedFn) {
      await this.initialize();
      if (!this.embedFn) return null;
    }

    try {
      // Truncate to 512 tokens worth of text (~2000 chars)
      const truncated = text.length > 2000 ? text.slice(0, 2000) : text;
      const embedding = await this.embedFn(truncated);
      return {
        embedding,
        dimensions: this.dimensions,
        model: this.modelName,
      };
    } catch {
      return null;
    }
  }

  /**
   * Serialize Float32Array to Buffer for SQLite BLOB storage.
   */
  static serializeEmbedding(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  }

  /**
   * Deserialize SQLite BLOB to Float32Array.
   */
  static deserializeEmbedding(blob: Buffer | Uint8Array, dimensions: number): Float32Array {
    return new Float32Array(
      (blob instanceof Buffer ? blob : Buffer.from(blob)).buffer,
      (blob instanceof Buffer ? blob : Buffer.from(blob)).byteOffset,
      dimensions
    );
  }

  /**
   * Calculate cosine similarity between two embeddings.
   * Returns value in [-1, 1] range.
   */
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}
