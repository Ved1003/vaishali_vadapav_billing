import express, { Application, Request, Response } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import itemsRoutes from './routes/items.routes';
import usersRoutes from './routes/users.routes';
import billsRoutes from './routes/bills.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import fridgeRoutes from './routes/fridge.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

// ───────────────────────────────────────────────
// Trust Proxy (Required for Railway/Heroku Load Balancers)
// ───────────────────────────────────────────────
app.set('trust proxy', 1);

// ───────────────────────────────────────────────
// Compression (gzip/brotli – reduces payload size)
// ───────────────────────────────────────────────
app.use(compression());

// ───────────────────────────────────────────────
// Security: Helmet (sets secure HTTP headers)
// ───────────────────────────────────────────────
app.use(helmet());

// ───────────────────────────────────────────────
// CORS Configuration
// ALLOWED_ORIGINS in .env is a comma-separated list, e.g.:
//   https://yourapp.netlify.app,http://localhost:8080
// ───────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://localhost:5173,capacitor://localhost,http://localhost')
    .split(',')
    .map(o => o.trim());

const corsOptions: cors.CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // In development: allow ALL origins so any device on any network can connect
        if (isDev) return callback(null, true);

        // Allow requests with no origin (Capacitor native apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Allow local/mobile origins in addition to the whitelist
        const defaultAllowed = [
            'capacitor://localhost', 
            'http://localhost', 
            'http://localhost:8080', 
            'http://localhost:5173',
            'https://vaishali-vadapav-billing.vercel.app'
        ];
        
        // Also allow vercel preview deployments
        const isVercel = origin.endsWith('.vercel.app') || origin.includes('vaishali-vadapav');

        if (defaultAllowed.includes(origin) || allowedOrigins.includes(origin) || isVercel) {
            return callback(null, true);
        }

        const msg = `CORS: Origin '${origin}' is not allowed.`;
        return callback(new Error(msg), false);
    },
    credentials: true,
};

app.use(cors(corsOptions));

// ───────────────────────────────────────────────
// Rate Limiting – Increased for live dashboard polling
// ───────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Reverted to safe limit (WebSockets will handle real-time load)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Stricter rate limit for auth endpoints to prevent brute force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Reverted to strict limit
    message: { error: 'Too many login attempts, please try again later.' },
});

app.use(limiter);

// Specific limiter for dashboard
const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Dashboard refresh limit exceeded.' },
});

// ───────────────────────────────────────────────
// Body Parsers
// ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ───────────────────────────────────────────────
// Health Check
// ───────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'SwiftBill API is running', timestamp: new Date().toISOString() });
});

// ───────────────────────────────────────────────
// API Routes
// ───────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/dashboard', dashboardLimiter, dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/fridge', fridgeRoutes);
// NOTE: /api/setup has been removed – no longer needed with MongoDB Atlas

// ───────────────────────────────────────────────
// Error Handler (must be last)
// ───────────────────────────────────────────────
app.use(errorHandler);

export default app;
