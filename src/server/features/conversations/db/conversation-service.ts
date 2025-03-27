import { v4 as uuidv4 } from 'uuid'
import { ConversationModel, IConversation } from './conversation-schema'
import logger from '@/server/config/pino-config'
import { ChatIntentType } from '@/server/features/agents/default-agent/intent-classifier'
import dbConnect from '@/db/connect'

/**
 * Message type matching the structure used in the chat API
 */
export interface ChatMessage {
  role: string
  content: string
  metadata?: {
    intentType?: ChatIntentType
    reasoning?: string
    handoverTicketId?: string
    transactionType?: string
    success?: boolean
    knowledgeSource?: string
    hasRelevantInformation?: boolean
  }
  timestamp?: Date
}

/**
 * Service for managing conversation persistence and retrieval
 */
export class ConversationService {
  /**
   * Creates a new conversation or updates an existing one
   * @param conversationId Unique identifier for the conversation
   * @param knowledgeBaseCode Knowledge base code related to the conversation
   * @param messages Array of chat messages
   * @returns The updated or created conversation
   */
  async saveConversation(
    conversationId: string,
    knowledgeBaseCode: string,
    messages: ChatMessage[]
  ): Promise<IConversation> {
    try {
        await dbConnect()
      // Format messages to include timestamp if not present
      const formattedMessages = messages.map(message => ({
        ...message,
        timestamp: message.timestamp || new Date()
      }))

      // Try to update existing conversation
      const updatedConversation = await ConversationModel.findOneAndUpdate(
        { conversation_id: conversationId },
        {
          knowledge_base_code: knowledgeBaseCode,
          messages: formattedMessages,
          updated_at: new Date()
        },
        { new: true, upsert: true }
      )

      logger.info(
        { conversationId, messageCount: messages.length },
        'Conversation saved successfully'
      )

      return updatedConversation
    } catch (error) {
      logger.error(
        { error, conversationId },
        'Error saving conversation'
      )
      throw new Error(`Failed to save conversation: ${error}`)
    }
  }

  /**
   * Appends a new message to an existing conversation
   * @param conversationId Conversation identifier
   * @param message The new message to append
   * @returns The updated conversation
   */
  async appendMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<IConversation | null> {
    await dbConnect()
    try {
      // Format message to include timestamp
      const formattedMessage = {
        ...message,
        timestamp: new Date()
      }

      // Find and update the conversation
      const updatedConversation = await ConversationModel.findOneAndUpdate(
        { conversation_id: conversationId },
        {
          $push: { messages: formattedMessage },
          updated_at: new Date()
        },
        { new: true }
      )

      if (!updatedConversation) {
        logger.warn(
          { conversationId },
          'Attempted to append message to non-existent conversation'
        )
        return null
      }

      logger.info(
        { conversationId, messageRole: message.role },
        'Message appended to conversation'
      )

      return updatedConversation
    } catch (error) {
      logger.error(
        { error, conversationId },
        'Error appending message to conversation'
      )
      throw new Error(`Failed to append message: ${error}`)
    }
  }

  /**
   * Retrieves a conversation by its ID
   * @param conversationId Conversation identifier
   * @returns The conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<IConversation | null> {
    await dbConnect()
    try {
      const conversation = await ConversationModel.findOne({
        conversation_id: conversationId
      })

      if (!conversation) {
        logger.info(
          { conversationId },
          'Conversation not found'
        )
        return null
      }

      return conversation
    } catch (error) {
      logger.error(
        { error, conversationId },
        'Error retrieving conversation'
      )
      throw new Error(`Failed to retrieve conversation: ${error}`)
    }
  }

  /**
   * Retrieves all conversations associated with a specific knowledge base code
   * @param knowledgeBaseCode Knowledge base code to filter by
   * @param limit Optional limit on the number of results
   * @returns Array of conversations
   */
  async getConversationsByKnowledgeBaseCode(
    knowledgeBaseCode: string,
    limit = 100
  ): Promise<IConversation[]> {
    await dbConnect()
    try {
      const conversations = await ConversationModel.find({ knowledge_base_code: knowledgeBaseCode })
        .sort({ updated_at: -1 })
        .limit(limit)

      logger.info(
        { knowledgeBaseCode, count: conversations.length },
        'Retrieved conversations by knowledge base code'
      )

      return conversations
    } catch (error) {
      logger.error(
        { error, knowledgeBaseCode },
        'Error retrieving conversations by knowledge base code'
      )
      throw new Error(`Failed to retrieve conversations: ${error}`)
    }
  }

  /**
   * Generates a new conversation ID
   * @returns A unique conversation ID
   */
  generateConversationId(): string {
    return uuidv4()
  }
}

// Export singleton instance
export const conversationService = new ConversationService()
