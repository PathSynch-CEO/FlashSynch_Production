import { Router, Request, Response } from 'express';
import { Card, generateUniqueSlug } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { createCardSchema, updateCardSchema, CreateCardInput, UpdateCardInput } from '../validation/schemas.js';
import { qrsynchService } from '../services/qrsynch.js';
import { ZodError } from 'zod';
import { DEFAULT_THEME, DEFAULT_SETTINGS, DEFAULT_ANALYTICS } from '@flashsynch/shared';

const router = Router();

/**
 * POST /api/cards
 * Create a new card
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Validate request body
    let input: CreateCardInput;
    try {
      input = createCardSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      throw error;
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(input.profile.firstName, input.profile.lastName);

    // Generate QRsynch links for card links
    const linkShortUrls = await qrsynchService.generateLinksForCard(
      slug,
      input.links.map((l) => ({ type: l.type, value: l.value, label: l.label }))
    );

    // Merge short URLs into links
    const linksWithShortUrls = input.links.map((link, index) => ({
      ...link,
      ...linkShortUrls[index],
    }));

    // Generate short URL for the card page itself
    const cardPageLink = await qrsynchService.generateCardPageLink(slug);

    // Create card
    const card = new Card({
      userId: req.user._id,
      slug,
      mode: input.mode,
      status: 'active',
      profile: input.profile,
      links: linksWithShortUrls,
      theme: { ...DEFAULT_THEME, ...input.theme },
      settings: { ...DEFAULT_SETTINGS, ...input.settings },
      qrsynchShortUrl: cardPageLink.shortUrl,
      qrsynchLinkId: cardPageLink.linkId,
      analytics: { ...DEFAULT_ANALYTICS },
    });

    await card.save();

    res.status(201).json({ data: card.toObject() });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card', code: 'CREATE_CARD_ERROR' });
  }
});

/**
 * GET /api/cards
 * Get all cards for authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const cards = await Card.find({
      userId: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    res.json({ data: cards.map((c) => c.toObject()) });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to get cards', code: 'GET_CARDS_ERROR' });
  }
});

/**
 * GET /api/cards/:slug
 * Get card by slug (PUBLIC - no auth required)
 * Increments view count
 */
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const card = await Card.findOneAndUpdate(
      { slug, status: 'active' },
      { $inc: { 'analytics.totalViews': 1 } },
      { new: true }
    );

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    // Return public card data (exclude sensitive fields)
    const publicCard = {
      _id: card._id,
      slug: card.slug,
      mode: card.mode,
      profile: card.profile,
      links: card.links.filter((l) => l.visible),
      theme: card.theme,
      settings: {
        leadCaptureEnabled: card.settings.leadCaptureEnabled,
        showEmail: card.settings.showEmail,
        showPhone: card.settings.showPhone,
        scheduleLink: card.settings.scheduleLink,
        embedSchedule: card.settings.embedSchedule,
      },
      qrsynchShortUrl: card.qrsynchShortUrl,
    };

    res.json({ data: publicCard });
  } catch (error) {
    console.error('Get card by slug error:', error);
    res.status(500).json({ error: 'Failed to get card', code: 'GET_CARD_ERROR' });
  }
});

/**
 * PUT /api/cards/:id
 * Update a card (owner only)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    let input: UpdateCardInput;
    try {
      input = updateCardSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      throw error;
    }

    // Find card and verify ownership
    const card = await Card.findById(id);

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    if (card.userId.toString() !== req.user._id) {
      res.status(403).json({ error: 'Not authorized to update this card', code: 'FORBIDDEN' });
      return;
    }

    // If links are being updated, regenerate QRsynch short URLs for new/modified links
    if (input.links) {
      const existingLinkIds = new Set(card.links.map((l) => l._id?.toString()));
      const newLinks = input.links.filter((l) => !l._id || !existingLinkIds.has(l._id));

      if (newLinks.length > 0) {
        const linkShortUrls = await qrsynchService.generateLinksForCard(
          card.slug,
          newLinks.map((l) => ({ type: l.type, value: l.value, label: l.label }))
        );

        let newLinkIndex = 0;
        input.links = input.links.map((link) => {
          if (!link._id || !existingLinkIds.has(link._id)) {
            const shortUrlData = linkShortUrls[newLinkIndex++];
            return { ...link, ...shortUrlData };
          }
          return link;
        });
      }
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};

    if (input.profile) {
      Object.entries(input.profile).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields[`profile.${key}`] = value;
        }
      });
    }

    if (input.links) {
      updateFields.links = input.links;
    }

    if (input.theme) {
      Object.entries(input.theme).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields[`theme.${key}`] = value;
        }
      });
    }

    if (input.settings) {
      Object.entries(input.settings).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields[`settings.${key}`] = value;
        }
      });
    }

    if (input.mode) {
      updateFields.mode = input.mode;
    }

    // Update card
    const updatedCard = await Card.findByIdAndUpdate(id, { $set: updateFields }, { new: true });

    res.json({ data: updatedCard?.toObject() });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card', code: 'UPDATE_CARD_ERROR' });
  }
});

/**
 * DELETE /api/cards/:id
 * Soft-delete a card (set status to archived)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;

    // Find card and verify ownership
    const card = await Card.findById(id);

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    if (card.userId.toString() !== req.user._id) {
      res.status(403).json({ error: 'Not authorized to delete this card', code: 'FORBIDDEN' });
      return;
    }

    // Soft delete
    card.status = 'archived';
    await card.save();

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card', code: 'DELETE_CARD_ERROR' });
  }
});

export default router;
