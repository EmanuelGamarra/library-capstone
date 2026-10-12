export function errorHandler(err, req, res, next) {
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 500
      ? err.statusCode
      : 500;

  if (statusCode === 500) {
    console.error("Unexpected server error:", err);
  }

  return res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
}
