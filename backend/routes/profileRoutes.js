const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

router.get('/me', protect, profileController.getProfile);
router.put('/update/:userId', protect, adminOnly, profileController.updateProfile);
router.post('/set-pin', protect, profileController.setTransactionPIN);
router.post('/verify-pin', protect, profileController.verifyPIN);
router.post('/upload-picture/:userId', protect, profileController.uploadProfilePicture);

module.exports = router;