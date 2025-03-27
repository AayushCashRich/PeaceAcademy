import { z } from 'zod'
/**
 * Common ticket creation params schema
 * This provides a unified schema for creating tickets across different systems
 */
export const ticketCreationSchema = z.object({
    /** The customer's name */
    name: z.string().min(1, "Name is required"),
    /** The customer's email */
    email: z.string().email("Valid email is required"),
    /** The ticket subject/title */
    subject: z.string().min(3, "Subject must be at least 3 characters"),
    /** The ticket content/body */
    body: z.string().min(5, "Body must be at least 5 characters"),
    /** Priority level (1-4) */
    priority: z.number().min(1).max(4).optional().default(2),
    /** Custom fields specific to the ticketing system */
    customFields: z.record(z.string(), z.unknown()).optional(),
    /** Tags to categorize the ticket */
    tags: z.array(z.string()).optional()
  })
  
  // Export the inferred type from the schema
  export type TicketCreationParams = z.infer<typeof ticketCreationSchema>
  
  /**
   * Generic ticket response schema
   */
  export const ticketResponseSchema = z.object({
    /** Unique identifier for the ticket */
    ticketId: z.union([z.string(), z.number()]),
    /** URL to access the ticket in the ticketing system */
    ticketUrl: z.string().url().optional(),
    /** Status of the ticket */
    status: z.string(),
    /** Original response from the ticketing system */
    originalResponse: z.unknown()
  })
  
  // Export the inferred type from the schema
  export type TicketResponse = z.infer<typeof ticketResponseSchema>
/**
 * Adapter interface for ticketing systems
 */
export interface TicketingAdapter {
    /**
     * Create a ticket in the ticketing system
     */
    createTicket(params: TicketCreationParams): Promise<TicketResponse>
  }