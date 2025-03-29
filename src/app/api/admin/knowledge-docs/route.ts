import { NextRequest, NextResponse } from 'next/server'
import { knowledgeDocumentDbService } from '@/server/features/knowledge-docs/db/knowledge-docs-db-service'
import { pdfChunkExtractor } from '@/server/features/chunk-extractor/pdf-chunk-extractor'
import { embeddingGenerationService } from '@/server/features/knowledge-doc-embeddings/embedding-generation-service'
import logger from '@/server/config/pino-config'
import { ObjectId } from 'mongoose'

// GET - Fetch knowledge documents for a specific knowledge base
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Check for either snake_case or camelCase parameter for backward compatibility
    const knowledgeBaseCode = searchParams.get('knowledge_base_code') || searchParams.get('knowledgeBaseCode')
    
    if (!knowledgeBaseCode) {
      return NextResponse.json(
        { error: 'Knowledge base code is required' },
        { status: 400 }
      )
    }
    
    const documents = await knowledgeDocumentDbService.getDocumentsByKnowledgeBaseCode(knowledgeBaseCode)
    return NextResponse.json(documents)
  } catch (error) {
    logger.error({ error }, 'Failed to fetch knowledge documents')
    return NextResponse.json(
      { error: 'Failed to fetch knowledge documents' },
      { status: 500 }
    )
  }
}

// POST - Create a new knowledge document
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Basic validation - look for snake_case field names
    if (!body.knowledge_base_code || !body.file_name || !body.file_url || !body.file_size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create document record in database with snake_case attributes
    const newDocument = await knowledgeDocumentDbService.createDocument({
      knowledge_base_code: body.knowledge_base_code,
      file_name: body.file_name,
      file_url: body.file_url,
      user_id: body.user_id || 'admin',
      file_size: body.file_size,
      status: body.status || 'pending'
    })
    
    // Check if auto-processing is requested
    const shouldProcess = body.auto_process || true
    
    if (shouldProcess) {
      const documentId = (newDocument._id as ObjectId).toString()
      try {
        // Start processing in the background
        generateDocEmbeddings(documentId, body.knowledge_base_code)
          .catch(err => {
            logger.error(
              { err, documentId: documentId },
              'Background processing of document failed'
            )
          })
        
        return NextResponse.json(
          { 
            ...newDocument.toObject(), 
            processing_status: 'processing_started' 
          }, 
          { status: 201 }
        )
      } catch (error) {
        logger.error(
          { error, documentId: documentId },
          'Failed to start document processing'
        )
        return NextResponse.json(
          { 
            ...newDocument.toObject(), 
            processing_status: 'processing_failed_to_start' 
          }, 
          { status: 201 }
        )
      }
    }
    
    return NextResponse.json(newDocument, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create knowledge document')
    return NextResponse.json(
      { error: 'Failed to create knowledge document' },
      { status: 500 }
    )
  }
}

/**
 * Process a document by extracting text, generating embeddings, and updating status
 * This is an asynchronous function that runs in the background
 */
async function generateDocEmbeddings(documentId: string, knowledgeBaseCode: string): Promise<void> {
  try {
    // Update document status to processing
    await knowledgeDocumentDbService.updateDocument(documentId, {
      status: 'pending'
    })
    
    // Get document from database
    const document = await knowledgeDocumentDbService.getDocumentById(documentId)
    
    if (!document) {
      throw new Error(`Document not found with ID: ${documentId}`)
    }
    
    // Extract text chunks from the PDF
    const chunks = await pdfChunkExtractor.extractChunks(document.file_url)
    
    logger.info(
      { documentId, chunkCount: chunks.length },
      'Successfully extracted chunks from PDF'
    )
    
    // Generate embeddings for the extracted chunks
    const embeddingResult = await embeddingGenerationService.generateAndStoreEmbeddings({
      knowledge_base_code: knowledgeBaseCode,
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
  } catch (error) {
    // Update document status to error
    await knowledgeDocumentDbService.updateDocument(documentId, {
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error during processing'
    })
    
    logger.error({ error, documentId }, 'Failed to process document')
    throw error
  }
}
