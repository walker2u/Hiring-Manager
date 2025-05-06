const express = require('express');
const webhookController = require('../controllers/webhookController');
const router = express.Router();

// router.post('/webhook', webhookController.verifyWebhook, webhookController.handleWebhook);
router.post('/webhook', webhookController.handleWebhook);


module.exports = router;