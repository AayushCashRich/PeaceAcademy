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

      //- TRANSACTION: User wants to perform an action like registering, canceling, modifying bookings    


      // Generate structured classification using Vercel AI SDK
      const { object } = await defaultAiSdkWrapper.generateObject<IntentClassification>({
        schema: z.object({
          reasoning: z.string().describe('Explanation of why this classification was chosen'),
          intentType: z.enum([
            ChatIntentType.AGENT_REQUEST,
            ChatIntentType.SMALL_TALK
          ]).describe('The type of intent detected in the user query')
        }),
        prompt: `Classify this user query based on its intent:
        
User Query: "${query}"

Recent conversation history:
${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Classification rules:
- AGENT_REQUEST: User explicitly asks for a live agent, shows extreme frustration, or needs human assistance
- SMALL_TALK: All other interactions including:
  - Casual conversation and greetings
  - Questions about services or programs
  - Interest in signing up or registering
  - Support requests or issues
  - Any other queries or responses

Specific guidelines:
1. Only classify as AGENT_REQUEST if:
   - User directly asks for a human/live agent
   - User shows clear frustration or anger
   - User repeatedly states the AI isn't helping
2. Classify everything else as SMALL_TALK, including:
   - Program inquiries
   - Registration interest
   - Support questions
   - General conversation

Example classifications:
- "I want to speak to a human" -> AGENT_REQUEST
- "This is frustrating, I need a real person!" -> AGENT_REQUEST
- "What is Peace Academy?" -> SMALL_TALK
- "I'm interested in joining" -> SMALL_TALK
- "Hi" or "Thanks" -> SMALL_TALK
- "How do I register?" -> SMALL_TALK

Consider both the current query and the conversation history when classifying.`
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
