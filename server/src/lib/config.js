import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  failCooldownDays: Number(process.env.FAIL_COOLDOWN_DAYS || 7),
  bookingCutoffHours: Number(process.env.BOOKING_CUTOFF_HOURS || 2),
};
