const nodemailer = require('nodemailer');

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create transporter
function createTransporter() {
  const service = process.env.EMAIL_SERVICE || 'gmail';

  if (service === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else if (service === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  } else if (service === 'custom') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Default fallback
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"CorpCommercial Bank" <${process.env.EMAIL_USER || 'noreply@corpcommercial.com'}>`,
      to: email,
      subject: 'Email Verification - CorpCommercial Bank',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #00596B; padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; }
            .otp-box { background: #E6F3F5; border: 2px dashed #00596B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #00596B; letter-spacing: 8px; }
            .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CorpCommercial Bank</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Email Verification</p>
            </div>
            <div class="content">
              <h2 style="color: #00596B; margin-top: 0;">Verify Your Email Address</h2>
              <p style="color: #333; line-height: 1.6;">Thank you for registering with CorpCommercial Bank. To complete your registration, please use the following One-Time Password (OTP):</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your verification code:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p style="color: #666; font-size: 14px;"><strong>This code will expire in 10 minutes.</strong></p>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you did not request this verification, please ignore this email or contact our support team immediately.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  <strong>Need help?</strong><br>
                  Email: support@corpcommercial.com<br>
                  Phone: +1 (903) 517-0151
                </p>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2026 CorpCommercial Bank. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent to:', email);
    return true;

  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    return false;
  }
}

// Send password reset email
async function sendPasswordResetEmail(email, resetToken) {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"CorpCommercial Bank" <${process.env.EMAIL_USER || 'noreply@corpcommercial.com'}>`,
      to: email,
      subject: 'Password Reset Request - CorpCommercial Bank',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #00596B; padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; }
            .btn { display: inline-block; background: #00596B; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CorpCommercial Bank</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Password Reset</p>
            </div>
            <div class="content">
              <h2 style="color: #00596B; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #333; line-height: 1.6;">You have requested to reset your password. Click the button below to proceed:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">Reset Password</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link:</p>
              <p style="color: #00596B; font-size: 12px; word-break: break-all;">${resetUrl}</p>
              
              <p style="color: #666; font-size: 14px;"><strong>This link will expire in 1 hour.</strong></p>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                If you did not request this password reset, please ignore this email or contact our support team immediately.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2026 CorpCommercial Bank. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', email);
    return true;

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    return false;
  }
}

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetEmail
};
