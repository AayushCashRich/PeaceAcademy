import { CoreAssistantMessage, CoreSystemMessage, CoreUserMessage, tool } from "ai"
import { AgentRequest, AgentResponse } from "../interfaces"
import { KnowledgeHandlerService } from './knowledge-handler'
import { AISdkWrapper, defaultAiSdkWrapper } from "@/server/llm/ai-sdk-wrapper"
import logger from "@/server/config/pino-config"
import { z } from "zod"
import { zohoService } from "@/server/utils/ZohoAdaptor"

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
    3. When user shows interest in joining (says yes, interested, etc.), collect their name and email for registration.

    **General Guidelines:**
    - Be concise and friendly (keep responses under 3-4 lines when possible)
    - Make responses engaging and conversational
    - Follow up on user interest with registration questions
    - Use the knowledge base as your primary source

    **Registration Flow:**
    When user shows interest in joining:
    1. Thank them for their interest
    2. Ask for their name if not provided
    3. Ask for their email if not provided
    4. Once details are collected, provide next steps

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

    Example Registration Flow:
    User: "Yes"
    Response: "Wonderful! 😊 To help you get started, could you please share your name?"
    User: "John"
    Response: "Thanks John! Could you please provide your email address so I can send you the registration details?"

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
      maxTokens: 150,
      tools: {
        createZohoLead: tool({
          description: 'Create a lead in Zoho CRM when user provides both name and email for Genie Seminar registration. Only call this tool when you have collected both pieces of information.',
          parameters: z.object({
            name: z.string().describe('Full name of the participant'),
            email: z.string().email().describe('Email address of the participant')
          }),
          execute: async ({ name, email }) => {
            try {
              logger.info({ name, email }, 'Attempting to create Zoho lead')

              const leadId = await zohoService.createLead(name, email)

              logger.info({ leadId, name, email }, 'Successfully created Zoho lead')

              return {
                success: true,
                message: "Wonderful! I've registered you for the Genie Seminar. You'll receive a confirmation email shortly with all the details. We're excited to have you join us! 😊"
              }
            } catch (error) {
              logger.error({ error, name, email }, 'Failed to create Zoho lead')
              return {
                success: false,
                message: "I apologize, but I encountered an error while processing your registration. Please try again later or contact our support team for assistance."
              }
            }
          }
        })
      },  // Keep responses brief
      toolChoice: 'auto'
    })

    return { message: response }
  }

}