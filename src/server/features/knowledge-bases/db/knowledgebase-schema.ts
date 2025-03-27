import mongoose, { Document, Schema } from 'mongoose'

// Define the KnowledgeBase interface
export interface IKnowledgeBase extends Document {
  code: string // Unique identifier for the knowledge base (e.g., "IFTA-2025")
  name: string // Display name of the knowledge base
  description: string // Detailed description of the knowledge base
  is_active: boolean // Whether the knowledge base is currently active
  created_at: Date
  updated_at: Date
}

// Create the KnowledgeBase schema
const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    code: {
      type: String,
      required: [true, 'Knowledge base code is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Knowledge base name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { 
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
)

// Check if the model already exists to prevent duplicate model errors
// during hot reloads in development
export const KnowledgeBaseModel = mongoose.models['knowledge_bases'] || mongoose.model<IKnowledgeBase>('knowledge-bases', KnowledgeBaseSchema, 'knowledge_bases')