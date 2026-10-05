const admin = require('firebase-admin');
const prisma = require('./prisma');
const env = require('../config/env');

let messaging = null;

if (env.firebaseServiceAccount) {
  try {
    const credentials = JSON.parse(Buffer.from(env.firebaseServiceAccount, 'base64').toString('utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
    }
    messaging = admin.messaging();
    console.log('Push notifications enabled');
  } catch (err) {
    console.error('Push notifications disabled: invalid FIREBASE_SERVICE_ACCOUNT_BASE64:', err.message);
  }
} else {
  console.log('Push notifications disabled (no FIREBASE_SERVICE_ACCOUNT_BASE64)');
}

const isPushConfigured = () => messaging !== null;

const DEAD_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

// Send a notification to every device a user has registered
async function sendToUser(userId, { title, body, data = {} }) {
  if (!messaging) return;

  const devices = await prisma.deviceToken.findMany({ where: { userId } });
  if (devices.length === 0) return;

  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));

  const result = await messaging.sendEachForMulticast({
    tokens: devices.map(d => d.token),
    notification: { title, body },
    data: stringData,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });

  // Remove tokens that no longer work
  const dead = [];
  result.responses.forEach((r, i) => {
    if (!r.success && r.error && DEAD_TOKEN_CODES.includes(r.error.code)) {
      dead.push(devices[i].token);
    }
  });
  if (dead.length) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }
}

module.exports = { sendToUser, isPushConfigured };