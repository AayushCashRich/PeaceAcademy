import { CoreAssistantMessage, CoreSystemMessage, CoreUserMessage } from "ai"
import { AgentRequest, AgentResponse } from "../interfaces"
import { KnowledgeHandlerService } from './knowledge-handler'
import { AISdkWrapper, defaultAiSdkWrapper } from "@/server/llm/ai-sdk-wrapper"

export class SmallTalkHandlerService {
  private aiSdkWrapper: AISdkWrapper

  private knowledgeHandler: KnowledgeHandlerService

  constructor() {
    this.aiSdkWrapper = defaultAiSdkWrapper
    this.knowledgeHandler = new KnowledgeHandlerService()
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
    - Be concise and friendly (keep responses under 3-4 lines when possible)
    - Make responses engaging and conversational
    - Always end Genie Seminar responses with a question about joining
    - Use the knowledge base as your primary source

    **Knowledge Base Interaction:**
    - Prioritize providing accurate information from the knowledge base
    - Keep responses focused on the most relevant information
    - Only state "I don't have information" if you've thoroughly checked the knowledge base

    **Genie Seminar Response Structure:**
    When someone asks about the Genie Seminar:
    1. Brief Description (1-2 lines max)
    2. Key Benefit (1 line)
    3. Direct Question: "Would you like to join? I can help you sign up! 😊"

    Example Genie Seminar response:
    "The Genie Seminar is our signature online program where you'll learn essential skills for happiness, love, and peace.

    You'll join a supportive community focused on personal growth and positive change.

    Would you like to join? I can help you sign up! 😊"

    **Response Formatting:**
    - Keep paragraphs short (1-2 lines each)
    - Use **bold** for key points
    - Add emojis sparingly for warmth

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