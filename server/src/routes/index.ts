import { Router } from 'express';
import authRoutes from './auth.js';
import cardsRoutes from './cards.js';
import contactsRoutes from './contacts.js';
import analyticsRoutes from './analytics.js';
import webhooksRoutes from './webhooks.js';
import orgsRoutes from './orgs.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);
router.use('/', authRoutes); // For /users/me routes

// Cards routes
router.use('/cards', cardsRoutes);

// Contacts routes (lead capture under cards, contacts list separate)
router.use('/cards', contactsRoutes); // For /cards/:slug/capture
router.use('/contacts', contactsRoutes); // For /contacts

// Analytics routes
router.use('/cards', analyticsRoutes); // For /cards/:slug/scan
router.use('/analytics', analyticsRoutes); // For /analytics/:cardId

// Organization routes
router.use('/orgs', orgsRoutes);

// Webhooks routes
router.use('/webhooks', webhooksRoutes);

export default router;
