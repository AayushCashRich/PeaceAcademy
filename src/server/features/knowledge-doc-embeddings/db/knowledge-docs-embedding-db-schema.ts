import mongoose, { Schema, Document } from 'mongoose'
// Define the interface for embedding documents
export interface IKnowledgeDocEmbedding extends Document {
  knowledge_base_code: string
  document_id: mongoose.Types.ObjectId
  text: string
  embedding: number[]
  chunk_position: {
    chunk_id: string
  }
  created_at: Date
  updated_at: Date
}
// Define the schema
const KnowledgeDocEmbeddingSchema = new Schema<IKnowledgeDocEmbedding>(
  {
    knowledge_base_code: {
      type: String,
      required: true
    },
    document_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'KnowledgeDocument'
    },
    text: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      required: true
    },
    chunk_position: {
      chunk_id: {
        type: String,
        required: true
      }
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
)
// :small_blue_diamond: Step 1: Create indexes
async function createIndexes() {
  try {
    // Ensure knowledge_base_code is indexed properly
    await KnowledgeDocEmbeddingSchema.index({ knowledge_base_code: 1 }) // Normal index
    // await KnowledgeDocEmbeddingSchema.index({ knowledge_base_code: "text" }) // Use this if text-based search is needed
    // Compound index for fast lookups
    await KnowledgeDocEmbeddingSchema.index({ knowledge_base_code: 1, document_id: 1, 'chunk_position.chunk_id': 1 }, { unique: true })
    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}
// :small_blue_diamond: Step 2: Create model
const KnowledgeDocEmbeddingModel =
  mongoose.models["knowledge_doc_embeddings"] as mongoose.Model<IKnowledgeDocEmbedding> ||
  mongoose.model<IKnowledgeDocEmbedding>('knowledge_doc_embeddings', KnowledgeDocEmbeddingSchema, 'knowledge_doc_embeddings')
// :small_blue_diamond: Step 3: Run index creation (only once per application startup)
createIndexes()
export { KnowledgeDocEmbeddingModel }