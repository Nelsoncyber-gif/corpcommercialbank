const pool = require('../config/db');

// ============== GET ALL USERS =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role,
              address, city, state, zip_code, country,
              date_of_birth, occupation, tax_id,
              next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
              profile_picture, created_at
       FROM users`
    );

    res.json({
      success: true,
      users: users.rows
    });

  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: err.message
    });
  }
};

// ============== GET ALL TRANSACTIONS =================
exports.getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      transactions: result.rows
    });

  } catch (err) {
    console.error('Get all transactions error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions",
      error: err.message
    });
  }
};

// ============== GET USER ACCOUNTS (ADMIN ONLY) =================
exports.getUserAccounts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const accounts = await pool.query(
      "SELECT id, account_number, balance, status, created_at, user_id FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    res.json({
      success: true,
      accounts: accounts.rows
    });

  } catch (err) {
    console.error('Get user accounts error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user accounts",
      error: err.message
    });
  }
};

// ============== FREEZE ACCOUNT =================
exports.freezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required"
      });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'frozen' WHERE id = $1 RETURNING *",
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    res.json({
      success: true,
      message: "Account frozen successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Freeze account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to freeze account",
      error: err.message
    });
  }
};

// ============== UNFREEZE ACCOUNT =================
exports.unfreezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "Account ID is required"
      });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'active' WHERE id = $1 RETURNING *",
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    res.json({
      success: true,
      message: "Account reactivated successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Unfreeze account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to unfreeze account",
      error: err.message
    });
  }
};

// ============== CHECK ACCOUNT STATUS =================
exports.checkAccountStatus = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await pool.query(
      "SELECT id, account_number, balance, status FROM accounts WHERE id = $1",
      [accountId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const acc = account.rows[0];

    res.json({
      success: true,
      account: acc
    });

  } catch (err) {
    console.error('Check account status error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to check account status",
      error: err.message
    });
  }
};

// ============== DELETE USER (ADMIN ONLY) =================
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Prevent admin from deleting themselves
    if (userId == req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get user's accounts
      const userAccounts = await client.query(
        "SELECT id FROM accounts WHERE user_id = $1",
        [userId]
      );

      const accountIds = userAccounts.rows.map(acc => acc.id);

      // Delete transactions associated with user's accounts
      if (accountIds.length > 0) {
        await client.query(
          "DELETE FROM transactions WHERE account_id = ANY($1::int[])",
          [accountIds]
        );
      }

      // Delete user's accounts
      await client.query(
        "DELETE FROM accounts WHERE user_id = $1",
        [userId]
      );

      // Delete the user
      const result = await client.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [userId]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "User and all associated data deleted successfully"
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: err.message
    });
  }
};