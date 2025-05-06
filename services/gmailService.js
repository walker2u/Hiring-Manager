const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const googleAuthService = require('./googleAuthService');
const stateStorage = require('../storage/stateStorage');
const logger = require('../utils/logger');

const attachmentsDir = config.attachmentsDir;

async function setupWatch() {
    try {
        const auth = await googleAuthService.getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });
        logger.info(`Setting up Gmail watch for topic: ${config.pubsub.topicName}`);

        const response = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                labelIds: ['INBOX'],
                topicName: config.pubsub.topicName,
            },
        });

        logger.info('Gmail watch setup successful:', response.data);
        await stateStorage.saveWatchState(response.data.historyId, response.data.expiration);
        logger.info(`Watch state saved. Initial history ID: ${response.data.historyId}. Expires: ${new Date(parseInt(response.data.expiration, 10)).toISOString()}`);
        return response.data;
    } catch (error) {
        logger.error('Error setting up Gmail watch:', error.response?.data || error.message);
        if (error.message.includes('Topic not found')) {
            logger.error(`Pub/Sub topic "${config.pubsub.topicName}" not found or permission error.`);
        }
        throw new Error('Failed to set up Gmail watch.');
    }
}

async function getMessageDetails(messageId) {
    try {
        const auth = await googleAuthService.getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });
        logger.debug(`Fetching full details for message ID: ${messageId}`);
        const msgResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });
        return msgResponse.data;
    } catch (error) {
        logger.error(`Error fetching details for message ID ${messageId}:`, error.response?.data || error.message);
        throw error;
    }
}

// --- findAndSaveAttachments Function ---
/**
 * Recursively searches message parts for the *first* attachment, saves it,
 * and returns immediately upon successful save.
 * @param {string} messageId
 * @param {object} part The current message part being examined.
 * @param {object} gmail The authenticated Gmail API client instance.
 * @param {number} depth Current recursion depth (for logging).
 * @returns {Promise<object>} -Promise resolving to { foundAndSaved: boolean, fileFinalName: string }
 */
async function findAndSaveAttachments(messageId, part, gmail, depth = 0) {
    const indent = '  '.repeat(depth);
    logger.debug(`${indent}Checking Part - MimeType: ${part.mimeType}, Filename: ${part.filename || 'N/A'}, PartID: ${part.partId || 'N/A'}`);

    // Checking if the currentt part is a suitable attachment --------------
    if (part.filename && part.filename.length > 0 && part.body && (part.body.attachmentId || part.body.data)) {
        const sanitizedFilename = part.filename.replace(/[^a-z0-9\.\-\_]/gi, '_');
        const baseFilename = `${messageId}-${sanitizedFilename}`;
        const filepath = path.join(attachmentsDir, baseFilename);

        logger.info(`${indent}* Found potential attachment candidate: ${part.filename}. Attempting to save as: ${path.basename(filepath)}`);

        let attachmentDataB64 = '';
        try {
            // --- Fetch Attachment Data ---
            if (part.body.attachmentId) {
                logger.debug(`${indent}  Fetching attachment data via ID: ${part.body.attachmentId}, Expected Size: ${part.body.size}`);
                const attachmentResponse = await gmail.users.messages.attachments.get({
                    userId: 'me',
                    messageId: messageId,
                    id: part.body.attachmentId,
                });
                attachmentDataB64 = attachmentResponse.data.data;
                if (!attachmentDataB64) logger.warn(`${indent}  WARN: Attachment fetch for ID ${part.body.attachmentId} returned no data.`);

            } else if (part.body.data) {
                logger.debug(`${indent}  Using inline attachment data. Body Size: ${part.body.size}`);
                attachmentDataB64 = part.body.data;
            }

            if (attachmentDataB64) {
                const safeBase64 = attachmentDataB64.replace(/-/g, '+').replace(/_/g, '/');
                const decodedData = Buffer.from(safeBase64, 'base64');
                await fs.mkdir(attachmentsDir, { recursive: true });
                await fs.writeFile(filepath, decodedData);
                logger.info(`${indent}  Successfully saved attachment to: ${filepath}`);

                return { foundAndSaved: true, fileFinalName: baseFilename };
            } else {
                logger.warn(`${indent}  Attachment candidate found but failed to retrieve Base64 data.`);
            }
        } catch (error) {
            logger.error(`${indent}  ERROR processing attachment "${part.filename}" (Fetch/Save):`, error.response?.data || error.message);
        }
    }

    if (part.parts && part.parts.length > 0) {
        logger.debug(`${indent} Part has ${part.parts.length} sub-part(s). Descending...`);
        for (const subPart of part.parts) {
            const resultFromSubpart = await findAndSaveAttachments(messageId, subPart, gmail, depth + 1);
            if (resultFromSubpart && resultFromSubpart.foundAndSaved) {
                logger.debug(`${indent} Attachment found and saved in sub-part. Propagating result.`);
                return resultFromSubpart;
            }
            //otherwise, continue checking the next sub-part
        }
    }

    // --- If code reaches here, no attachment was found and saved in this part or its children ------
    logger.debug(`${indent}No attachment found or saved in this branch.`);
    return { foundAndSaved: false, fileFinalName: '' };
}

// --- processHistory Function (Unchanged) ---
async function processHistory(startHistoryId) {
    try {
        const auth = await googleAuthService.getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });
        logger.info(`Fetching history starting from ID: ${startHistoryId}`);

        const historyResponse = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: startHistoryId,
            historyTypes: ['messageAdded'],
        });

        const historyRecords = historyResponse.data.history;
        const newMessages = [];

        if (historyRecords && historyRecords.length > 0) {
            historyRecords.forEach(record => {
                if (record.messagesAdded) {
                    record.messagesAdded.forEach(msgAdd => {
                        if (!newMessages.some(m => m.id === msgAdd.message.id)) {
                            newMessages.push({ id: msgAdd.message.id, threadId: msgAdd.message.threadId });
                        }
                    });
                }
            });
            logger.info(`Found ${newMessages.length} new message(s) in history.`);
        } else {
            logger.info(`No new message history found since ${startHistoryId}.`);
        }
        return newMessages;
    } catch (error) {
        logger.error('Error fetching Gmail history:', error.response?.data || error.message);
        throw error;
    }
}


module.exports = {
    setupWatch,
    processHistory,
    getMessageDetails,
    findAndSaveAttachments,
};