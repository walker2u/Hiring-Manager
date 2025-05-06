const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

const TOKEN_PATH = config.storage.tokenPath;

async function saveRefreshToken(token) {
    try {
        logger.info(`Saving refresh token to ${TOKEN_PATH}`);
        await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
        const data = JSON.stringify({ refresh_token: token });
        await fs.writeFile(TOKEN_PATH, data);
        logger.info('Refresh token saved successfully.');
    } catch (error) {
        logger.error(`Error saving refresh token to ${TOKEN_PATH}:`, error);
        throw new Error('Failed to save refresh token.');
    }
}

async function getRefreshToken() {
    try {
        logger.debug(`Attempting to read refresh token from ${TOKEN_PATH}`);
        try {
            await fs.access(TOKEN_PATH);
        } catch (accessError) {
            logger.warn(`Token file ${TOKEN_PATH} not found or not accessible.`);
            return null;
        }

        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        logger.debug('Refresh token retrieved successfully.');
        return credentials.refresh_token;
    } catch (error) {
        logger.error(`Error reading refresh token from ${TOKEN_PATH}:`, error);
        return null;
    }
}

module.exports = { saveRefreshToken, getRefreshToken };