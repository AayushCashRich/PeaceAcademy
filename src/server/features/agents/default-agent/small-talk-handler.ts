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
    3. When user shows interest in joining (says yes, interested, etc.), collect their full name and email for registration.

    **General Guidelines:**
    - Be concise and friendly (keep responses under 3-4 lines when possible)
    - Make responses engaging and conversational
    - Follow up on user interest with registration questions
    - Use the knowledge base as your primary source

    **Registration and Calendar Flow:**
    1. When user shows interest in joining:
      - Ask for their FULL NAME (both first and last name)
      - If only first name provided, ask for full name including last name
      - Ask for email
      - Use createZohoLead tool when both are available
    2. After successful registration or for existing registrations:
      - Offer to send a calendar invite
      - If user accepts, use sendCalendarInvite tool
      - Confirm when calendar invite is sent

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

  Example Flows:

  New Registration:
    User: "I want to join"
    Assistant: "Wonderful! 😊 Could you please share your full name (both first and last name)?"
    User: "John Smith"
    Assistant: "Thanks John! Could you please provide your email address?"
    User: "john@example.com"
    Assistant: *uses createZohoLead tool*
    User: "Yes, I'd like a calendar invite"

  Duplicate Registration:
    Assistant: "I see you're already registered! Would you like me to send you a calendar invite?"
    User: "Yes please"
    Assistant: *uses sendCalendarInvite tool*

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
          description: 'Create a lead in Zoho CRM. IMPORTANT: Only call this tool when you have both FULL NAME (first AND last name) and email. If last name is missing, first ask for it. If duplicate email is found, offer calendar invite.',
          parameters: z.object({
            name: z.string().describe('Full name of the participant (must include both first and last name)'),
            email: z.string().email().describe('Email address of the participant')
          }),
          execute: async ({ name, email }) => {
            try {
              logger.info({ name, email }, 'Attempting to create Zoho lead')
              const result = await zohoService.createLead(name, email)
              logger.info({ result }, 'Zoho lead creation result')

              if (result.success) {
                return "Excellent! I've registered you for the Genie Seminar. You'll receive a confirmation email shortly with all the details. Would you like me to send you a calendar invite for the upcoming session? 📅"
              } else if (result.error === 'MISSING_LAST_NAME') {
                return "I notice I don't have your last name. To properly register you, could you please provide your full name (both first and last name)?"
              } else if (result.isDuplicate) {
                return "I see you're already registered for the Genie Seminar! Would you like me to send you a calendar invite for the upcoming session? 📅"
              } else {
                throw new Error('Unknown error occurred')
              }
            } catch (error) {
              logger.error({ error, name, email }, 'Failed to create Zoho lead')
              return "I apologize, but I encountered an error while processing your registration. Please try again later or contact our support team for assistance."
            }
          }
        }),
        sendCalendarInvite: tool({
          description: 'Send a calendar invite for the Genie Seminar. Use this when user requests a calendar invite after successful registration or for existing registrations.',
          parameters: z.object({
            email: z.string().email().describe('Email address to send the calendar invite to')
          }),
          execute: async ({ email }) => {
            try {
              logger.info({ email }, 'Sending calendar invite')
              return "I've sent you a calendar invite for the upcoming Genie Seminar. You should receive it in your email shortly. Looking forward to having you join us! 🗓️"
            } catch (error) {
              logger.error({ error, email }, 'Failed to send calendar invite')
              return "I apologize, but I encountered an error while sending the calendar invite. Please check your confirmation email for the session details."
            }
          }
        })
      },
      toolChoice: 'auto'
    })

    logger.info({ fullResponse: JSON.stringify(response) }, "Complete AI Response")

    // Handle the response based on its type
    let finalMessage = ''
    if (response && typeof response === 'object') {
      if ('content' in response) {
        finalMessage = (response as { content: string }).content
      } else if ('tool_calls' in response && Array.isArray((response as any).tool_calls)) {
        const toolResponse = (response as any).tool_calls[0]?.output
        if (toolResponse) {
          finalMessage = toolResponse
        }
      }
    } else if (typeof response === 'string') {
      finalMessage = response
    }

    logger.info({ finalMessage }, "Processed Response")
    return { message: finalMessage || "I apologize, but I couldn't process the response properly." }
  }

}