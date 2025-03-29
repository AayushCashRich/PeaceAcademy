import { NextRequest, NextResponse } from 'next/server'
// import { getPresignedUploadUrl } from '@/server/features/knowledge-docs/s3-service'
import { getPresignedUploadUrl } from '@/server/features/knowledge-docs/firebase-service'
import logger from '@/server/config/pino-config'

// POST - Generate a presigned URL for S3 file upload
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Basic validation
    if (!body.knowledge_base_code && !body.knowledgeBaseCode || !body.file_name && !body.fileName) {
      return NextResponse.json(
        { error: 'Knowledge base code and file name are required' },
        { status: 400 }
      )
    }
    
    // Allow for both camelCase and snake_case in request for backward compatibility
    const knowledgeBaseCode = body.knowledge_base_code || body.knowledgeBaseCode
    const fileName = body.file_name || body.fileName
    
    // Validate file name (must be PDF)
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Generate the presigned URL
    const urlData = await getPresignedUploadUrl(knowledgeBaseCode, fileName)
    
    // Parse the JSON string returned from getPresignedUploadUrl
    const { presigned_url, file_path, file_url } = JSON.parse(urlData)
    
    return NextResponse.json({ presigned_url, file_path, file_url })
  } catch (error) {
    logger.error({ error }, 'Failed to generate presigned URL')
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
