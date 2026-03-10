const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ==================== AUTH CONTROLLERS ====================

// Register - no OTP verification required
exports.register = async (req, res) => {
  console.log('🔵 Register endpoint called');
  console.log('Request body:', req.body);

  const {
    first_name,
    last_name,
    email,
    password,
    phone,
    address,
    city,
    state,
    zip,
    country,
    dob,
    occupation,
    taxId,
    nextOfKinName,
    nextOfKinPhone,
    nextOfKinRelation,
    profilePicture
  } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      success: false,
      message: "Required fields: first name, last name, email, password"
    });
  }

  try {
    console.log('📊 Checking if email exists:', email);

    // Check if user already exists
    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('❌ Email already registered:', email);
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    console.log('💾 Creating user in database...');
    // Create user with all fields (no OTP)
    const result = await pool.query(
      `INSERT INTO users(
        first_name, last_name, email, password, phone,
        address, city, state, zip_code, country,
        date_of_birth, occupation, tax_id,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
        profile_picture, is_verified
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, first_name, last_name, email, phone`,
      [
        first_name, last_name, email, hashed, phone,
        address, city, state, zip, country,
        dob, occupation, taxId,
        nextOfKinName, nextOfKinPhone, nextOfKinRelation,
        profilePicture, true
      ]
    );

    const newUser = result.rows[0];
    console.log('✅ User created:', newUser.id);

    console.log('✅ Registration successful for:', email);

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now login.',
      userId: newUser.id,
      email: newUser.email,
      requiresVerification: false
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Registration failed. Please try again."
    });
  }
};

// Login - no verification check required
exports.login = async (req, res) => {
  console.log('🔵 Login endpoint called');

  const { email, password } = req.body;

  console.log('Login attempt:', { email, password: '***' });

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required"
    });
  }

  try {
    console.log('📊 Finding user:', email);

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];
    console.log('🔐 Comparing password...');

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);

    // Remove password from user object
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: 'Server error during login'
    });
  }
};

// Get user profile
exports.profile = async (req, res) => {
  try {
    console.log('🔵 Profile endpoint called for user:', req.user.id);

    const user = await pool.query(
      "SELECT id, first_name, last_name, email, phone, role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });

  } catch (err) {
    console.error('❌ Profile error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required"
      });
    }

    let query, params;
    if (phone !== undefined && phone !== null) {
      query = "UPDATE users SET first_name=$1, last_name=$2, phone=$3 WHERE id=$4";
      params = [first_name, last_name, phone, userId];
    } else {
      query = "UPDATE users SET first_name=$1, last_name=$2 WHERE id=$3";
      params = [first_name, last_name, userId];
    }

    await pool.query(query, params);

    res.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    console.log('🔵 Logout endpoint called for user:', req.user.id);

    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both old and new passwords are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const user = await pool.query(
      "SELECT password FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const valid = await bcrypt.compare(oldPassword, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Old password incorrect"
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE id=$2",
      [hashed, userId]
    );

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = exports;
