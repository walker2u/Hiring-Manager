const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

const STATE_PATH = config.storage.statePath;

async function loadState() {
    try {
        logger.debug(`Attempting to load state from ${STATE_PATH}`);
        try {
            await fs.access(STATE_PATH);
        } catch (accessError) {
            logger.warn(`State file ${STATE_PATH} not found or not accessible. Initializing empty state.`);
            return { lastHistoryId: null, watchExpiry: null };
        }

        const content = await fs.readFile(STATE_PATH);
        logger.debug('State loaded successfully.');
        return JSON.parse(content);
    } catch (error) {
        logger.error(`Error loading state from ${STATE_PATH}:`, error);
        return { lastHistoryId: null, watchExpiry: null };
    }
}

async function saveState(state) {
    if (typeof state !== 'object' || state === null || typeof state.lastHistoryId === 'undefined') {
        logger.error('Attempted to save invalid state:', state);
        return;
    }
    try {
        logger.info(`Saving state to ${STATE_PATH}:`, state);
        await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
        const data = JSON.stringify(state, null, 2);
        await fs.writeFile(STATE_PATH, data);
        logger.info('State saved successfully.');
    } catch (error) {
        logger.error(`Error saving state to ${STATE_PATH}:`, error);
    }
}

async function clearState() {
    try {
        await fs.unlink(STATE_PATH);
        logger.info(`State file ${STATE_PATH} deleted successfully.`);
    } catch (error) {
        logger.error(`Error deleting state file ${STATE_PATH}:`, error);
    }
}

async function getLastHistoryId() {
    const state = await loadState();
    return state.lastHistoryId;
}

async function saveLastHistoryId(historyId) {
    const state = await loadState();
    state.lastHistoryId = historyId;
    await saveState(state);
}

async function getWatchExpiry() {
    const state = await loadState();
    return state.watchExpiry ? new Date(state.watchExpiry) : null;
}

async function saveWatchState(historyId, expiration) {
    const state = await loadState();
    state.lastHistoryId = historyId;
    state.watchExpiry = expiration ? new Date(parseInt(expiration, 10)).toISOString() : null;
    await saveState(state);
}


module.exports = {
    saveState,
    loadState,
    getLastHistoryId,
    saveLastHistoryId,
    getWatchExpiry,
    saveWatchState,
    clearState
};