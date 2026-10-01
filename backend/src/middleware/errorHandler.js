const env = require("../config/env");

function notFound(req, res) {
  res.status(404).json({ error: "Route not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Body parser errors
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error:
      status >= 500 && env.isProd
        ? "Internal server error"
        : err.message || "Internal server error",
  });
}

module.exports = { notFound, errorHandler };
