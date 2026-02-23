import { Router, Request, Response } from 'express';
import { Org, User, Card, Invitation } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { sendInviteEmail } from '../services/email.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const router = Router();

/**
 * Helper to generate URL-safe slug from org name
 */
function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Helper to check if user has admin access to org
 */
function hasAdminAccess(org: any, userId: string): boolean {
  const userIdStr = userId.toString();
  if (org.ownerId.toString() === userIdStr) return true;
  const member = org.members.find((m: any) => {
    const memberId = m.userId?._id ? m.userId._id.toString() : m.userId.toString();
    return memberId === userIdStr;
  });
  return member?.role === 'admin' || member?.role === 'owner';
}

/**
 * POST /api/orgs
 * Create a new organization
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Organization name must be at least 2 characters', code: 'VALIDATION_ERROR' });
      return;
    }

    // Generate unique slug
    let slug = generateOrgSlug(name);
    let slugExists = await Org.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${generateOrgSlug(name)}-${counter}`;
      slugExists = await Org.findOne({ slug });
      counter++;
    }

    // Create organization with user as owner
    const org = new Org({
      name: name.trim(),
      slug,
      ownerId: req.user._id,
      members: [
        {
          userId: req.user._id,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
      settings: {
        maxCards: 10,
        maxMembers: 5,
      },
    });

    await org.save();

    // Update user's orgId
    await User.findByIdAndUpdate(req.user._id, { orgId: org._id });

    res.status(201).json({ data: org.toObject() });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: 'Failed to create organization', code: 'CREATE_ORG_ERROR' });
  }
});

/**
 * GET /api/orgs/me
 * Get current user's organization
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Find org where user is a member
    const org = await Org.findOne({
      'members.userId': req.user._id,
    }).populate('members.userId', 'displayName email avatarUrl');

    if (!org) {
      res.status(404).json({ error: 'No organization found', code: 'ORG_NOT_FOUND' });
      return;
    }

    // Get member count and card count
    const cardCount = await Card.countDocuments({ orgId: org._id, status: 'active' });

    res.json({
      data: {
        ...org.toObject(),
        stats: {
          memberCount: org.members.length,
          cardCount,
        },
      },
    });
  } catch (error) {
    console.error('Get org error:', error);
    res.status(500).json({ error: 'Failed to get organization', code: 'GET_ORG_ERROR' });
  }
});

/**
 * PUT /api/orgs/:id
 * Update organization (owner/admin only)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;
    const { name, settings } = req.body;

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    if (!hasAdminAccess(org, req.user._id)) {
      res.status(403).json({ error: 'Not authorized to update this organization', code: 'FORBIDDEN' });
      return;
    }

    if (name) {
      org.name = name.trim();
    }

    if (settings) {
      if (settings.maxCards !== undefined) org.settings.maxCards = settings.maxCards;
      if (settings.maxMembers !== undefined) org.settings.maxMembers = settings.maxMembers;
    }

    await org.save();

    res.json({ data: org.toObject() });
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ error: 'Failed to update organization', code: 'UPDATE_ORG_ERROR' });
  }
});

/**
 * POST /api/orgs/:id/invitations
 * Invite a member to the organization
 */
router.post('/:id/invitations', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    if (!hasAdminAccess(org, req.user._id)) {
      res.status(403).json({ error: 'Not authorized to invite members', code: 'FORBIDDEN' });
      return;
    }

    // Check member limit
    if (org.members.length >= org.settings.maxMembers) {
      res.status(400).json({ error: 'Member limit reached. Upgrade your plan.', code: 'MEMBER_LIMIT_REACHED' });
      return;
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const isMember = org.members.some((m) => m.userId.toString() === existingUser._id.toString());
      if (isMember) {
        res.status(400).json({ error: 'User is already a member', code: 'ALREADY_MEMBER' });
        return;
      }
    }

    // Check if there's already a pending invitation
    const existingInvite = await Invitation.findOne({
      orgId: org._id,
      email: email.toLowerCase(),
      status: 'pending',
    });

    if (existingInvite) {
      res.status(400).json({ error: 'Invitation already sent to this email', code: 'INVITE_EXISTS' });
      return;
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = new Invitation({
      orgId: org._id,
      email: email.toLowerCase(),
      role: role === 'admin' ? 'admin' : 'member',
      invitedBy: req.user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await invitation.save();

    // Send invitation email
    const inviter = await User.findById(req.user._id);
    await sendInviteEmail({
      to: email.toLowerCase(),
      inviterName: inviter?.displayName || 'A team member',
      orgName: org.name,
      role: invitation.role,
      inviteToken: token,
    });

    res.status(201).json({
      data: {
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:5175'}/invite/${token}`,
      },
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Failed to create invitation', code: 'CREATE_INVITE_ERROR' });
  }
});

/**
 * GET /api/orgs/:id/invitations
 * Get all pending invitations for an organization
 */
router.get('/:id/invitations', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    if (!hasAdminAccess(org, req.user._id)) {
      res.status(403).json({ error: 'Not authorized to view invitations', code: 'FORBIDDEN' });
      return;
    }

    const invitations = await Invitation.find({
      orgId: org._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    res.json({ data: invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to get invitations', code: 'GET_INVITES_ERROR' });
  }
});

/**
 * DELETE /api/orgs/:id/invitations/:inviteId
 * Cancel an invitation
 */
router.delete('/:id/invitations/:inviteId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id, inviteId } = req.params;

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    if (!hasAdminAccess(org, req.user._id)) {
      res.status(403).json({ error: 'Not authorized to cancel invitations', code: 'FORBIDDEN' });
      return;
    }

    await Invitation.findByIdAndDelete(inviteId);

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Delete invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation', code: 'DELETE_INVITE_ERROR' });
  }
});

/**
 * POST /api/orgs/invitations/:token/accept
 * Accept an invitation (public - but must be authenticated)
 */
router.post('/invitations/:token/accept', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found or expired', code: 'INVITE_NOT_FOUND' });
      return;
    }

    // Verify email matches
    const user = await User.findById(req.user._id);
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      res.status(403).json({
        error: 'This invitation was sent to a different email address',
        code: 'EMAIL_MISMATCH',
      });
      return;
    }

    const org = await Org.findById(invitation.orgId);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    // Add user to org members
    org.members.push({
      userId: new mongoose.Types.ObjectId(req.user._id),
      role: invitation.role,
      joinedAt: new Date(),
    });

    await org.save();

    // Update user's orgId
    await User.findByIdAndUpdate(req.user._id, { orgId: org._id });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    res.json({ data: org.toObject() });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation', code: 'ACCEPT_INVITE_ERROR' });
  }
});

