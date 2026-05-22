import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import os from 'os';
import { runMigrations } from './db';
import { configurePassport } from './auth/passport';
import passportInstance from './auth/passport';
import authRouter from './auth/router';
import classesRouter from './classes/router';
import pagesRouter from './pages/router';
import hifzRouter from './hifz/router';
import nazirahRouter from './nazirah/router';
import inviteRouter from './invite/router';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is required in production');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-nazirah-secret-change-in-production';
  console.warn('⚠  JWT_SECRET not set — using insecure dev default');
}

// ── Middleware ──────────────────────────────────────────────────
// In dev, allow localhost + any private-network LAN IP so phones/tablets
// can hit the API while testing. In prod, only CLIENT_ORIGIN is allowed.
const isPrivateOrigin = (origin: string): boolean => {
  // Match http://<ip>:<port> where ip is in RFC1918 private ranges or localhost
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
};
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);          // curl / mobile native shells
      if (origin === CLIENT_ORIGIN) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && isPrivateOrigin(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 min (only for OAuth state)
  },
}));

configurePassport();
app.use(passportInstance.initialize());
app.use(passportInstance.session());

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/classes', classesRouter);
app.use('/api/classes/:classId/invite', inviteRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/hifz', hifzRouter);
app.use('/api/nazirah', nazirahRouter);

// ── Production static serving ──────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Global error handler ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────
function getLanIPs(): string[] {
  const nets = os.networkInterfaces();
  const out: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function start() {
  runMigrations();
  // Bind to 0.0.0.0 so LAN devices (phone, tablet, laptop) can reach the API.
  app.listen(PORT, '0.0.0.0', () => {
    const lan = getLanIPs();
    console.log('');
    console.log(`✓ Nazirah API server running`);
    console.log(`  • Local:   http://localhost:${PORT}`);
    for (const ip of lan) console.log(`  • Network: http://${ip}:${PORT}`);
    console.log('');
    console.log(`  Client should be reachable at the matching :5173 URLs.`);
    console.log('');
  });
}

start();
