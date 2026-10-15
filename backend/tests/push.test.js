const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

function loadPush({ serviceAccount, devices = [], responses = [] }) {
  const state = {
    initialized: [],
    credential: null,
    sent: [],
    deleted: [],
    dbCalls: 0,
  };

  const originalLoad = Module._load;
  const pushPath = require.resolve("../src/lib/push");
  delete require.cache[pushPath];

  const prisma = {
    deviceToken: {
      findMany: async () => {
        state.dbCalls += 1;
        return devices;
      },
      deleteMany: async (query) => state.deleted.push(query),
    },
  };
  const messaging = {
    sendEachForMulticast: async (message) => {
      state.sent.push(message);
      return { responses };
    },
  };

  Module._load = function (request, parent, isMain) {
    if (request === "firebase-admin/app") {
      return {
        cert: (value) => {
          state.credential = value;
          return { serviceAccount: value };
        },
        getApps: () => [],
        initializeApp: (options) => {
          state.initialized.push(options);
          return { name: "[DEFAULT]" };
        },
      };
    }
    if (request === "firebase-admin/messaging") {
      return { getMessaging: () => messaging };
    }
    if (request === "./prisma" && parent.filename === pushPath) return prisma;
    if (request === "../config/env" && parent.filename === pushPath) {
      return { firebaseServiceAccount: serviceAccount };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    state.push = require(pushPath);
  } finally {
    Module._load = originalLoad;
    console.log = originalLog;
    console.error = originalError;
    delete require.cache[pushPath];
  }

  return state;
}

test("Firebase Admin v14 credentials initialize and push delivery removes dead tokens", async () => {
  const account = {
    type: "service_account",
    project_id: "moneysafe-test",
    client_email: "push@moneysafe-test.iam.gserviceaccount.com",
    private_key: "test-private-key",
  };
  const state = loadPush({
    serviceAccount: Buffer.from(JSON.stringify(account)).toString("base64"),
    devices: [{ token: "dead-device-token" }, { token: "active-device-token" }],
    responses: [
      {
        success: false,
        error: { code: "messaging/registration-token-not-registered" },
      },
      { success: true },
    ],
  });

  assert.equal(state.push.isPushConfigured(), true);
  assert.deepEqual(state.credential, account);
  assert.equal(state.initialized.length, 1);

  await state.push.sendToUser("user-1", {
    title: "Budget alert",
    body: "You reached your limit",
    data: { type: "budget_alert", category: "FOOD", count: 2 },
  });

  assert.equal(state.sent.length, 1);
  assert.deepEqual(state.sent[0].tokens, [
    "dead-device-token",
    "active-device-token",
  ]);
  assert.deepEqual(state.sent[0].data, {
    type: "budget_alert",
    category: "FOOD",
    count: "2",
  });
  assert.deepEqual(state.deleted, [
    { where: { token: { in: ["dead-device-token"] } } },
  ]);
});

test("push notifications stay disabled when no service account is configured", async () => {
  const state = loadPush({ serviceAccount: "" });

  assert.equal(state.push.isPushConfigured(), false);
  await state.push.sendToUser("user-1", { title: "Alert", body: "Message" });
  assert.equal(state.dbCalls, 0);
  assert.equal(state.sent.length, 0);
});
