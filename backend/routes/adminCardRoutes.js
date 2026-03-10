const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const cardController = require('../controllers/cardController');

// All routes are protected and admin-only
router.get('/requests', protect, adminOnly, cardController.getAllCardRequests);
router.post('/requests/approve', protect, adminOnly, cardController.approveCardRequest);
router.post('/requests/reject', protect, adminOnly, cardController.rejectCardRequest);

module.exports = router;
