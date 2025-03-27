import { NextRequest, NextResponse } from 'next/server'
import { vectorSearchService } from '@/server/features/knowledge-doc-embeddings/vector-search-service'
import logger from '@/server/config/pino-config'

/**
 * API endpoint for vector search
 * Requires knowledge_base_code and query parameters
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.knowledge_base_code || !body.query) {
      return NextResponse.json(
        { error: 'Missing required fields: knowledge_base_code and query are required' },
        { status: 400 }
      )
    }
    
    const knowledgeBaseCode = body.knowledge_base_code
    const query = body.query
    const options = {
      limit: body.limit || 10,
      documentIds: body.document_ids,
      numCandidates: body.num_candidates || 100
    }
    
    // Perform vector search
    const searchResults = await vectorSearchService.searchByText(
      query,
      knowledgeBaseCode,
      options
    )
    
    return NextResponse.json({
      results: searchResults,
      count: searchResults.length,
      query
    })
  } catch (error) {
    logger.error({ error }, 'Error in vector search API')
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    )
  }
}

/**
 * Direct vector search with raw embedding vector
 * For advanced use cases
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    if (!body.knowledge_base_code || !body.embedding) {
      return NextResponse.json(
        { error: 'Missing required fields: knowledge_base_code and embedding are required' },
        { status: 400 }
      )
    }
    
    if (!Array.isArray(body.embedding)) {
      return NextResponse.json(
        { error: 'Embedding must be an array of numbers' },
        { status: 400 }
      )
    }
    
    const knowledgeBaseCode = body.knowledge_base_code
    const embedding = body.embedding
    const options = {
      limit: body.limit || 10,
      documentIds: body.document_ids,
      numCandidates: body.num_candidates || 100
    }
    
    // Perform vector search with raw embedding
    const searchResults = await vectorSearchService.searchSimilarDocuments(
      embedding,
      knowledgeBaseCode,
      options
    )
    
    return NextResponse.json({
      results: searchResults,
      count: searchResults.length
    })
  } catch (error) {
    logger.error({ error }, 'Error in direct vector search API')
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    )
  }
}
