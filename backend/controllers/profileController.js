const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, address, city, state, zip_code, country,
              phone, tax_id, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
              occupation, date_of_birth, profile_picture, role, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// ============== FIXED: Renamed to adminUpdateProfile =================
// Update user profile (Admin only) - RENAMED to avoid conflict
exports.adminUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      first_name, last_name, email, address, city, state, zip_code, country,
      phone, tax_id, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
      occupation, date_of_birth, profile_picture
    } = req.body;

    // Only admin can update profiles
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can edit profiles' });
    }

    const result = await pool.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        address = COALESCE($4, address),
        city = COALESCE($5, city),
        state = COALESCE($6, state),
        zip_code = COALESCE($7, zip_code),
        country = COALESCE($8, country),
        phone = COALESCE($9, phone),
        tax_id = COALESCE($10, tax_id),
        next_of_kin_name = COALESCE($11, next_of_kin_name),
        next_of_kin_phone = COALESCE($12, next_of_kin_phone),
        next_of_kin_relationship = COALESCE($13, next_of_kin_relationship),
        occupation = COALESCE($14, occupation),
        date_of_birth = COALESCE($15, date_of_birth),
        profile_picture = COALESCE($16, profile_picture)
       WHERE id = $17
       RETURNING id, first_name, last_name, email, phone, address, profile_picture`,
      [first_name, last_name, email, address, city, state, zip_code, country,
       phone, tax_id, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
       occupation, date_of_birth, profile_picture, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Admin update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// Set/Update transaction PIN
exports.setTransactionPIN = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin, currentPassword } = req.body;

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 6 digits' });
    }

    // Verify current password
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Hash the PIN
    const hashedPIN = await bcrypt.hash(pin, 10);

    // Update PIN
    await pool.query('UPDATE users SET transaction_pin = $1 WHERE id = $2', [hashedPIN, userId]);

    res.json({ success: true, message: 'Transaction PIN set successfully' });
  } catch (error) {
    console.error('Set PIN error:', error);
    res.status(500).json({ success: false, message: 'Failed to set PIN' });
  }
};

// Verify transaction PIN
exports.verifyPIN = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    const result = await pool.query('SELECT transaction_pin FROM users WHERE id = $1', [userId]);
    
    if (!result.rows[0].transaction_pin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set' });
    }

    const isValidPIN = await bcrypt.compare(pin, result.rows[0].transaction_pin);
    
    if (!isValidPIN) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    res.json({ success: true, message: 'PIN verified' });
  } catch (error) {
    console.error('Verify PIN error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify PIN' });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageData } = req.body; // Base64 image data

    // Only admin can change profile pictures
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Validate image data (basic check)
    if (!imageData || !imageData.startsWith('data:image')) {
      return res.status(400).json({ success: false, message: 'Invalid image data' });
    }

    // Check size (5MB limit = ~6.7MB base64)
    if (imageData.length > 7000000) {
      return res.status(400).json({ success: false, message: 'Image too large (max 5MB)' });
    }

    await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [imageData, userId]);

    res.json({ success: true, message: 'Profile picture uploaded successfully', imageUrl: imageData });
  } catch (error) {
    console.error('Upload picture error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload picture' });
  }
};

module.exports = exports;