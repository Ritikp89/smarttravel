const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details;

  // Mongoose validation - collect all the field messages so the form can show them
  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(details)[0] || 'Validation failed';
  }

  // Bad ObjectId in a URL
  if (err.name === 'CastError') {
    status = 404;
    message = 'Resource not found';
  }

  // Duplicate key (almost always the email on registration)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = field === 'email' ? 'An account with that email already exists' : `Duplicate ${field}`;
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 && { stack: err.stack }),
  });
};

// Small helper so controllers can throw with a status code.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Wraps async route handlers so we don't need try/catch everywhere.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, ApiError, asyncHandler };
