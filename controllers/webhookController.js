// controllers/webhookController.js
const config = require('../config/config');
const logger = require('../utils/logger');
const stateStorage = require('../storage/stateStorage');
const gmailService = require('../services/gmailService');
const calendarService = require('../services/calendarService');
const { extractEmailFromHeader } = require('../utils/emailExtractor');
const googleAuthService = require('../services/googleAuthService');
const { google } = require('googleapis');
const checkQualificaion = require('../llm/main');
const { qualifiedCandidates } = require('../storage/candidates.ts');
const crypto = require('crypto');

const path = require('path');
const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];

const verifyWebhook = (req, res, next) => {
    if (config.server.webhookSecret) {
        // Example: Check a custom header or query parameter
        // const providedSecret = req.headers['x-webhook-secret'] || req.query.secret;
        // if (providedSecret !== config.server.webhookSecret) {
        //     logger.warn('Webhook verification failed: Invalid secret.');
        //     return res.status(403).send('Forbidden: Invalid secret.');
        // }
        logger.debug('Webhook secret verification bypassed (implement specific check).');
    }
    next();
};


const handleWebhook = async (req, res) => {
    logger.info('Webhook request received.');
    // logger.debug('Webhook Headers:', req.headers);
    // logger.debug('Webhook Body:', req.body);

    if (!req.body || !req.body.message || !req.body.message.data) {
        logger.error('Invalid Pub/Sub message format received.');
        return res.status(400).send('Bad Request: Invalid Pub/Sub message');
    }

    res.status(204).send();
    logger.info('Webhook acknowledged with 204.');

    try {
        const pubsubMessage = req.body.message;
        const dataBuffer = Buffer.from(pubsubMessage.data, 'base64');
        const notificationData = JSON.parse(dataBuffer.toString('utf-8'));
        logger.info('Decoded Pub/Sub Data:', notificationData);

        const { emailAddress: recipientEmail, historyId: currentHistoryId } = notificationData;

        if (!recipientEmail || !currentHistoryId) {
            logger.error('Decoded Pub/Sub data missing emailAddress or historyId.');
            return;
        }

        // --- Core Processing Logic ---
        const lastHistoryId = await stateStorage.getLastHistoryId();
        if (!lastHistoryId) {
            logger.warn(`No previous history ID found. Storing current ID ${currentHistoryId} as baseline.`);
            await stateStorage.saveLastHistoryId(currentHistoryId);
            return;
        }

        // Get new message IDs since last check
        const newMessages = await gmailService.processHistory(lastHistoryId);

        if (newMessages.length === 0) {
            // Still update history ID even if no new messages found in this specific history range
            await stateStorage.saveLastHistoryId(currentHistoryId);
            logger.info(`Processing complete. No new messages to handle. History ID updated to ${currentHistoryId}`);
            return;
        }

        for (const messageInfo of newMessages) {
            try {
                logger.info(`--- Processing Message ID: ${messageInfo.id} ---`);
                const messageData = await gmailService.getMessageDetails(messageInfo.id);
                const payload = messageData.payload;
                const headers = payload.headers;

                const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
                const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
                const subject = subjectHeader?.value || 'No Subject';
                const fromValue = fromHeader?.value || 'Unknown Sender';
                const senderEmail = extractEmailFromHeader(fromValue);

                logger.info(`  Subject: ${subject}`);
                logger.info(`  From: ${fromValue} (Extracted: ${senderEmail || 'N/A'})`);
                logger.info(`  Recipient: ${recipientEmail}`);

                const auth = await googleAuthService.getAuthenticatedClient();
                const gmail = google.gmail({ version: 'v1', auth: auth });

                logger.info(`  Checking for attachments...`);
                const { foundAndSaved, fileFinalName } = await gmailService.findAndSaveAttachments(messageInfo.id, payload, gmail);
                logger.info(`foundsave : ${foundAndSaved}, fileFinalName : ${fileFinalName}`);

                if (senderEmail && foundAndSaved && fileFinalName) {
                    console.log('Chechking with llm!');
                    const fileExtension = path.extname(fileFinalName).toLowerCase();
                    logger.info(`  Attachment extension: ${fileExtension}`);

                    if (!allowedExtensions.includes(fileExtension)) {
                        logger.warn(`  Skipping Meet schedule: File extension ${fileExtension} is not allowed.`);
                        break;
                    }

                    const llmResponse = await checkQualificaion(fileFinalName);
                    logger.info(`  Is Qualified: ${llmResponse}`);
                    if (llmResponse.qualified) {
                        logger.info(`  Attempting to schedule meet...`);
                        await calendarService.scheduleMeet(senderEmail, recipientEmail, subject).then(() => {
                            qualifiedCandidates.push({
                                id: crypto.randomUUID(),
                                name: llmResponse.name,
                                title: llmResponse.currentRole,
                                avatarUrl: '',
                                resumeDetails: `**Summary:** ${llmResponse.summary} \n\n**Experience:**${llmResponse.experience.map((exp) => `\n*   ${exp}`)}\n\n**Skills:** ${llmResponse.skills}`,
                            })
                        }).catch((error) => {
                            logger.error('Error scheduling meet:', error);
                        });
                        console.log(qualifiedCandidates);
                    }
                } else {
                    logger.warn("  Skipping Meet schedule: sender email could not be extracted.");
                }

            } catch (msgProcessingError) {
                logger.error(`Error processing message ${messageInfo.id}:`, msgProcessingError);
            }
            logger.info(`--- Finished Message ID: ${messageInfo.id} ---`);
        }

        await stateStorage.saveLastHistoryId(currentHistoryId);
        logger.info(`Batch processing complete. History ID updated to ${currentHistoryId}`);

    } catch (error) {
        logger.error('Error processing webhook notification batch:', error);
    }
};


module.exports = { handleWebhook, verifyWebhook };