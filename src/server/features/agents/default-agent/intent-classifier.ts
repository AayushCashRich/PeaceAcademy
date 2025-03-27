import { z } from 'zod'
import logger from '@/server/config/pino-config'
import { defaultAiSdkWrapper } from '@/server/llm/ai-sdk-wrapper'

// Define the possible intent types
export enum ChatIntentType {
  AGENT_REQUEST = 'AGENT_REQUEST',  // Explicit agent request or extreme frustration
  TRANSACTION = 'TRANSACTION',      // Transaction-related (register, cancel, etc.)
  TICKET_CREATION = 'TICKET_CREATION', // Ticket creation or management
  FAQ = 'FAQ',                     // General question from knowledge base
  SMALL_TALK = 'SMALL_TALK'        // Casual conversation
}

// Intent classification result with reasoning
export interface IntentClassification {
  intentType: ChatIntentType
  reasoning: string
}

/**
 * Intent classifier service for the chatbot
 * Uses LLM to classify user queries into appropriate intent categories
 */
export class IntentClassifierService {
  /**
   * Classify user intent using LLM
   * @param query The user's query
   * @param messageHistory Previous conversation history for context
   * @returns Classification of the intent with reasoning
   */
  async classifyIntent(
    query: string,
    messageHistory: { role: string; content: string }[]
  ): Promise<IntentClassification> {
    try {
      logger.info({ query: query.substring(0, 50) }, 'Classifying user intent')
      
      // Create a context-aware prompt by including the last few messages
      const recentMessages = messageHistory.slice(-6)
      
      // Generate structured classification using Vercel AI SDK
      const { object } = await defaultAiSdkWrapper.generateObject<IntentClassification>({
        schema: z.object({
          reasoning: z.string().describe('Explanation of why this classification was chosen'),
          intentType: z.enum([
            ChatIntentType.AGENT_REQUEST,
            ChatIntentType.TRANSACTION,
            ChatIntentType.TICKET_CREATION,
            ChatIntentType.FAQ,
            ChatIntentType.SMALL_TALK
          ]).describe('The type of intent detected in the user query')
        }),
        prompt: `Classify this user query based on its intent:
        
User Query: "${query}"

Recent conversation history:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Classification rules:
- AGENT_REQUEST: User explicitly asks for a live agent or shows extreme frustration
- TRANSACTION: User wants to perform an action like registering, canceling, modifying bookings
- TICKET_CREATION: User wants to create a new ticket
- FAQ: User asks a question that can be answered with knowledge from the knowledge base
- SMALL_TALK: Casual conversation, greetings, thanks, or out-of-context questions or questions not relevant to the knowledge base

Consider both the user query and the conversation history when classifying.`
      })
      
      logger.info(
        { intent: object.intentType, reasoning: object.reasoning.substring(0, 100) }, 
        'Intent classification completed'
      )
      
      return {
        intentType: object.intentType as ChatIntentType,
        reasoning: object.reasoning
      }
    } catch (error) {
      logger.error({ error }, 'Error classifying intent')
      // Default to FAQ as a fallback
      return {
        intentType: ChatIntentType.FAQ,
        reasoning: 'Classification failed, defaulting to FAQ'
      }
    }
  }
}

// Export singleton instance
export const intentClassifier = new IntentClassifierService()
