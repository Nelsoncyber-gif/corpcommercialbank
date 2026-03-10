const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP config
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"CorpCommercial Bank" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #00596B; margin-bottom: 5px;">CorpCommercial Bank</h1>
          <p style="color: #666;">Email Verification</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 30px; border-radius: 8px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
          
          <div style="background-color: #00596B; color: white; font-size: 36px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 10px; margin-bottom: 20px;">
            ${otp}
          </div>
          
          <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
            Enter this code to verify your email address.
          </p>
          
          <p style="color: #999; font-size: 14px;">
            This code will expire in 10 minutes.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
          <p>If you didn't request this, please ignore this email.</p>
          <p>&copy; 2026 CorpCommercial Bank. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail
};