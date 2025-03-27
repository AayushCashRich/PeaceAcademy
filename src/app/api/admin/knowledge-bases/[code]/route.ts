import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBaseDbService } from '@/server/features/knowledge-bases/db/knowledgebase-db-service'
import logger from '@/server/config/pino-config'

interface RouteParams {
  params: Promise<{
    code: string
  }>
}

// GET - Fetch a specific knowledge base by code
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { code } = await params
  try {

    const knowledgeBase = await knowledgeBaseDbService.getKnowledgeBaseByCode(code)
    
    if (!knowledgeBase) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(knowledgeBase)
  } catch (error) {
    logger.error({ error }, `Failed to fetch knowledge base: ${code}`)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    )
  }
}

// PUT - Update an knowledge base
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { code } = await params
  try {
    const body = await req.json()
    
    // Convert from camelCase request body to snake_case for database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    // Map camelCase from request to snake_case for database
    if (body.name) updateData.name = body.name
    if (body.description) updateData.description = body.description
    if (body.isActive !== undefined) updateData.is_active = body.isActive
    
    const updatedKnowledgeBase = await knowledgeBaseDbService.updateKnowledgeBaseByCode(code, updateData)
    
    if (!updatedKnowledgeBase) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(updatedKnowledgeBase)
  } catch (error) {
    logger.error({ error }, `Failed to update knowledge base: ${code}`)
    return NextResponse.json(
      { error: 'Failed to update knowledge base' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an knowledge base
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { code } = await params
  try {
    const deletedKnowledgeBase = await knowledgeBaseDbService.deleteKnowledgeBaseByCode(code)
    
    if (!deletedKnowledgeBase) {
      return NextResponse.json(
        { error: 'Knowledge base not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, message: 'Knowledge base deleted successfully' })
  } catch (error) {
    logger.error({ error }, `Failed to delete knowledge base: ${code}`)
    return NextResponse.json(
      { error: 'Failed to delete knowledge base' },
      { status: 500 }
    )
  }
}
