import 'dotenv/config';
import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectMongoDB, isMongoConnected } from './config/mongodb.js';
import { initializeFirebase } from './config/firebase.js';
import { qrsynchService } from './services/qrsynch.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbConnected: isMongoConnected(),
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

/**
 * Log all registered routes
 */
function logRoutes(router: Router, basePath = ''): void {
  const routes: string[] = [];

  function extractRoutes(layer: { route?: { path: string; methods: Record<string, boolean> }; name?: string; handle?: { stack?: unknown[] }; regexp?: RegExp; path?: string }, path: string): void {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route!.methods[m])
        .map((m) => m.toUpperCase())
        .join(', ');
      routes.push(`  ${methods.padEnd(8)} ${path}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle && 'stack' in layer.handle) {
      const nestedPath = path + (layer.regexp?.source.replace(/\\\//g, '/').replace(/\^\||\$|\?|\(\?.*?\)/g, '').replace(/\\/g, '') || '');
      (layer.handle.stack as unknown[]).forEach((nestedLayer) => extractRoutes(nestedLayer as typeof layer, nestedPath));
    }
  }

  (app._router.stack as unknown[]).forEach((layer) => {
    const typedLayer = layer as { route?: { path: string; methods: Record<string, boolean> }; name?: string; handle?: { stack?: unknown[] }; regexp?: RegExp; path?: string };
    if (typedLayer.name === 'router') {
      const path = typedLayer.regexp?.source.replace(/\\\//g, '/').replace(/\^\||\$|\?|\(\?.*?\)/g, '').replace(/\\/g, '') || '';
      if (typedLayer.handle && 'stack' in typedLayer.handle) {
        (typedLayer.handle.stack as unknown[]).forEach((nestedLayer) => extractRoutes(nestedLayer as typeof typedLayer, path));
      }
    } else if (typedLayer.route) {
      const methods = Object.keys(typedLayer.route.methods)
        .filter((m) => typedLayer.route!.methods[m])
        .map((m) => m.toUpperCase())
        .join(', ');
      routes.push(`  ${methods.padEnd(8)} ${typedLayer.route.path}`);
    }
  });

  console.log('\nRegistered routes:');
  console.log('  GET      /api/health');
  routes.forEach((r) => console.log(r));
  console.log('');
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  // Try to connect to MongoDB (warn on failure, don't exit)
  try {
    await connectMongoDB();
  } catch (error) {
    console.warn('\n*** WARNING: MongoDB connection failed. Update MONGODB_URI in .env ***');
    console.warn('Server will start but database operations will fail.\n');
  }

  // Initialize Firebase Admin SDK (optional)
  try {
    initializeFirebase();
  } catch (error) {
    console.warn('Firebase initialization failed - auth will not work');
  }

  // Initialize QRsynch service (optional)
  qrsynchService.initialize();

  // Start server
  app.listen(PORT, () => {
    console.log(`\nFlashSynch API server running on http://localhost:${PORT}`);
    logRoutes(app._router);
  });
}

start();
