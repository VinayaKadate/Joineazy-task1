const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// ── Security & Parsing Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes (added phase by phase) ────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/groups', require('./routes/groups'));
// Phase 3: app.use('/assignments', require('./routes/assignments'));
// Phase 4: app.use('/submissions', require('./routes/submissions'));
// Phase 5: app.use('/analytics', require('./routes/analytics'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
