const pool = require('../config/db');
const crypto = require('crypto');

// Encryption key (in production, use environment variable)
// Must be exactly 32 characters for aes-256-cbc
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || 'your-32-char-secret-key-here1234';
const ALGORITHM = 'aes-256-cbc';

// Encrypt card data
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt card data
function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Generate card number
function generateCardNumber() {
  // Generate 15 random digits, starting with 4 (Visa)
  let cardNumber = '4';
  for (let i = 0; i < 14; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }

  // Luhn algorithm for check digit
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cardNumber[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return cardNumber + checkDigit;
}

// Generate CVV
function generateCVV() {
  return Math.floor(100 + Math.random() * 9000).toString();
}

// Generate expiry date (MM/YY format, 5 years from now)
function generateExpiryDate() {
  const now = new Date();
  const year = now.getFullYear() + 5;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${month}/${String(year).slice(-2)}`;
}

// Request card
exports.requestCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardType = 'Visa' } = req.body;

    // Check if user already has pending request
    const existingRequest = await pool.query(
      'SELECT * FROM card_requests WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending card request' });
    }

    // Create request
    await pool.query(
      'INSERT INTO card_requests (user_id, card_type, status) VALUES ($1, $2, $3)',
      [userId, cardType, 'pending']
    );

    res.json({ success: true, message: 'Card request submitted successfully' });
  } catch (error) {
    console.error('Request card error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit card request' });
  }
};

// Approve card request and generate card (Admin only)
exports.approveCardRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const adminId = req.user.id;

    // Get the card request
    const requestResult = await pool.query(
      'SELECT * FROM card_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card request not found' });
    }

    const cardRequest = requestResult.rows[0];

    if (cardRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Card request is not pending' });
    }

    // Get user details for card holder name
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [cardRequest.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    const cardHolderName = `${user.first_name} ${user.last_name}`.toUpperCase();

    // Generate card details
    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiryDate = generateExpiryDate();

    // Encrypt sensitive data
    const encryptedCardNumber = encrypt(cardNumber);
    const encryptedCVV = encrypt(cvv);

    // Create the actual card
    const cardResult = await pool.query(
      `INSERT INTO cards (
        user_id, 
        card_number, 
        card_holder_name, 
        expiry_date, 
        cvv, 
        card_type, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        cardRequest.user_id,
        encryptedCardNumber,
        cardHolderName,
        expiryDate,
        encryptedCVV,
        cardRequest.card_type,
        'active'
      ]
    );

    // Update card request status
    await pool.query(
      `UPDATE card_requests 
       SET status = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3`,
      ['approved', adminId, requestId]
    );

    // Return card without encrypted data
    const newCard = cardResult.rows[0];
    res.json({
      success: true,
      message: 'Card approved and generated successfully',
      card: {
        id: newCard.id,
        card_holder_name: newCard.card_holder_name,
        expiry_date: newCard.expiry_date,
        card_type: newCard.card_type,
        status: newCard.status,
        last_four: cardNumber.slice(-4) // Show only last 4 digits
      }
    });

  } catch (error) {
    console.error('Approve card error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve card request' });
  }
};

// Get user's card requests
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM card_requests WHERE user_id = $1 ORDER BY requested_at DESC',
      [userId]
    );

    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};

// Get user's cards
exports.getMyCards = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🃏 Fetching cards for user:', userId);

    const result = await pool.query(
      'SELECT id, card_holder_name, expiry_date, card_type, status, balance, daily_limit, created_at, card_number FROM cards WHERE user_id = $1',
      [userId]
    );

    console.log('🃏 Raw cards from DB:', result.rows.length);

    // Map cards to include last_four from encrypted card number
    const cards = result.rows.map((card, index) => {
      let last_four = '0000';
      let cardNumberVisible = '****';
      try {
        // Decrypt card number to get last 4 digits
        const decryptedCardNumber = decrypt(card.card_number);
        console.log('🃏 Decrypted card number:', decryptedCardNumber);
        last_four = decryptedCardNumber.slice(-4);
        cardNumberVisible = decryptedCardNumber; // Store full visible number
        console.log(`🃏 Card ${index + 1} decrypted successfully, last_four: ${last_four}`);
      } catch (err) {
        console.error(`❌ Error decrypting card ${index + 1}:`, err.message);
        console.error('🃏 Encrypted card_number:', card.card_number?.substring(0, 50) + '...');
      }

      return {
        ...card,
        last_four,
        cardNumberVisible
      };
    });

    console.log('🃏 Sending cards:', cards);
    res.json({ success: true, cards });
  } catch (error) {
    console.error('❌ Get cards error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cards' });
  }
};

