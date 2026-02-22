import { Router, Request, Response } from 'express';
import { Card, Scan } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { trackScanSchema, TrackScanInput } from '../validation/schemas.js';
import { ZodError } from 'zod';
import UAParser from 'ua-parser-js';
import type { DeviceType } from '@flashsynch/shared';

const router = Router();

/**
 * Helper to determine device type from user agent
 */
function getDeviceType(userAgent: string | undefined): DeviceType | undefined {
  if (!userAgent) return undefined;

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();

  if (device.type === 'mobile') return 'mobile';
  if (device.type === 'tablet') return 'tablet';
  return 'desktop';
}

/**
 * POST /api/cards/:slug/scan
 * Track a scan event (PUBLIC)
 */
router.post('/:slug/scan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    // Find the card
    const card = await Card.findOne({ slug, status: 'active' });

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    // Validate request body
    let input: TrackScanInput;
    try {
      input = trackScanSchema.parse(req.body);
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

    const userAgent = req.get('user-agent');
    const parser = userAgent ? new UAParser(userAgent) : null;

    // Create scan event
    const scan = new Scan({
      cardId: card._id,
      linkId: input.linkId,
      eventType: input.eventType,
      metadata: {
        ip: req.ip,
        userAgent,
        referrer: input.referrer || req.get('referer'),
        deviceType: getDeviceType(userAgent),
        browser: parser?.getBrowser().name,
        os: parser?.getOS().name,
      },
      timestamp: new Date(),
    });

    await scan.save();

    // Update card analytics based on event type
    const updateField =
      input.eventType === 'click'
        ? 'analytics.totalClicks'
        : input.eventType === 'view'
          ? 'analytics.totalViews'
          : null;

    if (updateField) {
      await Card.findByIdAndUpdate(card._id, {
        $inc: { [updateField]: 1 },
      });
    }

    res.status(201).json({ data: { success: true } });
  } catch (error) {
    console.error('Track scan error:', error);
    res.status(500).json({ error: 'Failed to track scan', code: 'TRACK_SCAN_ERROR' });
  }
});

/**
 * GET /api/analytics/aggregate
 * Get aggregated analytics across all user's cards
 */
router.get('/aggregate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Parse date filter
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Get all user's cards
    const userCards = await Card.find({ userId: req.user._id, status: 'active' });
    const cardIds = userCards.map((c) => c._id);

    if (cardIds.length === 0) {
      res.json({
        data: {
          views: 0,
          clicks: 0,
          captures: 0,
          shares: 0,
          viewsByDay: [],
          topCards: [],
        },
      });
      return;
    }

    // Aggregate totals
    const totals = userCards.reduce(
      (acc, card) => ({
        views: acc.views + (card.analytics?.totalViews || 0),
        clicks: acc.clicks + (card.analytics?.totalClicks || 0),
        captures: acc.captures + (card.analytics?.totalCaptures || 0),
      }),
      { views: 0, clicks: 0, captures: 0 }
    );

    // Count shares
    const sharesCount = await Scan.countDocuments({
      cardId: { $in: cardIds },
      eventType: 'share',
    });

    // Views by day
    const viewsByDay = await Scan.aggregate([
      {
        $match: {
          cardId: { $in: cardIds },
          eventType: 'view',
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top cards by views
    const topCards = userCards
      .map((card) => ({
        cardId: card._id.toString(),
        cardName: `${card.profile.firstName} ${card.profile.lastName}`,
        views: card.analytics?.totalViews || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    res.json({
      data: {
        views: totals.views,
        clicks: totals.clicks,
        captures: totals.captures,
        shares: sharesCount,
        viewsByDay: viewsByDay.map((v) => ({
          date: v._id,
          count: v.count,
        })),
        topCards,
      },
    });
  } catch (error) {
    console.error('Get aggregate analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics', code: 'GET_ANALYTICS_ERROR' });
  }
});

/**
 * GET /api/analytics/:cardId
 * Get aggregated analytics for a card
 */
router.get('/:cardId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { cardId } = req.params;

    // Find card and verify ownership
    const card = await Card.findById(cardId);

    if (!card) {
      res.status(404).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
      return;
    }

    if (card.userId.toString() !== req.user._id) {
      res.status(403).json({ error: 'Not authorized to view this card\'s analytics', code: 'FORBIDDEN' });
      return;
    }

    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregate views by day (last 30 days)
    const viewsByDay = await Scan.aggregate([
      {
        $match: {
          cardId: card._id,
          eventType: 'view',
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top clicked links
    const topLinks = await Scan.aggregate([
      {
        $match: {
          cardId: card._id,
          eventType: 'click',
          linkId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    // Top referrers
    const topReferrers = await Scan.aggregate([
      {
        $match: {
          cardId: card._id,
          'metadata.referrer': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$metadata.referrer',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Device type breakdown
    const deviceBreakdown = await Scan.aggregate([
      {
        $match: {
          cardId: card._id,
          'metadata.deviceType': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$metadata.deviceType',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      data: {
        totals: {
          views: card.analytics.totalViews,
          clicks: card.analytics.totalClicks,
          captures: card.analytics.totalCaptures,
        },
        viewsByDay: viewsByDay.map((v) => ({
          date: v._id,
          count: v.count,
        })),
        topLinks: topLinks.map((l) => ({
          linkId: l._id,
          clicks: l.clicks,
        })),
        topReferrers: topReferrers.map((r) => ({
          referrer: r._id,
          count: r.count,
        })),
        deviceBreakdown: deviceBreakdown.map((d) => ({
          device: d._id,
          count: d.count,
        })),
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics', code: 'GET_ANALYTICS_ERROR' });
  }
});

export default router;
