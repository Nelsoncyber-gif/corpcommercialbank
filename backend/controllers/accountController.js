const pool = require('../config/db');

// ==================== CREATE ACCOUNT ====================
// Create account request - requires admin approval
exports.createAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has an account or pending request
    const existingAccounts = await pool.query(
      'SELECT id FROM accounts WHERE user_id = $1',
      [userId]
    );

    if (existingAccounts.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an account. Each user is limited to one account.'
      });
    }

    // Check for pending approval requests
    const pendingRequest = await pool.query(
      'SELECT id FROM account_approvals WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (pendingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending account request. Please wait for admin approval.'
      });
    }

    // Generate unique account number
    const accountNumber = Math.floor(Math.random() * 9000000000) + 1000000000;

    // Create pending account approval request (account not active yet)
    const result = await pool.query(
      `INSERT INTO account_approvals (user_id, account_number, status, requested_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [userId, accountNumber, 'pending']
    );

    res.json({
      success: true,
      message: 'Account request submitted successfully. Please wait for admin approval.',
      approvalRequest: result.rows[0],
      requiresApproval: true
    });
  } catch (error) {
    console.error('Create account request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit account request'
    });
  }
};

// ==================== GET USER ACCOUNTS ====================
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, account_number, balance, status, created_at FROM accounts WHERE user_id = $1`,
      [userId]
    );

    // Also check for pending account approval requests
    const pendingResult = await pool.query(
      `SELECT id, account_number, status, requested_at FROM account_approvals WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    res.status(200).json({
      success: true,
      accounts: result.rows,
      pendingApprovals: pendingResult.rows,
      hasPendingRequest: pendingResult.rows.length > 0
    });

  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve accounts"
    });
  }
};

// ==================== FIND ACCOUNT BY NUMBER ====================
exports.findAccountByNumber = async (req, res) => {
  try {
    const { accountNumber } = req.query;

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account number is required"
      });
    }

    const result = await pool.query(
      `SELECT a.id, a.account_number, a.balance, a.status, u.id as user_id, u.first_name, u.last_name
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.account_number = $1`,
      [accountNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    res.status(200).json({
      success: true,
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Find account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to find account"
    });
  }
};

// ==================== DEPOSIT ====================
exports.deposit = async (req, res) => {
  try {
    const { accountId, amount } = req.body;
    const userId = req.user.id;

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number"
      });
    }

    const accountResult = await pool.query(
      `SELECT id, account_number, user_id, status FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const account = accountResult.rows[0];

   if (account.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only deposit to your own accounts."
      });
    }

    if (account.status === 'frozen') {
      return res.status(403).json({
        success: false,
        message: "Account is frozen. Contact support for assistance."
      });
    }

    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [parseFloat(amount), accountId]
    );

    // Fix: Use 'type' and provide both sender_account and receiver_account
    await pool.query(
      `INSERT INTO transactions (account_id, type, amount, sender_account, receiver_account, receiver_name, receiver_account_number, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [accountId, 'deposit', parseFloat(amount), account.account_number, account.account_number, 'Self Deposit', account.account_number, 'N/A']
    );

    res.status(200).json({
      success: true,
      message: "Deposit successful"
    });

  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({
      success: false,
      message: "Deposit failed"
    });
  }
};

// ==================== WITHDRAW ====================
exports.withdraw = async (req, res) => {
  try {
    const { accountId, amount } = req.body;
    const userId = req.user.id;

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number"
      });
    }

    const accountResult = await pool.query(
      `SELECT balance, account_number, user_id, status FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const account = accountResult.rows[0];

    if (account.user_id != userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only withdraw from your own accounts."
      });
    }

    if (account.status === 'frozen') {
      return res.status(403).json({
        success: false,
        message: "Account is frozen. Contact support for assistance."
      });
    }

    if (account.balance < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds"
      });
    }

    await pool.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [parseFloat(amount), accountId]
    );

    // Fix: Use 'type' and provide both sender_account and receiver_account
    await pool.query(
      `INSERT INTO transactions (account_id, type, amount, sender_account, receiver_account, receiver_name, receiver_account_number, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [accountId, 'withdraw', parseFloat(amount), account.account_number, account.account_number, 'Self Withdrawal', account.account_number, 'N/A']
    );

    res.status(200).json({
      success: true,
      message: "Withdrawal successful"
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({
      success: false,
      message: "Withdrawal failed"
    });
  }
};

// ==================== TRANSFER ====================
exports.transfer = async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, bankName } = req.body;
    const userId = req.user.id;

    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to the same account"
      });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number"
      });
    }

    // Query by account ID
    const fromAcc = await pool.query(
      "SELECT * FROM accounts WHERE id = $1",
      [fromAccount]
    );

    const toAcc = await pool.query(
      "SELECT * FROM accounts WHERE id = $1",
      [toAccount]
    );

    if (fromAcc.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Source account not found"
      });
    }

    if (toAcc.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Destination account not found"
      });
    }

    const sender = fromAcc.rows[0];
    const receiver = toAcc.rows[0];

    if (sender.user_id != userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only transfer from your own accounts."
      });
    }

    // Check if sender account is frozen
    if (sender.status === 'frozen') {
      return res.status(403).json({
        success: false,
        message: "Your account is frozen. Contact support for assistance."
      });
    }

    // Check if receiver account is frozen
    if (receiver.status === 'frozen') {
      return res.status(403).json({
        success: false,
        message: "Recipient account is frozen. Transfer cannot be completed."
      });
    }

    if (sender.balance < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds"
      });
    }

    // Get receiver's name from users table
    const receiverUser = await pool.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [receiver.user_id]
    );
    const receiverName = receiverUser.rows.length > 0
      ? `${receiverUser.rows[0].first_name} ${receiverUser.rows[0].last_name}`
      : 'Unknown';

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        [parseFloat(amount), fromAccount]
      );

      await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        [parseFloat(amount), toAccount]
      );

      await client.query(
        `INSERT INTO transactions (account_id, type, amount, sender_account, receiver_account, receiver_name, receiver_account_number, bank_name)
         VALUES ($1, 'transfer_out', $2, $3, $4, $5, $6, $7)`,
        [sender.id, parseFloat(amount), sender.account_number, receiver.account_number, receiverName, receiver.account_number, bankName||null]
      );

      await client.query(
        `INSERT INTO transactions (account_id, type, amount, sender_account, receiver_account, receiver_name, receiver_account_number, bank_name)
         VALUES ($1, 'transfer_in', $2, $3, $4, $5, $6, $7)`,
        [receiver.id, parseFloat(amount), sender.account_number, receiver.account_number, receiverName, receiver.account_number, bankName||null]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: "Transfer successful"
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transfer transaction error:", error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({
      success: false,
      message: "Transfer failed"
    });
  }
};

// ==================== TRANSACTION HISTORY ====================
exports.transactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const userAccounts = await pool.query(
      "SELECT id FROM accounts WHERE user_id = $1",
      [userId]
    );

    if (userAccounts.rows.length === 0) {
      return res.status(200).json({
        success: true,
        transactions: []
      });
    }

    const accountIds = userAccounts.rows.map(row => row.id);

    const result = await pool.query(
      `SELECT t.* FROM transactions t
       WHERE t.account_id = ANY($1::int[])
       ORDER BY t.created_at DESC`,
      [accountIds]
    );

    res.status(200).json({
      success: true,
      transactions: result.rows
    });

  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions"
    });
  }
};