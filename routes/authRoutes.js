const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.get('/auth', authController.getAuth);
router.get('/oauth2callback', authController.handleCallback);

module.exports = router;