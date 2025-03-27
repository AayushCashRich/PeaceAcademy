import OpenAI from 'openai'
import { knowledgeDocEmbeddingDbService } from './db/knowledge-docs-embedding-db-service'
import logger from '@/server/config/pino-config'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// The model we'll use for embeddings
const EMBEDDING_MODEL = 'text-embedding-3-small'

export interface TextChunk {
  text: string
  chunk_id: string
}

export interface GenerateEmbeddingInput {
  knowledge_base_code: string
  document_id: string
  chunks: TextChunk[]
}

export interface EmbeddingResult {
  success: boolean
  total: number
  successful: number
  failed: number
  errors?: Error[]
}

class EmbeddingGenerationService {
  /**
   * Generate embeddings for a list of text chunks and store them in the database
   */
  async generateAndStoreEmbeddings(input: GenerateEmbeddingInput): Promise<EmbeddingResult> {
    try {
      logger.info(
        { documentId: input.document_id, chunkCount: input.chunks.length },
        'Starting embedding generation'
      )

      // Track results
      const result: EmbeddingResult = {
        success: false,
        total: input.chunks.length,
        successful: 0,
        failed: 0,
        errors: []
      }
      
      // Process chunks in smaller batches to avoid rate limits
      // OpenAI recommends max 2048 tokens per request for embeddings
      const BATCH_SIZE = 20
      const batches = this.createBatches(input.chunks, BATCH_SIZE)
      
      // Process each batch
      for (const batch of batches) {
        try {
          // Get embeddings from OpenAI
          const embeddingResponse = await this.getEmbeddingsFromOpenAI(batch)
          
          // Map to database format
          const embeddings = embeddingResponse.map((item, index) => ({
            knowledge_base_code: input.knowledge_base_code,
            document_id: input.document_id,
            text: batch[index].text,
            embedding: item.embedding,
            chunk_position: {
              chunk_id: batch[index].chunk_id
            }
          }))
          
          // Store in database
          await knowledgeDocEmbeddingDbService.createManyEmbeddings(embeddings)
          
          // Update success count
          result.successful += batch.length
          
          logger.info(
            { batchSize: batch.length },
            'Successfully processed and stored embeddings batch'
          )
        } catch (error) {
          // Log and track errors, but continue with other batches
          logger.error(
            { error },
            'Error processing embedding batch'
          )
          
          if (error instanceof Error) {
            result.errors?.push(error)
          } else {
            result.errors?.push(new Error('Unknown error during embedding generation'))
          }
          
          result.failed += batch.length
        }
      }
      
      // Set overall success status
      result.success = result.failed === 0
      
      return result
    } catch (error) {
      logger.error(
        { error, documentId: input.document_id },
        'Failed to generate embeddings'
      )
      throw error
    }
  }
  
  /**
   * Split input chunks into batches of specified size
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }
  
  /**
   * Get embeddings from OpenAI API
   */
  private async getEmbeddingsFromOpenAI(chunks: TextChunk[]): Promise<Array<{ embedding: number[] }>> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunks.map(chunk => chunk.text),
        encoding_format: 'float'
      })
      
      return response.data.map(item => ({
        embedding: item.embedding
      }))
    } catch (error) {
      logger.error({ error }, 'OpenAI embedding API error')
      throw error
    }
  }
  
  /**
   * Generate a single embedding for a query
   * Useful for similarity search
   */
  async generateQueryEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: 'float'
      })
      
      return response.data[0].embedding
    } catch (error) {
      logger.error({ error }, 'Failed to generate query embedding')
      throw error
    }
  }
}

// Export singleton instance
export const embeddingGenerationService = new EmbeddingGenerationService()