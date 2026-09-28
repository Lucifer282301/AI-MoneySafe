const { GoogleGenAI } = require("@google/genai");
const prisma = require("../lib/prisma");
const { uploadReceipt } = require("../lib/cloudinary");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-2.5-flash";

// POST /api/ai/extract
// multipart/form-data
// bill = image file

exports.extractReceipt = async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "bill image is required",
      });
    }

    // Convert uploaded image buffer to Base64
    const image = req.file.buffer.toString("base64");

    // Get MIME type automatically from uploaded file
    const mimeType = req.file.mimetype;

    const today = new Date().toISOString().split("T")[0];

    const prompt = `
Parse this receipt/payment screenshot.

Respond ONLY with valid JSON.
Do not use markdown.
Do not add explanations.

{
  "merchant": "string",
  "amount": 0,
  "category": "FOOD|TRANSPORT|SHOPPING|ENTERTAINMENT|BILLS|HEALTH|EDUCATION|OTHER",
  "date": "YYYY-MM-DD",
  "note": "string"
}

Use ${today} if the date is not visible.
`;

    // Run Gemini extraction and Cloudinary upload in parallel
    const [geminiResult, receiptUrl] = await Promise.all([
      ai.models.generateContent({
        model: MODEL,
        contents: [
          { inlineData: { data: image, mimeType: mimeType } },
          { text: prompt },
        ],
      }),

      uploadReceipt(image, req.userId),
    ]);

    // Get Gemini response
    const text = geminiResult.text.trim();

    // Remove markdown code fences if Gemini adds them
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Return extracted data + Cloudinary URL
    return res.json({
      ...parsed,
      receiptUrl,
    });
  } catch (err) {
    console.error("Gemini Extraction Error:", err);

    return res
      .status(500)
      .json({ error: "AI extraction failed", message: err.message });
  }
};

// POST /api/ai/chat
// { messages: [{ role, content }, ...] }

exports.chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages array is required",
      });
    }

    // ---------------------------------------
    // 1. Get current month's transactions
    // ---------------------------------------

    const now = new Date();

    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const txs = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: start,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // ---------------------------------------
    // 2. Get budgets
    // ---------------------------------------

    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.userId,
      },
    });

    // ---------------------------------------
    // 3. Get user
    // ---------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    // ---------------------------------------
    // 4. Calculate spending
    // ---------------------------------------

    const total = txs
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory = {};

    txs.forEach((t) => {
      if (t.type === "DEBIT") {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      }
    });

    // ---------------------------------------
    // 5. Build financial context
    // ---------------------------------------

    const context = `
You are a concise personal finance AI assistant.

Use ONLY the financial data provided below.
Never invent transaction amounts, budgets, merchants, or totals.

Use ₹ for currency.

User:
${user?.name || "User"}

This month:

Total spent:
₹${total}

Spending by category:
${
  Object.entries(byCategory)
    .map(([category, amount]) => `${category}: ₹${amount}`)
    .join(", ") || "No spending"
}

Budgets:
${
  budgets.map((budget) => `${budget.category}: ₹${budget.limit}`).join(", ") ||
  "No budgets set"
}

Recent transactions:
${
  txs
    .slice(0, 10)
    .map((t) => `${t.merchant}: ₹${t.amount} (${t.category})`)
    .join(" | ") || "No transactions"
}

Answer the user's question concisely.
`;

    // ---------------------------------------
    // 6. Convert messages to Gemini format
    // ---------------------------------------

    const history = messages.slice(0, -1).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",

      parts: [
        {
          text: message.content,
        },
      ],
    }));

    // ---------------------------------------
    // 7. Add financial context
    // ---------------------------------------

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: context,
          },
        ],
      },
      ...history,
      {
        role: "user",
        parts: [
          {
            text: messages[messages.length - 1].content,
          },
        ],
      },
    ];

    // ---------------------------------------
    // 8. Call Gemini
    // ---------------------------------------

    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
    });

    const reply = response.text;

    res.json({
      reply,
    });
  } catch (err) {
    console.error("Gemini Chat Error:", err);

    res.status(500).json({
      error: "Chat failed",
      message: err.message,
    });
  }
};
