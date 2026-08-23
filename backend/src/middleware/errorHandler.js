/**
 * Global error handler middleware.
 * Must be registered LAST in app.js with 4 arguments.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err.stack);
  }

  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
