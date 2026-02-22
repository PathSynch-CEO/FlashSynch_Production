import { Router, Request, Response } from 'express';
import { Card, Contact } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  leadCaptureSchema,
  updateContactSchema,
  contactsQuerySchema,
  LeadCaptureInput,
  UpdateContactInput,
  ContactsQueryInput,
} from '../validation/schemas.js';
import { ZodError } from 'zod';

const router = Router();

/**
 * POST /api/cards/:slug/capture
 * Lead capture submission (PUBLIC)
 */
router.post('/:slug/capture', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    // Find the card
    const card = await Card.findOne({ slug, status: 'active' });

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    // Check if lead capture is enabled
    if (!card.settings.leadCaptureEnabled) {
      res.status(400).json({ error: 'Lead capture is not enabled for this card', code: 'LEAD_CAPTURE_DISABLED' });
      return;
    }

    // Validate request body
    let input: LeadCaptureInput;
    try {
      input = leadCaptureSchema.parse(req.body);
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

    // Create contact
    const contact = new Contact({
      cardId: card._id,
      cardOwnerId: card.userId,
      lead: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        notes: input.notes,
      },
      source: {
        channel: input.channel || 'link_share',
        referrer: req.get('referer'),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
      consent: input.consent,
      status: 'new',
      tags: [],
      syncedToPathSynch: false,
    });

    await contact.save();

    // Increment card's capture count
    await Card.findByIdAndUpdate(card._id, {
      $inc: { 'analytics.totalCaptures': 1 },
    });

    res.status(201).json({
      data: {
        success: true,
        message: 'Thank you for your submission!',
      },
    });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ error: 'Failed to capture lead', code: 'LEAD_CAPTURE_ERROR' });
  }
});

/**
 * GET /api/contacts
 * Get all contacts for authenticated user's cards
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Validate query params
    let query: ContactsQueryInput;
    try {
      query = contactsQuerySchema.parse(req.query);
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

    // Build filter
    const filter: Record<string, unknown> = {
      cardOwnerId: req.user._id,
    };

    if (query.cardId) {
      filter.cardId = query.cardId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    // Get total count
    const total = await Contact.countDocuments(filter);

    // Get paginated contacts
    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('cardId', 'slug profile.firstName profile.lastName');

    const totalPages = Math.ceil(total / query.limit);

    res.json({
      data: contacts.map((c) => c.toObject()),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts', code: 'GET_CONTACTS_ERROR' });
  }
});

/**
 * PUT /api/contacts/:id
 * Update contact status and tags
 */
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;

    // Validate request body
    let input: UpdateContactInput;
    try {
      input = updateContactSchema.parse(req.body);
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

    // Find contact and verify ownership
    const contact = await Contact.findById(id);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found', code: 'CONTACT_NOT_FOUND' });
      return;
    }

    if (contact.cardOwnerId.toString() !== req.user._id) {
      res.status(403).json({ error: 'Not authorized to update this contact', code: 'FORBIDDEN' });
      return;
    }

    // Update contact
    if (input.status) {
      contact.status = input.status;
    }

    if (input.tags) {
      contact.tags = input.tags;
    }

    await contact.save();

    res.json({ data: contact.toObject() });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact', code: 'UPDATE_CONTACT_ERROR' });
  }
});

export default router;
