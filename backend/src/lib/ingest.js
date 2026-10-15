const prisma = require("./prisma");
const { assessPayment } = require("./risk");
const { sendToUser } = require("./push");
const { COUNTED } = require("./finance");

// Entry point for payments that arrive from a bank or card feed (LINKED source).
// A real bank integration (a webhook or a sync job) should call this function.
// Unusual payments are paused for review and the user is notified.
async function ingestLinkedPayment(userId, payment) {
  const history = await prisma.transaction.findMany({
    where: { userId, type: "DEBIT", ...COUNTED },
    orderBy: { date: "desc" },
    take: 100,
    select: { merchant: true, amount: true, category: true, location: true },
  });

  const assessment = assessPayment(payment, history);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      merchant: payment.merchant,
      amount: payment.amount,
      category: payment.category,
      type: "DEBIT",
      date: payment.date,
      note: payment.note || null,
      paymentMethod: payment.paymentMethod || null,
      location: payment.location || null,
      accountId: payment.accountId || null,
      source: "LINKED",
      reviewStatus: assessment.flagged ? "PENDING" : "NONE",
      riskLevel: assessment.riskLevel,
      flagReasons: assessment.reasons,
    },
  });

  if (!assessment.flagged && payment.accountId) {
    // A normal payment moves the account balance straight away
    await prisma.account.update({
      where: { id: payment.accountId },
      data: { balance: { decrement: payment.amount } },
    });
  }

  if (assessment.flagged) {
    sendToUser(userId, {
      title: "A payment needs a closer look",
      body: `${payment.merchant} · ${payment.amount.toFixed(2)} was paused for your review.`,
      data: { type: "payment_review", screen: "Safety", transactionId: tx.id },
    }).catch((err) =>
      console.error("Review notification failed:", err.message),
    );
  }

  return tx;
}

module.exports = { ingestLinkedPayment };
