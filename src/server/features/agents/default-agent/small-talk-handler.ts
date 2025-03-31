import { CoreAssistantMessage, CoreSystemMessage, CoreUserMessage } from "ai"
import { AgentRequest, AgentResponse } from "../interfaces"
import { AISdkWrapper, defaultAiSdkWrapper } from "@/server/llm/ai-sdk-wrapper"

export class SmallTalkHandlerService {
    private aiSdkWrapper: AISdkWrapper

    constructor() {
        this.aiSdkWrapper = defaultAiSdkWrapper
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
    // Create a system prompt specifically for casual conversation
    const smallTalkPrompt = `You are a friendly customer support assistant.
    Your name is Peace Academy Assistant.
    Be concise, conversational, and personable.
    Keep your responses brief and friendly.
    Avoid providing detailed or technical information unless specifically asked.
    Always steer the conversation back to how you can help with knowledge base-related questions when appropriate.
    
    Current date: ${new Date().toLocaleDateString()}`
    
    // Generate a response focused on small talk
    const response = await this.aiSdkWrapper.generateText({
      system: smallTalkPrompt,
      messages: request.previousMessages as (CoreSystemMessage | CoreUserMessage | CoreAssistantMessage)[],
      temperature: 0.7, // Higher temperature for more conversational responses
      maxTokens: 150,   // Keep responses brief
    })

    return {message: response}
  }
  
}