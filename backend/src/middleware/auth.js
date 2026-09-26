const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // Expect header format: "Authorization: Bearer eyJhbGc..."
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // strip "Bearer "

  try {
    // Verify signature and decode payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // attach to request for controllers to use
    next(); // proceed to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
