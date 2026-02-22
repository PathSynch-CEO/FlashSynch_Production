import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { revenueCatWebhookSchema, RevenueCatWebhookInput } from '../validation/schemas.js';
import { REVENUECAT_ENTITLEMENTS } from '@flashsynch/shared';
import { ZodError } from 'zod';
import type { PlanType } from '@flashsynch/shared';

const router = Router();

/**
 * Verify RevenueCat webhook signature
 */
function verifyRevenueCatSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat subscription events
 */
router.post('/revenuecat', async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('REVENUECAT_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook not configured', code: 'WEBHOOK_NOT_CONFIGURED' });
      return;
    }

    // Verify signature
    const signature = req.get('X-RevenueCat-Signature');
    const payload = JSON.stringify(req.body);

    if (!verifyRevenueCatSignature(payload, signature, webhookSecret)) {
      res.status(401).json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' });
      return;
    }

    // Validate webhook payload
    let webhookData: RevenueCatWebhookInput;
    try {
      webhookData = revenueCatWebhookSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid webhook payload',
          code: 'INVALID_PAYLOAD',
        });
        return;
      }
      throw error;
    }

    const { event } = webhookData;
    const { type, app_user_id, entitlement_ids, expiration_at_ms } = event;

    // Find user by Firebase UID (app_user_id is the Firebase UID)
    const user = await User.findOne({ firebaseUid: app_user_id });

    if (!user) {
      console.warn(`RevenueCat webhook: User not found for app_user_id ${app_user_id}`);
      // Return 200 to acknowledge receipt (don't retry for missing users)
      res.json({ data: { success: true, message: 'User not found' } });
      return;
    }

    // Determine new plan based on event type
    let newPlan: PlanType = 'free';
    let planExpiresAt: Date | undefined;

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        // Find the highest tier entitlement
        if (entitlement_ids && entitlement_ids.length > 0) {
          for (const entitlementId of entitlement_ids) {
            const mappedPlan = REVENUECAT_ENTITLEMENTS[entitlementId];
            if (mappedPlan) {
              // Team > Pro > Free
              if (mappedPlan === 'team' || (mappedPlan === 'pro' && newPlan !== 'team')) {
                newPlan = mappedPlan;
              }
            }
          }
        }

        // Set expiration date
        if (expiration_at_ms) {
          planExpiresAt = new Date(expiration_at_ms);
        }

        console.log(`RevenueCat: User ${user.email} upgraded to ${newPlan}`);
        break;

      case 'CANCELLATION':
      case 'EXPIRATION':
        // Downgrade to free
        newPlan = 'free';
        planExpiresAt = undefined;
        console.log(`RevenueCat: User ${user.email} downgraded to free`);
        break;

      case 'BILLING_ISSUE':
        // Log but don't change plan yet (RevenueCat handles grace period)
        console.warn(`RevenueCat: Billing issue for user ${user.email}`);
        res.json({ data: { success: true } });
        return;

      case 'PRODUCT_CHANGE':
        // Handle product change (upgrade/downgrade)
        if (entitlement_ids && entitlement_ids.length > 0) {
          for (const entitlementId of entitlement_ids) {
            const mappedPlan = REVENUECAT_ENTITLEMENTS[entitlementId];
            if (mappedPlan) {
              if (mappedPlan === 'team' || (mappedPlan === 'pro' && newPlan !== 'team')) {
                newPlan = mappedPlan;
              }
            }
          }
        }
        if (expiration_at_ms) {
          planExpiresAt = new Date(expiration_at_ms);
        }
        console.log(`RevenueCat: User ${user.email} changed plan to ${newPlan}`);
        break;

      default:
        console.log(`RevenueCat: Unhandled event type ${type}`);
        res.json({ data: { success: true } });
        return;
    }

    // Update user plan
    await User.findByIdAndUpdate(user._id, {
      $set: {
        plan: newPlan,
        planExpiresAt,
      },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed', code: 'WEBHOOK_ERROR' });
  }
});

export default router;
