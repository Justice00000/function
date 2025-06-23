// index.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// In-memory OTP store (use MongoDB or similar for production)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).send({ error: 'Email is required' });

  const otp = generateOTP();
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 mins expiry

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `OTP Service <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your verification code is ${otp}. It will expire in 5 minutes.`
    });

    res.send({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('❌ OTP email error:', err.message, err.stack);
res.status(500).send({ error: err.message });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp) {
    return res.status(400).send({ error: 'Invalid or expired OTP' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).send({ error: 'OTP expired' });
  }

  otpStore.delete(email);
  res.send({ message: 'OTP verified successfully' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));