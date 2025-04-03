/**
 * Interface for agent requests
 */
export interface AgentRequest {
  query: string
  previousMessages: { role: string; content: string; metadata?: Record<string, unknown> }[]
  knowledgeBaseCode: string
  conversationId?: string
}

/**
 * Interface for agent responses
 */
export interface AgentResponse {
  message: string
  metadata?: Record<string, unknown>
  toolResponse?: {
    success: boolean
    message: string
    needsLastName?: boolean
    isDuplicate?: boolean
  }
}

/**
 * Interface for AI agents
 */
export interface AIAgent<T extends AgentRequest, K extends AgentResponse> {
  /**
   * Process an agent request and produce a response
   * @param request The agent request to process
   * @returns Promise resolving to an agent response
   */
  process(request: T): Promise<K>
}
