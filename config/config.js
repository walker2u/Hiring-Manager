// config/config.js
require('dotenv').config();
const path = require('path');
const assert = require('assert');

const config = {
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        projectId: process.env.GOOGLE_PROJECT_ID,
        scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/pubsub',
            'https://www.googleapis.com/auth/calendar.events',
        ],
    },
    pubsub: {
        topicId: process.env.PUB_SUB_TOPIC_ID,
        topicName: `projects/${process.env.GOOGLE_PROJECT_ID}/topics/${process.env.PUB_SUB_TOPIC_ID}`,
    },
    server: {
        port: process.env.PORT || 3000,
        webhookSecret: process.env.WEBHOOK_SECRET_TOKEN || null,
    },
    storage: {
        tokenPath: process.env.TOKEN_STORAGE_PATH || path.join(__dirname, '..', 'storage', 'token.json'),
        statePath: process.env.STATE_STORAGE_PATH || path.join(__dirname, '..', 'storage', 'state.json'),
    },
    attachmentsDir: path.join(__dirname, '..', 'attachments'),
};

// --- Validation ---
assert(config.google.clientId, 'Missing GOOGLE_CLIENT_ID in .env');
assert(config.google.clientSecret, 'Missing GOOGLE_CLIENT_SECRET in .env');
assert(config.google.redirectUri, 'Missing GOOGLE_REDIRECT_URI in .env');
assert(config.google.projectId, 'Missing GOOGLE_PROJECT_ID in .env');
assert(config.pubsub.topicId, 'Missing PUB_SUB_TOPIC_ID in .env');

module.exports = config;