import { z } from 'zod'
import logger from '@/server/config/pino-config'
import { AISdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { defaultAiSdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { AgentRequest, AgentResponse } from '..'

// Transaction types
export enum TransactionType {
  REGISTRATION = 'REGISTRATION',
  CANCELLATION = 'CANCELLATION',
  MODIFICATION = 'MODIFICATION',
  OTHER = 'OTHER'
}

/**
 * Transaction handler service
 * Handles different types of transaction requests from users
 */
export class TransactionHandlerService {
  private readonly aiWrapper: AISdkWrapper
  
  constructor() {
    this.aiWrapper = defaultAiSdkWrapper
  }
  
  /**
   * Process a transaction request
   * @param request Agent request containing user query and previous messages
   * @returns Transaction result with success status and message
   */
  async processTransaction(
    request: AgentRequest
  ): Promise<AgentResponse> {
    try {
      // Identify the specific transaction type
      const transactionType = await this.classifyTransactionType(request)
      
      // Route to appropriate transaction handler
      switch (transactionType) {
        case TransactionType.REGISTRATION:
          return this.handleRegistration()
        case TransactionType.CANCELLATION:
          return this.handleCancellation()
        case TransactionType.MODIFICATION:
          return this.handleModification()
        default:
          return {
            message: "I'm not sure how to process that transaction. Would you like me to connect you with a human agent who can help?"
          }
      }
    } catch (error) {
      logger.error({ error }, 'Error processing transaction')
      return {
        message: "I encountered an issue while processing your request. Would you like to speak with a human agent instead?"
      }
    }
  }
  
  /**
   * Classify the specific transaction type
   * @param query User query
   * @param messageHistory Previous conversation for context
   * @returns Type of transaction
   */
  private async classifyTransactionType(
    request: AgentRequest
  ): Promise<TransactionType> {
    try {
      // Create a context-aware prompt with recent history
      const recentMessages = request.previousMessages.slice(-4)
      
      // Generate structured classification
      const { object } = await this.aiWrapper.generateObject({
        schema: z.object({
          transactionType: z.enum([
            TransactionType.REGISTRATION,
            TransactionType.CANCELLATION,
            TransactionType.MODIFICATION,
            TransactionType.OTHER
          ]).describe('The type of transaction requested by the user')
        }),
        prompt: `Classify this transaction-related query:
        
User Query: "${request.query}"

Recent conversation:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Classification rules:
- REGISTRATION: User wants to register, sign up, join, enroll, or participate
- CANCELLATION: User wants to cancel, withdraw, stop, or end their participation
- MODIFICATION: User wants to change, modify, update, or alter their existing registration
- OTHER: Query doesn't clearly fit any of the above categories

Return only the transaction type.`
      })
      
      logger.info({ transactionType: object.transactionType }, 'Transaction type classified')
      return object.transactionType as TransactionType
    } catch (error) {
      logger.error({ error }, 'Error classifying transaction type')
      return TransactionType.OTHER // Default to OTHER on classification failure
    }
  }
  
  /**
   * Handle registration requests
   */
  private handleRegistration(): AgentResponse {
    return {
      message: "To register for the event, please visit https://www.indiafintech.com/registration/. You'll need to provide your contact information and select your ticket type. Would you like any specific information about the registration process?"
    }
  }
  
  /**
   * Handle cancellation requests
   */
  private handleCancellation(): AgentResponse {
    return {
      message: "To cancel your registration, please visit https://www.indiafintech.com/cancellation/ and follow the instructions. You'll need your registration ID and email. Please note our cancellation policy may apply depending on how close we are to the event date."
    }
  }
  
  /**
   * Handle modification requests
   */
  private handleModification(): AgentResponse {
    return {
      message: "To modify your registration details, please visit https://www.indiafintech.com/modification/ and log in with your registration ID and email. From there, you can update your information or change your ticket type if available."
    }
  }
}

// Export singleton instance
export const transactionHandler = new TransactionHandlerService()
