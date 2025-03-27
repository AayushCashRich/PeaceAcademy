import { Types } from 'mongoose'
import dbConnect from '@/db/connect'
import { KnowledgeDocEmbeddingModel } from './db/knowledge-docs-embedding-db-schema'
import { embeddingGenerationService } from './embedding-generation-service'
import logger from '@/server/config/pino-config'

// Vector search configuration
const VECTOR_SEARCH_INDEX = 'knowledge-docs-embeddings-vector-idx'
const EMBEDDING_PATH = 'embedding'

export interface SearchResult {
  _id: string
  document_id: string
  text: string
  knowledge_base_code: string
  chunk_position: {
    chunk_id: string
  }
  score: number
}

export interface VectorSearchOptions {
  limit?: number
  documentIds?: string[]
  numCandidates?: number
}

class VectorSearchService {
  /**
   * Search for similar documents using vector similarity
   * @param embedding - The query embedding vector
   * @param knowledgeBaseCode - The knowledge base code to filter results
   * @param options - Search options
   */
  async searchSimilarDocuments(
    embedding: number[],
    knowledgeBaseCode: string,
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      await dbConnect()
      
      // Set defaults
      const limit = options.limit || 10
      const numCandidates = options.numCandidates || limit * 10
      
      // Build prefilter for knowledge base code and optional document IDs
      const prefilter: any = {
        $and: [
          { knowledge_base_code: knowledgeBaseCode }
        ]
      }
      
      // Add document filter if specified
      if (options.documentIds && options.documentIds.length > 0) {
        prefilter.$and.push({
          document_id: {
            $in: options.documentIds.map(id => new Types.ObjectId(id))
          }
        })
      }
      
      // Perform vector search using MongoDB's $vectorSearch operator
      const results = await KnowledgeDocEmbeddingModel.aggregate([
        {
          $vectorSearch: {
            queryVector: embedding,
            index: VECTOR_SEARCH_INDEX,
            path: EMBEDDING_PATH,
            limit: limit,
            numCandidates: numCandidates,
            filter: prefilter
          }
        },
        {
          $project: {
            _id: 1,
            document_id: 1,
            text: 1,
            knowledge_base_code: 1,
            chunk_position: 1,
            score: { $meta: "vectorSearchScore" },
          }
        }
      ]).sort({ score: -1 })
      
      return results.map(result => ({
        _id: result._id.toString(),
        document_id: result.document_id.toString(),
        text: result.text,
        knowledge_base_code: result.knowledge_base_code,
        chunk_position: result.chunk_position,
        score: result.score
      }))
    } catch (error) {
      logger.error({ error, knowledgeBaseCode }, 'Failed to perform vector search')
      throw error
    }
  }
  
  /**
   * Search similar documents using a text query
   * First generates an embedding for the query, then searches for similar documents
   */
  async searchByText(
    query: string,
    knowledgeBaseCode: string,
    options: VectorSearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query text
      const queryEmbedding = await embeddingGenerationService.generateQueryEmbedding(query)
      
      // Search for similar documents
      return await this.searchSimilarDocuments(queryEmbedding, knowledgeBaseCode, options)
    } catch (error) {
      logger.error({ error, knowledgeBaseCode, query }, 'Failed to search by text')
      throw error
    }
  }
}

// Export a singleton instance
export const vectorSearchService = new VectorSearchService()