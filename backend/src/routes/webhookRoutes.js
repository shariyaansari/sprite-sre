const express = require('express');
const router = express.Router();
const { processGithubWebhook } = require('../controllers/webhookController');

// GitHub will POST here
router.route('/github')
    .post(processGithubWebhook);

module.exports = router;
