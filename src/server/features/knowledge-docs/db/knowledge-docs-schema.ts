import mongoose, { Document, Schema } from 'mongoose'

export interface IKnowledgeDocument extends Document {
  knowledge_base_code: string
  file_name: string
  s3_url: string
  user_id: string
  file_size: number
  uploaded_at: Date
  status: 'pending' | 'processed' | 'error'
  error_message?: string
  created_at: Date
  updated_at: Date
}

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    knowledge_base_code: {
      type: String,
      required: true,
      index: true
    },
    file_name: {
      type: String,
      required: true
    },
    s3_url: {
      type: String,
      required: true
    },
    user_id: {
      type: String,
      required: true,
      default: 'admin'
    },
    file_size: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'error'],
      default: 'pending'
    },
    error_message: {
      type: String
    }
  },
  {
    timestamps: { 
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
)

// Create a compound index on knowledge_base_code and file_name for faster lookups
KnowledgeDocumentSchema.index({ knowledge_base_code: 1, file_name: 1 })

export const KnowledgeDocumentModel = mongoose.models['knowledge_docs'] || 
  mongoose.model<IKnowledgeDocument>('knowledge_docs', KnowledgeDocumentSchema, 'knowledge_docs')