/**
 * GET /api/orgs/invitations/:token
 * Get invitation details (public)
 */
router.get('/invitations/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found or expired', code: 'INVITE_NOT_FOUND' });
      return;
    }

    const org = await Org.findById(invitation.orgId).select('name slug');

    res.json({
      data: {
        email: invitation.email,
        role: invitation.role,
        orgName: org?.name,
        orgSlug: org?.slug,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Failed to get invitation', code: 'GET_INVITE_ERROR' });
  }
});

/**
 * PUT /api/orgs/:id/members/:userId
 * Update member role (owner/admin only)
 */
router.put('/:id/members/:userId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      res.status(400).json({ error: 'Invalid role', code: 'VALIDATION_ERROR' });
      return;
    }

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    // Only owner can change roles
    if (org.ownerId.toString() !== req.user._id) {
      res.status(403).json({ error: 'Only the owner can change member roles', code: 'FORBIDDEN' });
      return;
    }

    // Can't change owner's role
    if (userId === org.ownerId.toString()) {
      res.status(400).json({ error: "Cannot change owner's role", code: 'CANNOT_CHANGE_OWNER' });
      return;
    }

    const memberIndex = org.members.findIndex((m) => m.userId.toString() === userId);

    if (memberIndex === -1) {
      res.status(404).json({ error: 'Member not found', code: 'MEMBER_NOT_FOUND' });
      return;
    }

    org.members[memberIndex].role = role;
    await org.save();

    res.json({ data: org.toObject() });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member', code: 'UPDATE_MEMBER_ERROR' });
  }
});

/**
 * DELETE /api/orgs/:id/members/:userId
 * Remove a member from the organization
 */
router.delete('/:id/members/:userId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id, userId } = req.params;

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    // Can remove self, or admins can remove others
    const isSelf = userId === req.user._id;
    const isAdmin = hasAdminAccess(org, req.user._id);

    if (!isSelf && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to remove members', code: 'FORBIDDEN' });
      return;
    }

    // Can't remove owner
    if (userId === org.ownerId.toString()) {
      res.status(400).json({ error: 'Cannot remove the owner', code: 'CANNOT_REMOVE_OWNER' });
      return;
    }

    org.members = org.members.filter((m) => m.userId.toString() !== userId);
    await org.save();

    // Clear user's orgId
    await User.findByIdAndUpdate(userId, { $unset: { orgId: 1 } });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member', code: 'REMOVE_MEMBER_ERROR' });
  }
});

/**
 * GET /api/orgs/:id/analytics
 * Get team-wide analytics
 */
router.get('/:id/analytics', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const { id } = req.params;

    const org = await Org.findById(id);

    if (!org) {
      res.status(404).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
      return;
    }

    // Check membership
    const isMember = org.members.some((m) => m.userId.toString() === req.user!._id);
    if (!isMember) {
      res.status(403).json({ error: 'Not a member of this organization', code: 'FORBIDDEN' });
      return;
    }

    // Get all org cards
    const cards = await Card.find({ orgId: org._id, status: 'active' });

    // Aggregate analytics
    const totals = cards.reduce(
      (acc, card) => ({
        views: acc.views + (card.analytics?.totalViews || 0),
        clicks: acc.clicks + (card.analytics?.totalClicks || 0),
        captures: acc.captures + (card.analytics?.totalCaptures || 0),
      }),
      { views: 0, clicks: 0, captures: 0 }
    );

    // Get member stats with their cards
    const memberStats = await Promise.all(
      org.members.map(async (member) => {
        const memberCards = await Card.find({
          userId: member.userId,
          orgId: org._id,
          status: 'active',
        });

        const memberUser = await User.findById(member.userId).select('displayName email avatarUrl');

        const memberTotals = memberCards.reduce(
          (acc, card) => ({
            views: acc.views + (card.analytics?.totalViews || 0),
            clicks: acc.clicks + (card.analytics?.totalClicks || 0),
            captures: acc.captures + (card.analytics?.totalCaptures || 0),
          }),
          { views: 0, clicks: 0, captures: 0 }
        );

        return {
          userId: member.userId,
          displayName: memberUser?.displayName || 'Unknown',
          email: memberUser?.email,
          avatarUrl: memberUser?.avatarUrl,
          role: member.role,
          cardCount: memberCards.length,
          ...memberTotals,
        };
      })
    );

    res.json({
      data: {
        totals,
        cardCount: cards.length,
        memberCount: org.members.length,
        memberStats: memberStats.sort((a, b) => b.views - a.views),
      },
    });
  } catch (error) {
    console.error('Get org analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics', code: 'GET_ANALYTICS_ERROR' });
  }
});

export default router;
