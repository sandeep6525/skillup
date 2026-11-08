import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { getUploadsDir } from './utils/pathUtils';

// Route imports
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import learningRoutes from './routes/learningRoutes';
import paymentRoutes from './routes/paymentRoutes';
import extraRoutes from './routes/extraRoutes';
import uploadRoutes from './routes/uploadRoutes';
import mentorRoutes from './routes/mentorRoutes';
import adminRoutes from './routes/adminRoutes';
import internshipRoutes from './routes/internshipRoutes';
import materialRoutes from './routes/materialRoutes';
import hackathonRoutes from './routes/hackathonRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import galleryRoutes from './routes/galleryRoutes';
import achievementRoutes from './routes/achievementRoutes';

export const createApp = (): Express => {
  const app = express();

  // Trust reverse proxy (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on cloud/Nginx/Docker)
  app.set('trust proxy', 1);

  // Clean HTTP API Request & Response Logger (Method, Endpoint, Status, Response Time)
  app.use((req, res, next) => {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode;
      const statusColor =
        status >= 500
          ? '\x1b[31m' // Red
          : status >= 400
          ? '\x1b[33m' // Yellow
          : status >= 300
          ? '\x1b[36m' // Cyan
          : '\x1b[32m'; // Green
      const reset = '\x1b[0m';
      console.log(`[API] ${method} ${originalUrl} -> ${statusColor}${status}${reset} (${duration}ms)`);
    });

    next();
  });

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow cross-origin media embedding in dev
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Rate Limiting on Authentication & Sensitive Endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 auth requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    },
  });

  // CORS configuration (Permissive for local development & verified production origins)
  const allowedOrigins = [
    config.clientUrl,
    'https://skillups.co.in',
    'https://www.skillups.co.in',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (
          isLocalDev ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          origin.includes('tricubedigitalsolutions.com')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Cache-Control',
        'Pragma',
        'Expires',
        'Accept',
      ],
    })
  );

  // Body parsers with rawBody preservation for webhooks
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Static files for uploads (serves directly from dist/uploads as well as fallback server/uploads)
  const primaryUploadDir = getUploadsDir();
  app.use('/uploads', express.static(primaryUploadDir));

  // Also mount alternate location if it exists so existing files are always accessible
  const fallbackUploadDir = path.resolve(process.cwd(), 'uploads');
  if (fallbackUploadDir !== primaryUploadDir && require('fs').existsSync(fallbackUploadDir)) {
    app.use('/uploads', express.static(fallbackUploadDir));
  }

  // Health check route with active database ping
  app.get('/api/health', async (_req, res) => {
    let dbStatus = 'healthy';
    let dbError = null;

    try {
      const prismaClient = (await import('./config/prisma')).default;
      await prismaClient.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err.message || 'Database ping failed';
    }

    const isOk = dbStatus === 'healthy';
    res.status(isOk ? 200 : 503).json({
      status: isOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'SkillUp Courses Platform API',
      version: '1.0.0',
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {}),
      },
    });
  });

  // Mount API modules with rate limiting on auth
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/internships', internshipRoutes);
  app.use('/api/materials', materialRoutes);
  app.use('/api/hackathons', hackathonRoutes);
  app.use('/api/mentor', mentorRoutes);
  app.use('/api/instructor', mentorRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', galleryRoutes);
  app.use('/api', extraRoutes);
  app.use('/api', uploadRoutes);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
