const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const prisma = require("../lib/prisma");

// ==========================================
// ACCESS TOKEN
// Valid for 15 minutes
// ==========================================
function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

// ==========================================
// REFRESH TOKEN
// Valid for 30 days
// ==========================================
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

// ==========================================
// ISSUE ACCESS + REFRESH TOKENS
// ==========================================
async function issueTokens(userId) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId);
  return { accessToken, refreshToken };
}

// ==========================================
// SIGNUP
// POST /api/auth/signup
// ==========================================

exports.signup = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "All fields required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be 6+ characters",
      });
    }

    // Check existing user
    const existing = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate access + refresh tokens
    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.status(201).json({
      accessToken,
      refreshToken,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);

    res.status(500).json({
      error: "Signup failed",
    });
  }
};

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Generate access + refresh tokens
    const { accessToken, refreshToken } = await issueTokens(user.id);

    res.json({
      accessToken,
      refreshToken,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      error: "Login failed",
    });
  }
};

// ==========================================
// REFRESH TOKEN
// POST /api/auth/refresh
// ==========================================

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: "No refresh token",
      });
    }

    const saved = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

    if (!saved || saved.expiresAt < new Date()) {
      return res.status(401).json({
        error: "Refresh token invalid or expired",
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(saved.userId);

    res.json({
      accessToken,
    });
  } catch (err) {
    console.error("Refresh token error:", err);

    res.status(500).json({
      error: "Token refresh failed",
    });
  }
};

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required",
      });
    }

    await prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);

    res.status(500).json({
      error: "Logout failed",
    });
  }
};

// ==========================================
// SAVE PUSH TOKEN
// POST /api/auth/push-token
// ==========================================

exports.savePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ error: "Push token is required" });
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Save push token error:", err);
    res.status(500).json({ error: "Failed to save push token" });
  }
};
