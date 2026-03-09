const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  setPIN,
  verifyPIN,
  forgotPassword,
  resetPassword,
  checkPINStatus
} = require('../controllers/otpController');
const { protect } = require('../middleware/auth');

// ==================== OTP ROUTES ====================

/**
 * Send OTP to user's email
 * @route POST /api/otp/send
 * @body {string} email - Required
 */
router.post('/send', sendOTP);

/**
 * Verify OTP code
 * @route POST /api/otp/verify
 * @body {string} email - Required
 * @body {string} otp - Required
 */
router.post('/verify', verifyOTP);

// ==================== PIN ROUTES ====================

/**
 * Set transaction PIN
 * @route POST /api/otp/set-pin
 * @access Protected
 * @body {string} pin - Required (6 digits)
 * @body {string} currentPassword - Required
 */
router.post('/set-pin', protect, setPIN);

/**
 * Verify transaction PIN
 * @route POST /api/otp/verify-pin
 * @access Protected
 * @body {string} pin - Required
 */
router.post('/verify-pin', protect, verifyPIN);

/**
 * Check if user has set a PIN
 * @route GET /api/otp/check-pin
 * @access Protected
 */
router.get('/check-pin', protect, checkPINStatus);

// ==================== PASSWORD RESET ROUTES ====================

/**
 * Request password reset (forgot password)
 * @route POST /api/otp/forgot-password
 * @body {string} email - Required
 */
router.post('/forgot-password', forgotPassword);

/**
 * Reset password with token
 * @route POST /api/otp/reset-password
 * @body {string} token - Required
 * @body {string} newPassword - Required
 */
router.post('/reset-password', resetPassword);

// ==================== TEST ROUTE ====================

router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'OTP routes are alive',
    status: 'ok'
  });
});

module.exports = router;
