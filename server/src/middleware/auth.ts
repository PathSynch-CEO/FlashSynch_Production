import type { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth, isFirebaseInitialized } from '../config/firebase.js';
import { User } from '../models/User.js';
import type { User as UserType } from '@flashsynch/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email?: string;
        name?: string;
      };
      user?: UserType;
    }
  }
}

/**
 * Middleware to verify Firebase ID token and attach decoded user to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken) {
    res.status(401).json({ error: 'Missing token', code: 'UNAUTHORIZED' });
    return;
  }

  if (!isFirebaseInitialized()) {
    res.status(500).json({ error: 'Authentication service not available', code: 'AUTH_SERVICE_ERROR' });
    return;
  }

  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    // Try to find the user in MongoDB
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (user) {
      req.user = user.toObject() as UserType;
    }

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  if (!idToken || !isFirebaseInitialized()) {
    next();
    return;
  }

  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (user) {
      req.user = user.toObject() as UserType;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
}
