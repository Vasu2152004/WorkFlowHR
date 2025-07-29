const crypto = require('crypto');

// Generate a secure random password for employees
const generatePassword = (length = 12) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each category
  password += charset[Math.floor(Math.random() * 26)]; // Uppercase
  password += charset[26 + Math.floor(Math.random() * 26)]; // Lowercase
  password += charset[52 + Math.floor(Math.random() * 10)]; // Number
  password += charset[62 + Math.floor(Math.random() * 8)]; // Special character
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Generate a temporary password for password reset
const generateTemporaryPassword = () => {
  return generatePassword(8);
};

// Hash password for storage (if needed)
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

module.exports = {
  generatePassword,
  generateTemporaryPassword,
  hashPassword
}; 