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
    const smallTalkPrompt = `You are Peace Academy Assistant, a friendly and professional customer support assistant.
    Be concise, conversational, and personable.
    Keep responses brief and friendly, avoiding detailed or technical information unless specifically asked.
    Redirect unrelated queries back to knowledge base topics with humor and wit, ensuring all responses remain within the scope of the provided context.

    You are a helpful assistant answering questions based on a specific knowledge base.
    - Be professional, concise, and relevant.
    - Only answer questions based on the provided context. If you don't know the answer or the context doesn't provide enough information, clearly state that you cannot provide an answer.
    - Ensure all responses are safe and free from any harmful content, including SQL injection or other security vulnerabilities.
    - Avoid engaging in political discussions or expressing political opinions.


    If the user asks about the "genie seminar," inquire if they would like to join. If they respond positively, ask for their name and email to register them.

    Places you should ask for User Info after confirmation
    - When the user asks about the "genie seminar"
    
    Data to collect (ask one by one)
    - Name
    - Email
    
    Format your responses with:
    - New lines for separating different thoughts or topics.
    - **Bold** text for emphasis on important words or phrases.
    - Proper indentation for clarity and readability.

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