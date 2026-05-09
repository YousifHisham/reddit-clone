const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = errorMiddleware;
