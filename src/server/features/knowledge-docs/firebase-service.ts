import logger from '@/server/config/pino-config';
import { storage } from '@/server/config/firebase-config';

/**
 * Create a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(knowledgeBaseCode: string, fileName: string): Promise<string> {
  const bucket = storage;

  // Format date for file path
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

  // Create Firebase Storage path with format: knowledgeBaseCode/fileName_YYYYMMDD_HHmm.pdf
  const fileNameWithoutExt = fileName.replace(/\.pdf$/i, '');
  const filePath = `${knowledgeBaseCode}/${fileNameWithoutExt}_${dateStr}.pdf`;
  const generatedFileName = `${fileNameWithoutExt}_${dateStr}.pdf`;
  try {
    const file = bucket.file(filePath);

    const uploadTask = file.createWriteStream({
        metadata: {
          contentType: 'application/pdf',
        },
      });

    uploadTask.on("finish", async () => {
        logger.info(`File uploaded to ${filePath}`);
    })
    
    uploadTask.on("error", (error) => {
        logger.error({ error }, `Failed to upload file to ${filePath}`);
        throw error;
    })
      
    // Generate a signed URL for uploading with a 15-minute expiry
    const [url] = await file.getSignedUrl({
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'application/pdf'
      });
  
      // Return both the URL and the generated file path using snake_case
      return JSON.stringify({
          presigned_url: url,
        file_name: generatedFileName,
        file_path: filePath,
        file_url: `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}`
      });


  } catch (error) {
    logger.error({ error }, `Failed to generate presigned URL for ${fileName}`);
    throw error;
  }
}

/**
 * Create a presigned URL for downloading a file
 */
export async function getPresignedDownloadUrl(filePath: string): Promise<string> {
  const bucket = storage;

  try {
    const file = bucket.file(filePath);

    // Generate a signed URL for downloading with a 15-minute expiry
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000 // 15 minutes
    });

    return url;
  } catch (error) {
    logger.error({ error }, `Failed to generate download URL for ${filePath}`);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFileFromStorage(filePath: string): Promise<void> {
  const bucket = storage;

  try {
    await bucket.file(filePath).delete();
    logger.info(`Successfully deleted file from Firebase Storage: ${filePath}`);
  } catch (error) {
    logger.error({ error }, `Failed to delete file from Firebase Storage: ${filePath}`);
    throw error;
  }
}

/**
 * Extract file path from Firebase Storage URL
 */
export function extractFilePathFromUrl(fileUrl: string): string {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  const pattern = new RegExp(`https://storage.googleapis.com/${bucketName}/(.+)`);

  const match = fileUrl.match(pattern);
  if (match && match[1]) {
    return match[1];
  }

  throw new Error(`Could not extract file path from URL: ${fileUrl}`);
}