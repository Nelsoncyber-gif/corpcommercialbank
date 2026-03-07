const pool = require('../config/db');
const PDFDocument = require('pdfkit');

exports.generateReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Fetch the transaction with all needed fields
    const result = await pool.query(
      `SELECT 
        t.id,
        t.type,
        t.amount,
        t.created_at,
        t.receiver_name,
        t.receiver_account_number,
        t.bank_name,
        a.account_number,
        a.user_id,
        u.first_name,
        u.last_name,
        u.email
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

    // Create PDF with error handling
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${transactionId}.pdf`);

    // Error handling for PDF stream
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to generate PDF"
        });
      }
    });

    res.on('error', (err) => {
      console.error('Response stream error:', err);
      doc.destroy();
    });

    // Pipe the PDF into the response
    doc.pipe(res);

    // ===== PDF CONTENT =====

    // Header with bank branding
    doc.fontSize(24)
       .fillColor('#00596B')
       .text('CORPCOMMERCIAL BANK', { align: 'center' });
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text('FINANCIAL SERVICES', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Horizontal line
    doc.moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .strokeColor('#00596B')
       .lineWidth(2)
       .stroke();
    
    doc.moveDown(1);

    // Receipt title
    doc.fontSize(18)
       .fillColor('#000000')
       .text('TRANSACTION RECEIPT', { align: 'center' });
    
    doc.moveDown(1);

    // Transaction ID and Date box
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Receipt No: TXN-#${transaction.id}`, 50, doc.y, { align: 'left' });
    
    doc.text(`Date: ${new Date(transaction.created_at).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 50, doc.y, { align: 'left' });
    
    doc.moveDown(1.5);

    // Account holder section
    doc.fontSize(12)
       .fillColor('#00596B')
       .text('ACCOUNT HOLDER DETAILS', { underline: true });
    
    doc.moveDown(0.5);
    
    doc.fontSize(10)
       .fillColor('#000000')
       .text(`Name: ${transaction.first_name} ${transaction.last_name}`);
    
    doc.text(`Email: ${transaction.email}`);
    doc.text(`Account Number: ${transaction.account_number}`);
    
    doc.moveDown(1.5);

    // Transaction details section
    doc.fontSize(12)
       .fillColor('#00596B')
       .text('TRANSACTION DETAILS', { underline: true });
    
    doc.moveDown(0.5);

    // Transaction type with color coding
    const transactionTypeColor = 
      transaction.type === 'deposit' || transaction.type === 'transfer_in' 
        ? '#10B981' // Green for credit
        : '#EF4444'; // Red for debit

    const typeLabel = transaction.type.replace('_', ' ').toUpperCase();
    
    doc.fontSize(10)
       .fillColor('#000000')
       .text('Transaction Type: ');
    
    doc.fillColor(transactionTypeColor)
       .text(typeLabel);

    doc.fillColor('#000000')
       .moveDown(0.5);

    // Amount - large and prominent
    doc.fontSize(10)
       .fillColor('#000000')
       .text('Amount: ');
    
    doc.fontSize(16)
       .fillColor(transactionTypeColor)
       .text(`$${parseFloat(transaction.amount).toFixed(2)}`);
    
    doc.fillColor('#000000')
       .fontSize(10)
       .moveDown(1);

    // Transfer details (if applicable)
    if (transaction.type === 'transfer_out' || transaction.type === 'transfer_in') {
      doc.fontSize(10)
         .fillColor('#000000');
      
      if (transaction.receiver_name) {
        doc.text(`Recipient: ${transaction.receiver_name}`);
      }
      
      if (transaction.receiver_account_number) {
        doc.text(`Recipient Account: ${transaction.receiver_account_number}`);
      }
      
      if (transaction.bank_name) {
        doc.text(`Bank: ${transaction.bank_name}`);
      }
      
      doc.moveDown(1);
    }

    // Status badge
    const badgeY = doc.y;
    doc.rect(50, badgeY, 150, 25)
       .fillAndStroke('#D1FAE5', '#10B981');
    
    doc.fontSize(11)
       .fillColor('#065F46')
       .text('✓ COMPLETED', 55, badgeY + 5);
    
    doc.fontSize(10)
       .moveDown(2.5);

    // Bottom border
    doc.moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .strokeColor('#CCCCCC')
       .lineWidth(1)
       .stroke();
    
    doc.moveDown(1);

    // Footer
    doc.fontSize(9)
       .fillColor('#666666')
       .text('This is a computer-generated receipt and does not require a signature.', {
         align: 'center'
       });

    doc.moveDown(0.5);

    doc.fontSize(8)
       .fillColor('#999999')
       .text('For support, contact: support@corpcommercial.com', {
         align: 'center'
       });

    doc.moveDown(0.3);

    // Branch locations
    doc.fontSize(8)
       .fillColor('#00596B')
       .text('CORPCOMMERCIAL BANK BRANCH LOCATIONS', {
         align: 'center',
         underline: true
       });

    doc.moveDown(0.3);

    doc.fontSize(7)
       .fillColor('#666666')
       .text('🇺🇸 New York, USA: DFE541 Street, New York, NY | +1 (903) 517-0151', {
         align: 'center'
       });

    doc.text('🇩🇪 Berlin, Germany: Eichborndamm 167, 13403 Berlin | +49 16 301 54371', {
      align: 'center'
    });

    doc.text('🇨🇦 Toronto, Canada: 100 King Street West, Toronto, ON M5X 1C9 | +1 (416) 555-0199', {
      align: 'center'
    });

    doc.moveDown(0.5);

    doc.fontSize(8)
       .fillColor('#999999')
       .text('CorpCommercial Bank Financial Services © 2026', {
         align: 'center'
       });

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('Receipt generation error:', err);
    
    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to generate receipt: " + err.message
      });
    }
  }
};