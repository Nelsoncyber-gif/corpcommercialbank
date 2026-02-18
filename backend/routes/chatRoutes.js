const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');

// Get chat history for a specific user (Admin only)
router.get('/chat-history/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await pool.query(
      `SELECT cm.*, u.first_name, u.last_name 
       FROM chat_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.user_id = $1 
       ORDER BY cm.created_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      messages: messages.rows
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history'
    });
  }
});

module.exports = router;