import { z } from 'zod'
import logger from '@/server/config/pino-config'
import { ticketFactoryService, TicketPlatform } from '../capabilities/ticketing/ticket-factory-service'
import { AISdkWrapper, defaultAiSdkWrapper } from '@/server/llm/ai-sdk-wrapper'
import { CoreMessage } from 'ai'
import { AgentRequest, AgentResponse } from '..'
import { TicketCreationParams } from '../capabilities/ticketing/adapter'
 


// Priority enum for tickets
export enum TicketPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

// Ticket creation result interface
export interface TicketCreationResult {
  success: boolean
  message: string
  ticketId?: string | number
  requiresMoreInfo?: boolean
  requestedInfo?: string[]
}

/**
 * Represents the extracted information for creating a ticket
 */
interface TicketInfo {
  name: string
  email: string
  subject: string
  body: string
  priority: TicketPriority
  isComplete: boolean
  missingFields: string[]
}

/**
 * Ticket creation handler service
 * Handles ticket creation requests from users
 */
export class TicketCreationHandlerService {
  private aiWrapper: AISdkWrapper
  private platform: TicketPlatform
  
  constructor(platform: TicketPlatform) {
    this.aiWrapper = defaultAiSdkWrapper
    this.platform = platform
  }
  
  /**
   * Process a ticket creation request
   * @param query User query related to creating a ticket
   * @param messageHistory Previous conversation history for context
   * @returns Ticket creation result with success status and message
   */
  async processTicketCreation(
    request: AgentRequest
  ): Promise<AgentResponse> {
    try {
      // Extract ticket information from the query and message history
      const ticketInfo = await this.extractTicketInfo(request)
      
      // If ticket information is incomplete, ask for more details
      if (!ticketInfo.isComplete) {
        return await this.handleIncompleteTicketInfo(ticketInfo)
      }
      
      // Create the ticket using the factory service
      return await this.createTicket(ticketInfo)
    } catch (error) {
      logger.error({ error }, 'Error processing ticket creation')
      return {
        message: "I encountered an issue while processing your ticket request. Would you like to speak with a human agent instead?"
      }
    }
  }
  
  /**
   * Extract ticket information from user's query and conversation history
   * @param query User query
   * @param messageHistory Previous conversation for context
   * @returns Extracted ticket information
   */
  private async extractTicketInfo(
    request: AgentRequest
  ): Promise<TicketInfo> {
    try {
      // Create a context-aware prompt with recent history
      const recentMessages = request.previousMessages.slice(-5)
      
      // Generate structured ticket information
      const { object } = await this.aiWrapper.generateObject({
        schema: z.object({
          name: z.string().describe('User\'s full name'),
          email: z.string().email().describe('User\'s email address'),
          subject: z.string().describe('A concise subject line for the ticket'),
          body: z.string().describe('Detailed description of the issue or request'),
          priority: z.nativeEnum(TicketPriority).describe('Ticket priority level: 1=Low, 2=Medium, 3=High, 4=Urgent'),
          isComplete: z.boolean().describe('Whether all necessary information is available to create the ticket'),
          missingFields: z.array(z.string()).describe('List of fields that are missing or incomplete')
        }),
        messages: recentMessages as CoreMessage[],
        system: `Extract information for creating a support ticket from this conversation.
        
User Query: "${request.query}"

Extract the following information from the query and conversation history:
- User's full name
- User's email address
- A concise subject line that summarizes the issue
- A detailed description of the issue that provides all relevant context
- Priority level (1=Low, 2=Medium, 3=High, 4=Urgent)

If any field is missing or insufficient, set isComplete to false and list the missing fields in missingFields.
If all required information is present, set isComplete to true.

Guidelines for setting priority:
- Low (1): General questions, minor issues with workarounds
- Medium (2): Functional problems that impact experience but don't prevent core functions
- High (3): Issues preventing important functionality or requiring prompt attention
- Urgent (4): Critical problems affecting multiple users or presenting security risks

Return the structured ticket information.`
      })
      
      // Process the extracted information
      const ticketInfo = object as TicketInfo
      
      logger.info(
        { isComplete: ticketInfo.isComplete, missingFields: ticketInfo.missingFields },
        'Ticket information extracted'
      )
      return ticketInfo
    } catch (error) {
      logger.error({ error }, 'Error extracting ticket information')
      // Return a default incomplete ticket info
      return {
        name: '',
        email: '',
        subject: '',
        body: '',
        priority: TicketPriority.MEDIUM,
        isComplete: false,
        missingFields: ['Failed to extract ticket information']
      }
    }
  }
  
