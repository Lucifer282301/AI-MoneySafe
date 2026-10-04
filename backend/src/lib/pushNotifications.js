const { Expo } = require("expo-server-sdk");
const prisma = require("./prisma");

const expo = new Expo();

async function sendPush(userId, title, body) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken) return false;

  if (!Expo.isExpoPushToken(user.pushToken)) {
    console.warn(`Removing invalid Expo push token for user ${userId}`);
    await prisma.user.updateMany({
      where: { id: userId, pushToken: user.pushToken },
      data: { pushToken: null },
    });
    return false;
  }

  const [ticket] = await expo.sendPushNotificationsAsync([
    { to: user.pushToken, sound: "default", title, body },
  ]);

  if (ticket?.status !== "ok") {
    if (ticket?.details?.error === "DeviceNotRegistered") {
      await prisma.user.updateMany({
        where: { id: userId, pushToken: user.pushToken },
        data: { pushToken: null },
      });
    } else {
      console.error("Expo rejected push notification:", ticket?.message);
    }
    return false;
  }

  return true;
}

module.exports = { sendPush };
