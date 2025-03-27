import { AgentRequest, AgentResponse } from "../../interfaces";


export interface LiveAgentHandoffService<T extends AgentRequest, K extends AgentResponse> {
  handoverToAgent(request: T): Promise<K>
}   