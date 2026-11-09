import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_skillup_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_skillup_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_sampleKey123',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_sampleSecret456',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'razorpay_webhook_secret_123',
  },
  smtp: {
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465' || (!process.env.SMTP_PORT && !process.env.SMTP_SECURE),
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    fromName: (process.env.SMTP_FROM_NAME || 'SkillUp Platform').trim(),
    fromEmail: (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@skillup.com').trim(),
  },
  livekit: {
    url: process.env.LIVEKIT_URL || 'wss://courses-platform.livekit.cloud',
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secret_dev_livekit_key_2026_skillup',
  },
};


