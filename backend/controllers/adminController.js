const pool = require('../config/db');

// ============== GET ALL USERS =================
exports.getAllUsers = async (req, res) => {
  try {
    // Get all users including admins
    const users = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role,
              address, city, state, zip_code, country,
              date_of_birth, occupation, tax_id,
              next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
              profile_picture, created_at
       FROM users
       ORDER BY created_at DESC`  // ✅ Removed the WHERE clause
    );

    console.log(`📊 Found ${users.rows.length} total users`);
    
    // Optional: Log breakdown by role for debugging
    const adminCount = users.rows.filter(u => u.role === 'admin').length;
    const regularCount = users.rows.length - adminCount;
    console.log(`   - ${regularCount} regular users, ${adminCount} admins`);

    res.json({
      success: true,
      users: users.rows
    });

  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== GET PENDING ACCOUNT APPROVALS =================
// NOTE: This endpoint requires the 'account_approvals' table to exist
// If you don't have this table, either create it or remove this endpoint
exports.getPendingApprovals = async (req, res) => {
  try {
    // Check if table exists first (optional safety check)
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'account_approvals'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        pendingApprovals: [],
        message: "Account approvals table not configured"
      });
    }

    const result = await pool.query(
      `SELECT aa.*, u.first_name, u.last_name, u.email, u.phone
       FROM account_approvals aa
       JOIN users u ON aa.user_id = u.id
       WHERE aa.status = 'pending'
       ORDER BY aa.requested_at DESC`
    );

    res.json({
      success: true,
      pendingApprovals: result.rows
    });

  } catch (err) {
    console.error('Get pending approvals error:', err);
    // Return empty array if table doesn't exist instead of crashing
    res.json({
      success: true,
      pendingApprovals: [],
      message: "Approvals not configured"
    });
  }
};

// ============== APPROVE ACCOUNT =================
exports.approveAccount = async (req, res) => {
  try {
    const { approvalId } = req.body;
    const adminId = req.user?.id;

    // FIX #3: Add input validation
    const parsedApprovalId = parseInt(approvalId);
    if (isNaN(parsedApprovalId) || parsedApprovalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid approval ID is required"
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get the pending approval request
      const approvalResult = await client.query(
        "SELECT * FROM account_approvals WHERE id = $1 AND status = 'pending'",
        [parsedApprovalId]
      );

      if (approvalResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Pending approval request not found"
        });
      }

      const approval = approvalResult.rows[0];

      // Create the actual account
      const accountResult = await client.query(
        `INSERT INTO accounts (user_id, account_number, balance, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [approval.user_id, approval.account_number, 0.00, 'active', approval.requested_at]
      );

      // Update the approval status
      await client.query(
        `UPDATE account_approvals
         SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1, review_notes = $2
         WHERE id = $3`,
        [adminId, 'Account approved', parsedApprovalId]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Account approved successfully",
        account: accountResult.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Approve account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to approve account",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== REJECT ACCOUNT =================
exports.rejectAccount = async (req, res) => {
  try {
    const { approvalId, reason } = req.body;
    const adminId = req.user?.id;

    // FIX #3: Add input validation
    const parsedApprovalId = parseInt(approvalId);
    if (isNaN(parsedApprovalId) || parsedApprovalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid approval ID is required"
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Update the approval status to rejected
    const result = await pool.query(
      `UPDATE account_approvals
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [adminId, reason || 'Account rejected', parsedApprovalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending approval request not found"
      });
    }

    res.json({
      success: true,
      message: "Account request rejected",
      approval: result.rows[0]
    });

  } catch (err) {
    console.error('Reject account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to reject account",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== TOGGLE ACCOUNT STATUS (FREEZE/UNFREEZE) =================
// FIX #1: Changed to accept accountId in params and query by account id
exports.toggleAccountStatus = async (req, res) => {
  try {
    // FIX #1: Get accountId from params (not userId)
    const { accountId } = req.params;
    const adminId = req.user?.id;

    // FIX #3: Add input validation
    const parsedAccountId = parseInt(accountId);
    if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required"
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // FIX #1: Query by account id (not user_id)
    const accountResult = await pool.query(
      "SELECT id, status, user_id FROM accounts WHERE id = $1",
      [parsedAccountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const account = accountResult.rows[0];
    const newStatus = account.status === 'frozen' ? 'active' : 'frozen';

    // Toggle the status
    const updateResult = await pool.query(
      "UPDATE accounts SET status = $1 WHERE id = $2 RETURNING *",
      [newStatus, parsedAccountId]
    );

    res.json({
      success: true,
      message: `Account ${newStatus === 'frozen' ? 'frozen' : 'unfrozen'} successfully`,
      account: updateResult.rows[0]
    });

  } catch (err) {
    console.error('Toggle account status error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle account status",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== GET USER DETAILS WITH ACCOUNT =================
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // FIX #3: Add input validation
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required"
      });
    }

    // Get user details
    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role,
              address, city, state, zip_code, country,
              date_of_birth, occupation, tax_id,
              next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
              profile_picture, created_at
       FROM users
       WHERE id = $1`,
      [parsedUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user's account
    const accountResult = await pool.query(
      "SELECT id, account_number, balance, status, created_at FROM accounts WHERE user_id = $1",
      [parsedUserId]
    );

    // Get user's transactions
    const transactionsResult = await pool.query(
      `SELECT t.* FROM transactions t
       INNER JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [parsedUserId]
    );

    const user = userResult.rows[0];
    const accounts = accountResult.rows;
    const transactions = transactionsResult.rows;

    res.json({
      success: true,
      user: user,
      accounts: accounts,
      transactions: transactions,
      accountCount: accounts.length,
      transactionCount: transactions.length
    });

  } catch (err) {
    console.error('Get user details error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to get user details",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== GET USER ACCOUNTS (ADMIN ONLY) =================
exports.getUserAccounts = async (req, res) => {
  try {
    const { userId } = req.params;

    // FIX #2: Add input validation AND parseInt
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required"
      });
    }

    const accounts = await pool.query(
      "SELECT id, account_number, balance, status, created_at, user_id FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
      [parsedUserId]  // FIX #2: Use parsed integer
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== FREEZE ACCOUNT =================
// FIX #4: Kept for backwards compatibility but recommend using toggleAccountStatus instead
exports.freezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    // FIX #3: Add input validation
    const parsedAccountId = parseInt(accountId);
    if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required"
      });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'frozen' WHERE id = $1 RETURNING *",
      [parsedAccountId]
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== UNFREEZE ACCOUNT =================
// FIX #4: Kept for backwards compatibility but recommend using toggleAccountStatus instead
exports.unfreezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    // FIX #3: Add input validation
    const parsedAccountId = parseInt(accountId);
    if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required"
      });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'active' WHERE id = $1 RETURNING *",
      [parsedAccountId]
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== CHECK ACCOUNT STATUS =================
exports.checkAccountStatus = async (req, res) => {
  try {
    const { accountId } = req.params;

    // FIX #3: Add input validation
    const parsedAccountId = parseInt(accountId);
    if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid account ID is required"
      });
    }

    const account = await pool.query(
      "SELECT id, account_number, balance, status FROM accounts WHERE id = $1",
      [parsedAccountId]
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== DELETE USER (ADMIN ONLY) =================
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const adminId = req.user?.id;

    // FIX #3: Add input validation
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required"
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Prevent admin from deleting themselves
    if (parsedUserId === adminId) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // FIX #4: Simplified - ON DELETE CASCADE handles child records automatically
      // Get user's accounts first (for logging if needed)
      const userAccounts = await client.query(
        "SELECT id FROM accounts WHERE user_id = $1",
        [parsedUserId]
      );

      // Delete the user - CASCADE will handle accounts, transactions, etc.
      const result = await client.query(
        "DELETE FROM users WHERE id = $1 RETURNING *",
        [parsedUserId]
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
        message: "User and all associated data deleted successfully",
        deletedAccounts: userAccounts.rows.length
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============== BACKDATE TRANSACTION (ADMIN ONLY) =================
exports.backdateTransaction = async (req, res) => {
  try {
    const { transactionId, newDate } = req.body;
    const adminId = req.user?.id;

    // FIX #3: Add input validation
    const parsedTransactionId = parseInt(transactionId);
    if (isNaN(parsedTransactionId) || parsedTransactionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid transaction ID is required"
      });
    }

    if (!newDate || isNaN(new Date(newDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid date is required"
      });
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Update the transaction date
    const result = await pool.query(
      `UPDATE transactions 
       SET created_at = $1, backdated_by = $2, original_date = COALESCE(original_date, created_at)
       WHERE id = $3 
       RETURNING *`,
      [new Date(newDate), adminId, parsedTransactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.json({
      success: true,
      message: "Transaction backdated successfully",
      transaction: result.rows[0]
    });

  } catch (err) {
    console.error('Backdate transaction error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to backdate transaction",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};