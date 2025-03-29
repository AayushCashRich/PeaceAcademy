import { NextRequest, NextResponse } from 'next/server'
import { knowledgeDocumentDbService } from '@/server/features/knowledge-docs/db/knowledge-docs-db-service'
import { pdfChunkExtractor } from '@/server/features/chunk-extractor/pdf-chunk-extractor'
import { embeddingGenerationService } from '@/server/features/knowledge-doc-embeddings/embedding-generation-service'
import logger from '@/server/config/pino-config'

/**
 * API endpoint to extract text from a PDF document, generate embeddings, and store them
 * This is an end-to-end processing endpoint that handles the entire RAG preprocessing pipeline
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.document_id) {
      return NextResponse.json(
        { error: 'Missing required field: document_id' },
        { status: 400 }
      )
    }
    
    const documentId = body.document_id
    
    // Get document from database
    const document = await knowledgeDocumentDbService.getDocumentById(documentId)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    // Update document status to processing
    await knowledgeDocumentDbService.updateDocument(documentId, {
      status: 'pending'
    })
    
    try {
      // Extract text chunks from the PDF
      const chunks = await pdfChunkExtractor.extractChunks(document.file_url)
      
      logger.info(
        { documentId, chunkCount: chunks.length },
        'Successfully extracted chunks from PDF'
      )
      
      // Generate embeddings for the extracted chunks
      const embeddingResult = await embeddingGenerationService.generateAndStoreEmbeddings({
        knowledge_base_code: document.knowledge_base_code,
        document_id: documentId,
        chunks
      })
      
      // Update document status based on embedding result
      if (embeddingResult.success) {
        await knowledgeDocumentDbService.updateDocument(documentId, {
          status: 'processed'
        })
      } else {
        await knowledgeDocumentDbService.updateDocument(documentId, {
          status: 'error',
          error_message: 'Partial or complete failure during embedding generation'
        })
      }
      
      return NextResponse.json({
        document_id: documentId,
        extraction: {
          success: chunks.length > 0,
          chunk_count: chunks.length
        },
        embedding: {
          success: embeddingResult.success,
          total: embeddingResult.total,
          successful: embeddingResult.successful,
          failed: embeddingResult.failed
        }
      })
    } catch (error) {
      // Update document status to error
      await knowledgeDocumentDbService.updateDocument(documentId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error during processing'
      })
      
      logger.error({ error, documentId }, 'Failed to process document')
      
      return NextResponse.json(
        { error: 'Failed to process document', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error({ error }, 'Error in document extraction API')
    return NextResponse.json(
      { error: 'Failed to extract document content' },
      { status: 500 }
    )
  }
}
