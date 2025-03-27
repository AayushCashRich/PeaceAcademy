import logger from '@/server/config/pino-config'
import { z } from 'zod'
import { TicketCreationParams, ticketCreationSchema, TicketingAdapter, TicketResponse } from './adapter'
import { FreshdeskAdapter } from './freshdesk-adapter'

export enum TicketPlatform {
  FRESHDESK = 'FRESHDESK',
}

/**
 * Factory for selecting the appropriate ticketing system adapter
 */
export class TicketFactoryService {
  private adapters: Map<TicketPlatform, TicketingAdapter>
  
  constructor() {
    this.adapters = new Map()
    
    // Register available adapters
    this.registerAdapter(TicketPlatform.FRESHDESK, new FreshdeskAdapter())
  }
  
  /**
   * Register a new ticketing adapter
   */
  registerAdapter(name: TicketPlatform, adapter: TicketingAdapter): void {
    this.adapters.set(name, adapter)
  }
  
  /**
   * Get an adapter by name
   */
  getAdapter(name: TicketPlatform): TicketingAdapter {
    const adapter = this.adapters.get(name)
    
    if (!adapter) {
      throw new Error(`Ticketing adapter '${name}' is not available`)
    }
    
    return adapter
  }
  
  /**
   * Create a ticket using the specified ticketing system
   */
  async createTicket(ticketPlatform: TicketPlatform, params: TicketCreationParams): Promise<TicketResponse> {
    try {
      // Validate the input params
      ticketCreationSchema.parse(params)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error({ error: error.errors, params }, 'Ticket creation validation failed')
        throw new Error(`Ticket validation failed: ${error.errors.map(e => e.message).join(', ')}`)
      }
      throw error
    }
    const adapter = this.getAdapter(ticketPlatform)
    return adapter.createTicket(params)
  }
}

// Export a singleton instance
export const ticketFactoryService = new TicketFactoryService()
