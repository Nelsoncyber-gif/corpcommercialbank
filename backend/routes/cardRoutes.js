const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  requestCard,
  getMyRequests,
  getMyCards,
  getCardDetails,
  approveCardRequest
} = require('../controllers/cardController');

// Request a new card (User)
router.post('/request', protect, requestCard);

// Get user's card requests (User)
router.get('/requests', protect, getMyRequests);

// Get user's cards (User)
router.get('/my-cards', protect, getMyCards);

// Get card details (User)
router.get('/:cardId', protect, getCardDetails);

// Approve card request (Admin only)
router.post('/approve', protect, adminOnly, approveCardRequest);

module.exports = router;
