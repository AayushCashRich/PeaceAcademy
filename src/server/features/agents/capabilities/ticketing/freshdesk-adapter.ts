import { z } from 'zod'
import { TicketCreationParams, ticketCreationSchema, TicketingAdapter, TicketResponse, ticketResponseSchema } from './adapter'
import createFreshdeskClient, { FreshdeskClient, FreshdeskTicketResponse } from './freshdesk-client'
import logger from '@/server/config/pino-config'
/**
 * Freshdesk implementation of the TicketingAdapter
 */
export class FreshdeskAdapter implements TicketingAdapter {
    private client: FreshdeskClient
    
    constructor() {
      this.client = createFreshdeskClient()
    }
    
    /**
     * Create a ticket in Freshdesk
     */
    async createTicket(params: TicketCreationParams): Promise<TicketResponse> {
      try {
        // Validate the params against the schema
        ticketCreationSchema.parse(params)
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error({ error: error.errors, params }, 'Ticket creation validation failed')
          throw new Error(`Ticket validation failed: ${error.errors.map(e => e.message).join(', ')}`)
        }
        throw error
      }
      
      try {
        // Map the generic ticket params to Freshdesk-specific format
        const freshdeskResponse = await this.client.createTicket({
          subject: params.subject,
          description: params.body,
          email: params.email,
          priority: params.priority || 2,
          custom_fields: params.customFields,
          tags: params.tags
        })
        
        // Map the Freshdesk response to our generic format
        return this.mapToTicketResponse(freshdeskResponse)
      } catch (error) {
        logger.error({ error, params }, 'Error creating Freshdesk ticket')
        throw error
      }
    }
    
    /**
     * Map Freshdesk response to generic TicketResponse
     */
    private mapToTicketResponse(response: FreshdeskTicketResponse): TicketResponse {
      const ticketResponse = {
        ticketId: response.id,
        status: this.mapStatus(response.status),
        originalResponse: response
      }
      
      // Validate the response against the schema
      return ticketResponseSchema.parse(ticketResponse)
    }
    
    /**
     * Map Freshdesk status codes to readable strings
     */
    private mapStatus(statusCode: number): string {
      const statusMap: Record<number, string> = {
        2: 'Open',
        3: 'Pending',
        4: 'Resolved',
        5: 'Closed'
      }
      
      return statusMap[statusCode] || 'Unknown'
    }
  }