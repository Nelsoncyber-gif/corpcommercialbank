const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const { protect, adminOnly } = require('../middleware/auth');

const {
  getAllUsers,
  getAllTransactions,
  freezeAccount,
  unfreezeAccount,
  checkAccountStatus,
  getUserAccounts,
  deleteUser
} = require('../controllers/adminController');



router.get('/users', protect, adminOnly, getAllUsers);

router.get('/user-accounts/:userId', protect, adminOnly, getUserAccounts);


router.get('/transactions', protect, adminOnly, getAllTransactions);

router.get('/status/:accountId', protect, adminOnly, checkAccountStatus);

router.post('/freeze', protect, adminOnly, freezeAccount);

router.post('/unfreeze', protect, adminOnly, unfreezeAccount);

router.delete('/delete-user', protect, adminOnly, deleteUser);

// Backdate transaction
router.post('/backdate-transaction', protect, adminOnly, async (req, res) => {
  try {
    const { transactionId, newDate } = req.body;

    console.log('🔵 Backdate transaction request:', { transactionId, newDate });

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    if (!newDate) {
      return res.status(400).json({
        success: false,
        message: 'New date is required'
      });
    }

    // Validate date format
    const dateObj = new Date(newDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const original = await pool.query(
      'SELECT id, created_at FROM transactions WHERE id = $1',
      [parseInt(transactionId)]
    );

    console.log('📊 Query result:', original.rows);

    if (original.rows.length === 0) {
      // Get all transaction IDs to help debug
      const allTx = await pool.query('SELECT id FROM transactions ORDER BY id DESC LIMIT 10');
      console.log('📋 Recent transactions:', allTx.rows);

      return res.status(404).json({
        success: false,
        message: `Transaction not found. Available transaction IDs: ${allTx.rows.map(t => t.id).join(', ') || 'None'}`
      });
    }

    await pool.query(
      'UPDATE transactions SET created_at = $1, original_date = $2 WHERE id = $3',
      [newDate, original.rows[0].created_at, parseInt(transactionId)]
    );

    console.log('✅ Transaction backdated successfully:', transactionId);

    res.json({
      success: true,
      message: 'Transaction backdated successfully',
      transactionId: parseInt(transactionId),
      newDate: newDate
    });
  } catch (error) {
    console.error('❌ Backdate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backdate transaction',
      error: error.message
    });
  }
});

module.exports = router;
