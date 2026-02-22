import { Router, Request, Response } from 'express';
import { User, generateUniqueHandle } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { updateUserSchema, UpdateUserInput } from '../validation/schemas.js';
import { ZodError } from 'zod';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user from Firebase ID token
 * Creates User doc in MongoDB with firebaseUid
 */
router.post('/register', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const firebaseUser = req.firebaseUser;

    if (!firebaseUser) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (existingUser) {
      res.status(200).json({ data: existingUser.toObject() });
      return;
    }

    // Generate unique handle from display name or email
    const displayName = firebaseUser.name || firebaseUser.email?.split('@')[0] || 'user';
    const handle = await generateUniqueHandle(displayName);

    // Create new user
    const newUser = new User({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName,
      handle,
      plan: 'free',
    });

    await newUser.save();

    res.status(201).json({ data: newUser.toObject() });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user', code: 'REGISTRATION_ERROR' });
  }
});

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/users/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      // User is authenticated via Firebase but not registered in MongoDB
      res.status(404).json({ error: 'User not found. Please register first.', code: 'USER_NOT_FOUND' });
      return;
    }

    res.json({ data: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', code: 'GET_USER_ERROR' });
  }
});

/**
 * PUT /api/users/me
 * Update current user's profile
 */
router.put('/users/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Validate request body
    let updates: UpdateUserInput;
    try {
      updates = updateUserSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: error.errors.map((e) => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      throw error;
    }

    // Check handle uniqueness if being updated
    if (updates.handle && updates.handle !== req.user.handle) {
      const existingHandle = await User.findOne({
        handle: updates.handle,
        _id: { $ne: req.user._id },
      });

      if (existingHandle) {
        res.status(409).json({ error: 'Handle already taken', code: 'HANDLE_TAKEN' });
        return;
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    res.json({ data: updatedUser.toObject() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user', code: 'UPDATE_USER_ERROR' });
  }
});

export default router;
