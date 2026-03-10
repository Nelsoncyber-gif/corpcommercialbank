const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  requestCard,
  getMyRequests,
  getMyCards,
  getCardDetails,
  approveCardRequest,
  getAllCardRequests,
  rejectCardRequest
} = require('../controllers/cardController');

// User Routes
router.post('/request', protect, requestCard);
router.get('/requests', protect, getMyRequests);
router.get('/my-cards', protect, getMyCards);
router.get('/:cardId', protect, getCardDetails);

// Admin Routes
router.get('/admin/all-requests', protect, adminOnly, getAllCardRequests);
router.post('/admin/approve', protect, adminOnly, approveCardRequest);
router.post('/admin/reject', protect, adminOnly, rejectCardRequest);

module.exports = router;
