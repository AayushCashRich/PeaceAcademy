import { Types } from 'mongoose'
import dbConnect from '@/db/connect'
import { KnowledgeDocEmbeddingModel, IKnowledgeDocEmbedding } from './knowledge-docs-embedding-db-schema'
import logger from '@/server/config/pino-config'

export interface CreateEmbeddingInput {
  knowledge_base_code: string
  document_id: string
  text: string
  embedding: number[]
  chunk_position: {
    chunk_id: string
  }
}

export interface QueryEmbeddingInput {
  knowledge_base_code: string
  embedding: number[]
  limit?: number
}

class KnowledgeDocEmbeddingDbService {
  /**
   * Create a new document embedding
   */
  async createEmbedding(embeddingData: CreateEmbeddingInput): Promise<IKnowledgeDocEmbedding> {
    try {
      await dbConnect()
      
      // Convert string ID to ObjectId
      const documentId = new Types.ObjectId(embeddingData.document_id)
      
      const embedding = new KnowledgeDocEmbeddingModel({
        ...embeddingData,
        document_id: documentId
      })
      
      return await embedding.save()
    } catch (error) {
      logger.error({ error }, 'Failed to create document embedding')
      throw error
    }
  }

  /**
   * Create multiple embeddings in bulk
   */
  async createManyEmbeddings(embeddingsData: CreateEmbeddingInput[]): Promise<IKnowledgeDocEmbedding[]> {
    try {
      await dbConnect()
      
      // Process all embeddings data
      const processedData = embeddingsData.map(data => ({
        ...data,
        document_id: new Types.ObjectId(data.document_id)
      }))
      
      // Use insertMany for better performance
      const result = await KnowledgeDocEmbeddingModel.insertMany(processedData, { ordered: false })
      return result
    } catch (error) {
      logger.error({ error }, 'Failed to create multiple document embeddings')
      throw error
    }
  }

  /**
   * Find embeddings by document ID
   */
  async getEmbeddingsByDocumentId(documentId: string): Promise<IKnowledgeDocEmbedding[]> {
    try {
      await dbConnect()
      return await KnowledgeDocEmbeddingModel.find({ 
        document_id: new Types.ObjectId(documentId) 
      })
    } catch (error) {
      logger.error({ error }, `Failed to get embeddings for document: ${documentId}`)
      throw error
    }
  }

  /**
   * Find embeddings by knowledge base code
   */
  async getEmbeddingsByKnowledgeBaseCode(knowledgeBaseCode: string): Promise<IKnowledgeDocEmbedding[]> {
    try {
      await dbConnect()
      return await KnowledgeDocEmbeddingModel.find({ knowledge_base_code: knowledgeBaseCode })
    } catch (error) {
      logger.error({ error }, `Failed to get embeddings for knowledge base: ${knowledgeBaseCode}`)
      throw error
    }
  }

  /**
   * Find embeddings by vector similarity
   * Uses a vector search to find similar embeddings
   */
  async findSimilarEmbeddings(queryData: QueryEmbeddingInput): Promise<IKnowledgeDocEmbedding[]> {
    try {
      await dbConnect()
      
      const limit = queryData.limit || 5
      
      // Using dot product for similarity search
      // Higher dot product indicates more similarity
      const similarEmbeddings = await KnowledgeDocEmbeddingModel.aggregate([
        {
          $match: { knowledge_base_code: queryData.knowledge_base_code }
        },
        {
          $addFields: {
            similarity: {
              $reduce: {
                input: { $zip: { inputs: ["$embedding", queryData.embedding] } },
                initialValue: 0,
                in: { $add: ["$$value", { $multiply: [{ $arrayElemAt: ["$$this", 0] }, { $arrayElemAt: ["$$this", 1] }] }] }
              }
            }
          }
        },
        { $sort: { similarity: -1 } },
        { $limit: limit }
      ])
      
      return similarEmbeddings
    } catch (error) {
      logger.error({ error }, 'Failed to find similar embeddings')
      throw error
    }
  }

  /**
   * Delete embeddings by document ID
   */
  async deleteEmbeddingsByDocumentId(documentId: string): Promise<{ deletedCount: number }> {
    try {
      await dbConnect()
      const result = await KnowledgeDocEmbeddingModel.deleteMany({
        document_id: new Types.ObjectId(documentId)
      })
      return { deletedCount: result.deletedCount || 0 }
    } catch (error) {
      logger.error({ error }, `Failed to delete embeddings for document: ${documentId}`)
      throw error
    }
  }
}

// Export a singleton instance
export const knowledgeDocEmbeddingDbService = new KnowledgeDocEmbeddingDbService()