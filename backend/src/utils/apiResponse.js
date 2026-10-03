/**
 * Standard API Response Utilities
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const payload = {
    success: true,
    message,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

function sendError(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = {
    success: false,
    message
  };
  if (errors) {
    if (typeof errors === 'object' && !Array.isArray(errors)) {
      Object.assign(payload, errors);
    }
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError
};
