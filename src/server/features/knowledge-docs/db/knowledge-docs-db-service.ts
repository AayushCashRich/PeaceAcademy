import dbConnect from '@/db/connect'
import { KnowledgeDocumentModel, IKnowledgeDocument } from './knowledge-docs-schema'
import logger from '@/server/config/pino-config'

export interface CreateKnowledgeDocInput {
  knowledge_base_code: string
  file_name: string
  file_url: string
  user_id?: string
  file_size: number
  status?: 'pending' | 'processed' | 'error'
  error_message?: string
}

export interface UpdateKnowledgeDocInput extends Partial<CreateKnowledgeDocInput> {
  // Partial allows all fields to be optional for updates
}

class KnowledgeDocumentDbService {
  /**
   * Create a new knowledge document
   */
  async createDocument(docData: CreateKnowledgeDocInput): Promise<IKnowledgeDocument> {
    try {
      await dbConnect()
      const document = new KnowledgeDocumentModel(docData)
      return await document.save()
    } catch (error) {
      logger.error({ error }, 'Failed to create knowledge document')
      throw error
    }
  }

  /**
   * Get all documents for a knowledge base
   */
  async getDocumentsByKnowledgeBaseCode(knowledgeBaseCode: string): Promise<IKnowledgeDocument[]> {
    try {
      await dbConnect()
      return await KnowledgeDocumentModel.find({ knowledge_base_code: knowledgeBaseCode }).sort({ created_at: -1 })
    } catch (error) {
      logger.error({ error }, `Failed to get documents for knowledge base: ${knowledgeBaseCode}`)
      throw error
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string): Promise<IKnowledgeDocument | null> {
    try {
      await dbConnect()
      return await KnowledgeDocumentModel.findById(id)
    } catch (error) {
      logger.error({ error }, `Failed to get document with id: ${id}`)
      throw error
    }
  }

  /**
   * Update document by ID
   */
  async updateDocument(id: string, updateData: UpdateKnowledgeDocInput): Promise<IKnowledgeDocument | null> {
    try {
      await dbConnect()
      return await KnowledgeDocumentModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
    } catch (error) {
      logger.error({ error }, `Failed to update document with id: ${id}`)
      throw error
    }
  }

  /**
   * Delete document by ID
   */
  async deleteDocument(id: string): Promise<IKnowledgeDocument | null> {
    try {
      await dbConnect()
      return await KnowledgeDocumentModel.findByIdAndDelete(id)
    } catch (error) {
      logger.error({ error }, `Failed to delete document with id: ${id}`)
      throw error
    }
  }

  /**
   * Check if a document with the given filename exists for a knowledge base
   */
  async documentExists(knowledgeBaseCode: string, fileName: string): Promise<boolean> {
    try {
      await dbConnect()
      const count = await KnowledgeDocumentModel.countDocuments({ 
        knowledge_base_code: knowledgeBaseCode, 
        file_name: fileName 
      })
      return count > 0
    } catch (error) {
      logger.error({ error }, `Failed to check if document exists: ${fileName} for knowledge base ${knowledgeBaseCode}`)
      throw error
    }
  }
}

// Export a singleton instance
export const knowledgeDocumentDbService = new KnowledgeDocumentDbService()