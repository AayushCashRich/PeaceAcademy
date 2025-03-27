import axios from 'axios'
import logger from '@/server/config/pino-config'

/**
 * Interface for Freshdesk ticket creation parameters
 */
export interface FreshdeskTicketParams {
  /** The subject of the ticket */
  subject: string
  /** The description or content of the ticket */
  description: string
  /** Email of the requester */
  email: string
  /** Priority of the ticket (1-4): 1 is Low, 2 is Medium, 3 is High, 4 is Urgent */
  priority?: number
  /** Status of the ticket (2-5): 2 is Open, 3 is Pending, 4 is Resolved, 5 is Closed */
  status?: number
  /** Source of the ticket (1-7): 1 is Email, 2 is Portal, 3 is Phone, etc. */
  source?: number
  /** Any additional tags to add to the ticket */
  tags?: string[]
  /** Custom fields for the ticket */
  custom_fields?: Record<string, unknown>
}

/**
 * Interface for the response when a ticket is created
 */
export interface FreshdeskTicketResponse {
  id: number
  subject: string
  description: string
  email: string
  priority: number
  status: number
  created_at: string
  updated_at: string
  [key: string]: unknown
}

/**
 * Configuration for the Freshdesk client
 */
export interface FreshdeskConfig {
  /** Freshdesk domain (e.g., 'yourcompany.freshdesk.com') */
  domain: string
  /** API key for authentication */
  apiKey: string
  /** Whether to enable logging */
  enableLogging?: boolean
}

/**
 * Client for interacting with the Freshdesk API
 */
export class FreshdeskClient {
  private baseUrl: string
  private apiKey: string
  private enableLogging: boolean

  constructor(config: FreshdeskConfig) {
    this.baseUrl = `https://${config.domain}/api/v2`
    this.apiKey = config.apiKey
    this.enableLogging = config.enableLogging ?? true
  }

  /**
   * Get the authentication headers for API requests
   */
  private getAuthHeaders() {
    // Freshdesk API uses Basic Auth with the API key as the password and X as the username
    const encodedAuth = Buffer.from(`${this.apiKey}:X`).toString('base64')
    return {
      'Authorization': `Basic ${encodedAuth}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, data?: Record<string, unknown>) {
    if (this.enableLogging) {
      logger.info({ message, ...data }, 'Freshdesk API')
    }
  }

  /**
   * Log errors if logging is enabled
   */
  private logError(message: string, error: unknown) {
    if (this.enableLogging) {
      logger.error({ error, message }, 'Freshdesk API Error')
    }
  }

  /**
   * Create a new ticket in Freshdesk
   */
  async createTicket(params: FreshdeskTicketParams): Promise<FreshdeskTicketResponse> {
    try {
      this.log('Creating Freshdesk ticket', { subject: params.subject })

      // Prepare the ticket data according to Freshdesk API requirements
      const ticketData = {
        subject: params.subject,
        description: params.description,
        email: params.email,
        priority: params.priority || 2, // Default to Medium priority
        status: params.status || 2, // Default to Open status
        source: params.source || 2, // Default to Portal as the source
        tags: params.tags || [],
        custom_fields: params.custom_fields || {}
      }

      // Make the API request to create the ticket
      const response = await axios.post<FreshdeskTicketResponse>(
        `${this.baseUrl}/tickets`,
        ticketData,
        { headers: this.getAuthHeaders() }
      )

      this.log('Ticket created successfully', { ticketId: response.data.id })
      return response.data
    } catch (error) {
      this.logError('Failed to create Freshdesk ticket', error)
      
      // Enhance error message with API response details if available
      const apiError = error as { response?: { data?: { message?: string }, status?: number } }
      const errorMessage = apiError.response?.data?.message || 'Unknown error occurred'
      const errorCode = apiError.response?.status || 500
      
      throw new Error(`Freshdesk API Error (${errorCode}): ${errorMessage}`)
    }
  }

  /**
   * Get a ticket by its ID
   */
  async getTicket(ticketId: number): Promise<FreshdeskTicketResponse> {
    try {
      this.log('Fetching Freshdesk ticket', { ticketId })

      const response = await axios.get<FreshdeskTicketResponse>(
        `${this.baseUrl}/tickets/${ticketId}`,
        { headers: this.getAuthHeaders() }
      )

      this.log('Ticket fetched successfully', { ticketId })
      return response.data
    } catch (error) {
      this.logError(`Failed to fetch Freshdesk ticket ${ticketId}`, error)
      
      const apiError = error as { response?: { data?: { message?: string }, status?: number } }
      const errorMessage = apiError.response?.data?.message || 'Unknown error occurred'
      const errorCode = apiError.response?.status || 500
      
      throw new Error(`Freshdesk API Error (${errorCode}): ${errorMessage}`)
    }
  }

  /**
   * Update an existing ticket
   */
  async updateTicket(ticketId: number, params: Partial<FreshdeskTicketParams>): Promise<FreshdeskTicketResponse> {
    try {
      this.log('Updating Freshdesk ticket', { ticketId })

      const response = await axios.put<FreshdeskTicketResponse>(
        `${this.baseUrl}/tickets/${ticketId}`,
        params,
        { headers: this.getAuthHeaders() }
      )

      this.log('Ticket updated successfully', { ticketId })
      return response.data
    } catch (error) {
      this.logError(`Failed to update Freshdesk ticket ${ticketId}`, error)
      
      const apiError = error as { response?: { data?: { message?: string }, status?: number } }
      const errorMessage = apiError.response?.data?.message || 'Unknown error occurred'
      const errorCode = apiError.response?.status || 500
      
      throw new Error(`Freshdesk API Error (${errorCode}): ${errorMessage}`)
    }
  }
}

// Export a default instance with environment variables
export default function createFreshdeskClient(config?: Partial<FreshdeskConfig>) {
  // Get values from environment variables if not provided
  const domain = config?.domain || process.env.FRESHDESK_DOMAIN
  const apiKey = config?.apiKey || process.env.FRESHDESK_API_KEY
  
  if (!domain || !apiKey) {
    throw new Error('Freshdesk domain and API key must be provided either through config or environment variables')
  }
  
  return new FreshdeskClient({
    domain,
    apiKey,
    enableLogging: config?.enableLogging
  })
}
