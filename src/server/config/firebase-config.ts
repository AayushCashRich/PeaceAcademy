const admin = require("firebase-admin");
import logger from '@/server/config/pino-config';

const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64 ?? '';

if (!base64Credentials) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS_BASE64 is not set or is empty');
}

let serviceAccount;
try {
  const jsonString = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  serviceAccount = JSON.parse(jsonString);
} catch (error) {
  logger.error({ error }, 'Failed to parse service account JSON');
  throw new Error('Invalid Base64 string for service account');
}

try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
  
  let storage = admin.storage().bucket();
  

async function verifyFirebaseSetup() {
  const bucket = storage;
  console.log(`Connected to bucket: ${bucket.name}`);
}

verifyFirebaseSetup();


export { admin, storage };