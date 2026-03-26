// Global Error Handling Middleware
export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  if (err.message === 'TOKEN_EXPIRED') { status = 401; code = 'TOKEN_EXPIRED'; }
  else if (err.message === 'TOKEN_INVALID') { status = 401; code = 'TOKEN_INVALID'; }
  else if (err.message === 'USER_ALREADY_EXISTS') { status = 400; code = 'VALIDATION_ERROR'; }
  else if (err.message === 'INVALID_EMAIL' || err.message === 'PASSWORD_TOO_SHORT') { status = 400; code = 'VALIDATION_ERROR'; }
  else if (err.name === 'ValidationError') { status = 400; code = 'VALIDATION_ERROR'; }

  const response = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};
