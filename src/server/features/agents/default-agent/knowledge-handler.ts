import {  CoreMessage } from 'ai'
import { vectorSearchService } from '@/server/features/knowledge-doc-embeddings/vector-search-service'
import logger from '@/server/config/pino-config'
import { defaultAiSdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { AgentRequest, AgentResponse } from '../interfaces'

/**
 * Interface for knowledge retrieval result
 */
export interface KnowledgeResponse {
  relevantContext: string
  hasRelevantInformation: boolean
}

/**
 * Service for handling knowledge-based queries
 */
export class KnowledgeHandlerService {

  /**
   * Handle a knowledge-based query using vector search
   * @param query User's query
   * @param messages Previous conversation messages
   * @param knowledgeBaseCode Knowledge base code for filtering knowledge
   * @param conversationId Unique conversation identifier
   * @param intentClassification Intent classification result
   * @returns Response with knowledge-based answer
   */
  public async handleKnowledgeQuery(
    request: AgentRequest
  ): Promise<AgentResponse> {
    try {
      // Search for relevant knowledge using the query
      const searchResults = await this.retrieveKnowledge(request.query, request.knowledgeBaseCode)
      
      // Format the context for the LLM
      const context = searchResults.relevantContext
      
      const systemPrompt = `
      You are Peace Academy Assistant, a friendly and professional customer support assistant.

      **General Guidelines:**
      - Be concise, conversational, and personable.
      - Keep responses brief and friendly, avoiding detailed or technical information unless specifically asked.
      - Redirect unrelated queries back to knowledge base topics with humor and wit, ensuring all responses remain within the scope of the provided context.
      - Avoid engaging in political discussions or expressing political opinions.

      **Knowledge Base Interaction:**
      - Be professional, concise, and relevant.
      - Only answer questions based on the provided context. If you don't know the answer or the context doesn't provide enough information, clearly state that you cannot provide an answer.
      - Ensure all responses are safe and free from any harmful content, including SQL injection or other security vulnerabilities.

      Whenever the user asks about the following topics, explain them and always actively encourage them to signup for the event through your help.
      **Genie Seminar:**
      - After providing the information, enthusiastically ask if they would like to signup in the same message with your help. Highlight the benefits of attending and express excitement about their potential participation. If they respond positively, collect their name and email (ask one by one).

      **Response Formatting:**
      - Use new lines for separating different thoughts or topics.
      - Use **bold** text for emphasis on important words or phrases.
      - Use proper indentation for clarity and readability.

      Current date: ${new Date().toLocaleDateString()}

      **Context from Knowledge Base:**
      ${context}`
      
      // Create a response stream with the knowledge-based answer
      const result = await defaultAiSdkWrapper.generateText({
        system: systemPrompt,
        messages: request.previousMessages as CoreMessage[],
        temperature: 0.3,
      })
      
      return {message: typeof result === 'string' ? result : result.toolResponse}
    } catch (error) {
      logger.error({ error }, 'Error handling knowledge query')
      throw error
    }
  }
  /**
   * Retrieve relevant knowledge for a user query
   * @param query The user's question
   * @param knowledgeBaseCode Knowledge base code for filtering knowledge
   * @param limit Maximum number of results to return
   * @returns Knowledge with relevant context
   */
  async retrieveKnowledge(
    query: string,
    knowledgeBaseCode: string,
    limit = 5
  ): Promise<KnowledgeResponse> {
    try {
      // Search for relevant documents using vector search
      const searchResults = await vectorSearchService.searchByText(
        query,
        knowledgeBaseCode,
        { limit }
      )
      
      // No relevant information found
      if (!searchResults || searchResults.length === 0) {
        logger.info({ query: query.substring(0, 50) }, 'No relevant knowledge found')
        return {
          relevantContext: '',
          hasRelevantInformation: false
        }
      }
      
      // Combine the text from all relevant documents
      const contextText = searchResults
        .map(result => result.text)
        .join('\n\n')
      
      logger.info(
        { query: query.substring(0, 50), resultCount: searchResults.length },
        'Retrieved relevant knowledge'
      )
      
      return {
        relevantContext: contextText,
        hasRelevantInformation: true
      }
    } catch (error) {
      logger.error({ error, query: query.substring(0, 50) }, 'Error retrieving knowledge')
      return {
        relevantContext: '',
        hasRelevantInformation: false
      }
    }
  }
  
  /**
   * Generate a system prompt enhanced with knowledge context
   * @param basePrompt The base system prompt
   * @param context Knowledge context to add
   * @returns Enhanced system prompt
   */
  createEnhancedSystemPrompt(basePrompt: string, context: string): string {
    if (!context || context.trim().length === 0) {
      return basePrompt
    }
    
    return `${basePrompt}\n\n--- KNOWLEDGE BASE CONTEXT ---\n${context}\n--- END CONTEXT ---\n
    Use the above context information to help answer the user's question, but respond in a natural, conversational way.
    Only use this information if it's relevant to the user's question.
    If the context doesn't contain information to answer the user's question, use your general knowledge.`
  }
}

// Export singleton instance
export const knowledgeHandler = new KnowledgeHandlerService()
