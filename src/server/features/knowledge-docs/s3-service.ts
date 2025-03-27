import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import logger from '@/server/config/pino-config'

// Constants
const S3_REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET_NAME

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

/**
 * Create a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(knowledgeBaseCode: string, fileName: string): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET_NAME environment variable is not set')
  }

  // Format date for file path
  const now = new Date()
  const dateStr = now.toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0]
  
  // Create S3 key with format: knowledgeBaseCode/fileName_YYYYMMDD_HHmm.pdf
  const fileNameWithoutExt = fileName.replace(/\.pdf$/i, '')
  const s3Key = `${knowledgeBaseCode}/${fileNameWithoutExt}_${dateStr}.pdf`
  
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: 'application/pdf'
    })
    
    // Generate presigned URL with 15-minute expiry
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })
    
    // Return both the URL and the generated S3 key using snake_case
    return JSON.stringify({
      presigned_url: presignedUrl,
      s3_key: s3Key,
      s3_url: `https://${S3_BUCKET}.s3.amazonaws.com/${s3Key}`
    })
  } catch (error) {
    logger.error({ error }, `Failed to generate presigned URL for ${fileName}`)
    throw error
  }
}

/**
 * Create a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(s3Key: string): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET_NAME environment variable is not set')
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    })
    
    // Generate presigned URL with 15-minute expiry
    return await getSignedUrl(s3Client, command, { expiresIn: 900 })
  } catch (error) {
    logger.error({ error }, `Failed to generate download URL for ${s3Key}`)
    throw error
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(s3Key: string): Promise<void> {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET_NAME environment variable is not set')
  }
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    })
    
    await s3Client.send(command)
    logger.info(`Successfully deleted file from S3: ${s3Key}`)
  } catch (error) {
    logger.error({ error }, `Failed to delete file from S3: ${s3Key}`)
    throw error
  }
}

/**
 * Extract S3 key from S3 URL
 */
export function extractS3KeyFromUrl(s3Url: string): string {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET_NAME environment variable is not set')
  }
  
  // Extract the key part from URL, handles both formats:
  // https://bucket.s3.amazonaws.com/key and https://s3.amazonaws.com/bucket/key
  const bucketPattern = new RegExp(`https://${S3_BUCKET}.s3.amazonaws.com/(.+)`)
  const pathPattern = new RegExp(`https://s3.amazonaws.com/${S3_BUCKET}/(.+)`)
  
  const bucketMatch = s3Url.match(bucketPattern)
  if (bucketMatch && bucketMatch[1]) {
    return bucketMatch[1]
  }
  
  const pathMatch = s3Url.match(pathPattern)
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1]
  }
  
  throw new Error(`Could not extract S3 key from URL: ${s3Url}`)
}