  /**
   * Handle incomplete ticket information by asking for specific missing details
   * Using LLM to generate a contextual message based on what information is missing
   * @param ticketInfo Partial ticket information
   * @returns Result indicating more information is needed
   */
  private async handleIncompleteTicketInfo(ticketInfo: TicketInfo): Promise<TicketCreationResult> {
    try {
      // Generate a message asking for the missing information using the LLM
      const result = await this.aiWrapper.generateText({
        system: `You are a helpful assistant creating a support ticket. 
        The user wants to create a ticket but some information is missing.
        
        Current information:
        ${ticketInfo.name ? `Name: ${ticketInfo.name}` : 'Name: Missing'}
        ${ticketInfo.email ? `Email: ${ticketInfo.email}` : 'Email: Missing'}
        ${ticketInfo.subject ? `Subject: ${ticketInfo.subject}` : 'Subject: Missing'}
        ${ticketInfo.body ? `Description: ${ticketInfo.body}` : 'Description: Missing'}
        
        Missing fields: ${ticketInfo.missingFields.join(', ')}
        
        Write a BRIEF, friendly message asking for ONLY the missing information. 
        Be conversational and natural, not like a form. 
        Do not ask for information that is already provided.`,
        prompt: "Generate a message asking for the missing ticket information",
        temperature: 0.7,
        maxTokens: 250
      })
      
      return {
        success: false,
        message: result,
        requiresMoreInfo: true,
        requestedInfo: ticketInfo.missingFields
      }
    } catch (error) {
      logger.error({ error, ticketInfo }, 'Error generating clarification message')
      
      // Fallback message if LLM fails
      let fallbackMessage = "I'd like to help you create a support ticket, but I need more information."
      if (ticketInfo.missingFields.length > 0) {
        fallbackMessage += ` Could you please provide: ${ticketInfo.missingFields.join(', ')}?`
      }
      
      return {
        success: false,
        message: fallbackMessage,
        requiresMoreInfo: true,
        requestedInfo: ticketInfo.missingFields
      }
    }
  }
  
  /**
   * Create a ticket using the ticket factory service
   * @param ticketInfo Complete ticket information
   * @returns Result of ticket creation
   */
  async createTicket(ticketInfo: TicketInfo): Promise<AgentResponse> {
    try {
      // Map the extracted information to ticket creation params
      const ticketParams: TicketCreationParams = {
        name: ticketInfo.name,
        email: ticketInfo.email,
        subject: ticketInfo.subject,
        body: ticketInfo.body,
        priority: ticketInfo.priority,
        tags: ['ai-assistant-created']
      }
      
      // Create the ticket using the factory service with Freshdesk
      const ticketResponse = await ticketFactoryService.createTicket(this.platform, ticketParams)
      
      logger.info({ ticketId: ticketResponse.ticketId }, 'Ticket created successfully')
      
      // Generate a contextual success message using LLM
      try {
        const successMessage = await this.aiWrapper.generateText({
          system: `You are a helpful assistant who has just created a support ticket for a user.
          
          Ticket information:
          - Ticket ID: ${ticketResponse.ticketId}
          - Subject: ${ticketInfo.subject}
          - Customer: ${ticketInfo.name}
          - Email: ${ticketInfo.email}
          - Priority: ${this.getPriorityText(ticketInfo.priority)}
          
          Write a BRIEF, friendly confirmation message informing the user that their ticket has been created.
          Include the ticket ID and when they can expect to hear back based on priority.
          Be conversational and warm but concise (max 3 sentences).`,
          prompt: "Generate a ticket creation confirmation message",
          temperature: 0.7,
          maxTokens: 200
        })
        
        return {
          message: successMessage
        }
      } catch (error) {
        logger.error({ error }, 'Error generating success message, using fallback')
        
        // Fallback success message if LLM fails
        return {
          message: `Our systems are having issues, please try again.`
        }
      }
    } catch (error) {
      logger.error({ error, ticketInfo }, 'Error creating ticket')
      
      try {
        // Generate a contextual error message using LLM
        const errorMessage = await this.aiWrapper.generateText({
          system: `You are a helpful assistant who just tried to create a support ticket but encountered an error.
          The error happened while trying to create a ticket about "${ticketInfo.subject}".
          
          Write a BRIEF, friendly message explaining that there was an issue creating the ticket.
          Suggest possible next steps (try again or speak to agent).
          Be empathetic but concise (max 2 sentences).`,
          prompt: "Generate a ticket creation error message",
          temperature: 0.7,
          maxTokens: 150
        })
        
        return {
          message: errorMessage
        }
      } catch (secondError) {
        // Log the secondary error
        logger.error({ secondError }, 'Error generating error message, using fallback')
        // Fallback error message if LLM also fails
        return {
          message: "I'm sorry, but I encountered an issue while creating your ticket. Would you like to try again or speak with a human agent?"
        }
      }
    }
  }
  
  /**
   * Helper method to convert priority number to readable text
   */
  private getPriorityText(priority: TicketPriority): string {
    switch (priority) {
      case TicketPriority.LOW:
        return "Low"
      case TicketPriority.MEDIUM:
        return "Medium"
      case TicketPriority.HIGH:
        return "High"
      case TicketPriority.URGENT:
        return "Urgent"
      default:
        return "Medium"
    }
  }
}