// Get card details (with sensitive data)
exports.getCardDetails = async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM cards WHERE id = $1 AND user_id = $2',
      [cardId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const card = result.rows[0];

    // Decrypt sensitive data
    try {
      card.card_number = decrypt(card.card_number);
      card.cvv = decrypt(card.cvv);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error decrypting card data' 
      });
    }

    // Remove any sensitive fields you don't want to send
    delete card.user_id; // Optional: remove user_id if not needed

    res.json({ success: true, card });
  } catch (error) {
    console.error('Get card details error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch card details' 
    });
  }
};

// ==================== ADMIN: GET ALL CARD REQUESTS ====================
exports.getAllCardRequests = async (req, res) => {
  try {
    // Only admin can access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    const result = await pool.query(
      `SELECT cr.*, u.first_name, u.last_name, u.email, u.phone 
       FROM card_requests cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.status = 'pending'
       ORDER BY cr.requested_at DESC`
    );

    res.json({ 
      success: true, 
      requests: result.rows 
    });
  } catch (error) {
    console.error('Get all card requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch card requests' 
    });
  }
};

// ==================== ADMIN: APPROVE CARD REQUEST ====================
exports.approveCardRequest = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { requestId } = req.body;
    const adminId = req.user.id;

    // Validate input
    const parsedRequestId = parseInt(requestId);
    if (isNaN(parsedRequestId) || parsedRequestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid request ID is required"
      });
    }

    await client.query('BEGIN');

    // Get the pending card request
    const requestResult = await client.query(
      `SELECT cr.*, u.first_name, u.last_name, u.email 
       FROM card_requests cr
       JOIN users u ON cr.user_id = u.id
       WHERE cr.id = $1 AND cr.status = 'pending'`,
      [parsedRequestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Pending card request not found"
      });
    }

    const request = requestResult.rows[0];

    // Generate card details
    const cardNumber = generateCardNumber();
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const expiryMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const expiryYear = (new Date().getFullYear() + 3).toString().slice(-2);
    const expiryDate = `${expiryMonth}/${expiryYear}`;
    
    // Card holder name (format: FIRST_NAME LAST_NAME)
    const cardHolderName = `${request.first_name} ${request.last_name}`.toUpperCase();

    // Check if user already has a card
    const existingCard = await client.query(
      'SELECT id FROM cards WHERE user_id = $1',
      [request.user_id]
    );

    if (existingCard.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "User already has a card"
      });
    }

    // Create the actual card with encrypted data
    await client.query(
      `INSERT INTO cards 
       (user_id, card_number, card_holder_name, expiry_date, cvv, card_type, status, daily_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        request.user_id,
        encrypt(cardNumber),      // Encrypt card number
        cardHolderName,
        expiryDate,
        encrypt(cvv),             // Encrypt CVV
        request.card_type,
        'active',
        1000.00                   // Default daily limit
      ]
    );

    // Update request status
    await client.query(
      `UPDATE card_requests 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2`,
      [adminId, parsedRequestId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Card request approved successfully',
      card: {
        cardNumber: cardNumber.slice(-4), // Return only last 4 digits
        cardHolderName,
        expiryDate,
        type: request.card_type
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve card request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve card request' 
    });
  } finally {
    client.release();
  }
};

// ==================== ADMIN: REJECT CARD REQUEST ====================
exports.rejectCardRequest = async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    const adminId = req.user.id;

    const parsedRequestId = parseInt(requestId);
    if (isNaN(parsedRequestId) || parsedRequestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid request ID is required"
      });
    }

    const result = await pool.query(
      `UPDATE card_requests 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [adminId, reason || 'Request rejected', parsedRequestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending card request not found"
      });
    }

    res.json({
      success: true,
      message: 'Card request rejected'
    });

  } catch (error) {
    console.error('Reject card request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject card request' 
    });
  }
};

// ==================== GET USER CARDS (WITH STATUS) ====================
exports.getMyCards = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active cards
    const cardsResult = await pool.query(
      `SELECT id, card_holder_name, expiry_date, card_type, status, 
              balance, daily_limit, created_at 
       FROM cards 
       WHERE user_id = $1`,
      [userId]
    );

    // Get pending requests
    const pendingResult = await pool.query(
      `SELECT id, card_type, status, requested_at 
       FROM card_requests 
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY requested_at DESC`,
      [userId]
    );

    // Get rejected requests
    const rejectedResult = await pool.query(
      `SELECT id, card_type, status, requested_at, review_notes 
       FROM card_requests 
       WHERE user_id = $1 AND status = 'rejected'
       ORDER BY requested_at DESC`,
      [userId]
    );

    res.json({ 
      success: true, 
      cards: cardsResult.rows,
      pendingRequests: pendingResult.rows,
      rejectedRequests: rejectedResult.rows
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cards' 
    });
  }
};
