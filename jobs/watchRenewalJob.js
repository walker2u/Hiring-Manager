const cron = require('node-cron');
const logger = require('../utils/logger');
const stateStorage = require('../storage/stateStorage');
const gmailService = require('../services/gmailService');
const googleAuthService = require('../services/googleAuthService');

const RENEWAL_SCHEDULE = '0 */12 * * *'; //every 12 hours for testing
const RENEWAL_THRESHOLD_HOURS = 24; //renew if expiry is within this many hours

async function renewGmailWatch() {
    logger.info('Running scheduled Gmail watch renewal check...');

    try {
        const isAuthenticated = await googleAuthService.isAuthenticated();
        if (!isAuthenticated) {
            logger.warn('Watch renewal skipped: Application is not authenticated.');
            return;
        }

        const watchExpiry = await stateStorage.getWatchExpiry();
        const now = new Date();
        const thresholdDate = new Date(now.getTime() + RENEWAL_THRESHOLD_HOURS * 60 * 60 * 1000);

        if (!watchExpiry) {
            logger.info('No existing watch expiry found. Attempting to establish initial watch.');
            await gmailService.setupWatch();
        } else if (watchExpiry <= thresholdDate) {
            logger.info(`Watch expiry (${watchExpiry.toISOString()}) is within threshold (${RENEWAL_THRESHOLD_HOURS} hours). Attempting renewal.`);
            await gmailService.setupWatch();
        } else {
            logger.info(`Watch expiry (${watchExpiry.toISOString()}) is not within renewal threshold. No action needed.`);
        }
    } catch (error) {
        logger.error('Error during scheduled watch renewal/check:', error);
    }
}

function scheduleWatchRenewal() {
    if (!cron.validate(RENEWAL_SCHEDULE)) {
        logger.error(`Invalid cron schedule: ${RENEWAL_SCHEDULE}. Watch renewal job not scheduled.`);
        return;
    }
    logger.info(`Scheduling Gmail watch renewal job with schedule: ${RENEWAL_SCHEDULE}`);
    cron.schedule(RENEWAL_SCHEDULE, renewGmailWatch, {
        scheduled: true,
    });

    setTimeout(() => {
        logger.info('Running initial watch renewal check on startup...');
        renewGmailWatch();
    }, 30 * 1000);
}

module.exports = { scheduleWatchRenewal };