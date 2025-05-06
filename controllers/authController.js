// controllers/authController.js
const googleAuthService = require('../services/googleAuthService');
const gmailService = require('../services/gmailService');
const logger = require('../utils/logger');
const stateStorage = require('../storage/stateStorage');
const { clearState } = require('../storage/stateStorage');
const config = require('../config/config');

const getAuth = (req, res) => {
    try {
        const authUrl = googleAuthService.generateAuthUrl();
        logger.info('Redirecting user to Google for authentication.');
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Error generating auth URL:', error);
        res.status(500).send('Failed to initiate authentication.');
    }
};

const handleCallback = async (req, res) => {
    const code = req.query.code;
    if (!code) {
        logger.warn('Authorization code missing in callback.');
        return res.status(400).send('Authorization code missing.');
    }
    logger.info('Received authorization code from Google.');

    try {
        await googleAuthService.exchangeCodeForTokens(code);
        logger.info('Tokens exchanged successfully.');

        await gmailService.setupWatch();
        logger.info('Initial Gmail watch setup initiated successfully after auth.');

        res.redirect('http://localhost:5173/');

    } catch (error) {
        logger.error('Error during OAuth callback or initial watch setup:', error);
        res.status(500).send(`Authentication or Watch Setup Failed: ${error.message}`);
    }
};

const getStatus = async (req, res) => {
    try {
        const authenticated = await googleAuthService.isAuthenticated();
        let watchStatus = 'Inactive';
        let expiryInfo = 'N/A';
        let historyId = 'N/A';

        if (authenticated) {
            const watchExpiry = await stateStorage.getWatchExpiry();
            historyId = await stateStorage.getLastHistoryId() || 'N/A';
            if (watchExpiry && watchExpiry > new Date()) {
                watchStatus = 'Active';
                expiryInfo = watchExpiry.toISOString();
            } else if (watchExpiry) {
                watchStatus = 'Expired';
                expiryInfo = watchExpiry.toISOString();
            }
        }

        // res.send(`<html><body>
        //     <h1>Gmail Notifier Status</h1>
        //     <p>Authentication Status: ${authenticated ? 'Authenticated' : 'Not Authenticated'}</p>
        //     <p>Watch Status: ${watchStatus}</p>
        //     <p>Watch Expires: ${expiryInfo}</p>
        //     <p>Last Known History ID: ${historyId}</p>
        //     ${!authenticated ? '<p><a href="/auth">Authenticate with Google</a></p>' : '<p>(App is authenticated. Ready for notifications)</p>'}
        //     <p>Webhook Endpoint: /webhook (POST)</p>
        //  </body></html>`);

        res.json({
            authenticated: authenticated,
            watchStatus: watchStatus,
            expiryInfo: expiryInfo,
            historyId: historyId,
        });
    } catch (error) {
        logger.error('Error getting application status:', error);
        res.status(500).send('Error retrieving status.');
    }
}

async function clearLocalCredentialsAndState() {
    const tokenPath = config.storage.tokenPath;
    const statePath = config.storage.statePath;
    let tokenDeleted = false;
    let stateDeleted = false;

    try {
        await fs.unlink(tokenPath);
        logger.info(`Token file ${tokenPath} deleted successfully.`);
        tokenDeleted = true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn(`Token file ${tokenPath} not found, likely already deleted.`);
        } else {
            logger.error(`Error deleting token file ${tokenPath}:`, error);
        }
    }

    try {
        await fs.unlink(statePath);
        logger.info(`State file ${statePath} deleted successfully.`);
        stateDeleted = true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn(`State file ${statePath} not found, likely already deleted.`);
        } else {
            logger.error(`Error deleting state file ${statePath}:`, error);
        }
    }

    const success = tokenDeleted && stateDeleted;
    if (!success) {
        logger.error("Failed to completely clear local credentials and state. Check previous errors.");
    }
    return success;
}

const logout = async (req, res) => {
    logger.info('Logout process started.');
    try {
        await googleAuthService.revokeToken();

        const cleanupSuccess = await clearLocalCredentialsAndState();

        if (!cleanupSuccess) {
            logger.warn('Local credential/state cleanup may not have been fully successful.');
        }

        logger.info('User logout process completed (local state cleared, token revocation attempted).');

        res.status(200).json({ message: 'Logout successful' });

    } catch (error) {
        logger.error('Error during logout process:', error);
        res.status(500).send(`Logout failed: ${error.message || 'Internal server error.'}`);
    }
};

module.exports = { getAuth, handleCallback, getStatus, clearLocalCredentialsAndState, logout };