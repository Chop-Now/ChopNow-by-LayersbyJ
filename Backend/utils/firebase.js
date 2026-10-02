const admin = require('firebase-admin');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

let isDryRun = true;

try {
  // 1. Try to load credentials from Env or Config File
  let serviceAccount = null;

  // Option A: Service account file path from Env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (fs.existsSync(keyPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
  }

  // Option B: Inline Env variables
  if (
    !serviceAccount &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  // Option C: Standard file check in config
  if (!serviceAccount) {
    const configPath = path.join(__dirname, '../config/firebase-service-account.json');
    if (fs.existsSync(configPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  }

  // 2. Initialize Firebase Admin SDK
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    isDryRun = false;
    logger.info(
      { projectId: serviceAccount.projectId || serviceAccount.project_id },
      'Firebase Admin initialized successfully.'
    );
  } else {
    logger.warn(
      'Firebase Admin credentials not found. Push notifications will run in DRY-RUN mode (logged to console).'
    );
  }
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize Firebase Admin SDK. Entering DRY-RUN mode.');
}

/**
 * Send a push notification to a single device token.
 * @param {string} token FCM token of the target device
 * @param {object} payload Notification details
 * @param {string} payload.title Title of the notification
 * @param {string} payload.body Body message of the notification
 * @param {object} [payload.data] Optional key-value metadata (strings only)
 */
const sendPushNotification = async (token, { title, body, data = {} }) => {
  if (!token) return;

  // Clean data keys: Firebase expects all values to be string values
  const stringifiedData = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      stringifiedData[key] = String(val);
    }
  }

  const message = {
    notification: { title, body },
    data: stringifiedData,
    token,
  };

  if (isDryRun) {
    logger.info(
      { dryRun: true, token, title, body, data: stringifiedData },
      '[DRY RUN] Send Push Notification'
    );
    return { success: true, messageId: 'dry-run-msg-id-' + Date.now() };
  }

  try {
    const response = await admin.messaging().send(message);
    logger.debug({ response }, 'Push notification sent successfully');
    return { success: true, messageId: response };
  } catch (error) {
    logger.error({ err: error, token }, 'Error sending push notification');
    return { success: false, error: error.message };
  }
};

/**
 * Send a push notification to multiple device tokens.
 * @param {string[]} tokens Array of target device FCM tokens
 * @param {object} payload Notification details
 * @param {string} payload.title Title of the notification
 * @param {string} payload.body Body message of the notification
 * @param {object} [payload.data] Optional key-value metadata (strings only)
 */
const sendMulticastPushNotification = async (tokens, { title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) return;

  // Filter out empty tokens
  const activeTokens = tokens.filter((t) => typeof t === 'string' && t.trim() !== '');
  if (activeTokens.length === 0) return;

  const stringifiedData = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      stringifiedData[key] = String(val);
    }
  }

  if (isDryRun) {
    logger.info(
      { dryRun: true, count: activeTokens.length, title, body, data: stringifiedData },
      '[DRY RUN] Send Multicast Push Notification'
    );
    return {
      success: true,
      responses: activeTokens.map((_, i) => ({ success: true, messageId: `dry-run-${i}` })),
    };
  }

  const message = {
    notification: { title, body },
    data: stringifiedData,
    tokens: activeTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    logger.debug(
      { successCount: response.successCount, failureCount: response.failureCount },
      'Multicast push notifications sent'
    );
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    logger.error({ err: error }, 'Error sending multicast push notifications');
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastPushNotification,
  isDryRun: () => isDryRun,
};
