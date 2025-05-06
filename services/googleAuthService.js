const { OAuth2Client } = require('google-auth-library');
const config = require('../config/config');
const tokenStorage = require('../storage/tokenStorage');
const logger = require('../utils/logger');

const oAuth2Client = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
);

function generateAuthUrl() {
    logger.info('Generating Google Auth URL');
    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.google.scopes,
        prompt: 'consent',
    });
}

async function exchangeCodeForTokens(code) {
    try {
        logger.info('Exchanging authorization code for tokens');
        const { tokens } = await oAuth2Client.getToken(code);
        logger.info('Tokens acquired');

        if (tokens.refresh_token) {
            logger.info('Obtained new refresh token.');
            await tokenStorage.saveRefreshToken(tokens.refresh_token);
        } else {
            logger.warn('Refresh token not explicitly returned in this exchange.');
        }

        oAuth2Client.setCredentials(tokens);
        return tokens;
    } catch (error) {
        logger.error('Error exchanging code for tokens:', error.response?.data || error.message);
        throw new Error('Failed to exchange code for tokens.');
    }
}

async function getAuthenticatedClient() {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
        logger.warn('No refresh token found in storage.');
        throw new Error('Application not authenticated. Refresh token missing.');
    }

    const client = new OAuth2Client(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
    );
    client.setCredentials({ refresh_token: refreshToken });
    logger.debug('Authenticated Google API client created.');
    return client;
}

async function isAuthenticated() {
    const refreshToken = await tokenStorage.getRefreshToken();
    return !!refreshToken;
}

async function revokeToken() {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
        logger.warn('No refresh token found to revoke.');
        return;
    }

    const client = new OAuth2Client(
        config.google.clientId,
        config.google.clientSecret
    );

    try {
        logger.info('Attempting to revoke Google token...');
        const response = await client.revokeToken(refreshToken);
        if (response.status === 200) {
            logger.info('Google token revoked successfully.');
        } else {
            logger.warn(`Google token revocation might have failed. Status: ${response.status}`, response.data);
        }
    } catch (error) {
        logger.error('Error revoking Google token:', error.response?.data || error.message);
    }
}

module.exports = {
    generateAuthUrl,
    exchangeCodeForTokens,
    getAuthenticatedClient,
    isAuthenticated,
    revokeToken
};