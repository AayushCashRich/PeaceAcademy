import { CoreAssistantMessage, CoreSystemMessage, CoreUserMessage } from "ai"
import { AgentRequest, AgentResponse } from "../interfaces"
import { KnowledgeHandlerService } from './knowledge-handler'
import { AISdkWrapper, defaultAiSdkWrapper } from "@/server/llm/ai-sdk-wrapper"

export class SmallTalkHandlerService {
  private aiSdkWrapper: AISdkWrapper

  knowledgeHandler: KnowledgeHandlerService

  constructor(
    knowledgeHandler: KnowledgeHandlerService) {
    this.aiSdkWrapper = defaultAiSdkWrapper
    this.knowledgeHandler = knowledgeHandler
  }

  /**
 * Handle small talk without using knowledge retrieval
 * @param query The user's query
 * @param messages Previous conversation history
 * @returns AI-generated response as a stream
 */
  async handleSmallTalk(
    request: AgentRequest
  ): Promise<AgentResponse> {

    // Search for relevant knowledge using the query
    const searchResults = await this.knowledgeHandler.retrieveKnowledge(request.query, request.knowledgeBaseCode)

    // Format the context for the LLM
    const context = searchResults.relevantContext

    // Create a system prompt specifically for casual conversation
    const smallTalkPrompt = `
    You are Peace Academy Assistant, a friendly and professional customer support assistant.

    **Primary Response Priority:**
    1. Always first check if the query matches knowledge base topics and provide accurate information from the knowledge base.
    2. Only default to Genie Seminar promotion if the query is specifically about seminars/programs or if no relevant knowledge base information exists.

    **General Guidelines:**
    - Be concise, conversational, and personable
    - Keep responses brief and friendly
    - Use the knowledge base as your primary source of information
    - Only mention the Genie Seminar when relevant or when specifically asked

    **Knowledge Base Interaction:**
    - Prioritize providing accurate information from the knowledge base
    - If the query matches multiple topics, provide the most relevant information
    - Only state "I don't have information" if you've thoroughly checked the knowledge base
    - Stay within the scope of the provided context

    **Genie Seminar Flow:**
    ONLY when users specifically:
    1. Ask about the Genie Seminar
    2. Express interest in programs/seminars
    3. Or after providing knowledge base information about related topics
    THEN:
    - Explain the Genie Seminar
    - Ask if they would like to signup
    - If yes, collect their name and email (one by one)

    **Response Formatting:**
    - Use new lines for separating different thoughts or topics
    - Use **bold** text for emphasis on important words or phrases
    - Use proper indentation for clarity and readability

    Current date: ${new Date().toLocaleDateString()}
      **Context from Knowledge Base:**
      ${context}`
    // Generate a response focused on small talk
    const response = await this.aiSdkWrapper.generateText({
      system: smallTalkPrompt,
      messages: request.previousMessages as (CoreSystemMessage | CoreUserMessage | CoreAssistantMessage)[],
      temperature: 0.7, // Higher temperature for more conversational responses
      maxTokens: 150,   // Keep responses brief
    })

    return { message: response }
  }

}