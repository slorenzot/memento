/**
 * Type declaration for optional peer dependency @huggingface/transformers.
 *
 * This module may or may not be installed. The EmbeddingService handles
 * the case where it's missing via graceful degradation.
 */
declare module '@huggingface/transformers' {
  export function pipeline(
    task: string,
    model: string,
    options?: Record<string, unknown>
  ): Promise<unknown>;
}
