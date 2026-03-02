const pool = require('../config/db');
const PDFDocument = require('pdfkit');

exports.generateReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Fetch the transaction
    const result = await pool.query(
      `SELECT t.*, a.account_number, u.first_name, u.last_name, u.email
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE t.id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    const transaction = result.rows[0];

    // If not admin, make sure the transaction belongs to the user
    if (!isAdmin && transaction.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers so browser knows it's a PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${transactionId}.pdf`);

    // Pipe the PDF into the response
    doc.pipe(res);

    // ===== PDF CONTENT =====

    // Header
    doc.fontSize(20).text('Transaction Receipt', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Bank name
    doc.fontSize(14).text('MyBank', { align: 'center' });
    doc.moveDown();

    // Transaction details
    doc.fontSize(12).text(`Receipt No: #${transaction.id}`);
    doc.text(`Date: ${new Date(transaction.created_at).toLocaleString()}`);
    doc.text(`Account Number: ${transaction.account_number}`);
    doc.text(`Account Holder: ${transaction.first_name} ${transaction.last_name}`);
    doc.text(`Email: ${transaction.email}`);
    doc.moveDown();

    // Transaction type and amount
    doc.fontSize(13).text(`Transaction Type: ${transaction.type.toUpperCase()}`);
    doc.text(`Amount: $${parseFloat(transaction.amount).toFixed(2)}`);

    // Show sender/receiver for transfers
    if (transaction.type === 'transfer_out' || transaction.type === 'transfer_in') {
      doc.text(`Sender Account: ${transaction.sender_account}`);
      doc.text(`Receiver Account: ${transaction.receiver_account}`);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Footer
    doc.fontSize(10).text('Thank you for banking with us.', { align: 'center' });
    doc.text('For support, contact support@mybank.com', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('Receipt generation error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to generate receipt"
    });
  }
};