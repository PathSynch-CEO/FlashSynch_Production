import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let firebaseInitialized = false;

export function initializeFirebase(): void {
  if (firebaseInitialized) {
    return;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountPath) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set - Firebase Auth will not work');
    return;
  }

  try {
    const absolutePath = resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf-8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export function getFirebaseAuth(): admin.auth.Auth {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  return admin.auth();
}

export function isFirebaseInitialized(): boolean {
  return firebaseInitialized;
}
