import dbConnect from '@/db/connect'
import { KnowledgeBaseModel, IKnowledgeBase } from './knowledgebase-schema'
import logger from '@/server/config/pino-config'

export interface CreateKnowledgeBaseInput {
  code: string
  name: string
  description?: string
  is_active?: boolean
}

export type UpdateKnowledgeBaseInput = Partial<CreateKnowledgeBaseInput>

class KnowledgeBaseDbService {
  /**
   * Create a new knowledge base
   */
  async createKnowledgeBase(knowledgeBaseData: CreateKnowledgeBaseInput): Promise<IKnowledgeBase> {
    try {
      await dbConnect()
      const knowledgeBase = new KnowledgeBaseModel(knowledgeBaseData)
      return await knowledgeBase.save()
    } catch (error) {
      logger.error({ error }, 'Failed to create knowledge base')
      throw error
    }
  }

  /**
   * Get all knowledge bases
   */
  async getAllKnowledgeBases(): Promise<IKnowledgeBase[]> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.find().sort({ created_at: -1 })
    } catch (error) {
      logger.error({ error }, 'Failed to get all knowledge bases')
      throw error
    }
  }

  /**
   * Get knowledge base by code
   */
  async getKnowledgeBaseByCode(code: string): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findOne({ code })
    } catch (error) {
      logger.error({ error }, `Failed to get knowledge base with code: ${code}`)
      throw error
    }
  }

  /**
   * Get knowledge base by ID
   */
  async getKnowledgeBaseById(id: string): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findById(id)
    } catch (error) {
      logger.error({ error }, `Failed to get knowledge base with id: ${id}`)
      throw error
    }
  }

  /**
   * Update knowledge base by ID
   */
  async updateKnowledgeBase(id: string, updateData: UpdateKnowledgeBaseInput): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
    } catch (error) {
      logger.error({ error }, `Failed to update knowledge base with id: ${id}`)
      throw error
    }
  }

  /**
   * Update knowledge base by code
   */
  async updateKnowledgeBaseByCode(code: string, updateData: UpdateKnowledgeBaseInput): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findOneAndUpdate(
        { code },
        updateData,
        { new: true, runValidators: true }
      )
    } catch (error) {
      logger.error({ error }, `Failed to update knowledge base with code: ${code}`)
      throw error
    }
  }

  /**
   * Delete knowledge base by ID
   */
  async deleteKnowledgeBase(id: string): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findByIdAndDelete(id)
    } catch (error) {
      logger.error({ error }, `Failed to delete knowledge base with id: ${id}`)
      throw error
    }
  }

  /**
   * Delete knowledge base by code
   */
  async deleteKnowledgeBaseByCode(code: string): Promise<IKnowledgeBase | null> {
    try {
      await dbConnect()
      return await KnowledgeBaseModel.findOneAndDelete({ code })
    } catch (error) {
      logger.error({ error }, `Failed to delete knowledge base with code: ${code}`)
      throw error
    }
  }

  /**
   * Check if a knowledge base with the given code exists
   */
  async codeExists(code: string): Promise<boolean> {
    try {
      await dbConnect()
      const count = await KnowledgeBaseModel.countDocuments({ code })
      return count > 0
    } catch (error) {
      logger.error({ error }, `Failed to check if knowledge base code exists: ${code}`)
      throw error
    }
  }
}

// Export a singleton instance
export const knowledgeBaseDbService = new KnowledgeBaseDbService()