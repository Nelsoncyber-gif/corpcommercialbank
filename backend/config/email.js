const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CorpCommercial Bank" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your CorpCommercial Bank Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00596B 0%, #003D4A 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; }
            .otp-box { background: #E6F3F5; border: 2px dashed #00596B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: 700; color: #00596B; letter-spacing: 8px; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏦 CorpCommercial Bank</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Account Verification</p>
            </div>
            <div class="content">
              <h2 style="color: #00596B; margin-top: 0;">Hello ${userName || 'Valued Customer'},</h2>
              <p style="color: #333; line-height: 1.6;">Thank you for registering with CorpCommercial Bank. To complete your registration, please use the following One-Time Password (OTP):</p>
              
              <div class="otp-box">
                <div style="color: #666; font-size: 14px; margin-bottom: 10px;">Your verification code:</div>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Our staff will never ask for your OTP.
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">If you did not request this verification, please ignore this email or contact our support team.</p>
            </div>
            <div class="footer">
              <p><strong>CorpCommercial Bank Financial Services</strong></p>
              <p>🇺🇸 New York, USA | 🇩🇪 Berlin, Germany | 🇨🇦 Toronto, Canada</p>
              <p>Support: support@corpcommercial.com | +1 (903) 517-0151</p>
              <p style="margin-top: 15px; color: #999;">© 2026 CorpCommercial Bank. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendResetPasswordEmail = async (email, resetToken, userName) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"CorpCommercial Bank" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - CorpCommercial Bank',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00596B 0%, #003D4A 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; }
            .btn { display: inline-block; background: #00596B; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; font-size: 14px; }
            .link-box { background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; padding: 15px; word-break: break-all; font-size: 12px; color: #00596B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 CorpCommercial Bank</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">Password Reset Request</p>
            </div>
            <div class="content">
              <h2 style="color: #00596B; margin-top: 0;">Hello ${userName || 'Valued Customer'},</h2>
              <p style="color: #333; line-height: 1.6;">We received a request to reset your password for your CorpCommercial Bank account. Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">Reset Password</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <div class="link-box">${resetUrl}</div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">This link will expire in <strong>1 hour</strong>.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email or contact our support team immediately. Your password will remain unchanged.
              </div>
            </div>
            <div class="footer">
              <p><strong>CorpCommercial Bank Financial Services</strong></p>
              <p>🇺🇸 New York, USA | 🇩🇪 Berlin, Germany | 🇨🇦 Toronto, Canada</p>
              <p>Support: support@corpcommercial.com | +1 (903) 517-0151</p>
              <p style="margin-top: 15px; color: #999;">© 2026 CorpCommercial Bank. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail
};
