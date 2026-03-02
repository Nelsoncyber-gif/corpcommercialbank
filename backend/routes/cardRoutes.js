const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requestCard,
  getMyRequests,
  getMyCards,
  getCardDetails
} = require('../controllers/cardController');

// Request a new card
router.post('/request', protect, requestCard);

// Get user's card requests
router.get('/requests', protect, getMyRequests);

// Get user's cards
router.get('/my-cards', protect, getMyCards);

// Get card details
router.get('/:cardId', protect, getCardDetails);

module.exports = router;
