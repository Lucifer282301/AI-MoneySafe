const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(header.slice(7), env.jwtSecret, {
      algorithms: ["HS256"],
    });
    req.userId = decoded.userId;
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    return res
      .status(401)
      .json({ error: expired ? "Token expired" : "Invalid token" });
  }
}

module.exports = authMiddleware;
