import mongoose, { Document, Schema } from 'mongoose'
import { ChatIntentType } from '@/server/features/agents/default-agent/intent-classifier'

// Define message structure interface
export interface IMessage extends Document {
  role: string
  content: string
  timestamp: Date
  metadata?: {
    intentType?: ChatIntentType
    reasoning?: string
    handoverTicketId?: string
    transactionType?: string
    success?: boolean
    knowledgeSource?: string
    hasRelevantInformation?: boolean
  }
}

// Define conversation structure interface
export interface IConversation extends Document {
  conversation_id: string
  knowledge_base_code: string
  messages: IMessage[]
  created_at: Date
  updated_at: Date
}

// Message schema
const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      required: true,
      enum: ['system', 'user', 'assistant']
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      intentType: {
        type: String,
        enum: Object.values(ChatIntentType)
      },
      reasoning: String,
      handoverTicketId: String,
      transactionType: String,
      success: Boolean,
      knowledgeSource: String,
      hasRelevantInformation: Boolean
    }
  },
  { _id: false }
)

// Conversation schema
const ConversationSchema = new Schema<IConversation>(
  {
    conversation_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    knowledge_base_code: {
      type: String,
      required: true,
      index: true
    },
    messages: {
      type: [MessageSchema],
      default: []
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

// Create model
export const ConversationModel = mongoose.models["conversations"] as mongoose.Model<IConversation> || 
  mongoose.model<IConversation>('conversations', ConversationSchema, 'conversations')
