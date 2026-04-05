const express = require('express');
const router = express.Router();
const { reportIncident, getIncidents, applyPatch, clearAllIncidents } = require('../controllers/incidentController');

// Map the HTTP verbs to our controller functions
router.route('/')
    .post(reportIncident)
    .get(getIncidents)
    .delete(clearAllIncidents);

router.route('/:id/patch')
    .post(applyPatch);

module.exports = router;
