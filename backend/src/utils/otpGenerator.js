const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generates a cryptographically secure 6-digit OTP string.
 */
function generateOTP() {
  // Generate random integer between 100000 and 999999
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
}

/**
 * Hashes an OTP before storing in database.
 */
async function hashOTP(otp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

/**
 * Compares plain OTP with hashed OTP.
 */
async function verifyOTPHash(plainOtp, hashedOtp) {
  return bcrypt.compare(plainOtp, hashedOtp);
}

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTPHash
};
