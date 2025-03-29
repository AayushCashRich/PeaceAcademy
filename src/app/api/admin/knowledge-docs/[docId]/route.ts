import { NextRequest, NextResponse } from 'next/server'
import { knowledgeDocumentDbService } from '@/server/features/knowledge-docs/db/knowledge-docs-db-service'
import { deleteFileFromS3, extractS3KeyFromUrl } from '@/server/features/knowledge-docs/s3-service'
import logger from '@/server/config/pino-config'
import { knowledgeDocEmbeddingDbService } from '@/server/features/knowledge-doc-embeddings/db/knowledge-docs-embedding-db-service'

interface Params {
  params: Promise<{
    docId: string
  }>
}

// GET - Get a specific knowledge document
export async function GET(req: NextRequest, { params }: Params) {
  const docId = (await params).docId
  try {
    
    const document = await knowledgeDocumentDbService.getDocumentById(docId)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Knowledge document not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(document)
  } catch (error) {
    logger.error({ error }, `Failed to get knowledge document with id: ${docId}`)
    return NextResponse.json(
      { error: 'Failed to get knowledge document' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a knowledge document
export async function DELETE(req: NextRequest, { params }: Params) {
  const docId = (await params).docId
  try {
    
    // Find the document first to get the S3 URL
    const document = await knowledgeDocumentDbService.getDocumentById(docId)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Knowledge document not found' },
        { status: 404 }
      )
    }
    
    // Delete from S3
    try {
      const s3Key = extractS3KeyFromUrl(document.file_url)
      await deleteFileFromS3(s3Key)
    } catch (s3Error) {
      logger.error({ error: s3Error }, `Failed to delete file from S3: ${document.file_url}`)
      // Continue with document deletion even if S3 deletion fails
    }
    
    // Delete document from database
    await knowledgeDocumentDbService.deleteDocument(docId)
    await knowledgeDocEmbeddingDbService.deleteEmbeddingsByDocumentId(docId)
    
    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    logger.error({ error }, `Failed to delete knowledge document with id: ${docId}`)
    return NextResponse.json(
      { error: 'Failed to delete knowledge document' },
      { status: 500 }
    )
  }
}
